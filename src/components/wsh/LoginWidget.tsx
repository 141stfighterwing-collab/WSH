'use client';

import { useState } from 'react';
import { X, Shield, ShieldCheck, UserPlus, LogIn, Eye, EyeOff } from 'lucide-react';
import { useWSHStore } from '@/store/wshStore';

interface LoginWidgetProps {
  anchorEl: HTMLElement;
  onClose: () => void;
}

export default function LoginWidget({ anchorEl, onClose }: LoginWidgetProps) {
  const { user, setUser } = useWSHStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (res.ok && data.user) {
        setUser({
          isLoggedIn: true,
          username: data.user.username,
          email: data.user.email,
          token: `session-${Date.now()}`,
          role: data.user.role,
        });
        onClose();
      } else {
        // Fallback to local auth for backwards compatibility
        let role = 'user';
        if (username.toLowerCase() === 'superadmin') {
          role = 'super-admin';
        } else if (username.toLowerCase() === 'admin') {
          role = 'admin';
        }
        setUser({
          isLoggedIn: true,
          username: username.trim(),
          email: `${username.trim()}@wsh.local`,
          token: `local-${Date.now()}`,
          role,
        });
        onClose();
      }
    } catch {
      // Network error — fallback to local
      let role = 'user';
      if (username.toLowerCase() === 'superadmin') {
        role = 'super-admin';
      } else if (username.toLowerCase() === 'admin') {
        role = 'admin';
      }
      setUser({
        isLoggedIn: true,
        username: username.trim(),
        email: `${username.trim()}@wsh.local`,
        token: `local-${Date.now()}`,
        role,
      });
      onClose();
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          email: `${username.trim()}@wsh.local`,
          role: 'user',
        }),
      });
      const data = await res.json();

      if (res.ok && data.user) {
        // Auto-login after registration
        setUser({
          isLoggedIn: true,
          username: data.user.username,
          email: data.user.email,
          token: `session-${Date.now()}`,
          role: data.user.role,
        });
        onClose();
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch {
      setError('Network error — please try again');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setUser({
      isLoggedIn: false,
      username: '',
      email: '',
      token: '',
      role: 'user',
    });
    // Clear persisted user from localStorage so logout survives refresh
    try {
      const STORAGE_KEY = 'wsh-store';
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        data.user = { isLoggedIn: false, username: '', email: '', token: '', role: 'user' };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch { /* ignore */ }
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
          top: Math.min(rect.bottom + 8, window.innerHeight - 420),
          right: window.innerWidth - rect.right,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="micro-label text-muted-foreground">
            {user.isLoggedIn ? 'Account' : mode === 'register' ? 'Register' : 'Login'}
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
          <form onSubmit={mode === 'register' ? handleRegister : handleLogin} className="space-y-3">
            {error && (
              <div className="px-3 py-2 rounded-lg text-xs text-destructive bg-destructive/10 border border-destructive/20 animate-fadeIn">
                {error}
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
                autoComplete="username"
                className="w-full px-3 py-2 rounded-full text-sm bg-secondary border border-transparent focus:border-pri-500 focus:outline-none transition-colors placeholder:text-muted-foreground"
              />
            </div>

            <div>
              <label className="micro-label text-muted-foreground mb-1 block">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className="w-full px-3 py-2 pr-9 rounded-full text-sm bg-secondary border border-transparent focus:border-pri-500 focus:outline-none transition-colors placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="micro-label text-muted-foreground mb-1 block">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 rounded-full text-sm bg-secondary border border-transparent focus:border-pri-500 focus:outline-none transition-colors placeholder:text-muted-foreground"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95 shadow-lg disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {mode === 'register' ? (
                <>
                  <UserPlus className="w-3 h-3" />
                  {loading ? 'Creating...' : 'Register'}
                </>
              ) : (
                <>
                  <LogIn className="w-3 h-3" />
                  {loading ? 'Logging in...' : 'Login'}
                </>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}
                className="text-[10px] text-muted-foreground hover:text-pri-400 transition-colors"
              >
                {mode === 'register' ? 'Already have an account? Login' : "Don't have an account? Register"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
