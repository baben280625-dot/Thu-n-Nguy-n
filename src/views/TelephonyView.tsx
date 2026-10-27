import React, { useState } from 'react';
import {
  PhoneCall,
  Phone,
  Clock,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Info,
  Server,
  Zap,
  Radio,
  Headphones,
} from 'lucide-react';
import { Lead, User } from '../types';
import { formatDateTimeVN, normalizeVietnamesePhone } from '../utils/phone';
import { db } from '../services/db';

interface TelephonyViewProps {
  currentUser: User;
  onOpenCallModal: (lead?: Lead) => void;
}

export const TelephonyView: React.FC<TelephonyViewProps> = ({
  currentUser,
  onOpenCallModal,
}) => {
  const [customPhone, setCustomPhone] = useState('');
  const leads = db.getLeads(currentUser);
  const callAttempts = db.getCallAttempts(20);

  // Queue of uncontacted leads
  const uncontactedQueue = leads.filter(
    (l) => (!l.lastContactAt || l.leadStatus === 'UNCONTACTED' || l.leadStatus === 'NEW') && !l.doNotContact
  );

  const nextLeadInQueue = uncontactedQueue[0];

  const handleDialCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPhone.trim()) return;
    const tempLead: Partial<Lead> = {
      id: 'custom_dial',
      fullName: 'Khách quay số trực tiếp',
      phoneRaw: customPhone.trim(),
      leadStatus: 'NEW',
    };
    onOpenCallModal(tempLead as Lead);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Disclaimer / Mock Mode Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-amber-900 text-sm">
            CHẾ ĐỘ MÔ PHỎNG (MOCK MODE) — CHƯA GỌI ĐIỆN THẬT
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            Hệ thống đang hoạt động với <code>MockTelephonyProvider</code> để kiểm thử toàn bộ luồng quay số, đổ chuông, bấm giờ, chống spam trùng cuộc gọi và ghi nhận kết quả chăm sóc. Không phát sinh cước viễn thông và không gọi đến số điện thoại thật của khách hàng.
          </p>
        </div>
      </div>

      {/* Main Grid: Auto Call Queue & Dial Pad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Lead in Queue (Auto dialer assist) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Hàng Đợi Khách Cần Gọi Tiếp Theo</h3>
              <p className="text-xs text-slate-500">
                Còn <strong className="text-emerald-700">{uncontactedQueue.length}</strong> khách hàng chưa liên hệ trong danh sách của bạn
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 text-xs font-bold tabular-nums">
              Auto Call Assistant
            </span>
          </div>

          {nextLeadInQueue ? (
            <div className="p-5 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono font-bold text-emerald-800 uppercase">
                    {nextLeadInQueue.code}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-0.5">
                    {nextLeadInQueue.fullName}
                  </h4>
                  <div className="text-sm font-bold text-emerald-700 mt-1 tabular-nums">
                    {normalizeVietnamesePhone(nextLeadInQueue.phoneRaw).formatted}
                  </div>
                </div>

                <button
                  onClick={() => onOpenCallModal(nextLeadInQueue)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-transform"
                >
                  <Phone className="w-4 h-4" />
                  <span>Quay Số Khách Này</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-emerald-100">
                <div>
                  <span className="text-slate-400">Nhu cầu / Sản phẩm:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {nextLeadInQueue.interestMessage || 'Chưa có thông tin'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Ngân sách dự kiến:</span>
                  <div className="font-semibold text-emerald-700 mt-0.5">
                    {nextLeadInQueue.needFinance || 'Chưa xác định'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Khu vực:</span>
                  <div className="text-slate-700 mt-0.5">{nextLeadInQueue.addressText || '—'}</div>
                </div>
                <div>
                  <span className="text-slate-400">Chiến dịch nguồn:</span>
                  <div className="text-slate-700 mt-0.5">
                    {nextLeadInQueue.firstSourceCampaignName || '—'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-xs">
              Tuyệt vời! Bạn đã liên hệ hết tất cả khách hàng trong danh sách hàng đợi hiện tại.
            </div>
          )}

          {/* Next 3 leads preview */}
          {uncontactedQueue.length > 1 && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-700">Khách tiếp theo trong hàng đợi:</div>
              <div className="space-y-1.5">
                {uncontactedQueue.slice(1, 4).map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[11px] text-slate-600">
                        {idx + 2}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">{item.fullName}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[250px]">
                          {item.interestMessage || 'Chưa có nhu cầu'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => onOpenCallModal(item)}
                      className="px-3 py-1 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 rounded text-xs font-semibold"
                    >
                      Gọi
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Direct Dial Pad */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">
              Bàn Phím Quay Số Thủ Công
            </h3>

            <form onSubmit={handleDialCustom} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhập số điện thoại:
                </label>
                <input
                  type="text"
                  value={customPhone}
                  onChange={(e) => setCustomPhone(e.target.value)}
                  placeholder="090x xxx xxx"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 tracking-wider tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Number pad */}
              <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => setCustomPhone((prev) => prev + digit)}
                    className="py-2.5 bg-slate-50 hover:bg-slate-200 active:bg-slate-300 text-slate-800 rounded-lg text-sm font-bold transition-colors"
                  >
                    {digit}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!customPhone.trim()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>Gọi Số Này (Mô phỏng)</span>
              </button>
            </form>
          </div>

          {/* VoIP Provider Integration Guide Checklist */}
          <div className="pt-3 border-t border-slate-100 text-xs space-y-2">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kiến Trúc Tích Hợp Tổng Đài Thật</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Khi chọn được nhà mạng (Stringee, Viettel VoIP, VHT hoặc FPT Oncall), chỉ cần truyền API Key & SIP Trunk vào <code>TelephonyProvider</code>. Giao diện và luồng xử lý tự động đồng bộ 100%.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Call Attempts Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">
          Nhật Ký Các Cuộc Gọi Thử Nghiệm Gần Đây
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3 font-semibold">Thời Gian</th>
                <th className="p-3 font-semibold">Khách Hàng</th>
                <th className="p-3 font-semibold">Số Điện Thoại</th>
                <th className="p-3 font-semibold">Thời Lượng</th>
                <th className="p-3 font-semibold">Kết Quả</th>
                <th className="p-3 font-semibold">Nhân Viên Gọi</th>
                <th className="p-3 font-semibold">Chế Độ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {callAttempts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Chưa có cuộc gọi thử nghiệm nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                callAttempts.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50">
                    <td className="p-3 tabular-nums text-slate-500">
                      {formatDateTimeVN(call.startedAt)}
                    </td>
                    <td className="p-3 font-bold text-slate-900">{call.leadName}</td>
                    <td className="p-3 tabular-nums font-semibold text-slate-700">
                      {call.leadPhone}
                    </td>
                    <td className="p-3 tabular-nums font-mono text-emerald-700 font-bold">
                      {call.durationSeconds} giây
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800">
                        {call.result || 'Đã kết nối'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{call.agentName}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 font-medium">
                        Mô phỏng (Mock)
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
