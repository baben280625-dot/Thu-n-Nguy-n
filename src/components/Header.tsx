import {
  Search,
  PhoneCall,
  Bell,
  ArrowRightLeft,
  ShieldCheck,
  UserCheck,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { User } from '../types';
import { NavTab } from './Sidebar';

interface HeaderProps {
  currentTab: NavTab;
  currentUser: User;
  allUsers: User[];
  onSwitchUser: (userId: string) => void;
  onOpenQuickCall: () => void;
  onSelectTab: (tab: NavTab) => void;
  dueTasksCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  currentUser,
  allUsers,
  onSwitchUser,
  onOpenQuickCall,
  onSelectTab,
  dueTasksCount,
  searchQuery,
  onSearchChange,
  onLogout,
}) => {
  const getTabTitle = (tab: NavTab) => {
    switch (tab) {
      case 'dashboard':
        return { title: 'Tổng Quan Bất Động Sản', sub: 'Chỉ số hiệu quả và hoạt động đội ngũ' };
      case 'leads':
        return { title: 'Quản Lý Khách Hàng', sub: 'Danh sách khách tiềm năng, lọc và phân công' };
      case 'campaigns':
        return { title: 'Chiến Dịch Tiếp Thị', sub: '5 chiến dịch đất Củ Chi & TP.HCM' };
      case 'telephony':
        return { title: 'Tổng Đài Gọi Điện (Auto Call)', sub: 'Chế độ mô phỏng WebRTC — chưa gọi điện thật' };
      case 'tasks':
        return { title: 'Lịch Chăm Sóc Khách Hàng', sub: 'Lịch gọi lại, xem đất và hẹn gặp' };
      case 'call_logs':
        return { title: 'Lịch Sử Cuộc Gọi', sub: 'Nhật ký kết nối, thời lượng và kết quả' };
      case 'users':
        return { title: 'Quản Lý Đội Ngũ Nhân Viên', sub: 'Phân quyền Admin & Chuyên viên kinh doanh' };
      case 'reports':
        return { title: 'Báo Cáo & Phân Tích', sub: 'Tỷ lệ chuyển đổi và doanh số tiềm năng' };
      case 'sheets_sync':
        return { title: 'Đồng Bộ Google Sheets', sub: 'Đồng bộ hai chiều với ID: 1RtTVt93QKonyTKOpgpPDT0_67FjaK8DvvlSEzFmWyFA' };
      case 'settings':
        return { title: 'Cài Đặt & Danh Sách Chặn Gọi (DNC)', sub: 'Bảo mật và tuân thủ quy định cuộc gọi' };
      default:
        return { title: 'RealCore Auto Call CRM', sub: 'Bất động sản' };
    }
  };

  const { title, sub } = getTabTitle(currentTab);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-10">
      {/* Page Title & Subtitle */}
      <div className="min-w-0">
        <h1 className="text-base font-bold text-slate-900 truncate leading-tight">
          {title}
        </h1>
        <p className="text-xs text-slate-500 truncate">{sub}</p>
      </div>

      {/* Middle: Quick Search */}
      <div className="flex-1 max-w-md mx-2 hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              if (currentTab !== 'leads') {
                onSelectTab('leads');
              }
            }}
            placeholder="Tìm tên khách, số điện thoại, khu vực Củ Chi..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Due Tasks Alert */}
        <button
          onClick={() => onSelectTab('tasks')}
          title="Lịch chăm sóc cần làm"
          className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Bell className="w-4 h-4" />
          {dueTasksCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
          )}
        </button>

        {/* Quick Call Button */}
        <button
          onClick={onOpenQuickCall}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
        >
          <PhoneCall className="w-3.5 h-3.5" />
          <span>Bàn Phím Gọi</span>
        </button>

        {/* User Switcher to easily test RBAC (Admin vs Agent) */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          <span className="text-xs text-slate-500 hidden sm:inline">Tài khoản:</span>
          <select
            value={currentUser.id}
            onChange={(e) => onSwitchUser(e.target.value)}
            className="text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName} ({u.role === 'ADMIN' ? 'Admin' : 'Kinh Doanh'})
              </option>
            ))}
          </select>
        </div>

        {/* Logout Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Đăng xuất khỏi RealCore CRM"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đăng Xuất</span>
          </button>
        )}
      </div>
    </header>
  );
};
