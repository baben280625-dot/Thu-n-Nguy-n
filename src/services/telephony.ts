/**
 * RealCore Auto Call CRM - Telephony Integration Layer
 * 
 * DESIGN PRINCIPLE: Provider-agnostic abstraction.
 * Currently runs MockTelephonyProvider for safe simulation and testing.
 * Ready for drop-in real provider adapters (Stringee, Viettel SIP, VHT, FPT Oncall).
 */

import { CallAttempt, CallOutcome } from '../types';
import { normalizeVietnamesePhone } from '../utils/phone';

export interface OutboundCallOptions {
  leadId: string;
  leadName: string;
  phone: string;
  agentId: string;
  agentName: string;
  campaignId?: string;
}

export interface CallProviderResponse {
  success: boolean;
  providerCallId?: string;
  idempotencyKey: string;
  status: 'INITIATED' | 'FAILED';
  errorMessage?: string;
  isSimulated: boolean;
}

export interface TelephonyProvider {
  name: string;
  providerKey: 'MOCK' | 'VIETTEL_VOIP' | 'STRINGEE' | 'VHT' | 'FPT';
  isSimulated: boolean;
  startOutboundCall(options: OutboundCallOptions): Promise<CallProviderResponse>;
  getCallStatus(providerCallId: string): Promise<string>;
  endCall(providerCallId: string): Promise<{ success: boolean; durationSeconds: number }>;
  getProviderCapabilities(): {
    supportsWebRTC: boolean;
    supportsRecording: boolean;
    supportsTransfer: boolean;
    requiresCallerIdWhitelist: boolean;
  };
}

/**
 * Mock Telephony Provider
 * Specifically built to simulate real estate agent outbound calling workflows.
 * Explicitly labeled as simulated mode.
 */
export class MockTelephonyProvider implements TelephonyProvider {
  name = 'RealCore Mock WebRTC Provider (Mô phỏng nội bộ)';
  providerKey = 'MOCK' as const;
  isSimulated = true;

  getProviderCapabilities() {
    return {
      supportsWebRTC: true,
      supportsRecording: false, // Tuân thủ: ghi âm chỉ bật khi xác nhận pháp lý & có nhà cung cấp thật
      supportsTransfer: false,
      requiresCallerIdWhitelist: false,
    };
  }

  async startOutboundCall(options: OutboundCallOptions): Promise<CallProviderResponse> {
    const phoneCheck = normalizeVietnamesePhone(options.phone);
    const idempotencyKey = `call_${options.leadId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (!phoneCheck.canCall) {
      return {
        success: false,
        idempotencyKey,
        status: 'FAILED',
        errorMessage: `Số điện thoại không hợp lệ để gọi (${phoneCheck.reason || 'sai định dạng'}).`,
        isSimulated: true,
      };
    }

    // Generate unique mock provider call ID
    const providerCallId = `mock_call_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

    return {
      success: true,
      providerCallId,
      idempotencyKey,
      status: 'INITIATED',
      isSimulated: true,
    };
  }

  async getCallStatus(providerCallId: string): Promise<string> {
    return `STATUS_MOCK_ACTIVE_${providerCallId}`;
  }

  async endCall(providerCallId: string): Promise<{ success: boolean; durationSeconds: number }> {
    return {
      success: true,
      durationSeconds: 15,
    };
  }
}

// Default telephony service instance
export const telephonyService: TelephonyProvider = new MockTelephonyProvider();
