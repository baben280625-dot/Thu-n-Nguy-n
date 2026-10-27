import React, { useState } from 'react';
import { X, ArrowRightLeft, Check, ShieldCheck, Edit3 } from 'lucide-react';
import { SyncConflict, User } from '../types';
import { db } from '../services/db';

interface ConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: SyncConflict | null;
  currentUser: User;
  onResolved: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflict,
  currentUser,
  onResolved,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<'KEEP_CRM' | 'KEEP_SHEET' | 'MANUAL'>('KEEP_CRM');
  const [manualValue, setManualValue] = useState('');

  if (!isOpen || !conflict) return null;

  const handleResolve = () => {
    let finalValue = conflict.crmValue;
    if (selectedChoice === 'KEEP_SHEET') {
      finalValue = conflict.sheetValue;
    } else if (selectedChoice === 'MANUAL') {
      finalValue = manualValue.trim() || conflict.crmValue;
    }

    db.resolveSyncConflict(conflict.id, selectedChoice, finalValue, currentUser);
    onResolved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Xử Lý Xung Đột Dữ Liệu Đồng Bộ Google Sheets
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs space-y-1">
            <div>
              Khách hàng: <strong>{conflict.leadName}</strong>
            </div>
            <div>
              Trường dữ liệu xung đột: <strong>{conflict.fieldLabel}</strong> ({conflict.fieldName})
            </div>
            <div className="text-slate-500">
              Vị trí trong Sheet: <strong>{conflict.sourceRowKey}</strong>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              Chọn giá trị cần áp dụng chuẩn:
            </label>

            {/* Option 1: Keep CRM */}
            <div
              onClick={() => setSelectedChoice('KEEP_CRM')}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedChoice === 'KEEP_CRM'
                  ? 'border-emerald-600 bg-emerald-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Lựa chọn 1: Giữ giá trị CRM (Khuyên dùng)
                </span>
                {selectedChoice === 'KEEP_CRM' && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
              <div className="text-xs text-slate-700 mt-1 font-mono bg-white p-2 rounded border border-slate-200">
                {String(conflict.crmValue)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                CRM là nguồn dữ liệu chuẩn cho lịch sử tương tác và ghi chú của nhân viên.
              </p>
            </div>

            {/* Option 2: Keep Sheet */}
            <div
              onClick={() => setSelectedChoice('KEEP_SHEET')}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedChoice === 'KEEP_SHEET'
                  ? 'border-emerald-600 bg-emerald-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Lựa chọn 2: Ghi đè bằng giá trị Google Sheets
                </span>
                {selectedChoice === 'KEEP_SHEET' && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
              <div className="text-xs text-slate-700 mt-1 font-mono bg-white p-2 rounded border border-slate-200">
                {String(conflict.sheetValue)}
              </div>
            </div>

            {/* Option 3: Manual Merge */}
            <div
              onClick={() => setSelectedChoice('MANUAL')}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedChoice === 'MANUAL'
                  ? 'border-emerald-600 bg-emerald-50/50'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">
                  Lựa chọn 3: Hợp nhất thủ công
                </span>
                {selectedChoice === 'MANUAL' && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
              <input
                type="text"
                value={manualValue}
                onChange={(e) => {
                  setSelectedChoice('MANUAL');
                  setManualValue(e.target.value);
                }}
                placeholder="Nhập giá trị hợp nhất chính xác..."
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Bỏ Qua
            </button>
            <button
              onClick={handleResolve}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              Lưu Quyết Định & Đồng Bộ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
