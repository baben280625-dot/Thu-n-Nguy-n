import React, { useState } from 'react';
import {
  Sheet,
  RefreshCw,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle2,
  Settings,
  History,
  Key,
  ExternalLink,
  ShieldCheck,
  Info,
  Trash2,
} from 'lucide-react';
import { GoogleSheetConnection, SyncConflict, SyncRun, User } from '../types';
import { formatDateTimeVN } from '../utils/phone';
import { db } from '../services/db';
import { runGoogleSheetsSync } from '../services/sheetsSync';
import { GoogleSheetSyncCard } from '../components/GoogleSheetSyncCard';

interface SheetsSyncViewProps {
  currentUser: User;
  onOpenConflictModal: (conflict: SyncConflict) => void;
  onRefresh: () => void;
}

export const SheetsSyncView: React.FC<SheetsSyncViewProps> = ({
  currentUser,
  onOpenConflictModal,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CONFLICTS' | 'SETUP' | 'LOGS'>('OVERVIEW');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const connections = db.getSheetConnections();
  const conn = connections[0];
  const conflicts = db.getSyncConflicts().filter((c) => !c.resolution);
  const syncRuns = db.getSyncRuns();

  const handleTriggerSync = async () => {
    if (!conn) {
      setSyncMessage('Chưa có bảng tính nào được kết nối. Vui lòng nhập link Google Sheet ở ô phía trên để đồng bộ dữ liệu.');
      return;
    }
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const res = await runGoogleSheetsSync(conn.id, conn.syncDirection, currentUser);
      setSyncMessage(res.message);
      onRefresh();
    } catch (err: any) {
      setSyncMessage(err.message || 'Lỗi khi đồng bộ Google Sheets');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleResetAllData = () => {
    db.clearAllData(currentUser);
    setShowResetConfirm(false);
    setSyncMessage('Đã xóa toàn bộ chiến dịch và data khách hàng, đưa CRM về trạng thái sạch.');
    onRefresh();
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Title & Reset Tool */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">
            Đồng Bộ Data Google Sheets
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Đồng bộ khách hàng, số điện thoại và lịch sử chăm sóc L1-L12 trực tiếp từ Google Sheets lên CRM
          </p>
        </div>

        <div className="flex items-center gap-2">
          {currentUser.role === 'ADMIN' && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-semibold transition-colors"
              title="Xóa toàn bộ data & đưa CRM về trạng thái trống"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Sạch Data</span>
            </button>
          )}

          {conn && (
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Đang Đồng Bộ...' : 'Chạy Đồng Bộ Ngay'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="p-4 bg-red-50 border border-red-300 rounded-xl space-y-3 text-xs text-red-900">
          <div className="flex items-center gap-2 font-bold text-red-800">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Xác nhận xóa toàn bộ data khách hàng & chiến dịch?</span>
          </div>
          <p className="text-slate-600">
            Hành động này sẽ xóa sạch toàn bộ data khách hàng, lịch sử chăm sóc và các chiến dịch hiện tại, chỉ giữ lại tài khoản Admin (Nguyễn Thuận). Bạn có thể nhập link Google Sheet bất kỳ lúc nào để nạp dữ liệu mới.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium"
            >
              Hủy
            </button>
            <button
              onClick={handleResetAllData}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold"
            >
              Xác Nhận Xóa Sạch
            </button>
          </div>
        </div>
      )}

      {/* PRIMARY FEATURE: Google Sheet URL Input & Sync Card */}
      <GoogleSheetSyncCard currentUser={currentUser} onSyncComplete={onRefresh} />

      {syncMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncMessage}</span>
          </div>
          <button onClick={() => setSyncMessage(null)} className="text-emerald-700 hover:underline">
            Đóng
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`pb-3 px-1 border-b-2 transition-colors ${
            activeTab === 'OVERVIEW'
              ? 'border-emerald-600 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Thông Tin Kết Nối
        </button>
        <button
          onClick={() => setActiveTab('CONFLICTS')}
          className={`pb-3 px-1 border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'CONFLICTS'
              ? 'border-emerald-600 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Xử Lý Xung Đột Dữ Liệu</span>
          {conflicts.length > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-slate-900 rounded font-bold text-[10px]">
              {conflicts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('LOGS')}
          className={`pb-3 px-1 border-b-2 transition-colors ${
            activeTab === 'LOGS'
              ? 'border-emerald-600 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Lịch Sử Đồng Bộ ({syncRuns.length})
        </button>
        <button
          onClick={() => setActiveTab('SETUP')}
          className={`pb-3 px-1 border-b-2 transition-colors ${
            activeTab === 'SETUP'
              ? 'border-emerald-600 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Hướng Dẫn Cấp Quyền & API
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {conn ? (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
                <span>Cấu Hình Bảng Tính Đang Kết Nối</span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded">
                  Đang hoạt động
                </span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400">Tên chiến dịch / bảng tính:</span>
                    <div className="font-semibold text-slate-800 mt-0.5">{conn.name}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Google Spreadsheet ID:</span>
                    <div className="font-mono text-emerald-800 font-bold mt-0.5 break-all">
                      {conn.spreadsheetId}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Worksheet / Tiêu đề:</span>
                    <div className="font-semibold text-slate-800 mt-0.5">{conn.sheetTitle}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400">Hướng đồng bộ:</span>
                    <div className="font-semibold text-slate-800 mt-0.5">
                      Hai chiều (Two-Way) — Tự động nhận diện thay đổi
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Thời điểm đồng bộ gần nhất:</span>
                    <div className="font-semibold text-slate-800 mt-0.5 tabular-nums">
                      {formatDateTimeVN(conn.lastSyncAt)}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Trạng thái bảo vệ dữ liệu:</span>
                    <div className="text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Không tự xóa khách CRM khi dòng Google Sheet bị xóa</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Field mapping table preview */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="text-xs font-bold text-slate-700">Ánh xạ cột CRM ⇄ Google Sheets:</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(conn.mapping).map(([crmField, sheetCol]) => (
                    <div key={crmField} className="p-2.5 bg-slate-50 rounded-lg text-xs">
                      <div className="text-slate-400 text-[11px]">{crmField}</div>
                      <div className="font-bold text-slate-800">{sheetCol}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto">
                <Sheet className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800">Chưa Có Bảng Tính Nào Được Kết Nối</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Hệ thống hiện tại ở trạng thái sạch. Hãy dán link Google Sheet vào ô nhập phía trên để đồng bộ danh sách khách hàng và lịch sử chăm sóc lên CRM.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Conflicts Tab */}
      {activeTab === 'CONFLICTS' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed">
            <strong>Quy tắc xử lý xung đột hai chiều:</strong> Khi cùng một trường dữ liệu của khách hàng bị sửa đổi đồng thời trên cả CRM và Google Sheets, hệ thống tạm dừng ghi đè và yêu cầu người dùng xác nhận nguồn chuẩn để bảo vệ thông tin.
          </div>

          {conflicts.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-400 text-xs">
              Hiện tại không có xung đột dữ liệu nào cần xử lý.
            </div>
          ) : (
            <div className="space-y-3">
              {conflicts.map((c) => (
                <div
                  key={c.id}
                  className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{c.leadName}</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 text-[10px] font-bold rounded">
                        Xung đột: {c.fieldLabel}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Vị trí: <strong>{c.sourceRowKey}</strong> · Phát hiện lúc {formatDateTimeVN(c.createdAt)}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
                      <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                        <span className="text-slate-400 font-semibold">Giá trị hiện tại ở CRM:</span>
                        <div className="font-bold text-slate-800 mt-0.5">{String(c.crmValue)}</div>
                      </div>
                      <div className="p-2.5 bg-emerald-50/50 rounded border border-emerald-200">
                        <span className="text-emerald-700 font-semibold">Giá trị trên Google Sheet:</span>
                        <div className="font-bold text-emerald-900 mt-0.5">{String(c.sheetValue)}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenConflictModal(c)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shrink-0 shadow-xs transition-colors"
                  >
                    Mở Trình Xử Lý Xung Đột
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'LOGS' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {syncRuns.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              Chưa có lịch sử đồng bộ nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="p-3 font-semibold">Thời Gian</th>
                    <th className="p-3 font-semibold">Chiến Dịch / Sheet</th>
                    <th className="p-3 font-semibold">Hướng</th>
                    <th className="p-3 font-semibold">Dòng Đã Đọc</th>
                    <th className="p-3 font-semibold">Tạo Mới</th>
                    <th className="p-3 font-semibold">Hợp Nhất</th>
                    <th className="p-3 font-semibold">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {syncRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-50">
                      <td className="p-3 tabular-nums text-slate-500">
                        {formatDateTimeVN(run.startedAt)}
                      </td>
                      <td className="p-3 font-bold text-slate-900">{run.sheetTitle}</td>
                      <td className="p-3 text-slate-600">{run.direction}</td>
                      <td className="p-3 tabular-nums">{run.rowsRead}</td>
                      <td className="p-3 tabular-nums text-emerald-700 font-bold">{run.rowsCreated}</td>
                      <td className="p-3 tabular-nums text-blue-700 font-bold">{run.rowsUpdated}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          run.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-amber-50 text-amber-800'
                        }`}>
                          {run.status === 'COMPLETED' ? 'Thành công' : 'Có xung đột'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Setup Guide Tab */}
      {activeTab === 'SETUP' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs">
          <h3 className="font-bold text-sm text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-600" />
            <span>Hướng Dẫn Cấp Quyền & Kết Nối Google Sheets</span>
          </h3>

          <div className="space-y-3 leading-relaxed text-slate-700">
            <p>
              Hệ thống RealCore Auto Call CRM hỗ trợ đồng bộ dữ liệu khách hàng từ bất kỳ đường link Google Sheet nào:
            </p>

            <div className="p-4 bg-emerald-50/60 rounded-lg border border-emerald-200 space-y-2">
              <span className="font-bold text-emerald-950">Cách 1: Sử dụng đường link Google Sheet (Đơn giản nhất)</span>
              <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                <li>Mở file Google Sheet của bạn trên trình duyệt.</li>
                <li>Nhấp nút <strong>Chia sẻ (Share)</strong> ở góc phải trên.</li>
                <li>Tại mục Quyền truy cập chung, chọn <strong>Bất kỳ ai có đường liên kết (Anyone with the link)</strong> với vai trò <strong>Người xem (Viewer)</strong>.</li>
                <li>Sao chép đường link và dán vào ô <strong>Đường Link Google Sheet</strong> ở phía trên, nhấn <strong>Đồng Bộ Lên CRM Ngay</strong>.</li>
              </ol>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900">Cách 2: Tải xuống CSV hoặc copy nội dung</span>
              <p>
                Nếu bảng tính có tính bảo mật nội bộ cao: Bạn vào <strong>Tệp (File) &gt; Tải xuống (Download) &gt; Giá trị phân tách bằng dấu phẩy (.csv)</strong>, sau đó nhấn nút <strong>Dán CSV / Tải Lên</strong> trên CRM để đồng bộ ngay lập tức.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
