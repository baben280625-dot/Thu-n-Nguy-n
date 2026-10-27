import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Phone,
  Plus,
  Users,
  Eye,
  Edit,
  ShieldAlert,
  Download,
  AlertTriangle,
  RefreshCw,
  CheckSquare,
  Square,
  Sparkles,
  Sheet,
} from 'lucide-react';
import { Lead, LeadStatus, User } from '../types';
import { formatDateVN, formatDateTimeVN, normalizeVietnamesePhone } from '../utils/phone';
import { db } from '../services/db';
import { GoogleSheetSyncCard } from '../components/GoogleSheetSyncCard';

interface LeadsViewProps {
  currentUser: User;
  onViewLead: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onCallLead: (lead: Lead) => void;
  onOpenCreateModal: () => void;
  onOpenBatchAssign: (selectedIds: string[]) => void;
  onRefresh?: () => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  currentUser,
  onViewLead,
  onEditLead,
  onCallLead,
  onOpenCreateModal,
  onOpenBatchAssign,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('ALL');
  const [showSyncCard, setShowSyncCard] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | 'ALL'>('ALL');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('ALL');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [filterUncontacted, setFilterUncontacted] = useState(false);
  const [filterDuplicatesOnly, setFilterDuplicatesOnly] = useState(false);

  // Bulk Selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const campaigns = db.getCampaigns();
  const allUsers = db.getUsers();

  // Load leads based on current filter & RBAC
  const rawLeads = db.getLeads(currentUser, {
    search: searchTerm,
    campaignId: selectedCampaign,
    status: selectedStatus,
    assignedTo: selectedAssignee,
    overdueOnly: filterOverdue,
    uncontactedOnly: filterUncontacted,
  });

  // Filter potential duplicates if checked
  const filteredLeads = useMemo(() => {
    if (!filterDuplicatesOnly) return rawLeads;

    // Detect identical phones or identical names across different leads
    const phoneCounts: Record<string, number> = {};
    const nameCounts: Record<string, number> = {};

    db.getLeads(currentUser).forEach((l) => {
      if (l.phoneNormalized) {
        phoneCounts[l.phoneNormalized] = (phoneCounts[l.phoneNormalized] || 0) + 1;
      }
      nameCounts[l.fullName.toLowerCase().trim()] = (nameCounts[l.fullName.toLowerCase().trim()] || 0) + 1;
    });

    return rawLeads.filter(
      (l) =>
        (l.phoneNormalized && phoneCounts[l.phoneNormalized] > 1) ||
        nameCounts[l.fullName.toLowerCase().trim()] > 1 ||
        l.relatedCampaignIds.length > 1
    );
  }, [rawLeads, filterDuplicatesOnly, currentUser]);

  const totalPages = Math.ceil(filteredLeads.length / pageSize) || 1;
  const paginatedLeads = filteredLeads.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSelectAll = () => {
    if (selectedLeadIds.length === paginatedLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(paginatedLeads.map((l) => l.id));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    const headers = [
      'Mã KH',
      'Họ Tên',
      'Số Điện Thoại Gốc',
      'Số Chuẩn Hóa',
      'Địa Chỉ',
      'Nhu Cầu BĐS',
      'Ngân Sách',
      'Chiến Dịch',
      'Trạng Thái',
      'Nhân Viên Phụ Trách',
      'Lần Liên Hệ Cuối',
      'Ngày Tạo',
    ];

    const rows = filteredLeads.map((l) => [
      `"${l.code}"`,
      `"${l.fullName}"`,
      `"${l.phoneRaw}"`,
      `"${l.phoneNormalized}"`,
      `"${l.addressText || ''}"`,
      `"${l.interestMessage || ''}"`,
      `"${l.needFinance || ''}"`,
      `"${l.firstSourceCampaignName || ''}"`,
      `"${l.leadStatus}"`,
      `"${l.assignedToName || ''}"`,
      `"${l.lastContactAt || ''}"`,
      `"${l.createdAt}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RealCore_KhachHang_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusLabel = (status: LeadStatus) => {
    switch (status) {
      case 'NEW':
        return 'Khách mới';
      case 'UNCONTACTED':
        return 'Chưa liên hệ';
      case 'CONTACTING':
        return 'Đang liên hệ';
      case 'CONNECTED':
        return 'Đã kết nối';
      case 'POTENTIAL':
        return 'Khách tiềm năng';
      case 'APPOINTMENT_SET':
        return 'Đã đặt lịch hẹn';
      case 'SITE_VISIT':
        return 'Đã xem đất';
      case 'NEGOTIATING':
        return 'Đang thương lượng';
      case 'DEAL_CLOSED':
        return 'Đã giao dịch';
      case 'NO_DEMAND':
        return 'Không còn nhu cầu';
      case 'INVALID_PHONE':
        return 'Sai số điện thoại';
      case 'DO_NOT_CONTACT':
        return 'Không liên hệ (DNC)';
      default:
        return status;
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">
            Danh Sách Khách Hàng Tiềm Năng
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tìm thấy <strong className="text-emerald-700">{filteredLeads.length}</strong> khách hàng phù hợp điều kiện lọc.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser.role === 'ADMIN' && selectedLeadIds.length > 0 && (
            <button
              onClick={() => onOpenBatchAssign(selectedLeadIds)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Phân Công ({selectedLeadIds.length})</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>

          <button
            onClick={() => setShowSyncCard(!showSyncCard)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Sheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>{showSyncCard ? 'Ẩn Ô Nhập Link' : 'Nhập Link Google Sheet'}</span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Khách Hàng</span>
          </button>
        </div>
      </div>

      {/* Google Sheet Sync Card (if open or if lead list is empty) */}
      {(showSyncCard || rawLeads.length === 0) && (
        <GoogleSheetSyncCard
          currentUser={currentUser}
          onSyncComplete={() => {
            if (onRefresh) onRefresh();
          }}
        />
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tên, số điện thoại, khu vực, nhu cầu..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Campaign Filter */}
          <div>
            <select
              value={selectedCampaign}
              onChange={(e) => {
                setSelectedCampaign(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">Tất cả chiến dịch ({campaigns.length})</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="NEW">Khách mới</option>
              <option value="UNCONTACTED">Chưa liên hệ</option>
              <option value="CONTACTING">Đang liên hệ</option>
              <option value="CONNECTED">Đã kết nối</option>
              <option value="POTENTIAL">Khách tiềm năng</option>
              <option value="APPOINTMENT_SET">Đã đặt lịch hẹn</option>
              <option value="SITE_VISIT">Đã đi xem đất</option>
              <option value="NEGOTIATING">Đang thương lượng</option>
              <option value="DEAL_CLOSED">Đã giao dịch</option>
              <option value="NO_DEMAND">Không còn nhu cầu</option>
              <option value="INVALID_PHONE">Sai số điện thoại</option>
              <option value="DO_NOT_CONTACT">Không liên hệ (DNC)</option>
            </select>
          </div>

          {/* Assignee Filter (Only Admin sees all agents filter) */}
          <div>
            <select
              value={selectedAssignee}
              onChange={(e) => {
                setSelectedAssignee(e.target.value);
                setCurrentPage(1);
              }}
              disabled={currentUser.role === 'AGENT'}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-60"
            >
              <option value="ALL">Tất cả nhân viên phụ trách</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Checkbox Tags */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={filterOverdue}
              onChange={(e) => {
                setFilterOverdue(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>Đến hạn / Quá hạn chăm sóc</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={filterUncontacted}
              onChange={(e) => {
                setFilterUncontacted(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>Chưa liên hệ lần nào</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={filterDuplicatesOnly}
              onChange={(e) => {
                setFilterDuplicatesOnly(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span>Khách trùng nguồn / nhiều chiến dịch</span>
          </label>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                {currentUser.role === 'ADMIN' && (
                  <th className="p-3 w-8">
                    <button onClick={handleSelectAll} className="text-slate-500 hover:text-slate-800">
                      {selectedLeadIds.length === paginatedLeads.length && paginatedLeads.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                )}
                <th className="p-3 font-semibold">Mã KH</th>
                <th className="p-3 font-semibold">Họ Tên</th>
                <th className="p-3 font-semibold">Số Điện Thoại</th>
                <th className="p-3 font-semibold">Địa Chỉ</th>
                <th className="p-3 font-semibold">Nhu Cầu & Sản Phẩm</th>
                <th className="p-3 font-semibold">Tài Chính</th>
                <th className="p-3 font-semibold">Chiến Dịch</th>
                <th className="p-3 font-semibold">Trạng Thái</th>
                <th className="p-3 font-semibold">Phụ Trách</th>
                <th className="p-3 font-semibold text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400">
                    Không tìm thấy khách hàng nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const phoneCheck = normalizeVietnamesePhone(lead.phoneRaw);
                  const isSelected = selectedLeadIds.includes(lead.id);

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      {currentUser.role === 'ADMIN' && (
                        <td className="p-3">
                          <button
                            onClick={() => handleToggleSelectOne(lead.id)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="p-3 font-mono font-bold text-slate-500 uppercase">{lead.code}</td>
                      <td className="p-3">
                        <button
                          onClick={() => onViewLead(lead)}
                          className="font-bold text-slate-900 hover:text-emerald-700 hover:underline text-left block"
                        >
                          {lead.fullName}
                        </button>
                        {lead.relatedCampaignIds.length > 1 && (
                          <span className="text-[10px] text-purple-700 font-semibold block">
                            Thuộc {lead.relatedCampaignIds.length} chiến dịch
                          </span>
                        )}
                      </td>
                      <td className="p-3 tabular-nums font-semibold text-slate-800 whitespace-nowrap">
                        {phoneCheck.formatted}
                        {!phoneCheck.isValid && (
                          <span className="block text-[10px] text-red-600 font-normal">
                            Không hợp lệ
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-600 max-w-[140px] truncate">
                        {lead.addressText || '—'}
                      </td>
                      <td className="p-3 text-slate-700 max-w-[200px] truncate" title={lead.interestMessage}>
                        {lead.interestMessage || '—'}
                      </td>
                      <td className="p-3 text-emerald-700 font-bold whitespace-nowrap">
                        {lead.needFinance || '—'}
                      </td>
                      <td className="p-3 text-slate-600 max-w-[140px] truncate">
                        {lead.firstSourceCampaignName || '—'}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">
                          {getStatusLabel(lead.leadStatus)}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        {lead.assignedToName || 'Chưa giao'}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onCallLead(lead)}
                            disabled={!phoneCheck.canCall || lead.doNotContact}
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 rounded transition-colors"
                            title="Gọi điện ngay"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onViewLead(lead)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                            title="Xem chi tiết hồ sơ"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditLead(lead)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Hiển thị trang <strong>{currentPage}</strong> trên <strong>{totalPages}</strong> ({filteredLeads.length} khách)
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white text-slate-700 disabled:opacity-40"
            >
              Trước
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-2.5 py-1 border border-slate-300 rounded bg-white text-slate-700 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
