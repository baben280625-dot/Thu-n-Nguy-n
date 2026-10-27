/**
 * RealCore Auto Call CRM - Phone Normalization & Validation Utility
 * Complies with Vietnamese Telecommunications Standards & CRM deduplication specs
 */

export interface PhoneValidationResult {
  raw: string;
  normalized: string;
  isValid: boolean;
  canCall: boolean;
  formatted: string;
  carrier?: string;
  reason?: string;
}

/**
 * Standardize phone input according to Vietnamese numbering plan:
 * Removes non-numeric noise, converts +84 / 84 to leading 0, validates prefixes.
 */
export function normalizeVietnamesePhone(input: string | number | undefined | null): PhoneValidationResult {
  if (input === undefined || input === null) {
    return {
      raw: '',
      normalized: '',
      isValid: false,
      canCall: false,
      formatted: 'Chưa có SĐT',
      reason: 'Số điện thoại rỗng'
    };
  }

  const rawStr = String(input).trim();
  if (!rawStr) {
    return {
      raw: '',
      normalized: '',
      isValid: false,
      canCall: false,
      formatted: 'Chưa có SĐT',
      reason: 'Số điện thoại rỗng'
    };
  }

  // Reject explicit text entries common in raw real estate Excel (e.g. "Zalo", "Không có", "Chưa liên lạc")
  const lower = rawStr.toLowerCase();
  if (
    lower.includes('zalo') ||
    lower.includes('chua') ||
    lower.includes('không') ||
    lower.includes('khong') ||
    lower.includes('fb') ||
    lower.includes('none') ||
    lower.includes('null')
  ) {
    return {
      raw: rawStr,
      normalized: '',
      isValid: false,
      canCall: false,
      formatted: rawStr,
      reason: 'Dữ liệu văn bản, không phải số điện thoại'
    };
  }

  // Extract only digits, preserve possible leading '+'
  let cleaned = rawStr.replace(/[^\d+]/g, '');

  // Handle +84 prefix
  if (cleaned.startsWith('+84')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('84') && cleaned.length >= 11) {
    cleaned = '0' + cleaned.slice(2);
  }

  // Ensure digits only
  let digitsOnly = cleaned.replace(/\D/g, '');

  // Handle case where Excel drops leading zero for 9-digit mobile numbers (e.g. 789533561 -> 0789533561)
  if (digitsOnly.length === 9 && /^[35789]/.test(digitsOnly)) {
    digitsOnly = '0' + digitsOnly;
  }

  // Check valid Vietnamese mobile prefix:
  // Viettel: 086, 096, 097, 098, 032, 033, 034, 035, 036, 037, 038, 039
  // Mobifone: 089, 090, 093, 070, 079, 077, 076, 078
  // Vinaphone: 088, 091, 094, 083, 084, 085, 081, 082
  // Vietnamobile: 092, 056, 058
  // Gmobile: 099, 059
  // Itelecom: 087
  // Wintel: 055
  const vnMobilePattern = /^0(3|5|7|8|9)[0-9]{8}$/;

  const isValid = vnMobilePattern.test(digitsOnly);

  let carrier: string | undefined;
  if (isValid) {
    const prefix3 = digitsOnly.slice(0, 3);
    if (['086', '096', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039'].includes(prefix3)) {
      carrier = 'Viettel';
    } else if (['089', '090', '093', '070', '079', '077', '076', '078'].includes(prefix3)) {
      carrier = 'MobiFone';
    } else if (['088', '091', '094', '083', '084', '085', '081', '082'].includes(prefix3)) {
      carrier = 'VinaPhone';
    } else if (['092', '056', '058'].includes(prefix3)) {
      carrier = 'Vietnamobile';
    } else if (['099', '059'].includes(prefix3)) {
      carrier = 'Gmobile';
    } else if (['087'].includes(prefix3)) {
      carrier = 'Itelecom';
    } else if (['055'].includes(prefix3)) {
      carrier = 'Wintel';
    } else {
      carrier = 'Nhà mạng VN';
    }
  }

  // Format phone for readable UI display: 0901 234 567
  let formatted = digitsOnly;
  if (digitsOnly.length === 10) {
    formatted = `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 7)} ${digitsOnly.slice(7)}`;
  }

  return {
    raw: rawStr,
    normalized: isValid ? digitsOnly : (digitsOnly.length >= 7 ? digitsOnly : ''),
    isValid,
    canCall: isValid,
    formatted: formatted || rawStr,
    carrier,
    reason: isValid ? undefined : `Định dạng không hợp lệ (${digitsOnly.length} chữ số)`
  };
}

/**
 * Format currency to Vietnamese Đồng
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format Date to Vietnamese display: DD/MM/YYYY HH:mm
 */
export function formatDateTimeVN(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

/**
 * Format Date only: DD/MM/YYYY
 */
export function formatDateVN(isoString?: string | null): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return isoString;
  }
}
