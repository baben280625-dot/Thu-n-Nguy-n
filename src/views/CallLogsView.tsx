import React, { useState } from 'react';
import { History, Phone, Clock, Search, Download } from 'lucide-react';
import { CallAttempt, User } from '../types';
import { formatDateTimeVN } from '../utils/phone';
import { db } from '../services/db';

interface CallLogsViewProps {
  currentUser: User;
}

export const CallLogsView: React.FC<CallLogsViewProps> = ({ currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const allCalls = db.getCallAttempts();

  const filteredCalls = allCalls.filter(
    (c) =>
      c.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.leadPhone.includes(searchTerm) ||
      c.agentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getResultBadge = (result?: string) => {
    switch (result) {
      case 'ANSWERED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800">Đã nghe máy</span>;
      case 'INTERESTED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-800">Khách quan tâm</span>;
      case 'APPOINTMENT_BOOKED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-800">Đã đặt lịch hẹn</span>;
      case 'NO_ANSWER':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">Không nghe máy</span>;
      case 'BUSY':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800">Máy bận</span>;
      case 'WRONG_NUMBER':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700">Sai số</span>;
      case 'DO_NOT_CALL':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-100 text-red-800">Yêu cầu chặn gọi (DNC)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">{result || 'Hoàn tất'}</span>;
    }
  };

  const handleExportCSV = () => {
    const headers = ['Thời Gian', 'Khách Hàng', 'Số Điện Thoại', 'Thời Lượng (giây)', 'Kết Quả', 'Nhân Viên Gọi', 'Ghi Chú', 'Loại Cuộc Gọi'];
    const rows = filteredCalls.map((c) => [
      `"${c.startedAt}"`,
      `"${c.leadName}"`,
      `"${c.leadPhone}"`,
      `"${c.durationSeconds}"`,
      `"${c.result || ''}"`,
      `"${c.agentName}"`,
      `"${c.notes || ''}"`,
      `"Mô phỏng (Mock)"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RealCore_LichSuCuocGoi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">
            Lịch Sử & Nhật Ký Cuộc Gọi (Call Logs)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tổng hợp dữ liệu kết nối, thời lượng xác thực và kết quả tư vấn của toàn đội ngũ.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Xuất File Báo Cáo Cuộc Gọi</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên khách, số điện thoại, nhân viên..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-3 font-semibold">Thời Gian Bắt Đầu</th>
                <th className="p-3 font-semibold">Khách Hàng</th>
                <th className="p-3 font-semibold">Số Điện Thoại</th>
                <th className="p-3 font-semibold">Thời Lượng</th>
                <th className="p-3 font-semibold">Kết Quả Cuộc Gọi</th>
                <th className="p-3 font-semibold">Nhân Viên Gọi</th>
                <th className="p-3 font-semibold">Ghi Chú Nhanh</th>
                <th className="p-3 font-semibold">Trạng Thái Hệ Thống</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Không tìm thấy lịch sử cuộc gọi nào.
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 tabular-nums text-slate-500 whitespace-nowrap">
                      {formatDateTimeVN(call.startedAt)}
                    </td>
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                      {call.leadName}
                    </td>
                    <td className="p-3 tabular-nums font-semibold text-slate-700 whitespace-nowrap">
                      {call.leadPhone}
                    </td>
                    <td className="p-3 tabular-nums font-mono font-bold text-emerald-800 whitespace-nowrap">
                      {call.durationSeconds}s
                    </td>
                    <td className="p-3 whitespace-nowrap">{getResultBadge(call.result)}</td>
                    <td className="p-3 text-slate-700 whitespace-nowrap">{call.agentName}</td>
                    <td className="p-3 text-slate-600 max-w-[200px] truncate" title={call.notes}>
                      {call.notes || '—'}
                    </td>
                    <td className="p-3 whitespace-nowrap">
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
