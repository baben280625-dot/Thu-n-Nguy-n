import React from 'react';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  PhoneCall,
  CalendarClock,
  History,
  UserCog,
  BarChart3,
  Sheet,
  Settings,
  Building2,
  ShieldCheck,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { User } from '../types';

export type NavTab =
  | 'dashboard'
  | 'leads'
  | 'campaigns'
  | 'telephony'
  | 'tasks'
  | 'call_logs'
  | 'users'
  | 'reports'
  | 'sheets_sync'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: User;
  dueTasksCount: number;
  conflictsCount: number;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  dueTasksCount,
  conflictsCount,
  onLogout,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'leads', label: 'Khách hàng', icon: Users },
    { id: 'campaigns', label: 'Chiến dịch', icon: Megaphone },
    { id: 'telephony', label: 'Gọi điện (Auto Call)', icon: PhoneCall },
    { id: 'tasks', label: 'Lịch chăm sóc', icon: CalendarClock, badge: dueTasksCount },
    { id: 'call_logs', label: 'Lịch sử cuộc gọi', icon: History },
    { id: 'users', label: 'Nhân viên', icon: UserCog, adminOnly: true },
    { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
    { id: 'sheets_sync', label: 'Đồng bộ Sheets', icon: Sheet, badge: conflictsCount },
    { id: 'settings', label: 'Cài đặt & DNC', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col shrink-0 h-screen sticky top-0 border-r border-slate-800 select-none z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="overflow-hidden">
          <div className="font-bold text-base text-white tracking-tight leading-tight truncate">
            RealCore CRM
          </div>
          <div className="text-xs text-emerald-400 font-medium truncate">
            Bất Động Sản Auto Call
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Quản Lý Kinh Doanh
        </div>

        {navItems.map((item) => {
          if (item.adminOnly && currentUser.role !== 'ADMIN') {
            return null;
          }

          const isActive = currentTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-emerald-700/80 text-white font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 truncate">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-500 text-slate-950 tabular-nums">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Information & Role */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser.fullName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">
                {currentUser.fullName}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                {currentUser.role === 'ADMIN' ? (
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                ) : (
                  <UserCheck className="w-3 h-3 text-blue-400" />
                )}
                <span>{currentUser.role === 'ADMIN' ? 'Quản Trị Viên' : 'Chuyên Viên KD'}</span>
              </div>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Đăng xuất khỏi hệ thống"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
