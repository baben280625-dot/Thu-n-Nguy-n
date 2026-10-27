import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, User as UserIcon } from 'lucide-react';
import { Campaign, Lead, User } from '../types';
import { normalizeVietnamesePhone } from '../utils/phone';
import { db } from '../services/db';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadToEdit?: Lead | null;
  currentUser: User;
  onSuccess: () => void;
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  leadToEdit,
  currentUser,
  onSuccess,
}) => {
  const [fullName, setFullName] = useState('');
  const [phoneRaw, setPhoneRaw] = useState('');
  const [addressText, setAddressText] = useState('');
  const [interestMessage, setInterestMessage] = useState('');
  const [needFinance, setNeedFinance] = useState('');
  const [generalNote, setGeneralNote] = useState('');
  const [leadStatus, setLeadStatus] = useState<Lead['leadStatus']>('NEW');
  const [assignedTo, setAssignedTo] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const users = db.getUsers();
  const campaigns = db.getCampaigns();
  const phoneValidation = normalizeVietnamesePhone(phoneRaw);
  const existingDuplicate = phoneValidation.normalized
    ? db.findLeadByNormalizedPhone(phoneValidation.normalized)
    : undefined;

  useEffect(() => {
    if (leadToEdit) {
      setFullName(leadToEdit.fullName);
      setPhoneRaw(leadToEdit.phoneRaw);
      setAddressText(leadToEdit.addressText || '');
      setInterestMessage(leadToEdit.interestMessage || '');
      setNeedFinance(leadToEdit.needFinance || '');
      setGeneralNote(leadToEdit.generalNote || '');
      setLeadStatus(leadToEdit.leadStatus);
      setAssignedTo(leadToEdit.assignedTo || '');
      setCampaignId(leadToEdit.firstSourceCampaignId || '');
    } else {
      setFullName('');
      setPhoneRaw('');
      setAddressText('');
      setInterestMessage('');
      setNeedFinance('');
      setGeneralNote('');
      setLeadStatus('NEW');
      setAssignedTo(currentUser.role === 'AGENT' ? currentUser.id : '');
      setCampaignId(campaigns[0]?.id || '');
    }
    setErrorMsg('');
  }, [leadToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập họ tên khách hàng');
      return;
    }

    if (!phoneRaw.trim()) {
      setErrorMsg('Vui lòng nhập số điện thoại');
      return;
    }

    try {
      if (leadToEdit) {
        db.updateLead(
          leadToEdit.id,
          {
            fullName: fullName.trim(),
            phoneRaw: phoneRaw.trim(),
            addressText: addressText.trim(),
            interestMessage: interestMessage.trim(),
            needFinance: needFinance.trim(),
            generalNote: generalNote.trim(),
            leadStatus,
            assignedTo: assignedTo || undefined,
          },
          currentUser
        );
      } else {
        const res = db.createLead(
          {
            fullName: fullName.trim(),
            phoneRaw: phoneRaw.trim(),
            addressText: addressText.trim(),
            interestMessage: interestMessage.trim(),
            needFinance: needFinance.trim(),
            generalNote: generalNote.trim(),
            leadStatus,
            assignedTo: assignedTo || undefined,
            campaignId: campaignId || undefined,
          },
          currentUser
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu thông tin khách hàng');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-slate-900 text-sm">
            {leadToEdit ? 'Chỉnh Sửa Hồ Sơ Khách Hàng' : 'Thêm Mới Khách Hàng Tiềm Năng'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Duplicate phone warning indicator */}
          {!leadToEdit && existingDuplicate && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <span className="font-bold">Quy tắc chống trùng:</span> Số điện thoại này đã thuộc về khách{' '}
              <strong>{existingDuplicate.fullName}</strong> ({existingDuplicate.code}). Nếu lưu, hệ thống sẽ tự động gộp chiến dịch vào hồ sơ cũ, không tạo trùng!
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Họ và tên khách hàng *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ví dụ: Trần Quốc Bảo"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số điện thoại *
              </label>
              <input
                type="text"
                required
                value={phoneRaw}
                onChange={(e) => setPhoneRaw(e.target.value)}
                placeholder="Ví dụ: 0908 123 456"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
              />
              {phoneRaw && (
                <div className="text-[11px] mt-1 text-slate-500">
                  Chuẩn hóa: {phoneValidation.formatted} ({phoneValidation.isValid ? 'Hợp lệ' : phoneValidation.reason})
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Địa chỉ / Khu vực sinh sống
              </label>
              <input
                type="text"
                value={addressText}
                onChange={(e) => setAddressText(e.target.value)}
                placeholder="Ví dụ: Quận Tân Bình, TP.HCM"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngân sách / Tài chính dự kiến
              </label>
              <input
                type="text"
                value={needFinance}
                onChange={(e) => setNeedFinance(e.target.value)}
                placeholder="Ví dụ: 1.5 - 2 tỷ"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Sản phẩm / Nhu cầu bất động sản quan tâm
            </label>
            <input
              type="text"
              value={interestMessage}
              onChange={(e) => setInterestMessage(e.target.value)}
              placeholder="Ví dụ: Đất vườn Củ Chi 1000m2 có thổ cư, đường ô tô"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trạng thái khách hàng
              </label>
              <select
                value={leadStatus}
                onChange={(e) => setLeadStatus(e.target.value as Lead['leadStatus'])}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="NEW">Khách mới</option>
                <option value="UNCONTACTED">Chưa liên hệ</option>
                <option value="CONTACTING">Đang liên hệ</option>
                <option value="CONNECTED">Đã kết nối</option>
                <option value="POTENTIAL">Khách tiềm năng</option>
                <option value="APPOINTMENT_SET">Đã đặt lịch hẹn</option>
                <option value="SITE_VISIT">Đã đi xem đất</option>
                <option value="NEGOTIATING">Đang thương lượng</option>
                <option value="DEAL_CLOSED">Đã giao dịch</option>
                <option value="NO_DEMAND">Không còn nhu cầu</option>
                <option value="INVALID_PHONE">Số điện thoại không hợp lệ</option>
                <option value="DO_NOT_CONTACT">Không liên hệ (DNC)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nhân viên phụ trách
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={currentUser.role === 'AGENT'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-75"
              >
                <option value="">-- Chưa phân công --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.role === 'ADMIN' ? 'Admin' : 'Kinh Doanh'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!leadToEdit && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chiến dịch nguồn
              </label>
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú tổng quát ban đầu
            </label>
            <textarea
              rows={2}
              value={generalNote}
              onChange={(e) => setGeneralNote(e.target.value)}
              placeholder="Ghi chú thêm về khách hàng..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              {leadToEdit ? 'Lưu Thay Đổi' : 'Thêm Khách Hàng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
