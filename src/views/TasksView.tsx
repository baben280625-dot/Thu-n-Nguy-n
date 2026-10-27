import React, { useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  Phone,
  AlertCircle,
  Plus,
  X,
  Filter,
} from 'lucide-react';
import { FollowUpTask, Lead, User } from '../types';
import { formatDateTimeVN } from '../utils/phone';
import { db } from '../services/db';

interface TasksViewProps {
  currentUser: User;
  onOpenCallModal: (lead?: Lead) => void;
  onViewLead: (lead: Lead) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  currentUser,
  onOpenCallModal,
  onViewLead,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'TODAY' | 'OVERDUE' | 'COMPLETED'>('TODAY');
  const [completeTaskId, setCompleteTaskId] = useState<string | null>(null);
  const [outcomeText, setOutcomeText] = useState('');

  const allTasks = db.getTasks(currentUser);
  const leads = db.getLeads(currentUser);
  const now = new Date().toISOString();

  const filteredTasks = allTasks.filter((t) => {
    if (activeTab === 'COMPLETED') return !!t.completedAt;
    if (t.completedAt) return false;

    if (activeTab === 'OVERDUE') {
      return t.dueAt < now;
    }
    if (activeTab === 'TODAY') {
      const today = new Date().toISOString().slice(0, 10);
      return t.dueAt.slice(0, 10) === today || t.dueAt < now;
    }
    return true;
  });

  const handleFinishTask = (taskId: string) => {
    if (!outcomeText.trim()) return;
    db.completeTask(taskId, outcomeText.trim(), currentUser);
    setCompleteTaskId(null);
    setOutcomeText('');
  };

  const getPriorityBadge = (p: FollowUpTask['priority']) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">Khẩn cấp</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">Ưu tiên cao</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-medium">Bình thường</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]">Thấp</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">
            Lịch Chăm Sóc & Gọi Lại Khách Hàng
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý lịch hẹn xem đất, gọi lại tư vấn và follow-up khách hàng tiềm năng.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg max-w-md">
        <button
          onClick={() => setActiveTab('TODAY')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'TODAY'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Hôm nay & Quá hạn
        </button>
        <button
          onClick={() => setActiveTab('OVERDUE')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'OVERDUE'
              ? 'bg-white text-red-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Quá hạn
        </button>
        <button
          onClick={() => setActiveTab('ALL')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'ALL'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Tất cả lịch
        </button>
        <button
          onClick={() => setActiveTab('COMPLETED')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            activeTab === 'COMPLETED'
              ? 'bg-white text-emerald-800 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Đã xong
        </button>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-400 text-xs">
            Không có lịch chăm sóc nào trong mục này.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isOverdue = !task.completedAt && task.dueAt < now;
            const lead = leads.find((l) => l.id === task.leadId);

            return (
              <div
                key={task.id}
                className={`bg-white p-4 rounded-xl border shadow-xs transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isOverdue ? 'border-red-200 bg-red-50/20' : 'border-slate-200'
                }`}
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">{task.title}</span>
                    {getPriorityBadge(task.priority)}
                    {isOverdue && (
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                        Quá hạn
                      </span>
                    )}
                    {task.completedAt && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Đã hoàn thành
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-4">
                    <span>
                      Khách: <strong>{task.leadName}</strong> · SĐT: {task.leadPhone}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 tabular-nums">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDateTimeVN(task.dueAt)}
                    </span>
                    <span>Phụ trách: {task.assignedToName}</span>
                  </div>

                  {task.details && (
                    <p className="text-xs text-slate-500 pt-1 italic">{task.details}</p>
                  )}

                  {task.outcome && (
                    <div className="text-xs text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-100 mt-2">
                      <strong>Kết quả xử lý:</strong> {task.outcome}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {lead && (
                    <button
                      onClick={() => onOpenCallModal(lead)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Gọi Khách</span>
                    </button>
                  )}

                  {!task.completedAt && (
                    <button
                      onClick={() => setCompleteTaskId(task.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Xong</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Complete Task Dialog */}
      {completeTaskId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900">
                Ghi Nhận Kết Quả Hoàn Thành Lịch Hẹn
              </h3>
              <button
                onClick={() => setCompleteTaskId(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kết quả thực hiện:
              </label>
              <textarea
                rows={3}
                required
                value={outcomeText}
                onChange={(e) => setOutcomeText(e.target.value)}
                placeholder="Ví dụ: Đã gọi lại trao đổi pháp lý sổ đỏ Tân Thạnh Đông, khách hẹn thứ 7 lên xem thực tế..."
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setCompleteTaskId(null)}
                className="px-3.5 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={() => handleFinishTask(completeTaskId)}
                disabled={!outcomeText.trim()}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
              >
                Xác Nhận Hoàn Thành
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
