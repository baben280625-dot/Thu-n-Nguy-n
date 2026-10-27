import { describe, it, expect, beforeEach } from 'vitest';
import { normalizeVietnamesePhone } from '../utils/phone';
import { db } from '../services/db';
import { telephonyService } from '../services/telephony';
import { dryRunImport, autoDetectMapping } from '../services/excelImport';
import { parseGoogleSheetUrl, syncGoogleSheetFromUrl, runGoogleSheetsSync } from '../services/sheetsSync';
import { User } from '../types';

describe('RealCore Auto Call CRM - Core Unit & Integration Tests', () => {
  const adminUser: User = {
    id: 'user_admin_thuan',
    fullName: 'Nguyễn Thuận',
    email: 'baben.280625@gmail.com',
    phone: '0903888999',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  };

  const agentUser: User = {
    id: 'user_agent_test',
    fullName: 'Chuyên Viên Kinh Doanh',
    email: 'agent.test@realcore.vn',
    phone: '0912345672',
    role: 'AGENT',
    isActive: true,
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  };

  beforeEach(() => {
    db.resetToDefaults();
  });

  describe('1. Clean Slate State (Accounts & Campaigns Wiped)', () => {
    it('initially has ONLY 1 Admin account (Nguyễn Thuận) and 0 other accounts', () => {
      const users = db.getUsers();
      expect(users.length).toBe(1);
      expect(users[0].email).toBe('baben.280625@gmail.com');
      expect(users[0].fullName).toBe('Nguyễn Thuận');
      expect(users[0].role).toBe('ADMIN');
    });

    it('initially has 0 campaigns and 0 leads in the system', () => {
      const campaigns = db.getCampaigns();
      const leads = db.getLeads(adminUser);
      expect(campaigns.length).toBe(0);
      expect(leads.length).toBe(0);
    });
  });

  describe('2. Phone Normalization & Validation', () => {
    it('normalizes standard 10-digit Vietnamese phone numbers', () => {
      const res = normalizeVietnamesePhone('0937 295 298');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('0937295298');
      expect(res.carrier).toBe('MobiFone');
      expect(res.canCall).toBe(true);
    });

    it('standardizes +84 and 84 prefixes to leading 0', () => {
      const res1 = normalizeVietnamesePhone('+84909069453');
      expect(res1.isValid).toBe(true);
      expect(res1.normalized).toBe('0909069453');
      expect(res1.carrier).toBe('MobiFone');

      const res2 = normalizeVietnamesePhone('84985454817');
      expect(res2.isValid).toBe(true);
      expect(res2.normalized).toBe('0985454817');
      expect(res2.carrier).toBe('Viettel');
    });

    it('handles 9-digit phones missing leading zero from Excel (e.g. 789533561 -> 0789533561)', () => {
      const res = normalizeVietnamesePhone('789533561');
      expect(res.isValid).toBe(true);
      expect(res.normalized).toBe('0789533561');
      expect(res.carrier).toBe('MobiFone');
      expect(res.canCall).toBe(true);
    });

    it('rejects text phrases and invalid numbers (e.g. Zalo, empty, short)', () => {
      const res1 = normalizeVietnamesePhone('Zalo');
      expect(res1.isValid).toBe(false);
      expect(res1.canCall).toBe(false);

      const res2 = normalizeVietnamesePhone('12345');
      expect(res2.isValid).toBe(false);
      expect(res2.canCall).toBe(false);

      const res3 = normalizeVietnamesePhone('');
      expect(res3.isValid).toBe(false);
    });
  });

  describe('3. Deduplication & Anti-Duplicate Rules', () => {
    it('creates new lead when phone does not exist in CRM', () => {
      const res = db.createLead(
        {
          fullName: 'Khách Thử Nghiệm Mới',
          phoneRaw: '0933 999 111',
          addressText: 'Xã Nhuận Đức, Củ Chi',
        },
        adminUser
      );

      expect(res.isMerged).toBe(false);
      expect(db.getLeads(adminUser).length).toBe(1);
    });

    it('automatically merges campaign into existing lead when normalized phone matches', () => {
      db.createLead(
        {
          fullName: 'Huỳnh Tuấn Anh',
          phoneRaw: '0937295298',
          campaignId: 'camp_init',
        },
        adminUser
      );

      const initialCount = db.getLeads(adminUser).length;
      expect(initialCount).toBe(1);

      // Create duplicate lead with formatted phone
      const res = db.createLead(
        {
          fullName: 'Huỳnh Tuấn Anh (Trùng SĐT)',
          phoneRaw: '+84 937 295 298',
          campaignId: 'camp_cuchi_new',
        },
        adminUser
      );

      // Verify no duplicate record created
      expect(res.isMerged).toBe(true);
      expect(db.getLeads(adminUser).length).toBe(initialCount);

      // Verify new campaign attached to existing record
      const updated = db.findLeadByNormalizedPhone('0937295298');
      expect(updated?.relatedCampaignIds).toContain('camp_cuchi_new');
    });
  });

  describe('4. Google Sheets Link Parsing & Sync Engine', () => {
    it('accurately parses any Google Sheet URL format and extracts spreadsheet ID and gid', () => {
      const parsed1 = parseGoogleSheetUrl(
        'https://docs.google.com/spreadsheets/d/1RtTVt93QKonyTKOpgpPDT0_67FjaK8DvvlSEzFmWyFA/edit#gid=0'
      );
      expect(parsed1.isValid).toBe(true);
      expect(parsed1.spreadsheetId).toBe('1RtTVt93QKonyTKOpgpPDT0_67FjaK8DvvlSEzFmWyFA');
      expect(parsed1.gid).toBe('0');
      expect(parsed1.exportCsvUrl).toContain('/export?format=csv&gid=0');

      const parsed2 = parseGoogleSheetUrl('1RtTVt93QKonyTKOpgpPDT0_67FjaK8DvvlSEzFmWyFA');
      expect(parsed2.isValid).toBe(true);
      expect(parsed2.spreadsheetId).toBe('1RtTVt93QKonyTKOpgpPDT0_67FjaK8DvvlSEzFmWyFA');

      const invalid = parseGoogleSheetUrl('not_a_valid_link');
      expect(invalid.isValid).toBe(false);
    });

    it('syncs customer data from Google Sheet URL, creates campaign, and migrates notes & tasks', async () => {
      const syncResult = await syncGoogleSheetFromUrl(
        'https://docs.google.com/spreadsheets/d/1RtTVt93QKonyTKOpgpPDT0_67FjaK8DvvlSEzFmWyFA/edit#gid=0',
        adminUser,
        { customCampaignName: 'Chiến Dịch Lô Góc 258m2 & 200m2' }
      );

      expect(syncResult.success).toBe(true);
      expect(syncResult.createdLeads).toBe(27);
      expect(syncResult.notesMigrated).toBeGreaterThan(0);

      // Verify leads in CRM
      const leads = db.getLeads(adminUser);
      expect(leads.length).toBe(27);

      // Verify campaign created
      const campaigns = db.getCampaigns();
      expect(campaigns.length).toBe(1);
      expect(campaigns[0].name).toBe('Chiến Dịch Lô Góc 258m2 & 200m2');

      // Verify connection saved
      const connections = db.getSheetConnections();
      expect(connections.length).toBe(1);
      expect(connections[0].spreadsheetId).toBe('1RtTVt93QKonyTKOpgpPDT0_67FjaK8DvvlSEzFmWyFA');
    });
  });

  describe('5. Role-Based Access Control (RBAC)', () => {
    it('admin user can view all synced leads while agent only sees assigned leads', async () => {
      // Sync dataset first
      await syncGoogleSheetFromUrl(
        'https://docs.google.com/spreadsheets/d/1RtTVt93QKonyTKOpgpPDT0_67FjaK8DvvlSEzFmWyFA/edit',
        adminUser
      );

      const allLeads = db.getLeads(adminUser);
      expect(allLeads.length).toBe(27);

      // Register an agent in the clean DB
      const registeredAgent = db.registerUser({
        fullName: 'Chuyên Viên Kinh Doanh',
        email: 'agent.sales@realcore.vn',
        password: 'Password123@',
        role: 'AGENT',
      });

      // Assign 1 lead to registeredAgent
      const leadToAssign = allLeads[0];
      db.batchAssignLeads([leadToAssign.id], registeredAgent.id, adminUser);

      // Agent sees only 1 lead
      const agentLeads = db.getLeads(registeredAgent);
      expect(agentLeads.length).toBe(1);
      expect(agentLeads[0].assignedTo).toBe(registeredAgent.id);
    });
  });

  describe('6. Telephony Provider & Safeguards', () => {
    it('blocks call if phone number is invalid', async () => {
      const res = await telephonyService.startOutboundCall({
        leadId: 'test_lead',
        leadName: 'Khách test',
        phone: 'invalid_number',
        agentId: adminUser.id,
        agentName: adminUser.fullName,
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('FAILED');
    });

    it('blocks calling phone on Suppression / Do Not Call list', async () => {
      db.addToSuppression('0813888879', 'Khách yêu cầu không gọi', undefined, adminUser);
      const isSuppressed = db.isSuppressed('0813888879');
      expect(isSuppressed).toBe(true);
    });

    it('initiates simulated call with unique idempotency key when valid', async () => {
      const res = await telephonyService.startOutboundCall({
        leadId: 'test_lead_valid',
        leadName: 'Khách VIP Củ Chi',
        phone: '0909123456',
        agentId: adminUser.id,
        agentName: adminUser.fullName,
      });

      expect(res.success).toBe(true);
      expect(res.isSimulated).toBe(true);
      expect(res.idempotencyKey).toBeDefined();
    });
  });

  describe('7. Authentication & User Management (Login / Register)', () => {
    it('authenticates Admin user Nguyễn Thuận with requested email & password', () => {
      const user = db.authenticate('baben.280625@gmail.com', 'Thuanvipro1@');
      expect(user).toBeDefined();
      expect(user.fullName).toBe('Nguyễn Thuận');
      expect(user.email).toBe('baben.280625@gmail.com');
      expect(user.role).toBe('ADMIN');
      expect(user.isActive).toBe(true);
    });

    it('rejects incorrect password with clear message', () => {
      expect(() => {
        db.authenticate('baben.280625@gmail.com', 'WrongPassword123');
      }).toThrow('Mật khẩu không chính xác');
    });

    it('rejects unknown email address', () => {
      expect(() => {
        db.authenticate('unknown.user@gmail.com', 'Thuanvipro1@');
      }).toThrow('chưa được đăng ký');
    });

    it('successfully registers a new Agent account and permits immediate login', () => {
      const newUser = db.registerUser({
        fullName: 'Trần Thị Mai',
        email: 'mai.tran@realcore.vn',
        phone: '0988776655',
        password: 'Password123@',
        role: 'AGENT',
      });

      expect(newUser.id).toBeDefined();
      expect(newUser.fullName).toBe('Trần Thị Mai');
      expect(newUser.role).toBe('AGENT');

      // Verify immediate login
      const loggedIn = db.authenticate('mai.tran@realcore.vn', 'Password123@');
      expect(loggedIn.id).toBe(newUser.id);
    });

    it('prevents duplicate registration with an already used email', () => {
      expect(() => {
        db.registerUser({
          fullName: 'Thuận Giả Mạo',
          email: 'baben.280625@gmail.com',
          password: 'Password123@',
        });
      }).toThrow('đã được sử dụng');
    });
  });
});
