import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  ArrowRight,
  Database,
  Download,
  Info,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  autoDetectMapping,
  ColumnMapping,
  dryRunImport,
  executeImport,
  parseExcelWorkbook,
  PRESET_CAMPAIGN_SHEETS,
} from '../services/excelImport';
import { ExcelImportPreviewRow, ImportSummary, User } from '../types';
import { db } from '../services/db';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onImportComplete: () => void;
}

type Step = 'UPLOAD' | 'SHEET_SELECT' | 'MAPPING' | 'DRY_RUN' | 'RESULT';

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onImportComplete,
}) => {
  const [step, setStep] = useState<Step>('UPLOAD');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [sheetsData, setSheetsData] = useState<Record<string, Record<string, any>[]>>({});
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [previewRows, setPreviewRows] = useState<ExcelImportPreviewRow[]>([]);
  const [dryRunStats, setDryRunStats] = useState<{
    total: number;
    willCreate: number;
    willMergeDuplicate: number;
    invalidPhone: number;
    notesToMigrate: number;
  } | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const { sheetNames: names, sheets } = parseExcelWorkbook(buffer);
        setSheetNames(names);
        setSheetsData(sheets);
        if (names.length > 0) {
          selectSheet(names[0], sheets[names[0]]);
        }
        setStep('SHEET_SELECT');
      } catch (err) {
        alert('Không thể đọc file Excel. Vui lòng kiểm tra định dạng .xlsx');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Select a preset campaign from DATA CHIẾN DỊCH (1).xlsx
  const handleLoadPreset = (sheetName: string) => {
    const preset = PRESET_CAMPAIGN_SHEETS[sheetName];
    if (!preset) return;

    const names = Object.keys(PRESET_CAMPAIGN_SHEETS);
    const dataDict: Record<string, Record<string, any>[]> = {};
    names.forEach((k) => {
      dataDict[k] = PRESET_CAMPAIGN_SHEETS[k].data;
    });

    setSheetNames(names);
    setSheetsData(dataDict);
    selectSheet(sheetName, preset.data);
    setStep('SHEET_SELECT');
  };

  const selectSheet = (name: string, data: Record<string, any>[]) => {
    setSelectedSheet(name);
    if (data.length > 0) {
      const columns = Object.keys(data[0]);
      const detected = autoDetectMapping(columns);
      setMapping(detected);
    }
  };

  const handleProceedToMapping = () => {
    if (!selectedSheet || !sheetsData[selectedSheet]) return;
    setStep('MAPPING');
  };

  const handleRunDryRun = () => {
    if (!mapping || !selectedSheet) return;
    const rawRows = sheetsData[selectedSheet];
    const existingLeads = db.getLeads(currentUser);
    const result = dryRunImport(rawRows, mapping, existingLeads);

    setPreviewRows(result.previewRows);
    setDryRunStats(result.stats);
    setStep('DRY_RUN');
  };

  const handleCommitImport = () => {
    if (!previewRows || previewRows.length === 0) return;
    setIsProcessing(true);

    // Map sheet name to campaign ID
    const campaigns = db.getCampaigns();
    const matchedCampaign = campaigns.find(
      (c) => c.name.toLowerCase().includes(selectedSheet.toLowerCase()) ||
             selectedSheet.toLowerCase().includes(c.name.toLowerCase())
    );
    const campaignId = matchedCampaign ? matchedCampaign.id : (campaigns[0]?.id || 'camp_cuchi_58');

    setTimeout(() => {
      const summary = executeImport(previewRows, campaignId, currentUser);
      setImportSummary(summary);
      setIsProcessing(false);
      setStep('RESULT');
      onImportComplete();
    }, 400);
  };

  const handleDownloadReport = () => {
    if (!importSummary) return;
    const blob = new Blob([JSON.stringify(importSummary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bao_Cao_Import_${selectedSheet}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Nhập Dữ Liệu Excel & Tự Động Chống Trùng
              </h3>
              <p className="text-xs text-slate-500">
                DATA CHIẾN DỊCH (1).xlsx — Nhận diện 5 sheet & ghi chú L1–L8
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps indicator */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
          <span className={step === 'UPLOAD' ? 'text-emerald-700 font-bold' : ''}>1. Chọn File</span>
          <span>&gt;</span>
          <span className={step === 'SHEET_SELECT' ? 'text-emerald-700 font-bold' : ''}>2. Chọn Sheet</span>
          <span>&gt;</span>
          <span className={step === 'MAPPING' ? 'text-emerald-700 font-bold' : ''}>3. Ánh Xạ Cột</span>
          <span>&gt;</span>
          <span className={step === 'DRY_RUN' ? 'text-emerald-700 font-bold' : ''}>4. Chạy Thử (Dry-Run)</span>
          <span>&gt;</span>
          <span className={step === 'RESULT' ? 'text-emerald-700 font-bold' : ''}>5. Kết Quả</span>
        </div>

        {/* Step 1: Upload or Choose Preset */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'UPLOAD' && (
            <div className="space-y-6">
              {/* File upload drag-and-drop */}
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-emerald-500 transition-colors bg-slate-50">
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-800">
                  Tải lên file Excel (.xlsx hoặc .xls)
                </h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Kéo thả file `DATA CHIẾN DỊCH (1).xlsx` vào đây hoặc nhấn duyệt file
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs">
                  <span>Duyệt Chọn File Excel</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Or Select Built-in Preset Sheets from DATA CHIẾN DỊCH (1).xlsx */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span>Hoặc Chọn Nhanh Sheet Có Sẵn Từ DATA CHIẾN DỊCH (1).xlsx</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.keys(PRESET_CAMPAIGN_SHEETS).map((name) => (
                    <button
                      key={name}
                      onClick={() => handleLoadPreset(name)}
                      className="p-3 bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-lg text-left transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900">{name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {PRESET_CAMPAIGN_SHEETS[name].data.length} dòng mẫu kiểm thử
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Sheet Select */}
          {step === 'SHEET_SELECT' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-800">
                Chọn Sheet Chiến Dịch Cần Nhập:
              </h4>
              <div className="space-y-2">
                {sheetNames.map((name) => {
                  const rowCount = sheetsData[name]?.length || 0;
                  const isSelected = selectedSheet === name;
                  return (
                    <div
                      key={name}
                      onClick={() => selectSheet(name, sheetsData[name])}
                      className={`p-3.5 rounded-lg border cursor-pointer transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/50'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet
                          className={`w-5 h-5 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`}
                        />
                        <div>
                          <div className="font-bold text-xs text-slate-900">{name}</div>
                          <div className="text-xs text-slate-500 tabular-nums">
                            {rowCount} dòng dữ liệu phát hiện
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-emerald-600" />}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep('UPLOAD')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Quay Lại
                </button>
                <button
                  onClick={handleProceedToMapping}
                  disabled={!selectedSheet}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Tiếp Tục Ánh Xạ Cột
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Column Mapping */}
          {step === 'MAPPING' && mapping && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  Hệ thống tự động phát hiện tiêu đề cột cho sheet <strong>{selectedSheet}</strong>. Bạn có thể kiểm tra hoặc điều chỉnh lại các trường bên dưới:
                </div>
              </div>

              {/* Mapping fields */}
              {(() => {
                const availableCols = sheetsData[selectedSheet]?.[0]
                  ? Object.keys(sheetsData[selectedSheet][0])
                  : [];

                return (
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Tên khách hàng (hoặc cột `//`) *
                        </label>
                        <select
                          value={mapping.fullNameCol}
                          onChange={(e) => setMapping({ ...mapping, fullNameCol: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
                        >
                          {availableCols.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Số điện thoại (SĐT / Phone) *
                        </label>
                        <select
                          value={mapping.phoneCol}
                          onChange={(e) => setMapping({ ...mapping, phoneCol: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
                        >
                          {availableCols.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Địa chỉ / Khu vực
                        </label>
                        <select
                          value={mapping.addressCol || ''}
                          onChange={(e) => setMapping({ ...mapping, addressCol: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
                        >
                          <option value="">-- Không ánh xạ --</option>
                          {availableCols.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Thông điệp / Sản phẩm quan tâm
                        </label>
                        <select
                          value={mapping.interestCol || ''}
                          onChange={(e) => setMapping({ ...mapping, interestCol: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
                        >
                          <option value="">-- Không ánh xạ --</option>
                          {availableCols.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Tài chính / Ngân sách
                        </label>
                        <select
                          value={mapping.financeCol || ''}
                          onChange={(e) => setMapping({ ...mapping, financeCol: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
                        >
                          <option value="">-- Không ánh xạ --</option>
                          {availableCols.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nhân viên phụ trách
                        </label>
                        <select
                          value={mapping.assignedCol || ''}
                          onChange={(e) => setMapping({ ...mapping, assignedCol: e.target.value })}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded text-xs"
                        >
                          <option value="">-- Không ánh xạ --</option>
                          {availableCols.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Detected Legacy L1-L8 notes */}
                    <div>
                      <div className="text-xs font-semibold text-slate-700 mb-1">
                        Các cột ghi chú lịch sử L1–L8 được phát hiện ({mapping.legacyNoteCols.length} cột):
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {mapping.legacyNoteCols.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">Không có cột L1-L8</span>
                        ) : (
                          mapping.legacyNoteCols.map((col) => (
                            <span
                              key={col}
                              className="px-2 py-1 bg-amber-100 text-amber-900 rounded text-xs font-medium"
                            >
                              {col}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep('SHEET_SELECT')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Quay Lại
                </button>
                <button
                  onClick={handleRunDryRun}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Chạy Thử Dry-Run & Kiểm Tra Trùng
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Dry Run Preview */}
          {step === 'DRY_RUN' && dryRunStats && (
            <div className="space-y-4">
              {/* Stats badges */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                  <div className="text-xs text-slate-500">Tổng số dòng</div>
                  <div className="text-base font-bold text-slate-900 tabular-nums">
                    {dryRunStats.total}
                  </div>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-center">
                  <div className="text-xs text-emerald-700">Tạo mới</div>
                  <div className="text-base font-bold text-emerald-800 tabular-nums">
                    {dryRunStats.willCreate}
                  </div>
                </div>
                <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200 text-center">
                  <div className="text-xs text-blue-700">Gộp trùng SĐT</div>
                  <div className="text-base font-bold text-blue-800 tabular-nums">
                    {dryRunStats.willMergeDuplicate}
                  </div>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-center">
                  <div className="text-xs text-amber-700">SĐT cần kiểm tra</div>
                  <div className="text-base font-bold text-amber-800 tabular-nums">
                    {dryRunStats.invalidPhone}
                  </div>
                </div>
                <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-200 text-center">
                  <div className="text-xs text-purple-700">Ghi chú L1–L8</div>
                  <div className="text-base font-bold text-purple-800 tabular-nums">
                    {dryRunStats.notesToMigrate}
                  </div>
                </div>
              </div>

              {/* Preview table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700">
                  Xem Trước 5 Dòng Đầu Tiên:
                </div>
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Khách Hàng</th>
                        <th className="p-2">Số Điện Thoại</th>
                        <th className="p-2">Sản Phẩm / Nhu Cầu</th>
                        <th className="p-2">Tài Chính</th>
                        <th className="p-2">Dự Kiến Xử Lý</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewRows.slice(0, 5).map((row) => (
                        <tr key={row.rowNumber} className="hover:bg-slate-50">
                          <td className="p-2 text-slate-400 tabular-nums">{row.rowNumber}</td>
                          <td className="p-2 font-semibold text-slate-900">{row.mapped.fullName}</td>
                          <td className="p-2 tabular-nums">
                            {row.mapped.phoneNormalized || row.mapped.phoneRaw}
                          </td>
                          <td className="p-2 text-slate-600 truncate max-w-[150px]">
                            {row.mapped.interestMessage || '—'}
                          </td>
                          <td className="p-2 text-emerald-700 font-medium">
                            {row.mapped.needFinance || '—'}
                          </td>
                          <td className="p-2">
                            {row.status === 'VALID' ? (
                              <span className="text-emerald-700 font-semibold">Tạo mới</span>
                            ) : row.status === 'DUPLICATE_PHONE' ? (
                              <span className="text-blue-700 font-semibold">Gộp hồ sơ trùng SĐT</span>
                            ) : (
                              <span className="text-red-600 font-semibold">SĐT không hợp lệ</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  onClick={() => setStep('MAPPING')}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Quay Lại Sửa Mapping
                </button>
                <button
                  onClick={handleCommitImport}
                  disabled={isProcessing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang Ghi Dữ Liệu...</span>
                    </>
                  ) : (
                    <span>Xác Nhận & Ghi Dữ Liệu Vào CRM</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Result Summary */}
          {step === 'RESULT' && importSummary && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Nhập Dữ Liệu Hoàn Tất Thành Công!
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Đã ghi vào CRM theo quy tắc chống trùng số điện thoại
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-left max-w-lg mx-auto bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <div className="text-slate-400">Tổng dòng xử lý:</div>
                  <div className="font-bold text-slate-900 tabular-nums">
                    {importSummary.totalRows}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Hồ sơ tạo mới:</div>
                  <div className="font-bold text-emerald-700 tabular-nums">
                    {importSummary.createdLeads}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Hồ sơ gộp trùng:</div>
                  <div className="font-bold text-blue-700 tabular-nums">
                    {importSummary.duplicateRows}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Ghi chú L1–L8 đã chuyển:</div>
                  <div className="font-bold text-purple-700 tabular-nums">
                    {importSummary.notesMigrated}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">SĐT cần kiểm tra:</div>
                  <div className="font-bold text-amber-700 tabular-nums">
                    {importSummary.invalidPhones}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400">Chiến dịch:</div>
                  <div className="font-bold text-slate-900 truncate">
                    {importSummary.campaignName}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-4">
                <button
                  onClick={handleDownloadReport}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải Báo Cáo Import (JSON)</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  Đóng & Xem Danh Sách Khách Hàng
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
