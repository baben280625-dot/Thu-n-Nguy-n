import React, { useState } from 'react';
import {
  Sheet,
  Link as LinkIcon,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Info,
  Upload,
} from 'lucide-react';
import { User } from '../types';
import { parseGoogleSheetUrl, syncGoogleSheetFromUrl, GoogleSheetSyncResult } from '../services/sheetsSync';

interface GoogleSheetSyncCardProps {
  currentUser: User;
  onSyncComplete: () => void;
  compact?: boolean;
}

export const GoogleSheetSyncCard: React.FC<GoogleSheetSyncCardProps> = ({
  currentUser,
  onSyncComplete,
  compact = false,
}) => {
  const [sheetUrl, setSheetUrl] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<GoogleSheetSyncResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showManualCsvModal, setShowManualCsvModal] = useState(false);
  const [manualCsvContent, setManualCsvContent] = useState('');

  const parsed = parseGoogleSheetUrl(sheetUrl);

  const handleSyncSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!sheetUrl.trim() && !manualCsvContent.trim()) {
      setErrorMessage('Vui lòng nhập đường link Google Sheet hoặc ID bảng tính.');
      return;
    }

    setIsSyncing(true);
    setErrorMessage(null);
    setSyncResult(null);

    try {
      const result = await syncGoogleSheetFromUrl(
        sheetUrl.trim() || '1RtTVt93QKonyTKOpgpPDT0_67FjaK8DvvlSEzFmWyFA',
        currentUser,
        {
          customCampaignName: campaignName.trim() || undefined,
          rawCsvContent: manualCsvContent.trim() || undefined,
        }
      );
      setSyncResult(result);
      setShowManualCsvModal(false);
      onSyncComplete();
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Không thể đồng bộ từ link Google Sheet. Vui lòng kiểm tra lại quyền truy cập hoặc định dạng file.'
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUsePresetLink = () => {
    setSheetUrl('https://docs.google.com/spreadsheets/d/1RtTVt93QKonyTKOpgpPDT0_67FjaK8DvvlSEzFmWyFA/edit#gid=0');
    setCampaignName('Chiến Dịch Lô Góc 258m2 & 200m2');
    setErrorMessage(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-slate-900 text-white p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Sheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Nhập Link Google Sheet Để Đồng Bộ Data Khách Hàng Lên CRM</span>
                <span className="px-2 py-0.5 bg-emerald-500/30 text-emerald-300 text-[10px] font-semibold rounded-full border border-emerald-400/30">
                  Tự động nhận diện
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Dán đường link Google Sheet bất kỳ — Hệ thống tự trích xuất thông tin khách, SĐT và toàn bộ lịch sử chăm sóc L1-L12
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleUsePresetLink}
            className="self-start sm:self-auto px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Dán Link Mẫu (DATA CHIẾN DỊCH)</span>
          </button>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="p-4 sm:p-5 space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setShowManualCsvModal(true)}
              className="text-xs font-bold text-red-700 underline shrink-0 hover:text-red-900"
            >
              Dán nội dung CSV
            </button>
          </div>
        )}

        {syncResult && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-sm">{syncResult.message}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200 text-slate-700">
              <div className="p-2 bg-white rounded-lg border border-emerald-100">
                <span className="text-[11px] text-slate-400">Chiến dịch tạo mới</span>
                <div className="font-bold text-slate-900 truncate">{syncResult.campaignName}</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-emerald-100">
                <span className="text-[11px] text-slate-400">Khách hàng mới tạo</span>
                <div className="font-bold text-emerald-700 tabular-nums text-sm">{syncResult.createdLeads} khách</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-emerald-100">
                <span className="text-[11px] text-slate-400">Ghi chú chăm sóc L1-L12</span>
                <div className="font-bold text-blue-700 tabular-nums text-sm">{syncResult.notesMigrated} ghi chú</div>
              </div>
              <div className="p-2 bg-white rounded-lg border border-emerald-100">
                <span className="text-[11px] text-slate-400">Lịch hẹn / Task đã tạo</span>
                <div className="font-bold text-purple-700 tabular-nums text-sm">{syncResult.tasksCreated} lịch</div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSyncSubmit} className="space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Input Link Google Sheet */}
            <div className="lg:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Đường Link Google Sheet (URL):
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={sheetUrl}
                  onChange={(e) => {
                    setSheetUrl(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/1RtTVt93QKonyTKOpgpPDT0_67FjaK8DvvlSEzFmWyFA/edit#gid=0"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
              {parsed.isValid && (
                <div className="text-[11px] text-emerald-700 font-mono flex items-center gap-1.5 pt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    Đã nhận diện Spreadsheet ID: <strong>{parsed.spreadsheetId}</strong>
                    {parsed.gid ? ` (Sheet GID: ${parsed.gid})` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Campaign Name */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700">
                Tên Chiến Dịch Trên CRM:
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="VD: Chiến Dịch Đất Củ Chi Mới"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Hỗ trợ cả link Google Sheet công khai (Bất kỳ ai có liên kết) và tệp CSV sao lưu
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowManualCsvModal(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Dán CSV / Tải Lên</span>
              </button>

              <button
                type="submit"
                disabled={isSyncing || (!sheetUrl.trim() && !manualCsvContent.trim())}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang Đồng Bộ Data...' : 'Đồng Bộ Lên CRM Ngay'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Manual CSV Modal */}
        {showManualCsvModal && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Dán Nội Dung Bảng Tính Hoặc Tải Lên Tệp CSV / Excel</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowManualCsvModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Thu gọn
              </button>
            </div>
            <textarea
              rows={4}
              value={manualCsvContent}
              onChange={(e) => setManualCsvContent(e.target.value)}
              placeholder="Dán nội dung CSV từ Google Sheet vào đây (hoặc copy từ file Excel)..."
              className="w-full p-3 font-mono text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowManualCsvModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleSyncSubmit()}
                disabled={!manualCsvContent.trim() || isSyncing}
                className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs"
              >
                Đồng Bộ Từ Nội Dung Này
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
