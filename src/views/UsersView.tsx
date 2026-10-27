import React, { useState } from 'react';
import { UserCog, ShieldCheck, UserCheck, Plus, CheckCircle, XCircle } from 'lucide-react';
import { User } from '../types';
import { formatDateVN } from '../utils/phone';
import { db } from '../services/db';

interface UsersViewProps {
  currentUser: User;
}

export const UsersView: React.FC<UsersViewProps> = ({ currentUser }) => {
  const users = db.getUsers();
  const leads = db.getLeads(currentUser);

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="p-12 text-center text-slate-500">
        Bạn không có quyền quản trị viên để xem trang này.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">
            Quản Lý Nhân Viên & Phân Quyền (RBAC)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Đội ngũ 1–4 nhân viên kinh doanh bất động sản. Phân định quyền Admin và Chuyên viên kinh doanh.
          </p>
        </div>
      </div>

      {/* Role explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-xs text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Quyền Quản Trị Viên (Admin)</span>
          </div>
          <p className="text-xs text-emerald-800 leading-relaxed">
            Xem toàn bộ khách hàng toàn đội, phân công khách cho nhân viên, tạo và quản lý 5 chiến dịch, cấu hình đồng bộ 2 chiều Google Sheets, xử lý xung đột dữ liệu và quản lý danh sách chặn gọi (DNC).
          </p>
        </div>

        <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-xs text-blue-900">
            <UserCheck className="w-4 h-4 text-blue-700" />
            <span>Quyền Chuyên Viên Kinh Doanh (Agent)</span>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">
            Chỉ xem và thao tác trên khách hàng được phân công phụ trách. Thực hiện cuộc gọi chăm sóc, cập nhật nhu cầu, tạo lịch gọi lại và xem lịch sử tương tác của hồ sơ được cấp quyền.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="p-3 font-semibold">Nhân Viên</th>
                <th className="p-3 font-semibold">Email Đăng Nhập</th>
                <th className="p-3 font-semibold">Số Điện Thoại</th>
                <th className="p-3 font-semibold">Vai Trò Hệ Thống</th>
                <th className="p-3 font-semibold">Số Khách Đang Phụ Trách</th>
                <th className="p-3 font-semibold">Trạng Thái</th>
                <th className="p-3 font-semibold">Ngày Tham Gia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const assignedCount = leads.filter((l) => l.assignedTo === u.id).length;
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{u.fullName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 font-mono">{u.email}</td>
                    <td className="p-3 tabular-nums text-slate-700 font-medium">{u.phone}</td>
                    <td className="p-3">
                      {u.role === 'ADMIN' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-max">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Quản Trị Viên</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 flex items-center gap-1 w-max">
                          <UserCheck className="w-3 h-3" />
                          <span>Kinh Doanh</span>
                        </span>
                      )}
                    </td>
                    <td className="p-3 tabular-nums font-bold text-slate-800">
                      {assignedCount} khách hàng
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 flex items-center gap-1 w-max">
                        <CheckCircle className="w-3 h-3" />
                        <span>Đang hoạt động</span>
                      </span>
                    </td>
                    <td className="p-3 tabular-nums text-slate-500">
                      {formatDateVN(u.createdAt)}
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
