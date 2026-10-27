import React from 'react';
import { BarChart3, TrendingUp, PhoneCall, Users, CheckCircle2, Download } from 'lucide-react';
import { User } from '../types';
import { db } from '../services/db';

interface ReportsViewProps {
  currentUser: User;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ currentUser }) => {
  const leads = db.getLeads(currentUser);
  const users = db.getUsers();
  const callAttempts = db.getCallAttempts();

  // Funnel counts
  const total = leads.length;
  const contacted = leads.filter((l) => l.lastContactAt).length;
  const potential = leads.filter((l) => ['POTENTIAL', 'APPOINTMENT_SET', 'SITE_VISIT', 'NEGOTIATING', 'DEAL_CLOSED'].includes(l.leadStatus)).length;
  const siteVisit = leads.filter((l) => ['SITE_VISIT', 'NEGOTIATING', 'DEAL_CLOSED'].includes(l.leadStatus)).length;
  const closed = leads.filter((l) => l.leadStatus === 'DEAL_CLOSED').length;

  // Conversion rates
  const contactRate = total > 0 ? Math.round((contacted / total) * 100) : 0;
  const potentialRate = contacted > 0 ? Math.round((potential / contacted) * 100) : 0;
  const closeRate = potential > 0 ? Math.round((closed / potential) * 100) : 0;

  const handleExportCSV = () => {
    const headers = ['Chỉ Số', 'Số Lượng', 'Tỷ Lệ Chuyển Đổi'];
    const rows = [
      ['Tổng khách hàng duy nhất', total, '100%'],
      ['Khách hàng đã liên hệ', contacted, `${contactRate}%`],
      ['Khách hàng tiềm năng', potential, `${potentialRate}%`],
      ['Khách hàng đã đi xem đất Củ Chi', siteVisit, '-'],
      ['Giao dịch thành công', closed, `${closeRate}%`],
    ];

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RealCore_BaoCaoKinhDoanh_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">
            Báo Cáo Hiệu Quả & Phân Tích Chuyển Đổi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dữ liệu phân tích thực tế từ hoạt động kinh doanh bất động sản và các chiến dịch.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Xuất Báo Cáo Doanh Số</span>
        </button>
      </div>

      {/* Funnel Section */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">
          Phễu Chuyển Đổi Khách Hàng Bất Động Sản
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="text-xs text-slate-500">1. Khách Hàng Nguồn</div>
            <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{total}</div>
            <div className="text-[11px] text-slate-400 mt-1">100% data sheet</div>
          </div>

          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 text-center">
            <div className="text-xs text-blue-800">2. Đã Kết Nối Cuộc Gọi</div>
            <div className="text-2xl font-bold text-blue-900 mt-1 tabular-nums">{contacted}</div>
            <div className="text-[11px] text-blue-700 mt-1">{contactRate}% tiếp cận</div>
          </div>

          <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-200 text-center">
            <div className="text-xs text-purple-800">3. Khách Tiềm Năng</div>
            <div className="text-2xl font-bold text-purple-900 mt-1 tabular-nums">{potential}</div>
            <div className="text-[11px] text-purple-700 mt-1">{potentialRate}% từ liên hệ</div>
          </div>

          <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-200 text-center">
            <div className="text-xs text-teal-800">4. Đã Đi Xem Đất</div>
            <div className="text-2xl font-bold text-teal-900 mt-1 tabular-nums">{siteVisit}</div>
            <div className="text-[11px] text-teal-700 mt-1">Xem thực tế Củ Chi</div>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 text-center">
            <div className="text-xs text-emerald-800">5. Giao Dịch Chốt</div>
            <div className="text-2xl font-bold text-emerald-900 mt-1 tabular-nums">{closed}</div>
            <div className="text-[11px] text-emerald-700 mt-1">{closeRate}% chốt cọc</div>
          </div>
        </div>
      </div>

      {/* Staff Performance Table */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">
          Hiệu Suất Từng Nhân Viên Kinh Doanh
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-3 font-semibold">Nhân Viên</th>
                <th className="p-3 font-semibold">Khách Được Giao</th>
                <th className="p-3 font-semibold">Đã Liên Hệ</th>
                <th className="p-3 font-semibold">Số Cuộc Gọi Đã Thực Hiện</th>
                <th className="p-3 font-semibold">Khách Tiềm Năng</th>
                <th className="p-3 font-semibold">Lịch Hẹn Thành Công</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const userLeads = leads.filter((l) => l.assignedTo === u.id);
                const userContacted = userLeads.filter((l) => l.lastContactAt).length;
                const userCalls = callAttempts.filter((c) => c.agentId === u.id).length;
                const userPotential = userLeads.filter((l) => ['POTENTIAL', 'APPOINTMENT_SET', 'SITE_VISIT', 'NEGOTIATING', 'DEAL_CLOSED'].includes(l.leadStatus)).length;
                const userAppointments = userLeads.filter((l) => ['APPOINTMENT_SET', 'SITE_VISIT', 'DEAL_CLOSED'].includes(l.leadStatus)).length;

                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-900">{u.fullName}</td>
                    <td className="p-3 tabular-nums font-semibold text-slate-800">{userLeads.length}</td>
                    <td className="p-3 tabular-nums text-slate-700">{userContacted}</td>
                    <td className="p-3 tabular-nums font-mono font-bold text-emerald-700">{userCalls} cuộc gọi</td>
                    <td className="p-3 tabular-nums text-purple-700 font-semibold">{userPotential}</td>
                    <td className="p-3 tabular-nums text-emerald-800 font-bold">{userAppointments} lịch hẹn</td>
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
