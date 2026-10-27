import React from 'react';
import {
  Users,
  UserPlus,
  PhoneCall,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  Sheet,
  Phone,
  Clock,
  CheckCircle2,
  Building,
  ArrowRight,
} from 'lucide-react';
import { Campaign, FollowUpTask, Lead, User } from '../types';
import { formatDateVN, formatDateTimeVN, normalizeVietnamesePhone } from '../utils/phone';
import { db } from '../services/db';
import { GoogleSheetSyncCard } from '../components/GoogleSheetSyncCard';

interface DashboardViewProps {
  currentUser: User;
  onSelectTab: (tab: any) => void;
  onOpenCallModal: (lead?: Lead) => void;
  onOpenImportModal: () => void;
  onViewLead: (lead: Lead) => void;
  onRefresh?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  onSelectTab,
  onOpenCallModal,
  onOpenImportModal,
  onViewLead,
  onRefresh,
}) => {
  const leads = db.getLeads(currentUser);
  const campaigns = db.getCampaigns();
  const tasks = db.getTasks(currentUser);
  const callAttempts = db.getCallAttempts(5);

  const totalUniqueLeads = leads.length;
  const newLeads = leads.filter((l) => l.leadStatus === 'NEW').length;
  const contactedLeads = leads.filter((l) => l.lastContactAt).length;
  const potentialLeads = leads.filter(
    (l) => ['POTENTIAL', 'APPOINTMENT_SET', 'SITE_VISIT', 'NEGOTIATING', 'DEAL_CLOSED'].includes(l.leadStatus)
  ).length;

  const now = new Date().toISOString();
  const overdueTasks = tasks.filter((t) => !t.completedAt && t.dueAt < now);
  const todayTasks = tasks.filter((t) => !t.completedAt && t.dueAt >= now);

  const answeredCalls = callAttempts.filter((c) => c.status === 'COMPLETED' && c.result === 'ANSWERED').length;
  const connectRate = callAttempts.length > 0 ? Math.round((answeredCalls / callAttempts.length) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Actions */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md">
              Bất Động Sản Củ Chi & TP.HCM
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">Hôm nay: {formatDateVN(now)}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Chào mừng, {currentUser.fullName}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hệ thống CRM quản lý danh sách khách hàng tiềm năng, lịch gọi lại và đồng bộ Google Sheets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenImportModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Nhập Excel Chiến Dịch</span>
          </button>

          <button
            onClick={() => onSelectTab('sheets_sync')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Sheet className="w-4 h-4 text-emerald-600" />
            <span>Đồng Bộ Google Sheets</span>
          </button>

          <button
            onClick={() => onOpenCallModal()}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Phone className="w-4 h-4" />
            <span>Quay Số Nhanh</span>
          </button>
        </div>
      </div>

      {/* Primary Google Sheet URL Sync Card */}
      <GoogleSheetSyncCard
        currentUser={currentUser}
        onSyncComplete={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Khách Duy Nhất</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 tabular-nums">{totalUniqueLeads}</div>
          <div className="text-[11px] text-slate-500 mt-1">Đã chuẩn hóa & chống trùng</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Khách Mới</span>
            <UserPlus className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-700 tabular-nums">{newLeads}</div>
          <div className="text-[11px] text-slate-500 mt-1">Cần liên hệ đầu tiên</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Đã Liên Hệ</span>
            <PhoneCall className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 tabular-nums">{contactedLeads}</div>
          <div className="text-[11px] text-slate-500 mt-1">Có lịch sử cuộc gọi / note</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Khách Tiềm Năng</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700 tabular-nums">{potentialLeads}</div>
          <div className="text-[11px] text-slate-500 mt-1">Quan tâm đất & hẹn gặp</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Lịch Cần Làm</span>
            <CalendarCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 tabular-nums">{todayTasks.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Lịch gọi lại hôm nay</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold">Tỷ Lệ Bắt Máy</span>
            <Phone className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-800 tabular-nums">{connectRate}%</div>
          <div className="text-[11px] text-slate-500 mt-1">Chế độ mô phỏng WebRTC</div>
        </div>
      </div>

      {/* Middle Row: Urgent Tasks & Active Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Follow-up Tasks */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Lịch Chăm Sóc Khách Hàng Đến Hạn</h3>
            </div>
            <button
              onClick={() => onSelectTab('tasks')}
              className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {overdueTasks.length > 0 && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between">
              <span className="font-semibold">Có {overdueTasks.length} lịch chăm sóc bị quá hạn!</span>
              <button
                onClick={() => onSelectTab('tasks')}
                className="font-bold underline text-red-800"
              >
                Xử lý ngay
              </button>
            </div>
          )}

          <div className="space-y-2.5">
            {todayTasks.length === 0 && overdueTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Không có lịch hẹn nào cần xử lý hôm nay.
              </div>
            ) : (
              [...overdueTasks, ...todayTasks].slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-start justify-between gap-3 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-xs text-slate-900">{task.title}</div>
                    <div className="text-xs text-slate-600">
                      Khách: <strong>{task.leadName}</strong> · SĐT: {task.leadPhone}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span className="tabular-nums">Hạn: {formatDateTimeVN(task.dueAt)}</span>
                      <span>·</span>
                      <span>Phụ trách: {task.assignedToName}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const l = leads.find((item) => item.id === task.leadId);
                      if (l) onOpenCallModal(l);
                    }}
                    className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                    title="Gọi ngay cho khách"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 5 Campaign Progress Highlights */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Tiến Độ 5 Chiến Dịch Bất Động Sản</h3>
            </div>
            <button
              onClick={() => onSelectTab('campaigns')}
              className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Chi tiết</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {campaigns.map((camp) => {
              const campLeads = leads.filter(
                (l) => l.firstSourceCampaignId === camp.id || l.relatedCampaignIds.includes(camp.id)
              );
              const contacted = campLeads.filter((l) => l.lastContactAt).length;
              const rate = campLeads.length > 0 ? Math.round((contacted / campLeads.length) * 100) : 0;

              return (
                <div key={camp.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 truncate">{camp.name}</span>
                    <span className="text-xs text-slate-500 font-medium tabular-nums">
                      {contacted}/{campLeads.length} khách ({rate}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom: Recent Leads & Quick Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-900">Khách Hàng Tiềm Năng Mới Cập Nhật</h3>
          <button
            onClick={() => onSelectTab('leads')}
            className="text-xs text-emerald-700 font-semibold hover:underline flex items-center gap-1"
          >
            <span>Mở danh sách khách hàng đầy đủ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3 font-semibold">Mã KH</th>
                <th className="p-3 font-semibold">Họ Tên</th>
                <th className="p-3 font-semibold">Số Điện Thoại</th>
                <th className="p-3 font-semibold">Nhu Cầu BĐS</th>
                <th className="p-3 font-semibold">Ngân Sách</th>
                <th className="p-3 font-semibold">Trạng Thái</th>
                <th className="p-3 font-semibold">Nhân Viên</th>
                <th className="p-3 font-semibold text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.slice(0, 6).map((lead) => {
                const phoneCheck = normalizeVietnamesePhone(lead.phoneRaw);
                return (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono font-bold text-slate-500 uppercase">{lead.code}</td>
                    <td className="p-3 font-bold text-slate-900">
                      <button
                        onClick={() => onViewLead(lead)}
                        className="hover:text-emerald-700 hover:underline text-left"
                      >
                        {lead.fullName}
                      </button>
                    </td>
                    <td className="p-3 tabular-nums font-medium text-slate-700">
                      {phoneCheck.formatted}
                    </td>
                    <td className="p-3 text-slate-600 truncate max-w-[200px]">
                      {lead.interestMessage || '—'}
                    </td>
                    <td className="p-3 text-emerald-700 font-semibold">
                      {lead.needFinance || '—'}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {lead.leadStatus}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600">{lead.assignedToName || 'Chưa giao'}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => onOpenCallModal(lead)}
                        className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors inline-flex items-center gap-1 font-semibold text-xs"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Gọi</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
