/**
 * RealCore Auto Call CRM - Type Definitions
 * Designed for Real Estate Sales & Telemarketing Teams
 */

export type UserRole = 'ADMIN' | 'AGENT';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  passwordHash?: string;
  isActive: boolean;
  avatarUrl?: string;
  assignedLeadsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus =
  | 'NEW'               // Khách mới
  | 'UNCONTACTED'       // Chưa liên hệ
  | 'CONTACTING'        // Đang liên hệ
  | 'CONNECTED'         // Đã kết nối
  | 'POTENTIAL'         // Khách tiềm năng
  | 'APPOINTMENT_SET'   // Đã đặt lịch hẹn
  | 'SITE_VISIT'        // Đã đi xem bất động sản
  | 'NEGOTIATING'       // Đang thương lượng
  | 'DEAL_CLOSED'       // Đã giao dịch
  | 'NO_DEMAND'         // Không còn nhu cầu
  | 'INVALID_PHONE'     // Số điện thoại không hợp lệ
  | 'DO_NOT_CONTACT';   // Không liên hệ (DNC)

export type ConsentStatus = 'OPTED_IN' | 'UNKNOWN' | 'OPTED_OUT';

export interface Lead {
  id: string;
  code: string;                 // Mã KH: KH-0001
  fullName: string;
  phoneRaw: string;
  phoneNormalized: string;
  addressText?: string;
  interestMessage?: string;     // Sản phẩm / Thông điệp quan tâm (e.g. Đất vườn Củ Chi 1000m2)
  needFinance?: string;         // Ngân sách / Tài chính (e.g. 1.5 - 2 tỷ)
  generalNote?: string;
  leadStatus: LeadStatus;
  assignedTo?: string;          // user id
  assignedToName?: string;
  createdBy: string;            // user id
  firstSourceCampaignId?: string;
  firstSourceCampaignName?: string;
  relatedCampaignIds: string[];
  sourceCreatedAt?: string;
  doNotContact: boolean;
  consentStatus: ConsentStatus;
  lastContactAt?: string;
  nextFollowUpAt?: string;
  rowVersion: number;
  hasConflict?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  sourceSheetTitle?: string;
  sourceSheetId?: string;
  startDate?: string;
  endDate?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  assignedAgentIds: string[];
  totalSourceRows: number;
  uniqueLeadsCount: number;
  contactedCount: number;
  potentialCount: number;
  createdAt: string;
}

export interface LeadCampaignSource {
  id: string;
  leadId: string;
  campaignId: string;
  campaignName: string;
  sourceRowKey: string;
  sourceRowNumber: number;
  sourcePayload: Record<string, any>;
  firstSeenAt: string;
  lastSeenAt: string;
}

export type ActivityChannel =
  | 'CALL'
  | 'NOTE'
  | 'MEETING'
  | 'SITE_VISIT'
  | 'MESSAGE'
  | 'ZALO'
  | 'OTHER';

export type CallOutcome =
  | 'ANSWERED'              // Đã nghe máy
  | 'NO_ANSWER'             // Không nghe máy
  | 'BUSY'                  // Máy bận
  | 'WRONG_NUMBER'          // Sai số
  | 'INTERESTED'            // Khách quan tâm
  | 'NOT_INTERESTED'        // Khách không quan tâm
  | 'CALLBACK_REQUESTED'    // Hẹn gọi lại
  | 'APPOINTMENT_BOOKED'    // Đã đặt lịch hẹn
  | 'DO_NOT_CALL'           // Yêu cầu không liên hệ
  | 'FAILED'                // Cuộc gọi thất bại
  | 'UNKNOWN';              // Chưa xác định

export interface LeadActivity {
  id: string;
  leadId: string;
  userId: string;
  userName: string;
  channel: ActivityChannel;
  result?: CallOutcome | string;
  subject: string;
  body: string;
  occurredAt: string;
  durationSeconds?: number;
  externalCallId?: string;
  nextFollowUpAt?: string;
  isLegacyImport?: boolean;   // Đánh dấu ghi chú chuyển từ L1-L8 Excel cũ
  metadata?: Record<string, any>;
  createdAt: string;
}

export type CallAttemptStatus =
  | 'INITIATED'
  | 'RINGING'
  | 'CONNECTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface CallAttempt {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  agentId: string;
  agentName: string;
  providerKey: 'MOCK' | 'VIETTEL_VOIP' | 'STRINGEE' | 'VHT' | 'FPT';
  providerCallId: string;
  idempotencyKey: string;
  status: CallAttemptStatus;
  result?: CallOutcome;
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds: number;
  errorCode?: string;
  errorMessage?: string;
  isSimulated: boolean;       // Luôn true cho Mock Telephony
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface FollowUpTask {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  assignedTo: string;
  assignedToName: string;
  createdBy: string;
  title: string;
  details?: string;
  dueAt: string;
  priority: TaskPriority;
  completedAt?: string;
  outcome?: string;
  createdAt: string;
}

export interface SuppressionEntry {
  id: string;
  phoneNormalized: string;
  leadId?: string;
  leadName?: string;
  reason: string;
  source: string;
  createdBy: string;
  createdAt: string;
}

export interface GoogleSheetConnection {
  id: string;
  name: string;
  spreadsheetId: string;
  sheetTitle: string;
  syncDirection: 'SHEET_TO_CRM' | 'CRM_TO_SHEET' | 'TWO_WAY';
  enabled: boolean;
  mapping: Record<string, string>; // CRM field -> Sheet Column
  lastSyncAt?: string;
  createdAt: string;
}

export interface SyncRun {
  id: string;
  connectionId: string;
  sheetTitle: string;
  direction: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CONFLICTS_FOUND';
  rowsRead: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsSkipped: number;
  conflictsCount: number;
  errorSummary?: string;
  startedAt: string;
  finishedAt?: string;
  createdAt: string;
}

export interface SyncConflict {
  id: string;
  syncRunId: string;
  leadId: string;
  leadName: string;
  sourceRowKey: string;
  fieldName: string;
  fieldLabel: string;
  crmValue: any;
  sheetValue: any;
  resolution?: 'KEEP_CRM' | 'KEEP_SHEET' | 'MANUAL';
  resolvedValue?: any;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  actorUserName: string;
  action: string;
  entityType: 'LEAD' | 'CAMPAIGN' | 'CALL' | 'USER' | 'SYNC' | 'SUPPRESSION' | 'TASK';
  entityId: string;
  entityName?: string;
  beforeData?: any;
  afterData?: any;
  createdAt: string;
}

export interface ExcelImportPreviewRow {
  rowNumber: number;
  raw: Record<string, any>;
  mapped: {
    fullName?: string;
    phoneRaw?: string;
    phoneNormalized?: string;
    addressText?: string;
    interestMessage?: string;
    needFinance?: string;
    assignedToName?: string;
    generalNote?: string;
    legacyNotes?: string[];
  };
  status: 'VALID' | 'DUPLICATE_PHONE' | 'INVALID_PHONE' | 'MISSING_DATA';
  issues: string[];
}

export interface ImportSummary {
  totalRows: number;
  createdLeads: number;
  updatedLeads: number;
  duplicateRows: number;
  invalidPhones: number;
  notesMigrated: number;
  manualReviewRequired: number;
  sheetName: string;
  campaignName: string;
  timestamp: string;
}
