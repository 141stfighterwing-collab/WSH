'use client';

import { useState } from 'react';
import { X, Shield, ShieldCheck, Loader2 } from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

interface LoginWidgetProps {
  anchorEl: HTMLElement;
  onClose: () => void;
}

interface LoginResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    status: string;
  };
  token: string;
  message: string;
}

export default function LoginWidget({ anchorEl, onClose }: LoginWidgetProps) {
  const { user, setUser, logoutUser, saveToLocalStorage } = useWSHStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      const loginData = data as LoginResponse;

      // BUG-003 fix: role comes from server response, NOT client-side assignment
      setUser({
        isLoggedIn: true,
        username: loginData.user.username,
        email: loginData.user.email,
        token: loginData.token,
        role: loginData.user.role,
      });
      saveToLocalStorage();
      setError('');
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    onClose();
  };

  const rect = anchorEl.getBoundingClientRect();

  const getRoleBadge = () => {
    switch (user.role) {
      case 'super-admin':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <ShieldCheck className="w-2.5 h-2.5" />
            Super Admin
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/20">
            <Shield className="w-2.5 h-2.5" />
            Admin
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[99]" onClick={onClose} />

      {/* Popover */}
      <div
        className="fixed z-[100] w-72 bg-card border border-border rounded-2xl shadow-2xl p-4 animate-fadeIn"
        style={{
          top: rect.bottom + 8,
          right: window.innerWidth - rect.right,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="micro-label text-muted-foreground">
            {user.isLoggedIn ? 'Account' : 'Login'}
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {user.isLoggedIn ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
              <div className="w-10 h-10 rounded-full bg-pri-600 flex items-center justify-center text-white font-bold">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground truncate">{user.username}</p>
                  {getRoleBadge()}
                </div>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 transition-all active:scale-95"
            >
              Logout
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-[10px] font-semibold text-red-400">{error}</p>
              </div>
            )}
            <div>
              <label className="micro-label text-muted-foreground mb-1 block">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-3 py-2 rounded-full text-sm bg-secondary border border-transparent focus:border-pri-500 focus:outline-none transition-colors placeholder:text-muted-foreground"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="micro-label text-muted-foreground mb-1 block">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-3 py-2 rounded-full text-sm bg-secondary border border-transparent focus:border-pri-500 focus:outline-none transition-colors placeholder:text-muted-foreground"
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
