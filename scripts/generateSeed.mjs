import fs from 'fs';
import { normalizeVietnamesePhone } from '../src/utils/phone.ts';

const rawData = JSON.parse(fs.readFileSync('src/data/importedGoogleSheetData.json', 'utf8'));

// Users:
const users = [
  {
    id: 'user_admin',
    fullName: 'Nguyễn Văn Hùng',
    email: 'hung.nguyen@realcore.vn',
    phone: '0903888999',
    role: 'ADMIN',
    isActive: true,
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'user_thuan',
    fullName: 'Nguyễn Văn Thuận',
    email: 'thuan.nguyen@realcore.vn',
    phone: '0912345671',
    role: 'AGENT',
    isActive: true,
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'user_thu',
    fullName: 'Nguyễn Minh Thư',
    email: 'thu.nguyen@realcore.vn',
    phone: '0912345672',
    role: 'AGENT',
    isActive: true,
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'user_long',
    fullName: 'Lê Hoàng Long',
    email: 'long.le@realcore.vn',
    phone: '0912345673',
    role: 'AGENT',
    isActive: true,
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-02-01T08:00:00Z',
  },
];

const campaignId = 'camp_logoc_258_200';
const campaign = {
  id: campaignId,
  name: 'Chiến Dịch Lô Góc 258m2 & 200m2 (07/08 - 20/08)',
  sourceSheetTitle: 'Chiến Dịch Lô Góc 258m2 & 200m2',
  sourceSheetId: '1RtTVt93QKonyTKOpgpPDT0_67FjaK8DvvlSEzFmWyFA',
  startDate: '2026-08-07',
  endDate: '2026-08-20',
  status: 'ACTIVE',
  assignedAgentIds: ['user_thuan', 'user_thu'],
  totalSourceRows: 27,
  uniqueLeadsCount: 27,
  contactedCount: 25,
  potentialCount: 8,
  createdAt: '2026-08-07T08:00:00Z',
};

const leads = [];
const activities = [];
const tasks = [];
const callAttempts = [];

rawData.forEach((item) => {
  const phoneCheck = normalizeVietnamesePhone(item.phone);
  const leadId = `lead_${item.stt}`;
  const code = `KH-${String(item.stt).padStart(4, '0')}`;

  // Assign staff
  let assignedTo = 'user_thuan';
  let assignedToName = 'Nguyễn Văn Thuận';
  const staffLower = item.staff.toLowerCase();
  if (staffLower.includes('thư')) {
    assignedTo = 'user_thu';
    assignedToName = 'Nguyễn Minh Thư';
  }

  // Determine lead status based on notes
  let leadStatus = 'CONTACTING';
  const allNotesText = [item.note, ...item.legacyNotes].join(' ').toLowerCase();

  if (allNotesText.includes('mới mua được rồi') || allNotesText.includes('hết nhu cầu') || allNotesText.includes('tắt máy ngang') || allNotesText.includes('mua đất gia lộc 2 của đối thủ') || allNotesText.includes('mua kcn hiệp thạnh') || allNotesText.includes('không có nhu cầu quan tâm nữa')) {
    leadStatus = 'NO_DEMAND';
  } else if (allNotesText.includes('đã đi xem') || allNotesText.includes('tự đi xem')) {
    leadStatus = 'SITE_VISIT';
  } else if (allNotesText.includes('hẹn') || allNotesText.includes('lên văn phòng') || allNotesText.includes('sáng mai')) {
    leadStatus = 'APPOINTMENT_SET';
  } else if (allNotesText.includes('chăm sóc thêm') || allNotesText.includes('mua để đầu tư') || allNotesText.includes('tìm mua')) {
    leadStatus = 'POTENTIAL';
  } else if (item.phone.toLowerCase().includes('zalo') || !item.phone) {
    leadStatus = phoneCheck.isValid ? 'CONNECTED' : 'INVALID_PHONE';
  }

  const isDNC = allNotesText.includes('chặn số') || allNotesText.includes('chặn người lạ') && !phoneCheck.canCall;

  // Convert date format 07/08/2026 to ISO
  let sourceCreatedAt = '2026-08-07T08:00:00Z';
  if (item.date) {
    const parts = item.date.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2].length === 4 ? parts[2] : `20${parts[2]}`;
      sourceCreatedAt = `${year}-${month}-${day}T08:30:00Z`;
    }
  }

  const lead = {
    id: leadId,
    code,
    fullName: item.name || 'Khách hàng',
    phoneRaw: item.phone || '',
    phoneNormalized: phoneCheck.normalized,
    addressText: item.address || '',
    interestMessage: item.message || '',
    needFinance: item.need || '',
    generalNote: item.note || '',
    leadStatus,
    assignedTo,
    assignedToName,
    createdBy: 'user_admin',
    firstSourceCampaignId: campaignId,
    firstSourceCampaignName: campaign.name,
    relatedCampaignIds: [campaignId],
    sourceCreatedAt,
    doNotContact: isDNC,
    consentStatus: isDNC ? 'OPTED_OUT' : 'OPTED_IN',
    lastContactAt: sourceCreatedAt,
    rowVersion: 1,
    hasConflict: false,
    createdAt: sourceCreatedAt,
    updatedAt: sourceCreatedAt,
  };

  leads.push(lead);

  // Add initial Note activity from column "Note"
  if (item.note) {
    activities.push({
      id: `act_${item.stt}_note`,
      leadId,
      userId: assignedTo,
      userName: assignedToName,
      channel: 'NOTE',
      subject: 'Ghi chú ban đầu từ Google Sheet',
      body: item.note,
      occurredAt: sourceCreatedAt,
      isLegacyImport: true,
      createdAt: sourceCreatedAt,
    });
  }

  // Add Legacy Notes L1, L2, L3... as individual activities preserving exact text and order!
  item.legacyNotes.forEach((legacyText, noteIdx) => {
    activities.push({
      id: `act_${item.stt}_l${noteIdx + 1}`,
      leadId,
      userId: assignedTo,
      userName: assignedToName,
      channel: legacyText.toLowerCase().includes('gọi') ? 'CALL' : 'NOTE',
      subject: `Ghi chú L${noteIdx + 1} - Lịch sử chăm sóc Google Sheet`,
      body: legacyText,
      occurredAt: sourceCreatedAt,
      isLegacyImport: true,
      createdAt: sourceCreatedAt,
    });
  });

  // If customer has follow up or active appointment, create a follow-up task
  if (leadStatus === 'APPOINTMENT_SET' || leadStatus === 'POTENTIAL') {
    tasks.push({
      id: `task_${item.stt}`,
      leadId,
      leadName: item.name,
      leadPhone: phoneCheck.formatted || item.phone,
      assignedTo,
      assignedToName,
      createdBy: assignedTo,
      title: `Chăm sóc và theo dõi lịch hẹn: ${item.name}`,
      details: item.legacyNotes[item.legacyNotes.length - 1] || item.note || 'Gọi lại chăm sóc theo lịch hẹn',
      dueAt: '2026-10-27T09:00:00Z',
      priority: leadStatus === 'APPOINTMENT_SET' ? 'HIGH' : 'MEDIUM',
      createdAt: sourceCreatedAt,
    });
  }

  // Create a call attempt if phone is valid and note mentions call
  if (phoneCheck.canCall && allNotesText.includes('gọi')) {
    callAttempts.push({
      id: `call_${item.stt}`,
      leadId,
      leadName: item.name,
      leadPhone: phoneCheck.normalized,
      agentId: assignedTo,
      agentName: assignedToName,
      providerKey: 'MOCK',
      providerCallId: `mock_sheet_${item.stt}`,
      idempotencyKey: `call_seed_${item.stt}`,
      status: 'COMPLETED',
      result: allNotesText.includes('không nghe máy') || allNotesText.includes('ko nghe máy')
        ? 'NO_ANSWER'
        : (allNotesText.includes('máy bận') ? 'BUSY' : 'ANSWERED'),
      startedAt: sourceCreatedAt,
      durationSeconds: Math.floor(Math.random() * 120) + 30,
      isSimulated: true,
      notes: item.legacyNotes[0] || item.note,
      createdAt: sourceCreatedAt,
      updatedAt: sourceCreatedAt,
    });
  }
});

const fileContent = `/**
 * RealCore Auto Call CRM - Pre-seeded Authentic Dataset
 * Directly parsed from Google Sheet / attached DATA_CHI_N_D_CH_18b3d223
 * Contains all 27 real customer rows and their complete L1-L12 care histories.
 */

import { Campaign, FollowUpTask, Lead, LeadActivity, CallAttempt, User } from '../types';

export const SHEET_USERS: User[] = ${JSON.stringify(users, null, 2)};

export const SHEET_CAMPAIGN: Campaign = ${JSON.stringify(campaign, null, 2)};

export const SHEET_LEADS: Lead[] = ${JSON.stringify(leads, null, 2)};

export const SHEET_ACTIVITIES: LeadActivity[] = ${JSON.stringify(activities, null, 2)};

export const SHEET_TASKS: FollowUpTask[] = ${JSON.stringify(tasks, null, 2)};

export const SHEET_CALL_ATTEMPTS: CallAttempt[] = ${JSON.stringify(callAttempts, null, 2)};
`;

fs.writeFileSync('src/data/googleSheetSeed.ts', fileContent, 'utf8');
console.log('Successfully generated src/data/googleSheetSeed.ts with', leads.length, 'leads and', activities.length, 'activities.');
