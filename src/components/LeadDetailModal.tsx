import React, { useState } from 'react';
import {
  X,
  Phone,
  Calendar,
  Clock,
  User as UserIcon,
  MapPin,
  Tag,
  DollarSign,
  MessageSquare,
  FileText,
  ShieldAlert,
  History,
  CheckCircle2,
  PlusCircle,
  ExternalLink,
  Edit,
} from 'lucide-react';
import { Lead, LeadActivity, User } from '../types';
import { formatDateVN, formatDateTimeVN, normalizeVietnamesePhone } from '../utils/phone';
import { db } from '../services/db';

interface LeadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  currentUser: User;
  onCallLead: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onRefresh: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({
  isOpen,
  onClose,
  lead,
  currentUser,
  onCallLead,
  onEditLead,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'legacy_notes' | 'info'>('timeline');
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Quick Task Scheduling state
  const [showScheduleTask, setShowScheduleTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');

  if (!isOpen || !lead) return null;

  const activities = db.getActivitiesForLead(lead.id);
  const legacyNotes = activities.filter((a) => a.isLegacyImport);
  const modernActivities = activities.filter((a) => !a.isLegacyImport);
  const phoneValidation = normalizeVietnamesePhone(lead.phoneRaw);
  const isSuppressed = db.isSuppressed(lead.phoneNormalized);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmittingNote(true);
    db.addActivity(
      {
        leadId: lead.id,
        userId: currentUser.id,
        userName: currentUser.fullName,
        channel: 'NOTE',
        subject: 'Ghi chú chăm sóc khách hàng',
        body: newNote.trim(),
      },
      currentUser
    );

    setNewNote('');
    setIsSubmittingNote(false);
    onRefresh();
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDueDate) return;

    db.createTask(
      {
        leadId: lead.id,
        title: taskTitle.trim(),
        dueAt: new Date(taskDueDate).toISOString(),
        priority: 'HIGH',
        assignedTo: lead.assignedTo || currentUser.id,
      },
      currentUser
    );

    setTaskTitle('');
    setTaskDueDate('');
    setShowScheduleTask(false);
    onRefresh();
  };

  const handleToggleDNC = () => {
    if (lead.doNotContact || isSuppressed) {
      const entry = db.getSuppressionList().find((s) => s.phoneNormalized === lead.phoneNormalized);
      if (entry) {
        db.removeFromSuppression(entry.id, currentUser);
      }
      db.updateLead(lead.id, { doNotContact: false, leadStatus: 'UNCONTACTED' }, currentUser);
    } else {
      db.addToSuppression(
        lead.phoneNormalized,
        `Đánh dấu thủ công bởi ${currentUser.fullName}`,
        lead.id,
        currentUser
      );
    }
    onRefresh();
  };

  const getStatusBadge = (status: Lead['leadStatus']) => {
    const config: Record<string, { label: string; bg: string; text: string }> = {
      NEW: { label: 'Khách mới', bg: 'bg-blue-50', text: 'text-blue-700' },
      UNCONTACTED: { label: 'Chưa liên hệ', bg: 'bg-slate-100', text: 'text-slate-700' },
      CONTACTING: { label: 'Đang liên hệ', bg: 'bg-amber-50', text: 'text-amber-700' },
      CONNECTED: { label: 'Đã kết nối', bg: 'bg-emerald-50', text: 'text-emerald-700' },
      POTENTIAL: { label: 'Khách tiềm năng', bg: 'bg-purple-50', text: 'text-purple-700' },
      APPOINTMENT_SET: { label: 'Đã đặt lịch hẹn', bg: 'bg-indigo-50', text: 'text-indigo-700' },
      SITE_VISIT: { label: 'Đã xem đất', bg: 'bg-teal-50', text: 'text-teal-700' },
      NEGOTIATING: { label: 'Đang thương lượng', bg: 'bg-amber-50', text: 'text-amber-800' },
      DEAL_CLOSED: { label: 'Đã giao dịch', bg: 'bg-emerald-100', text: 'text-emerald-900' },
      NO_DEMAND: { label: 'Không còn nhu cầu', bg: 'bg-slate-100', text: 'text-slate-600' },
      INVALID_PHONE: { label: 'Sai số điện thoại', bg: 'bg-red-50', text: 'text-red-700' },
      DO_NOT_CONTACT: { label: 'Không liên hệ (DNC)', bg: 'bg-red-100', text: 'text-red-800' },
    };
    const c = config[status] || { label: status, bg: 'bg-slate-100', text: 'text-slate-700' };
    return (
      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-500 uppercase">{lead.code}</span>
              <h2 className="text-lg font-bold text-slate-900">{lead.fullName}</h2>
              {getStatusBadge(lead.leadStatus)}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="font-semibold text-emerald-800 tabular-nums">
                {phoneValidation.formatted || lead.phoneRaw}
              </span>
              {lead.addressText && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {lead.addressText}
                </span>
              )}
              {lead.assignedToName && (
                <span className="flex items-center gap-1 text-slate-700">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                  Phụ trách: <strong>{lead.assignedToName}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditLead(lead)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors"
              title="Chỉnh sửa thông tin"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Call button */}
            <button
              onClick={() => onCallLead(lead)}
              disabled={!phoneValidation.canCall || isSuppressed}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs ${
                !phoneValidation.canCall || isSuppressed
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Gọi Ngay (Mô phỏng)</span>
            </button>

            {/* Schedule Task Button */}
            <button
              onClick={() => setShowScheduleTask(!showScheduleTask)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              <span>Đặt Lịch Gọi Lại / Hẹn Gặp</span>
            </button>

            {/* DNC Toggle */}
            <button
              onClick={handleToggleDNC}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isSuppressed || lead.doNotContact
                  ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isSuppressed || lead.doNotContact ? 'Bỏ Chặn Gọi' : 'Chặn Gọi (DNC)'}</span>
            </button>
          </div>

          {/* Conflict Flag Indicator if any */}
          {lead.hasConflict && (
            <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-md font-medium">
              Có xung đột dữ liệu Google Sheet
            </div>
          )}
        </div>

        {/* Quick Task Creation Drawer */}
        {showScheduleTask && (
          <form
            onSubmit={handleCreateTask}
            className="p-4 bg-emerald-50 border-b border-emerald-200 flex flex-wrap items-center gap-3"
          >
            <div className="flex-1 min-w-[240px]">
              <input
                type="text"
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Nội dung lịch hẹn (VD: Gọi lại trao đổi sổ đỏ Tân Thạnh Đông)..."
                className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <input
                type="datetime-local"
                required
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs text-slate-900 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors"
            >
              Lưu Lịch Hẹn
            </button>
            <button
              type="button"
              onClick={() => setShowScheduleTask(false)}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-300 transition-colors"
            >
              Hủy
            </button>
          </form>
        )}

        {/* Modal Body: Tabs */}
        <div className="flex items-center gap-6 px-6 pt-3 border-b border-slate-200 bg-white text-xs font-semibold">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`pb-2.5 border-b-2 transition-colors ${
              activeTab === 'timeline'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Nhật Ký Chăm Sóc ({modernActivities.length})
          </button>
          <button
            onClick={() => setActiveTab('legacy_notes')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'legacy_notes'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Ghi Chú Lịch Sử Excel (L1 - L8) ({legacyNotes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-2.5 border-b-2 transition-colors ${
              activeTab === 'info'
                ? 'border-emerald-600 text-emerald-800 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Chi Tiết Nhu Cầu & Chiến Dịch
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Thêm Ghi Chú Chăm Sóc Mới
                </label>
                <textarea
                  rows={2}
                  required
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Ghi lại tiến độ tư vấn, phản hồi của khách, trao đổi Zalo..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingNote || !newNote.trim()}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    Lưu Ghi Chú
                  </button>
                </div>
              </form>

              {/* Timeline Items */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Dòng Thời Gian Hoạt Động
                </div>

                {modernActivities.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                    Chưa có hoạt động cuộc gọi hay ghi chú mới nào.
                  </div>
                ) : (
                  modernActivities.map((act) => (
                    <div
                      key={act.id}
                      className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-start gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        {act.channel === 'CALL' ? (
                          <Phone className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <MessageSquare className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {act.subject}
                          </h4>
                          <span className="text-[11px] text-slate-400 shrink-0 tabular-nums">
                            {formatDateTimeVN(act.occurredAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">
                          {act.body}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                          <span>Bởi: <strong>{act.userName}</strong></span>
                          {act.durationSeconds ? (
                            <span>Thời lượng: <strong>{act.durationSeconds} giây</strong></span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'legacy_notes' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                <strong>Ghi chú nguyên bản từ file Excel (DATA CHIẾN DỊCH):</strong> Các cột L1 đến L8 được bảo toàn nguyên vẹn nội dung gốc và thứ tự cột. Hệ thống không tạo timestamp giả mạo.
              </div>

              {legacyNotes.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                  Không có ghi chú lịch sử cũ nào được nhập từ Excel cho khách hàng này.
                </div>
              ) : (
                legacyNotes.map((note, idx) => (
                  <div
                    key={note.id}
                    className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs flex items-start gap-3"
                  >
                    <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0">
                      L{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-800">{note.subject}</div>
                      <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{note.body}</p>
                      <div className="text-[11px] text-slate-400 mt-1.5 italic">
                        Dữ liệu lưu trữ cũ — Không ghi đè
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                  Nhu Cầu Bất Động Sản
                </h4>
                <div>
                  <div className="text-xs text-slate-400">Sản phẩm / Thông điệp quan tâm:</div>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">
                    {lead.interestMessage || 'Chưa có thông tin'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Ngân sách / Tài chính dự kiến:</div>
                  <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                    {lead.needFinance || 'Chưa xác định'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Ghi chú tổng quát:</div>
                  <div className="text-xs text-slate-700 mt-0.5">
                    {lead.generalNote || 'Không có ghi chú'}
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
                  Chiến Dịch & Nguồn Gốc
                </h4>
                <div>
                  <div className="text-xs text-slate-400">Chiến dịch đầu tiên:</div>
                  <div className="text-xs font-semibold text-slate-800 mt-0.5">
                    {lead.firstSourceCampaignName || 'Trực tiếp'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Các chiến dịch liên quan (chống trùng):</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {lead.relatedCampaignIds.map((cid) => {
                      const c = db.getCampaignById(cid);
                      return (
                        <span key={cid} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]">
                          {c?.name || cid}
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Ngày tạo hồ sơ:</div>
                  <div className="text-xs text-slate-700 mt-0.5 tabular-nums">
                    {formatDateTimeVN(lead.createdAt)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Lần liên hệ gần nhất:</div>
                  <div className="text-xs text-slate-700 mt-0.5 tabular-nums">
                    {formatDateTimeVN(lead.lastContactAt)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
