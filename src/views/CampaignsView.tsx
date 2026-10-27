import React from 'react';
import {
  Megaphone,
  Users,
  PhoneCall,
  TrendingUp,
  Calendar,
  Sheet,
  ArrowRight,
} from 'lucide-react';
import { Campaign, User } from '../types';
import { formatDateVN } from '../utils/phone';
import { db } from '../services/db';
import { GoogleSheetSyncCard } from '../components/GoogleSheetSyncCard';

interface CampaignsViewProps {
  currentUser: User;
  onFilterByCampaign: (campaignId: string) => void;
  onOpenImportModal: () => void;
  onRefresh?: () => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  currentUser,
  onFilterByCampaign,
  onOpenImportModal,
  onRefresh,
}) => {
  const campaigns = db.getCampaigns();
  const leads = db.getLeads(currentUser);
  const users = db.getUsers();

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 leading-tight">
            Chiến Dịch Bất Động Sản ({campaigns.length})
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý chiến dịch tiếp thị và đồng bộ nguồn dữ liệu khách hàng từ Google Sheets.
          </p>
        </div>

        <button
          onClick={onOpenImportModal}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
        >
          <Megaphone className="w-4 h-4" />
          <span>Nhập Dữ Liệu Sheet Mới</span>
        </button>
      </div>

      {/* Campaign Cards or Empty State */}
      {campaigns.length === 0 ? (
        <div className="space-y-4">
          <GoogleSheetSyncCard
            currentUser={currentUser}
            onSyncComplete={() => {
              if (onRefresh) onRefresh();
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {campaigns.map((camp) => {
          const campLeads = leads.filter(
            (l) => l.firstSourceCampaignId === camp.id || l.relatedCampaignIds.includes(camp.id)
          );
          const contacted = campLeads.filter((l) => l.lastContactAt).length;
          const potential = campLeads.filter(
            (l) => ['POTENTIAL', 'APPOINTMENT_SET', 'SITE_VISIT', 'NEGOTIATING', 'DEAL_CLOSED'].includes(l.leadStatus)
          ).length;
          const closed = campLeads.filter((l) => l.leadStatus === 'DEAL_CLOSED').length;
          const rate = campLeads.length > 0 ? Math.round((contacted / campLeads.length) * 100) : 0;

          return (
            <div
              key={camp.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-500 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-sm text-slate-900 leading-snug">
                    {camp.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 shrink-0">
                    {camp.status}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Sheet className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">Sheet: {camp.sourceSheetTitle}</span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Tỷ lệ tiếp cận:</span>
                    <span className="font-bold tabular-nums">{rate}% ({contacted}/{campLeads.length})</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full transition-all"
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-lg text-center text-xs">
                <div>
                  <div className="text-slate-400">Khách</div>
                  <div className="font-bold text-slate-900 tabular-nums">{campLeads.length}</div>
                </div>
                <div>
                  <div className="text-slate-400">Tiềm năng</div>
                  <div className="font-bold text-purple-700 tabular-nums">{potential}</div>
                </div>
                <div>
                  <div className="text-slate-400">Giao dịch</div>
                  <div className="font-bold text-emerald-800 tabular-nums">{closed}</div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] text-slate-400 tabular-nums">
                  Tạo ngày: {formatDateVN(camp.createdAt)}
                </div>
                <button
                  onClick={() => onFilterByCampaign(camp.id)}
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                >
                  <span>Xem khách hàng</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};
