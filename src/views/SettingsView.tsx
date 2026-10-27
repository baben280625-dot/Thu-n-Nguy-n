import React, { useState } from 'react';
import {
  ShieldAlert,
  Trash2,
  Plus,
  RefreshCw,
  History,
  AlertTriangle,
  CheckCircle,
  Database,
  Lock,
} from 'lucide-react';
import { SuppressionEntry, User } from '../types';
import { formatDateVN, formatDateTimeVN, normalizeVietnamesePhone } from '../utils/phone';
import { db } from '../services/db';

interface SettingsViewProps {
  currentUser: User;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<'DNC' | 'AUDIT' | 'SYSTEM'>('DNC');
  const [newPhone, setNewPhone] = useState('');
  const [newReason, setNewReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const suppressionList = db.getSuppressionList();
  const auditLogs = db.getAuditLogs(50);

  const handleAddDNC = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const check = normalizeVietnamesePhone(newPhone);
    if (!check.isValid) {
      setErrorMsg('Vui lòng nhập số điện thoại Việt Nam hợp lệ (10 chữ số)');
      return;
    }

    if (!newReason.trim()) {
      setErrorMsg('Vui lòng nhập lý do khách từ chối nhận cuộc gọi');
      return;
    }

    db.addToSuppression(check.normalized, newReason.trim(), undefined, currentUser);
    setNewPhone('');
    setNewReason('');
    onRefresh();
  };

  const handleRemoveDNC = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn mở chặn số điện thoại này?')) {
      db.removeFromSuppression(id, currentUser);
      onRefresh();
    }
  };

  const handleResetData = () => {
    if (
      confirm(
        'Bạn có chắc chắn muốn khôi phục lại toàn bộ dữ liệu mẫu ban đầu (5 chiến dịch Củ Chi, khách hàng và nhật ký chuẩn)? Mọi thay đổi thử nghiệm sẽ được đặt lại.'
      )
    ) {
      db.resetToDefaults();
      onRefresh();
      alert('Đã khôi phục dữ liệu hệ thống về trạng thái ban đầu.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900 leading-tight">
          Cài Đặt Hệ Thống & Tuân Thủ Viễn Thông
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Quản lý danh sách chặn gọi (Do Not Call - DNC), nhật ký kiểm toán và bảo mật.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveSubTab('DNC')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'DNC'
              ? 'border-emerald-600 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-red-600" />
          <span>Danh Sách Chặn Cuộc Gọi (DNC) ({suppressionList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('AUDIT')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'AUDIT'
              ? 'border-emerald-600 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-slate-500" />
          <span>Nhật Ký Thao Tác (Audit Logs)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('SYSTEM')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeSubTab === 'SYSTEM'
              ? 'border-emerald-600 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4 text-slate-500" />
          <span>Bảo Trì & Dữ Liệu Gốc</span>
        </button>
      </div>

      {/* DNC Tab */}
      {activeSubTab === 'DNC' && (
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-900 leading-relaxed space-y-1">
            <div className="font-bold">Tuân thủ Nghị định về cuộc gọi tiếp thị & bảo vệ dữ liệu:</div>
            <p>
              Các số điện thoại trong danh sách này sẽ bị <strong>chặn tự động 100%</strong> khi nhân viên nhấn nút gọi trên CRM. Hệ thống không cho phép thực hiện cuộc gọi tiếp thị nếu khách đã yêu cầu không làm phiền.
            </p>
          </div>

          {/* Add DNC Form */}
          <form
            onSubmit={handleAddDNC}
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3"
          >
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
              Thêm Số Điện Thoại Vào Danh Sách Chặn (DNC)
            </h3>

            {errorMsg && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại cần chặn:
                </label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="09xx xxx xxx"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do ghi nhận:
                </label>
                <input
                  type="text"
                  required
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Khách phản ánh không có nhu cầu, yêu cầu xóa số..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
              >
                Chặn Số Này Ngay
              </button>
            </div>
          </form>

          {/* DNC Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="p-3 font-semibold">Số Điện Thoại</th>
                    <th className="p-3 font-semibold">Tên Khách Hàng</th>
                    <th className="p-3 font-semibold">Lý Do Chặn</th>
                    <th className="p-3 font-semibold">Nguồn Ghi Nhận</th>
                    <th className="p-3 font-semibold">Thời Gian Thêm</th>
                    <th className="p-3 font-semibold text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppressionList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        Danh sách chặn hiện đang trống.
                      </td>
                    </tr>
                  ) : (
                    suppressionList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 font-bold font-mono text-red-700 tabular-nums">
                          {item.phoneNormalized}
                        </td>
                        <td className="p-3 font-bold text-slate-900">{item.leadName || '—'}</td>
                        <td className="p-3 text-slate-700">{item.reason}</td>
                        <td className="p-3 text-slate-500">{item.source}</td>
                        <td className="p-3 tabular-nums text-slate-400">
                          {formatDateTimeVN(item.createdAt)}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleRemoveDNC(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                            title="Bỏ chặn"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeSubTab === 'AUDIT' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-3 font-semibold">Thời Gian</th>
                  <th className="p-3 font-semibold">Người Thực Hiện</th>
                  <th className="p-3 font-semibold">Hành Động</th>
                  <th className="p-3 font-semibold">Đối Tượng</th>
                  <th className="p-3 font-semibold">Tên Đối Tượng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="p-3 tabular-nums text-slate-500 whitespace-nowrap">
                      {formatDateTimeVN(log.createdAt)}
                    </td>
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                      {log.actorUserName}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-500">{log.entityType}</td>
                    <td className="p-3 text-slate-700 truncate max-w-[250px]">
                      {log.entityName || log.entityId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeSubTab === 'SYSTEM' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5 text-xs">
          <div>
            <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100">
              Khôi Phục & Quản Trị Cơ Sở Dữ Liệu
            </h3>
            <p className="text-slate-500 mt-1">
              Khôi phục lại trạng thái mặc định của hệ thống với đầy đủ 5 chiến dịch Củ Chi, dữ liệu khách hàng mẫu, lịch chăm sóc và các cuộc gọi thử nghiệm.
            </p>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>Cảnh báo đặt lại dữ liệu</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              Thao tác này sẽ xóa bộ nhớ đệm trình duyệt và nạp lại dữ liệu ban đầu từ kho lưu trữ. Rất hữu ích khi bạn muốn bắt đầu lại sau khi thử nghiệm nhiều tính năng nhập file hoặc đồng bộ.
            </p>
            <button
              onClick={handleResetData}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition-colors shadow-xs"
            >
              Khôi Phục Dữ Liệu Mẫu Ban Đầu
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
