/**
 * RealCore Auto Call CRM - State Engine & Relational DB Repository
 * Built with full schema models, audit logging, deduplication constraints,
 * and role-based filtering.
 */

import {
  User,
  Lead,
  Campaign,
  LeadCampaignSource,
  LeadActivity,
  CallAttempt,
  FollowUpTask,
  SuppressionEntry,
  GoogleSheetConnection,
  SyncRun,
  SyncConflict,
  AuditLog,
  LeadStatus,
  TaskPriority,
  CallOutcome,
} from '../types';
import { normalizeVietnamesePhone } from '../utils/phone';

import {
  SHEET_USERS,
  SHEET_CAMPAIGN,
  SHEET_LEADS,
  SHEET_ACTIVITIES,
  SHEET_TASKS,
  SHEET_CALL_ATTEMPTS,
} from '../data/googleSheetSeed';

const DB_STORAGE_KEY = 'realcore_crm_db_v7_clean_slate';

export interface DatabaseState {
  users: User[];
  campaigns: Campaign[];
  leads: Lead[];
  leadSources: LeadCampaignSource[];
  activities: LeadActivity[];
  callAttempts: CallAttempt[];
  tasks: FollowUpTask[];
  suppressionList: SuppressionEntry[];
  sheetConnections: GoogleSheetConnection[];
  syncRuns: SyncRun[];
  syncConflicts: SyncConflict[];
  auditLogs: AuditLog[];
}

const SEED_USERS: User[] = SHEET_USERS;
const SEED_CAMPAIGNS: Campaign[] = [];
const SEED_LEADS: Lead[] = [];
const SEED_ACTIVITIES: LeadActivity[] = [];
const SEED_CALL_ATTEMPTS: CallAttempt[] = [];
const SEED_TASKS: FollowUpTask[] = [];
const SEED_SUPPRESSION: SuppressionEntry[] = [];
const SEED_SHEET_CONNECTIONS: GoogleSheetConnection[] = [];
const SEED_SYNC_RUNS: SyncRun[] = [];
const SEED_CONFLICTS: SyncConflict[] = [];

const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit_init_clean',
    actorUserId: 'user_admin_thuan',
    actorUserName: 'Nguyễn Thuận',
    action: 'KHỞI TẠO CRM SẠCH — SẴN SÀNG NHẬP LINK GOOGLE SHEET',
    entityType: 'CAMPAIGN',
    entityId: 'init',
    entityName: 'RealCore Auto Call CRM',
    createdAt: new Date().toISOString(),
  },
];

class DatabaseEngine {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(DB_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.leads && parsed.users && parsed.campaigns) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initial seed data', e);
    }

    const initialState: DatabaseState = {
      users: JSON.parse(JSON.stringify(SEED_USERS)),
      campaigns: JSON.parse(JSON.stringify(SEED_CAMPAIGNS)),
      leads: JSON.parse(JSON.stringify(SEED_LEADS)),
      leadSources: [],
      activities: JSON.parse(JSON.stringify(SEED_ACTIVITIES)),
      callAttempts: JSON.parse(JSON.stringify(SEED_CALL_ATTEMPTS)),
      tasks: JSON.parse(JSON.stringify(SEED_TASKS)),
      suppressionList: JSON.parse(JSON.stringify(SEED_SUPPRESSION)),
      sheetConnections: JSON.parse(JSON.stringify(SEED_SHEET_CONNECTIONS)),
      syncRuns: JSON.parse(JSON.stringify(SEED_SYNC_RUNS)),
      syncConflicts: JSON.parse(JSON.stringify(SEED_CONFLICTS)),
      auditLogs: JSON.parse(JSON.stringify(SEED_AUDIT_LOGS)),
    };
    this.saveState(initialState);
    return initialState;
  }

  private saveState(state: DatabaseState): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(state));
      }
    } catch (e) {
      console.error('Failed to save CRM state to localStorage', e);
    }
  }

  public resetToDefaults(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DB_STORAGE_KEY);
    }
    this.state = this.loadState();
  }

  // --- Users & RBAC ---
  public getUsers(): User[] {
    return [...this.state.users];
  }

  public getUserById(id: string): User | undefined {
    return this.state.users.find((u) => u.id === id);
  }

  public updateUser(id: string, updates: Partial<User>, actor: User): User {
    const idx = this.state.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');
    const before = { ...this.state.users[idx] };
    const updated = {
      ...this.state.users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.state.users[idx] = updated;

    this.logAudit({
      actorUserId: actor.id,
      actorUserName: actor.fullName,
      action: 'CẬP NHẬT NHÂN VIÊN',
      entityType: 'USER',
      entityId: id,
      entityName: updated.fullName,
      beforeData: before,
      afterData: updated,
    });

    this.saveState(this.state);
    return updated;
  }

  public authenticate(email: string, password: string): User {
    const trimmedEmail = email.trim().toLowerCase();
    const user = this.state.users.find((u) => u.email.toLowerCase() === trimmedEmail);

    if (!user) {
      throw new Error('Email này chưa được đăng ký trong hệ thống RealCore.');
    }

    if (!user.isActive) {
      throw new Error('Tài khoản của bạn đã bị vô hiệu hóa hoặc tạm khóa. Vui lòng liên hệ Admin.');
    }

    // Check password
    const expectedPass = user.passwordHash || (user.role === 'ADMIN' ? 'Thuanvipro1@' : '123456');
    if (password !== expectedPass) {
      throw new Error('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
    }

    this.logAudit({
      actorUserId: user.id,
      actorUserName: user.fullName,
      action: 'ĐĂNG NHẬP HỆ THỐNG',
      entityType: 'USER',
      entityId: user.id,
      entityName: user.fullName,
    });

    return user;
  }

  public registerUser(data: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    role?: 'ADMIN' | 'AGENT';
  }): User {
    const trimmedEmail = data.email.trim().toLowerCase();
    const existing = this.state.users.find((u) => u.email.toLowerCase() === trimmedEmail);

    if (existing) {
      throw new Error(`Email ${data.email} đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.`);
    }

    if (!data.fullName.trim()) {
      throw new Error('Vui lòng nhập họ và tên.');
    }

    if (!data.password || data.password.length < 6) {
      throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
    }

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fullName: data.fullName.trim(),
      email: trimmedEmail,
      phone: data.phone?.trim() || '',
      role: data.role || 'AGENT',
      passwordHash: data.password,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.users.push(newUser);

    this.logAudit({
      actorUserId: newUser.id,
      actorUserName: newUser.fullName,
      action: 'ĐĂNG KÝ TÀI KHOẢN MỚI',
      entityType: 'USER',
      entityId: newUser.id,
      entityName: newUser.fullName,
      afterData: { email: newUser.email, role: newUser.role },
    });

    this.saveState(this.state);
    return newUser;
  }

  public changePassword(userId: string, oldPass: string, newPass: string): void {
    const user = this.getUserById(userId);
    if (!user) throw new Error('Người dùng không tồn tại');

    const expectedPass = user.passwordHash || (user.role === 'ADMIN' ? 'Thuanvipro1@' : '123456');
    if (oldPass !== expectedPass) {
      throw new Error('Mật khẩu hiện tại không đúng.');
    }

    if (newPass.length < 6) {
      throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
    }

    this.updateUser(userId, { passwordHash: newPass }, user);
  }

  // --- Campaigns ---
  public getCampaigns(): Campaign[] {
    // Recalculate metrics on the fly based on current leads
    return this.state.campaigns.map((camp) => {
      const campLeads = this.state.leads.filter(
        (l) => l.firstSourceCampaignId === camp.id || l.relatedCampaignIds.includes(camp.id)
      );
      const contacted = campLeads.filter((l) => l.lastContactAt).length;
      const potential = campLeads.filter(
        (l) => ['POTENTIAL', 'APPOINTMENT_SET', 'SITE_VISIT', 'NEGOTIATING', 'DEAL_CLOSED'].includes(l.leadStatus)
      ).length;

      return {
        ...camp,
        uniqueLeadsCount: campLeads.length || camp.uniqueLeadsCount,
        contactedCount: contacted,
        potentialCount: potential,
      };
    });
  }

  public getCampaignById(id: string): Campaign | undefined {
    return this.state.campaigns.find((c) => c.id === id);
  }

  public createCampaign(data: {
    name: string;
    sourceSheetTitle?: string;
    sourceSheetId?: string;
    status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
    assignedAgentIds?: string[];
  }, actor: User): Campaign {
    const newCamp: Campaign = {
      id: `camp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      sourceSheetTitle: data.sourceSheetTitle || data.name.trim(),
      sourceSheetId: data.sourceSheetId || '',
      status: data.status || 'ACTIVE',
      assignedAgentIds: data.assignedAgentIds || [actor.id],
      totalSourceRows: 0,
      uniqueLeadsCount: 0,
      contactedCount: 0,
      potentialCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.state.campaigns.unshift(newCamp);

    this.logAudit({
      actorUserId: actor.id,
      actorUserName: actor.fullName,
      action: 'TẠO CHIẾN DỊCH MỚI',
      entityType: 'CAMPAIGN',
      entityId: newCamp.id,
      entityName: newCamp.name,
      afterData: newCamp,
    });

    this.saveState(this.state);
    return newCamp;
  }

  public deleteCampaign(id: string, actor: User): void {
    const camp = this.getCampaignById(id);
    if (!camp) return;

    this.state.campaigns = this.state.campaigns.filter((c) => c.id !== id);

    this.logAudit({
      actorUserId: actor.id,
      actorUserName: actor.fullName,
      action: 'XÓA CHIẾN DỊCH',
      entityType: 'CAMPAIGN',
      entityId: id,
      entityName: camp.name,
    });

    this.saveState(this.state);
  }

  public clearAllData(actor: User): void {
    this.state.campaigns = [];
    this.state.leads = [];
    this.state.leadSources = [];
    this.state.activities = [];
    this.state.callAttempts = [];
    this.state.tasks = [];
    this.state.suppressionList = [];
    this.state.syncConflicts = [];
    this.state.syncRuns = [];

    // Only keep Admin account
    this.state.users = this.state.users.filter((u) => u.email === 'baben.280625@gmail.com');
    if (this.state.users.length === 0) {
      this.state.users = [
        {
          id: 'user_admin_thuan',
          fullName: 'Nguyễn Thuận',
          email: 'baben.280625@gmail.com',
          phone: '0903888999',
          role: 'ADMIN',
          passwordHash: 'Thuanvipro1@',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    }

    this.logAudit({
      actorUserId: actor.id,
      actorUserName: actor.fullName,
      action: 'XÓA TOÀN BỘ DATA KHÁCH HÀNG & CHIẾN DỊCH',
      entityType: 'CAMPAIGN',
      entityId: 'all',
      entityName: 'Toàn bộ hệ thống CRM',
    });

    this.saveState(this.state);
  }

  public saveSheetConnection(conn: GoogleSheetConnection): GoogleSheetConnection {
    const idx = this.state.sheetConnections.findIndex((c) => c.id === conn.id || c.spreadsheetId === conn.spreadsheetId);
    if (idx >= 0) {
      this.state.sheetConnections[idx] = { ...this.state.sheetConnections[idx], ...conn };
    } else {
      this.state.sheetConnections.unshift(conn);
    }
    this.saveState(this.state);
    return conn;
  }

  // --- Leads with RBAC filtering & Deduplication ---
  public getLeads(currentUser: User, filters?: {
    search?: string;
    campaignId?: string;
    status?: LeadStatus | 'ALL';
    assignedTo?: string;
    overdueOnly?: boolean;
    uncontactedOnly?: boolean;
    duplicateSuspectsOnly?: boolean;
  }): Lead[] {
    let list = [...this.state.leads];

    // RBAC: Agents only view assigned leads by default unless role is ADMIN
    if (currentUser.role === 'AGENT') {
      list = list.filter((l) => l.assignedTo === currentUser.id);
    }

    if (!filters) return list;

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (l) =>
          l.fullName.toLowerCase().includes(q) ||
          l.phoneNormalized.includes(q) ||
          l.phoneRaw.includes(q) ||
          (l.addressText && l.addressText.toLowerCase().includes(q)) ||
          (l.interestMessage && l.interestMessage.toLowerCase().includes(q)) ||
          l.code.toLowerCase().includes(q)
      );
    }

    if (filters.campaignId && filters.campaignId !== 'ALL') {
      list = list.filter(
        (l) => l.firstSourceCampaignId === filters.campaignId || l.relatedCampaignIds.includes(filters.campaignId!)
      );
    }

    if (filters.status && filters.status !== 'ALL') {
      list = list.filter((l) => l.leadStatus === filters.status);
    }

    if (filters.assignedTo && filters.assignedTo !== 'ALL') {
      list = list.filter((l) => l.assignedTo === filters.assignedTo);
    }

    if (filters.overdueOnly) {
      const now = new Date().toISOString();
      list = list.filter((l) => l.nextFollowUpAt && l.nextFollowUpAt < now);
    }

    if (filters.uncontactedOnly) {
      list = list.filter((l) => !l.lastContactAt || l.leadStatus === 'UNCONTACTED' || l.leadStatus === 'NEW');
    }

    return list;
  }

  public getLeadById(id: string, currentUser: User): Lead | undefined {
    const lead = this.state.leads.find((l) => l.id === id);
    if (!lead) return undefined;
    // Check RBAC
    if (currentUser.role === 'AGENT' && lead.assignedTo !== currentUser.id) {
      return undefined;
    }
    return lead;
  }

  public findLeadByNormalizedPhone(phone: string): Lead | undefined {
    if (!phone) return undefined;
    return this.state.leads.find((l) => l.phoneNormalized === phone);
  }

  /**
   * Anti-Duplicate Lead Creation:
   * Uses normalized phone as primary match key.
   */
  public createLead(data: {
    fullName: string;
    phoneRaw: string;
    addressText?: string;
    interestMessage?: string;
    needFinance?: string;
    generalNote?: string;
    leadStatus?: LeadStatus;
    assignedTo?: string;
    campaignId?: string;
  }, actor: User): { lead: Lead; isMerged: boolean; message: string } {
    const phoneCheck = normalizeVietnamesePhone(data.phoneRaw);
    const normalized = phoneCheck.normalized;

    // Check if phone already exists in DB
    if (normalized) {
      const existing = this.findLeadByNormalizedPhone(normalized);
      if (existing) {
        // MERGE POLICY: Update existing lead with new campaign, never duplicate record!
        const updatedCampaigns = [...existing.relatedCampaignIds];
        if (data.campaignId && !updatedCampaigns.includes(data.campaignId)) {
          updatedCampaigns.push(data.campaignId);
        }

        const updatedLead: Lead = {
          ...existing,
          relatedCampaignIds: updatedCampaigns,
          updatedAt: new Date().toISOString(),
          rowVersion: existing.rowVersion + 1,
        };

        const idx = this.state.leads.findIndex((l) => l.id === existing.id);
        this.state.leads[idx] = updatedLead;

        // Record activity for deduplication merge
        this.addActivity({
          leadId: existing.id,
          userId: actor.id,
          userName: actor.fullName,
          channel: 'NOTE',
          subject: 'Gắn chiến dịch từ nguồn trùng số điện thoại',
          body: `Phát hiện khách hàng đã tồn tại trong hệ thống với SĐT ${normalized}. Tự động liên kết thêm chiến dịch mới, giữ nguyên lịch sử chăm sóc.`,
        }, actor);

        this.logAudit({
          actorUserId: actor.id,
          actorUserName: actor.fullName,
          action: 'GỘP NGUỒN KHÁCH TRÙNG SĐT',
          entityType: 'LEAD',
          entityId: existing.id,
          entityName: existing.fullName,
          afterData: { phoneNormalized: normalized, newCampaignId: data.campaignId },
        });

        this.saveState(this.state);
        return {
          lead: updatedLead,
          isMerged: true,
          message: `Số điện thoại ${normalized} đã tồn tại trong CRM (Mã: ${existing.code}). Đã tự động cập nhật và liên kết chiến dịch thay vì tạo trùng.`,
        };
      }
    }

    // Determine assignee
    let assignedTo = data.assignedTo;
    let assignedToName: string | undefined;
    if (assignedTo) {
      const user = this.getUserById(assignedTo);
      assignedToName = user?.fullName;
    } else if (actor.role === 'AGENT') {
      assignedTo = actor.id;
      assignedToName = actor.fullName;
    }

    const campaign = data.campaignId ? this.getCampaignById(data.campaignId) : undefined;
    const nextCodeNumber = this.state.leads.length + 1001;
    const isSuppressed = normalized ? this.isSuppressed(normalized) : false;

    const newLead: Lead = {
      id: `lead_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      code: `KH-${nextCodeNumber}`,
      fullName: data.fullName || 'Khách hàng chưa rõ tên',
      phoneRaw: data.phoneRaw,
      phoneNormalized: normalized,
      addressText: data.addressText || '',
      interestMessage: data.interestMessage || '',
      needFinance: data.needFinance || '',
      generalNote: data.generalNote || '',
      leadStatus: isSuppressed ? 'DO_NOT_CONTACT' : (data.leadStatus || (phoneCheck.isValid ? 'NEW' : 'INVALID_PHONE')),
      assignedTo,
      assignedToName,
      createdBy: actor.id,
      firstSourceCampaignId: data.campaignId,
      firstSourceCampaignName: campaign?.name,
      relatedCampaignIds: data.campaignId ? [data.campaignId] : [],
      sourceCreatedAt: new Date().toISOString(),
      doNotContact: isSuppressed,
      consentStatus: 'UNKNOWN',
      rowVersion: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.state.leads.unshift(newLead);

    this.logAudit({
      actorUserId: actor.id,
      actorUserName: actor.fullName,
      action: 'TẠO MỚI KHÁCH HÀNG',
      entityType: 'LEAD',
      entityId: newLead.id,
      entityName: newLead.fullName,
      afterData: newLead,
    });

    this.saveState(this.state);
    return {
      lead: newLead,
      isMerged: false,
      message: `Tạo hồ sơ khách hàng thành công (Mã: ${newLead.code}).`,
    };
  }

  public updateLead(id: string, updates: Partial<Lead>, actor: User): Lead {
    const idx = this.state.leads.findIndex((l) => l.id === id);
    if (idx === -1) throw new Error('Lead not found');

    const before = { ...this.state.leads[idx] };

    // If phone updated, re-normalize
    let phoneNormalized = before.phoneNormalized;
    let doNotContact = before.doNotContact;
    if (updates.phoneRaw !== undefined && updates.phoneRaw !== before.phoneRaw) {
      const check = normalizeVietnamesePhone(updates.phoneRaw);
      phoneNormalized = check.normalized;
      if (phoneNormalized && this.isSuppressed(phoneNormalized)) {
        doNotContact = true;
      }
    }

    // Resolve assignee name
    let assignedToName = before.assignedToName;
    if (updates.assignedTo !== undefined) {
      if (updates.assignedTo) {
        const u = this.getUserById(updates.assignedTo);
        assignedToName = u?.fullName;
      } else {
        assignedToName = undefined;
      }
    }

    const updated: Lead = {
      ...before,
      ...updates,
      phoneNormalized,
      doNotContact: updates.doNotContact !== undefined ? updates.doNotContact : doNotContact,
      assignedToName,
      updatedAt: new Date().toISOString(),
      rowVersion: before.rowVersion + 1,
    };

    this.state.leads[idx] = updated;

    this.logAudit({
      actorUserId: actor.id,
      actorUserName: actor.fullName,
      action: 'CẬP NHẬT HỒ SƠ KHÁCH HÀNG',
      entityType: 'LEAD',
      entityId: id,
      entityName: updated.fullName,
      beforeData: before,
      afterData: updated,
    });

    this.saveState(this.state);
    return updated;
  }

  public batchAssignLeads(leadIds: string[], newAgentId: string, actor: User): number {
    const targetAgent = this.getUserById(newAgentId);
    if (!targetAgent) throw new Error('Agent not found');

    let count = 0;
    this.state.leads = this.state.leads.map((lead) => {
      if (leadIds.includes(lead.id)) {
        count++;
        return {
          ...lead,
          assignedTo: targetAgent.id,
          assignedToName: targetAgent.fullName,
          updatedAt: new Date().toISOString(),
          rowVersion: lead.rowVersion + 1,
        };
      }
      return lead;
    });

    this.logAudit({
      actorUserId: actor.id,
      actorUserName: actor.fullName,
      action: 'PHÂN CÔNG HÀNG LOẠT KHÁCH HÀNG',
      entityType: 'LEAD',
      entityId: newAgentId,
      entityName: `Giao ${count} khách cho ${targetAgent.fullName}`,
      afterData: { assignedCount: count, leadIds },
    });

    this.saveState(this.state);
    return count;
  }

  // --- Activities & Call Logging ---
  public getActivitiesForLead(leadId: string): LeadActivity[] {
    return this.state.activities
      .filter((a) => a.leadId === leadId)
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }

  public addActivity(data: {
    leadId: string;
    userId: string;
    userName: string;
    channel: LeadActivity['channel'];
    result?: CallOutcome | string;
    subject: string;
    body: string;
    occurredAt?: string;
    durationSeconds?: number;
    externalCallId?: string;
    nextFollowUpAt?: string;
    isLegacyImport?: boolean;
  }, actor: User): LeadActivity {
    const occurredAt = data.occurredAt || new Date().toISOString();
    const newAct: LeadActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      leadId: data.leadId,
      userId: data.userId,
      userName: data.userName,
      channel: data.channel,
      result: data.result,
      subject: data.subject,
      body: data.body,
      occurredAt,
      durationSeconds: data.durationSeconds,
      externalCallId: data.externalCallId,
      nextFollowUpAt: data.nextFollowUpAt,
      isLegacyImport: data.isLegacyImport || false,
      createdAt: new Date().toISOString(),
    };

    this.state.activities.unshift(newAct);

    // Update lead's lastContactAt and nextFollowUpAt
    const leadIdx = this.state.leads.findIndex((l) => l.id === data.leadId);
    if (leadIdx !== -1) {
      const updates: Partial<Lead> = {
        lastContactAt: occurredAt,
        updatedAt: new Date().toISOString(),
      };
      if (data.nextFollowUpAt) {
        updates.nextFollowUpAt = data.nextFollowUpAt;
      }
      this.state.leads[leadIdx] = {
        ...this.state.leads[leadIdx],
        ...updates,
      };
    }

    this.saveState(this.state);
    return newAct;
  }

  // --- Call Attempts ---
  public getCallAttempts(limit = 100): CallAttempt[] {
    return [...this.state.callAttempts]
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  }

  public recordCallAttempt(attempt: Omit<CallAttempt, 'id' | 'createdAt' | 'updatedAt'>): CallAttempt {
    const newAttempt: CallAttempt = {
      ...attempt,
      id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.state.callAttempts.unshift(newAttempt);
    this.saveState(this.state);
    return newAttempt;
  }

  // --- Follow-up Tasks ---
  public getTasks(currentUser: User): FollowUpTask[] {
    let list = [...this.state.tasks];
    if (currentUser.role === 'AGENT') {
      list = list.filter((t) => t.assignedTo === currentUser.id);
    }
    return list.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  }

  public createTask(data: {
    leadId: string;
    title: string;
    details?: string;
    dueAt: string;
    priority: TaskPriority;
    assignedTo?: string;
  }, actor: User): FollowUpTask {
    const lead = this.state.leads.find((l) => l.id === data.leadId);
    if (!lead) throw new Error('Lead not found');

    const assigneeId = data.assignedTo || lead.assignedTo || actor.id;
    const assignee = this.getUserById(assigneeId);

    const task: FollowUpTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      leadId: lead.id,
      leadName: lead.fullName,
      leadPhone: lead.phoneRaw,
      assignedTo: assigneeId,
      assignedToName: assignee?.fullName || 'Chưa phân công',
      createdBy: actor.id,
      title: data.title,
      details: data.details,
      dueAt: data.dueAt,
      priority: data.priority,
      createdAt: new Date().toISOString(),
    };

    this.state.tasks.unshift(task);

    // Update lead's nextFollowUpAt if earlier or not set
    const leadIdx = this.state.leads.findIndex((l) => l.id === lead.id);
    if (leadIdx !== -1) {
      this.state.leads[leadIdx].nextFollowUpAt = data.dueAt;
    }

    this.saveState(this.state);
    return task;
  }

  public completeTask(taskId: string, outcome: string, actor: User): FollowUpTask {
    const idx = this.state.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) throw new Error('Task not found');

    const completed: FollowUpTask = {
      ...this.state.tasks[idx],
      completedAt: new Date().toISOString(),
      outcome,
    };
    this.state.tasks[idx] = completed;

    // Also record activity under the lead
    this.addActivity({
      leadId: completed.leadId,
      userId: actor.id,
      userName: actor.fullName,
      channel: 'NOTE',
      subject: `Hoàn thành lịch chăm sóc: ${completed.title}`,
      body: outcome || 'Đã thực hiện xong lịch chăm sóc đúng hạn.',
    }, actor);

    this.saveState(this.state);
    return completed;
  }

  // --- Suppression (Do Not Call) ---
  public getSuppressionList(): SuppressionEntry[] {
    return [...this.state.suppressionList];
  }

  public isSuppressed(phoneNormalized: string): boolean {
    if (!phoneNormalized) return false;
    return this.state.suppressionList.some((s) => s.phoneNormalized === phoneNormalized);
  }

  public addToSuppression(phoneNormalized: string, reason: string, leadId?: string, actor?: User): SuppressionEntry {
    const existing = this.state.suppressionList.find((s) => s.phoneNormalized === phoneNormalized);
    if (existing) return existing;

    const lead = leadId ? this.state.leads.find((l) => l.id === leadId) : undefined;
    const entry: SuppressionEntry = {
      id: `supp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      phoneNormalized,
      leadId,
      leadName: lead?.fullName,
      reason,
      source: actor ? `Thao tác bởi ${actor.fullName}` : 'Hệ thống',
      createdBy: actor?.fullName || 'Admin',
      createdAt: new Date().toISOString(),
    };

    this.state.suppressionList.unshift(entry);

    // Mark matching leads as DO_NOT_CONTACT
    this.state.leads = this.state.leads.map((l) => {
      if (l.phoneNormalized === phoneNormalized) {
        return {
          ...l,
          doNotContact: true,
          leadStatus: 'DO_NOT_CONTACT',
          updatedAt: new Date().toISOString(),
        };
      }
      return l;
    });

    this.logAudit({
      actorUserId: actor?.id || 'sys',
      actorUserName: actor?.fullName || 'Hệ thống',
      action: 'THÊM SĐT VÀO DANH SÁCH CHẶN GỌI (DNC)',
      entityType: 'SUPPRESSION',
      entityId: entry.id,
      entityName: phoneNormalized,
      afterData: { phoneNormalized, reason },
    });

    this.saveState(this.state);
    return entry;
  }

  public removeFromSuppression(id: string, actor: User): void {
    const entry = this.state.suppressionList.find((s) => s.id === id);
    if (!entry) return;

    this.state.suppressionList = this.state.suppressionList.filter((s) => s.id !== id);

    // Unmark matching leads
    this.state.leads = this.state.leads.map((l) => {
      if (l.phoneNormalized === entry.phoneNormalized) {
        return {
          ...l,
          doNotContact: false,
          leadStatus: 'UNCONTACTED',
          updatedAt: new Date().toISOString(),
        };
      }
      return l;
    });

    this.logAudit({
      actorUserId: actor.id,
      actorUserName: actor.fullName,
      action: 'XÓA KHỎI DANH SÁCH CHẶN GỌI (DNC)',
      entityType: 'SUPPRESSION',
      entityId: id,
      entityName: entry.phoneNormalized,
    });

    this.saveState(this.state);
  }

  // --- Google Sheet Sync & Conflict Resolution ---
  public getSheetConnections(): GoogleSheetConnection[] {
    return [...this.state.sheetConnections];
  }

  public getSyncRuns(): SyncRun[] {
    return [...this.state.syncRuns];
  }

  public getSyncConflicts(): SyncConflict[] {
    return [...this.state.syncConflicts];
  }

  public recordSyncResult(run: SyncRun, conflicts: SyncConflict[]): void {
    this.state.syncRuns.unshift(run);
    conflicts.forEach((c) => {
      this.state.syncConflicts.unshift(c);
      const leadIdx = this.state.leads.findIndex((l) => l.id === c.leadId);
      if (leadIdx !== -1) {
        this.state.leads[leadIdx].hasConflict = true;
      }
    });
    this.saveState(this.state);
  }

  public resolveSyncConflict(
    conflictId: string,
    resolution: 'KEEP_CRM' | 'KEEP_SHEET' | 'MANUAL',
    resolvedValue: any,
    actor: User
  ): SyncConflict {
    const idx = this.state.syncConflicts.findIndex((c) => c.id === conflictId);
    if (idx === -1) throw new Error('Conflict not found');

    const conflict = this.state.syncConflicts[idx];
    const resolved: SyncConflict = {
      ...conflict,
      resolution,
      resolvedValue,
      resolvedBy: actor.fullName,
      resolvedAt: new Date().toISOString(),
    };
    this.state.syncConflicts[idx] = resolved;

    // Apply resolved value to Lead if KEEP_SHEET or MANUAL
    if (resolution === 'KEEP_SHEET' || resolution === 'MANUAL') {
      const leadIdx = this.state.leads.findIndex((l) => l.id === conflict.leadId);
      if (leadIdx !== -1) {
        this.state.leads[leadIdx] = {
          ...this.state.leads[leadIdx],
          [conflict.fieldName]: resolvedValue,
          hasConflict: false,
          updatedAt: new Date().toISOString(),
          rowVersion: this.state.leads[leadIdx].rowVersion + 1,
        };
      }
    } else {
      // KEEP_CRM: simply clear conflict flag
      const leadIdx = this.state.leads.findIndex((l) => l.id === conflict.leadId);
      if (leadIdx !== -1) {
        this.state.leads[leadIdx].hasConflict = false;
      }
    }

    this.logAudit({
      actorUserId: actor.id,
      actorUserName: actor.fullName,
      action: 'XỬ LÝ XUNG ĐỘT ĐỒNG BỘ GOOGLE SHEETS',
      entityType: 'SYNC',
      entityId: conflictId,
      entityName: conflict.leadName,
      afterData: { resolution, resolvedValue },
    });

    this.saveState(this.state);
    return resolved;
  }

  // --- Audit Logs ---
  public getAuditLogs(limit = 100): AuditLog[] {
    return [...this.state.auditLogs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  public logAudit(entry: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
    const log: AuditLog = {
      ...entry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(log);
    // Keep max 200 audit entries
    if (this.state.auditLogs.length > 200) {
      this.state.auditLogs.pop();
    }
    return log;
  }
}

export const db = new DatabaseEngine();
