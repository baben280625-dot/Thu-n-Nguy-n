/**
 * RealCore Auto Call CRM - Excel Import & Deduplication Engine
 * Handles DATA CHIẾN DỊCH (1).xlsx with 5 campaign sheets,
 * flexible column mappings, L1-L8 note migrations, and dry-run validation.
 */

import * as XLSX from 'xlsx';
import { ExcelImportPreviewRow, ImportSummary, Lead, User } from '../types';
import { normalizeVietnamesePhone } from '../utils/phone';
import { db } from './db';

import importedSheetData from '../data/importedGoogleSheetData.json';

// Built-in authentic dataset from Google Sheet & DATA CHIẾN DỊCH (1).xlsx
export const PRESET_CAMPAIGN_SHEETS: Record<string, { campaignId: string; data: Record<string, any>[] }> = {
  'Chiến Dịch Lô Góc 258m2 & 200m2': {
    campaignId: 'camp_logoc_258_200',
    data: importedSheetData.map((item) => {
      const row: Record<string, any> = {
        'Tên Khách Hàng': item.name,
        'Số Điện Thoại': item.phone,
        'Địa Chỉ': item.address,
        'Thông Điệp': item.message,
        'Nhu Cầu': item.need,
        'Note': item.note,
        'Ngày': item.date,
        'Nhân Viên ': item.staff,
      };
      item.legacyNotes.forEach((n, idx) => {
        row[`Ghi chú ( L${idx + 1} )`] = n;
      });
      return row;
    }),
  },
  'Chiến Dịch Đất Củ Chi 58': {
    campaignId: 'camp_cuchi_58',
    data: [
      {
        '//': 'Trần Quốc Bảo',
        'Số điện thoại': '0903112233',
        'Địa chỉ': 'Q. Phú Nhuận',
        'Thông điệp': 'Đất Củ Chi 500m2 gần Tỉnh Lộ 15',
        'Tài chính': '1.5 tỷ',
        'Nhân viên': 'Trần Thị Mai',
        'Ghi chú (L1)': 'Khách nghe máy, hẹn chủ nhật 9h sáng xem đất',
        'Ghi chú (L2)': 'Đã gọi nhắc hẹn, khách bảo đi cùng con trai',
      },
      {
        '//': 'Lâm Thanh Phong',
        'Số điện thoại': '+84918445566',
        'Địa chỉ': 'Q. Gò Vấp',
        'Thông điệp': 'Lô thổ cư An Nhơn Tây 150m2',
        'Tài chính': '1.2 tỷ',
        'Nhân viên': 'Lê Hoàng Long',
        'Ghi chú (L1)': 'Khách hỏi pháp lý có dính quy hoạch cây xanh không',
        'Ghi chú (L2)': 'Đã kiểm tra quy hoạch, đất ở nông thôn hiện hữu, gửi quy hoạch cho khách',
        'Ghi chú (L3)': 'Khách ưng vị trí, đợi thu xếp tiền',
      },
      {
        '//': 'Hoàng Minh Trí', // Intentionally matching existing lead_1 to test merge deduplication!
        'Số điện thoại': '0908123456',
        'Địa chỉ': 'Q. Tân Bình',
        'Thông điệp': 'Quan tâm thêm lô đất vườn 2000m2',
        'Tài chính': '2.5 tỷ',
        'Nhân viên': 'Trần Thị Mai',
        'Ghi chú (L1)': 'Khách quen, gọi hỏi lô mới về',
      },
      {
        '//': 'Nguyễn Văn Đạt',
        'Số điện thoại': '0937 889 900',
        'Địa chỉ': 'Hóc Môn',
        'Thông điệp': 'Đất sào xã Tân An Hội',
        'Tài chính': '3 tỷ',
        'Nhân viên': 'Phạm Quốc Tuấn',
        'Ghi chú (L1)': 'Gọi máy bận 2 lần',
      },
      {
        '//': 'Chị Lan Zalo',
        'Số điện thoại': 'Zalo không có sđt',
        'Địa chỉ': 'Củ Chi',
        'Thông điệp': 'Hỏi nhà cấp 4',
        'Tài chính': '800 tr',
        'Ghi chú (L1)': 'Chỉ nhắn tin trên Zalo',
      },
    ],
  },
  'Chiến Dịch Nhà Đất Củ Chi 2008': {
    campaignId: 'camp_cuchi_2008',
    data: [
      {
        'Tên khách hàng': 'Đặng Hữu Thành',
        'SĐT': '0983 556 778',
        'Địa chỉ': 'Q. 10, TP.HCM',
        'Nhu cầu': 'Nhà đất thổ cư Củ Chi xây xưởng nhỏ',
        'Ngân sách': '4 - 5 tỷ',
        'Ghi chú L1': 'Khách cần đường xe tải 5 tấn vào được',
        'Ghi chú L2': 'Đã gửi 2 căn xưởng Bình Mỹ',
      },
      {
        'Tên khách hàng': 'Võ Thị Thu Hà',
        'SĐT': '0909 667 889',
        'Địa chỉ': 'Q. 3, TP.HCM',
        'Nhu cầu': 'Đất vườn nghỉ dưỡng ven sông Rạch Tra',
        'Ngân sách': '2.8 tỷ',
        'Ghi chú L1': 'Khách quan tâm có bờ kè chưa',
      },
    ],
  },
  'Chiến Dịch 0909 & 1109': {
    campaignId: 'camp_0909_1109',
    data: [
      {
        'Khách Hàng': 'Bùi Đức Trọng',
        'Điện Thoại': '0972 114 433',
        'Khu Vực': 'Tân Thạnh Đông',
        'Nhu Cầu': 'Đất thổ cư mặt tiền',
        'Tài Chính': '1.8 tỷ',
        'Ghi chú': 'Hỏi tiến độ dự án đường Vành Đai 3',
      },
    ],
  },
  'Chiến Dịch 2509 & 2909': {
    campaignId: 'camp_2509_2909',
    data: [
      {
        'Tên': 'Ngô Kim Ngân',
        'Số ĐT': '0919 778 899',
        'Địa chỉ': 'Q. Tân Phú',
        'Quan tâm': 'Đất sào xã Nhuận Đức làm trang trại bưởi',
        'Tài chính': '2 tỷ',
        'Ghi chú L1': 'Hỏi nguồn nước ngầm có nhiễm phèn không',
      },
    ],
  },
  'Chiến Dịch 0910 & 1210': {
    campaignId: 'camp_0910_1210',
    data: [
      {
        'Họ và Tên': 'Trịnh Thế Hùng',
        'Số Phone': '0901 889 911',
        'Địa Chỉ': 'Bình Dương',
        'Sản Phẩm': 'Đất vườn Trung Lập Hạ',
        'Ngân Sách': '1.3 tỷ',
        'Ghi chú': 'Khách muốn công chứng sang tên ngay trong tuần',
      },
    ],
  },
};

export interface ColumnMapping {
  fullNameCol: string;
  phoneCol: string;
  addressCol?: string;
  interestCol?: string;
  financeCol?: string;
  assignedCol?: string;
  generalNoteCol?: string;
  legacyNoteCols: string[]; // Ghi chú (L1), L2, L3, ...
}

export function autoDetectMapping(columns: string[]): ColumnMapping {
  let fullNameCol = '';
  let phoneCol = '';
  let addressCol = '';
  let interestCol = '';
  let financeCol = '';
  let assignedCol = '';
  let generalNoteCol = '';
  const legacyNoteCols: string[] = [];

  columns.forEach((col) => {
    const lower = col.toLowerCase().trim();

    // Name detection (includes '//' header from user's Excel)
    if (
      lower === '//' ||
      lower.includes('tên') ||
      lower.includes('họ tên') ||
      lower.includes('khách hàng') ||
      lower === 'họ và tên'
    ) {
      if (!fullNameCol) fullNameCol = col;
    }
    // Phone detection
    else if (
      lower.includes('thoại') ||
      lower.includes('sđt') ||
      lower.includes('sdt') ||
      lower.includes('phone') ||
      lower.includes('tel') ||
      lower.includes('mobile')
    ) {
      if (!phoneCol) phoneCol = col;
    }
    // Address detection
    else if (lower.includes('địa chỉ') || lower.includes('dia chi') || lower.includes('khu vực')) {
      if (!addressCol) addressCol = col;
    }
    // Interest / Message
    else if (
      lower.includes('thông điệp') ||
      lower.includes('nhu cầu') ||
      lower.includes('quan tâm') ||
      lower.includes('sản phẩm')
    ) {
      if (!interestCol) interestCol = col;
    }
    // Finance / Budget
    else if (
      lower.includes('tài chính') ||
      lower.includes('tai chinh') ||
      lower.includes('ngân sách') ||
      lower.includes('giá')
    ) {
      if (!financeCol) financeCol = col;
    }
    // Staff / Agent
    else if (lower.includes('nhân viên') || lower.includes('nv') || lower.includes('phụ trách')) {
      if (!assignedCol) assignedCol = col;
    }
    // L1 to L8 legacy notes
    else if (lower.includes('l1') || lower.includes('l2') || lower.includes('l3') || lower.includes('l4') ||
             lower.includes('l5') || lower.includes('l6') || lower.includes('l7') || lower.includes('l8')) {
      legacyNoteCols.push(col);
    }
    // General Note
    else if (lower.includes('note') || lower.includes('ghi chú') || lower.includes('ghi chu')) {
      if (!generalNoteCol) generalNoteCol = col;
    }
  });

  return {
    fullNameCol: fullNameCol || columns[0] || '',
    phoneCol: phoneCol || columns[1] || '',
    addressCol,
    interestCol,
    financeCol,
    assignedCol,
    generalNoteCol,
    legacyNoteCols: legacyNoteCols.sort(),
  };
}

export function parseExcelWorkbook(fileBuffer: ArrayBuffer): {
  sheetNames: string[];
  sheets: Record<string, Record<string, any>[]>;
} {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const sheetNames = workbook.SheetNames;
  const sheets: Record<string, Record<string, any>[]> = {};

  sheetNames.forEach((name) => {
    const worksheet = workbook.Sheets[name];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    sheets[name] = jsonData;
  });

  return { sheetNames, sheets };
}

/**
 * Dry-run inspection before committing import:
 * Validates phone numbers, identifies duplicates, calculates potential merges.
 */
export function dryRunImport(
  rawRows: Record<string, any>[],
  mapping: ColumnMapping,
  existingLeads: Lead[]
): {
  previewRows: ExcelImportPreviewRow[];
  stats: {
    total: number;
    willCreate: number;
    willMergeDuplicate: number;
    invalidPhone: number;
    notesToMigrate: number;
  };
} {
  const existingPhones = new Set(existingLeads.map((l) => l.phoneNormalized).filter(Boolean));
  const seenInFile = new Set<string>();

  let willCreate = 0;
  let willMergeDuplicate = 0;
  let invalidPhone = 0;
  let notesToMigrate = 0;

  const previewRows: ExcelImportPreviewRow[] = rawRows.map((row, idx) => {
    const rawName = row[mapping.fullNameCol];
    const rawPhone = row[mapping.phoneCol];
    const phoneCheck = normalizeVietnamesePhone(rawPhone);

    const issues: string[] = [];
    let status: ExcelImportPreviewRow['status'] = 'VALID';

    // Extract L1-L8 notes
    const legacyNotes: string[] = [];
    mapping.legacyNoteCols.forEach((colName) => {
      const val = row[colName];
      if (val && String(val).trim()) {
        legacyNotes.push(`${colName}: ${String(val).trim()}`);
      }
    });
    if (mapping.generalNoteCol && row[mapping.generalNoteCol]) {
      legacyNotes.push(`Ghi chú: ${String(row[mapping.generalNoteCol]).trim()}`);
    }
    notesToMigrate += legacyNotes.length;

    if (!phoneCheck.isValid) {
      status = 'INVALID_PHONE';
      issues.push(phoneCheck.reason || 'Số điện thoại không đúng chuẩn 10 chữ số');
      invalidPhone++;
    } else if (existingPhones.has(phoneCheck.normalized) || seenInFile.has(phoneCheck.normalized)) {
      status = 'DUPLICATE_PHONE';
      issues.push(`Trùng SĐT ${phoneCheck.formatted} - Sẽ gộp chiến dịch vào hồ sơ hiện có, không nhân bản.`);
      willMergeDuplicate++;
    } else {
      willCreate++;
    }

    if (phoneCheck.normalized) {
      seenInFile.add(phoneCheck.normalized);
    }

    return {
      rowNumber: idx + 1,
      raw: row,
      mapped: {
        fullName: rawName ? String(rawName).trim() : 'Khách chưa rõ tên',
        phoneRaw: String(rawPhone || ''),
        phoneNormalized: phoneCheck.normalized,
        addressText: mapping.addressCol ? String(row[mapping.addressCol] || '').trim() : undefined,
        interestMessage: mapping.interestCol ? String(row[mapping.interestCol] || '').trim() : undefined,
        needFinance: mapping.financeCol ? String(row[mapping.financeCol] || '').trim() : undefined,
        assignedToName: mapping.assignedCol ? String(row[mapping.assignedCol] || '').trim() : undefined,
        legacyNotes,
      },
      status,
      issues,
    };
  });

  return {
    previewRows,
    stats: {
      total: rawRows.length,
      willCreate,
      willMergeDuplicate,
      invalidPhone,
      notesToMigrate,
    },
  };
}

/**
 * Execute actual commit of rows into Database
 */
export function executeImport(
  previewRows: ExcelImportPreviewRow[],
  campaignId: string,
  actor: User
): ImportSummary {
  const campaign = db.getCampaignById(campaignId);
  const campaignName = campaign ? campaign.name : 'Chiến Dịch';

  let createdLeads = 0;
  let updatedLeads = 0;
  let duplicateRows = 0;
  let invalidPhones = 0;
  let notesMigrated = 0;
  let manualReviewRequired = 0;

  previewRows.forEach((row) => {
    const { mapped, status } = row;

    if (status === 'INVALID_PHONE') {
      invalidPhones++;
      manualReviewRequired++;
    }

    // Try finding matching agent
    let targetAgentId: string | undefined;
    if (mapped.assignedToName) {
      const match = db.getUsers().find(
        (u) => u.fullName.toLowerCase().includes(mapped.assignedToName!.toLowerCase())
      );
      if (match) targetAgentId = match.id;
    }

    const result = db.createLead(
      {
        fullName: mapped.fullName || 'Khách hàng',
        phoneRaw: mapped.phoneRaw || '',
        addressText: mapped.addressText,
        interestMessage: mapped.interestMessage,
        needFinance: mapped.needFinance,
        assignedTo: targetAgentId,
        campaignId,
      },
      actor
    );

    if (result.isMerged) {
      updatedLeads++;
      duplicateRows++;
    } else {
      createdLeads++;
    }

    // Add legacy notes (L1-L8) as individual activities preserving order and original content
    if (mapped.legacyNotes && mapped.legacyNotes.length > 0) {
      mapped.legacyNotes.forEach((noteText) => {
        db.addActivity(
          {
            leadId: result.lead.id,
            userId: actor.id,
            userName: actor.fullName,
            channel: 'NOTE',
            subject: 'Ghi chú lịch sử nhập từ Excel',
            body: noteText,
            isLegacyImport: true,
          },
          actor
        );
        notesMigrated++;
      });
    }
  });

  const summary: ImportSummary = {
    totalRows: previewRows.length,
    createdLeads,
    updatedLeads,
    duplicateRows,
    invalidPhones,
    notesMigrated,
    manualReviewRequired,
    sheetName: campaignName,
    campaignName,
    timestamp: new Date().toISOString(),
  };

  db.logAudit({
    actorUserId: actor.id,
    actorUserName: actor.fullName,
    action: 'NHẬP DỮ LIỆU EXCEL CHIẾN DỊCH',
    entityType: 'CAMPAIGN',
    entityId: campaignId,
    entityName: campaignName,
    afterData: summary,
  });

  return summary;
}
