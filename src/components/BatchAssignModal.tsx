import React, { useState } from 'react';
import { X, Users, Check } from 'lucide-react';
import { User } from '../types';
import { db } from '../services/db';

interface BatchAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLeadIds: string[];
  currentUser: User;
  onAssigned: () => void;
}

export const BatchAssignModal: React.FC<BatchAssignModalProps> = ({
  isOpen,
  onClose,
  selectedLeadIds,
  currentUser,
  onAssigned,
}) => {
  const [targetAgentId, setTargetAgentId] = useState('');
  const users = db.getUsers().filter((u) => u.isActive);

  if (!isOpen) return null;

  const handleAssign = () => {
    if (!targetAgentId) return;
    db.batchAssignLeads(selectedLeadIds, targetAgentId, currentUser);
    onAssigned();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-slate-900 text-sm">
              Phân Công Hàng Loạt Khách Hàng
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-xs text-slate-600">
            Bạn đang chọn phân công <strong>{selectedLeadIds.length}</strong> khách hàng tiềm năng cho chuyên viên kinh doanh:
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Chọn chuyên viên kinh doanh:
            </label>
            <select
              value={targetAgentId}
              onChange={(e) => setTargetAgentId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">-- Chọn nhân viên --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.role === 'ADMIN' ? 'Quản trị' : 'Kinh doanh'})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Hủy
            </button>
            <button
              onClick={handleAssign}
              disabled={!targetAgentId}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-colors shadow-xs"
            >
              Xác Nhận Phân Công
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
