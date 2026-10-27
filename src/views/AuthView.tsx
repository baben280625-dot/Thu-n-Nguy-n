import React, { useState } from 'react';
import {
  Building2,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { db } from '../services/db';

interface AuthViewProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login form states
  const [loginEmail, setLoginEmail] = useState('baben.280625@gmail.com');
  const [loginPassword, setLoginPassword] = useState('Thuanvipro1@');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form states
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('AGENT');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Status & errors
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const user = db.authenticate(loginEmail, loginPassword);
      setSuccessMessage(`Đăng nhập thành công! Xin chào ${user.fullName}`);
      setTimeout(() => {
        onLoginSuccess(user);
      }, 300);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập không thành công.');
      setIsLoading(false);
    }
  };

  // Quick Login as the newly created Admin
  const handleQuickAdminLogin = () => {
    setLoginEmail('baben.280625@gmail.com');
    setLoginPassword('Thuanvipro1@');
    setErrorMessage(null);
    try {
      const user = db.authenticate('baben.280625@gmail.com', 'Thuanvipro1@');
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  // Handle Register
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    setIsLoading(true);
    try {
      const newUser = db.registerUser({
        fullName: regFullName,
        email: regEmail,
        password: regPassword,
        phone: regPhone,
        role: regRole,
      });

      setSuccessMessage('Đăng ký tài khoản thành công! Đang chuyển vào hệ thống...');
      setTimeout(() => {
        onLoginSuccess(newUser);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng ký không thành công.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Brand Header */}
        <div className="bg-slate-900 text-white p-6 sm:p-8 text-center relative overflow-hidden">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white mx-auto shadow-md mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">RealCore Auto Call CRM</h1>
          <p className="text-xs text-emerald-400 font-medium mt-1">
            Bất Động Sản Củ Chi & TP.HCM
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 transition-colors ${
              mode === 'LOGIN'
                ? 'bg-white text-emerald-800 border-b-2 border-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('REGISTER');
              setErrorMessage(null);
            }}
            className={`flex-1 py-3 transition-colors ${
              mode === 'REGISTER'
                ? 'bg-white text-emerald-800 border-b-2 border-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Đăng Ký Tài Khoản
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-5">
          {/* Messages */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Quick Admin Login Box (Highlighted for user) */}
          {mode === 'LOGIN' && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-emerald-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Tài khoản Quản Trị Viên (Admin)
                </span>
                <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-900 rounded text-[10px]">
                  Yêu Cầu
                </span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-0.5">
                <div>Tên: <strong className="text-slate-800">Nguyễn Thuận</strong></div>
                <div>Gmail: <code className="text-emerald-800 font-semibold font-mono">baben.280625@gmail.com</code></div>
                <div>Mật khẩu: <code className="text-emerald-800 font-semibold font-mono">Thuanvipro1@</code></div>
              </div>
              <button
                type="button"
                onClick={handleQuickAdminLogin}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Đăng Nhập Nhanh Admin (1 Click)</span>
              </button>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gmail / Email đăng nhập:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="baben.280625@gmail.com"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Mật khẩu:
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
              >
                <span>{isLoading ? 'Đang Đăng Nhập...' : 'Đăng Nhập'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn An"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gmail / Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="an.nguyen@realcore.vn"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại liên hệ
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="09xx xxx xxx"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Xác nhận mật khẩu *
                  </label>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vai trò phân quyền hệ thống:
                </label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="AGENT">Chuyên viên kinh doanh (Agent)</option>
                  <option value="ADMIN">Quản trị viên (Admin)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 mt-2"
              >
                <span>{isLoading ? 'Đang Khởi Tạo...' : 'Đăng Ký & Bắt Đầu'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-400">
          RealCore Auto Call CRM · Bảo mật & Phân quyền nội bộ
        </div>
      </div>
    </div>
  );
};
