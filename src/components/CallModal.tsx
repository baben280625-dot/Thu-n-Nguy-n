import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  PhoneOff,
  PhoneCall,
  Mic,
  MicOff,
  Volume2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { CallOutcome, Lead, User } from '../types';
import { normalizeVietnamesePhone } from '../utils/phone';
import { db } from '../services/db';

interface CallModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead?: Lead | null;
  currentUser: User;
  onCallLogged?: () => void;
}

type CallPhase = 'IDLE' | 'RINGING' | 'CONNECTED' | 'LOG_OUTCOME';

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  lead,
  currentUser,
  onCallLogged,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [callPhase, setCallPhase] = useState<CallPhase>('IDLE');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Outcome logging states
  const [outcome, setOutcome] = useState<CallOutcome>('ANSWERED');
  const [notes, setNotes] = useState('');
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [leadStatusUpdate, setLeadStatusUpdate] = useState<Lead['leadStatus']>('CONNECTED');

  // Pre-call validation
  const phoneValidation = normalizeVietnamesePhone(phoneNumber);
  const isDNC = phoneValidation.normalized ? db.isSuppressed(phoneValidation.normalized) : false;

  useEffect(() => {
    if (lead) {
      setPhoneNumber(lead.phoneRaw || '');
      setCustomerName(lead.fullName || 'Khách hàng');
      setLeadStatusUpdate(lead.leadStatus);
    } else {
      setPhoneNumber('');
      setCustomerName('');
    }
    setCallPhase('IDLE');
    setDuration(0);
    setIsMuted(false);
    setNotes('');
    setCreateFollowUp(false);
  }, [lead, isOpen]);

  // Duration timer when connected
  useEffect(() => {
    let timer: any;
    if (callPhase === 'CONNECTED') {
      timer = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callPhase]);

  if (!isOpen) return null;

  const handleStartCall = () => {
    if (!phoneValidation.canCall || isDNC) return;

    setCallPhase('RINGING');
    // Simulate provider ringing for 3 seconds then connecting
    setTimeout(() => {
      setCallPhase('CONNECTED');
      setDuration(1);
    }, 2800);
  };

  const handleEndCall = () => {
    setCallPhase('LOG_OUTCOME');
  };

  const handleSaveCallOutcome = () => {
    const finalDuration = duration;
    const nowIso = new Date().toISOString();

    // 1. Record CallAttempt
    db.recordCallAttempt({
      leadId: lead?.id || 'lead_ad_hoc',
      leadName: customerName || 'Khách vãng lai',
      leadPhone: phoneValidation.normalized || phoneNumber,
      agentId: currentUser.id,
      agentName: currentUser.fullName,
      providerKey: 'MOCK',
      providerCallId: `mock_${Date.now()}`,
      idempotencyKey: `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: 'COMPLETED',
      result: outcome,
      startedAt: new Date(Date.now() - finalDuration * 1000).toISOString(),
      answeredAt: callPhase !== 'RINGING' ? new Date(Date.now() - finalDuration * 1000).toISOString() : undefined,
      endedAt: nowIso,
      durationSeconds: finalDuration,
      isSimulated: true,
      notes,
    });

    // 2. Add Activity to Lead if lead exists
    if (lead) {
      db.addActivity(
        {
          leadId: lead.id,
          userId: currentUser.id,
          userName: currentUser.fullName,
          channel: 'CALL',
          result: outcome,
          subject: `Cuộc gọi: ${getOutcomeLabel(outcome)} (${formatSeconds(finalDuration)})`,
          body: notes || `Thời lượng: ${formatSeconds(finalDuration)}. Trạng thái: ${getOutcomeLabel(outcome)}`,
          occurredAt: nowIso,
          durationSeconds: finalDuration,
        },
        currentUser
      );

      // If outcome is DO_NOT_CALL, add to suppression list
      if (outcome === 'DO_NOT_CALL') {
        db.addToSuppression(
          lead.phoneNormalized,
          `Khách yêu cầu không liên hệ sau cuộc gọi ngày ${new Date().toLocaleDateString('vi-VN')}`,
          lead.id,
          currentUser
        );
      } else {
        // Update lead status
        db.updateLead(lead.id, { leadStatus: leadStatusUpdate }, currentUser);
      }

      // 3. Create follow-up task if checked
      if (createFollowUp && followUpDate) {
        db.createTask(
          {
            leadId: lead.id,
            title: followUpTitle || `Gọi lại cho ${lead.fullName}`,
            details: notes,
            dueAt: new Date(followUpDate).toISOString(),
            priority: 'HIGH',
            assignedTo: lead.assignedTo || currentUser.id,
          },
          currentUser
        );
      }
    }

    if (onCallLogged) onCallLogged();
    onClose();
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const getOutcomeLabel = (out: CallOutcome) => {
    switch (out) {
      case 'ANSWERED':
        return 'Đã nghe máy';
      case 'NO_ANSWER':
        return 'Không nghe máy';
      case 'BUSY':
        return 'Máy bận';
      case 'WRONG_NUMBER':
        return 'Sai số';
      case 'INTERESTED':
        return 'Khách quan tâm';
      case 'NOT_INTERESTED':
        return 'Khách không quan tâm';
      case 'CALLBACK_REQUESTED':
        return 'Hẹn gọi lại';
      case 'APPOINTMENT_BOOKED':
        return 'Đã đặt lịch hẹn';
      case 'DO_NOT_CALL':
        return 'Yêu cầu không liên hệ (DNC)';
      default:
        return 'Hoàn tất';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm">Hệ Thống Quay Số Auto Call</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mock Notice Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-xs text-amber-800">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <span className="font-semibold">Chế độ mô phỏng</span> — Chưa gọi điện thật. Thiết kế sẵn sàng tích hợp WebRTC / SIP Trunking.
          </div>
        </div>

        {/* Content depending on Phase */}
        <div className="p-6">
          {callPhase === 'IDLE' && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                <div className="text-xs text-slate-500">Khách hàng:</div>
                <div className="font-bold text-slate-900 text-sm">
                  {customerName || 'Nhập số tự do'}
                </div>
                {lead?.interestMessage && (
                  <div className="text-xs text-slate-600 mt-1 line-clamp-2">
                    Nhu cầu: {lead.interestMessage}
                  </div>
                )}
              </div>

              {/* Phone Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại gọi ra:
                </label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Nhập số điện thoại (ví dụ: 0908 123 456)"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-semibold tracking-wide text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
                />

                {/* Validation warnings */}
                {phoneNumber && !phoneValidation.canCall && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{phoneValidation.reason}</span>
                  </div>
                )}

                {/* DNC Warning */}
                {isDNC && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mt-2 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">CẢNH BÁO: Số này thuộc danh sách Không Liên Hệ (DNC)!</span>
                      <p className="mt-0.5 text-red-600">Khách đã yêu cầu từ chối nhận cuộc gọi tiếp thị. Hệ thống chặn quay số theo quy định.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Dial Pad */}
              <div className="grid grid-cols-3 gap-2 py-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => setPhoneNumber((prev) => prev + digit)}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg text-sm font-bold transition-colors"
                  >
                    {digit}
                  </button>
                ))}
              </div>

              {/* Call Trigger Button */}
              <button
                type="button"
                onClick={handleStartCall}
                disabled={!phoneValidation.canCall || isDNC}
                className={`w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-xs transition-all ${
                  !phoneValidation.canCall || isDNC
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>Bắt Đầu Cuộc Gọi Thử Nghiệm</span>
              </button>
            </div>
          )}

          {callPhase === 'RINGING' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center animate-pulse">
                <PhoneCall className="w-10 h-10 animate-bounce" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">{customerName}</h4>
                <p className="text-sm text-slate-500 tabular-nums">{phoneValidation.formatted}</p>
                <p className="text-xs text-emerald-600 font-semibold mt-2">Đang đổ chuông (Simulated)...</p>
              </div>

              <button
                onClick={() => setCallPhase('IDLE')}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                Hủy Cuộc Gọi
              </button>
            </div>
          )}

          {callPhase === 'CONNECTED' && (
            <div className="text-center py-6 space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-600 text-white mx-auto flex items-center justify-center shadow-md">
                <Phone className="w-8 h-8" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">{customerName}</h4>
                <p className="text-xs text-slate-500 tabular-nums">{phoneValidation.formatted}</p>
                <div className="inline-block mt-3 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-mono text-sm font-bold tabular-nums">
                  {formatSeconds(duration)}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3 rounded-full border transition-colors ${
                    isMuted
                      ? 'bg-amber-100 border-amber-300 text-amber-800'
                      : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
                  title={isMuted ? 'Mở mic' : 'Tắt mic'}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>

                <button
                  type="button"
                  onClick={handleEndCall}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>Kết Thúc</span>
                </button>
              </div>
            </div>
          )}

          {callPhase === 'LOG_OUTCOME' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <div className="font-bold text-slate-900 text-sm">Ghi Nhận Kết Quả Cuộc Gọi</div>
                  <div className="text-xs text-slate-500">Thời lượng: {formatSeconds(duration)}</div>
                </div>
                <div className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded">
                  Cuộc gọi hoàn tất
                </div>
              </div>

              {/* Outcome Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kết quả cuộc gọi:
                </label>
                <select
                  value={outcome}
                  onChange={(e) => {
                    const val = e.target.value as CallOutcome;
                    setOutcome(val);
                    if (val === 'INTERESTED' || val === 'APPOINTMENT_BOOKED') {
                      setLeadStatusUpdate('POTENTIAL');
                      setCreateFollowUp(true);
                    } else if (val === 'CALLBACK_REQUESTED') {
                      setCreateFollowUp(true);
                    } else if (val === 'DO_NOT_CALL') {
                      setLeadStatusUpdate('DO_NOT_CONTACT');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ANSWERED">Đã nghe máy</option>
                  <option value="INTERESTED">Khách quan tâm (Tiềm năng)</option>
                  <option value="APPOINTMENT_BOOKED">Đã đặt lịch hẹn xem đất</option>
                  <option value="CALLBACK_REQUESTED">Hẹn gọi lại sau</option>
                  <option value="NO_ANSWER">Không nghe máy</option>
                  <option value="BUSY">Máy bận</option>
                  <option value="WRONG_NUMBER">Sai số</option>
                  <option value="NOT_INTERESTED">Khách không quan tâm</option>
                  <option value="DO_NOT_CALL">Khách yêu cầu không liên hệ (DNC)</option>
                </select>
              </div>

              {/* Update Lead Status */}
              {lead && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cập nhật trạng thái khách hàng:
                  </label>
                  <select
                    value={leadStatusUpdate}
                    onChange={(e) => setLeadStatusUpdate(e.target.value as Lead['leadStatus'])}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="NEW">Khách mới</option>
                    <option value="CONTACTING">Đang liên hệ</option>
                    <option value="CONNECTED">Đã kết nối</option>
                    <option value="POTENTIAL">Khách tiềm năng</option>
                    <option value="APPOINTMENT_SET">Đã đặt lịch hẹn</option>
                    <option value="SITE_VISIT">Đã đi xem bất động sản</option>
                    <option value="NEGOTIATING">Đang thương lượng</option>
                    <option value="DEAL_CLOSED">Đã giao dịch</option>
                    <option value="NO_DEMAND">Không còn nhu cầu</option>
                    <option value="DO_NOT_CONTACT">Không liên hệ</option>
                  </select>
                </div>
              )}

              {/* Call Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú nội dung trao đổi:
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi nhận thông tin nhu cầu, tài chính, sản phẩm đất Củ Chi..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Follow-up task option */}
              {lead && (
                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      checked={createFollowUp}
                      onChange={(e) => setCreateFollowUp(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Tạo lịch gọi lại / hẹn xem đất tiếp theo</span>
                  </label>

                  {createFollowUp && (
                    <div className="mt-2 space-y-2 pl-5">
                      <input
                        type="text"
                        value={followUpTitle}
                        onChange={(e) => setFollowUpTitle(e.target.value)}
                        placeholder="Nội dung lịch hẹn (VD: Gọi lại chốt lịch xem đất Nhuận Đức)"
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-900"
                      />
                      <input
                        type="datetime-local"
                        value={followUpDate}
                        onChange={(e) => setFollowUpDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs text-slate-900"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSaveCallOutcome}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                Lưu Kết Quả & Hoàn Tất
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
