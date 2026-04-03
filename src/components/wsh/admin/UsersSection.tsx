'use client';

import { useState, useCallback, useEffect } from 'react';
import { Users, Plus, Loader2 } from 'lucide-react';
import type { UserData } from './types';

export default function UsersSection() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', role: 'user' });
  const [showNewUser, setShowNewUser] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    }
    setLoading(false);
    setFetched(true);
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (data.user) {
        setUsers((prev) => [data.user, ...prev]);
        setNewUser({ username: '', email: '', role: 'user' });
        setShowNewUser(false);
      }
    } catch {
      setUsers((prev) => [
        {
          id: `usr-${Date.now()}`,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      setNewUser({ username: '', email: '', role: 'user' });
      setShowNewUser(false);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-3 animate-fadeIn">
      <div className="flex items-center justify-between">
        <span className="micro-label text-muted-foreground">Registered Users</span>
        <button
          onClick={() => setShowNewUser(!showNewUser)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-all active:scale-95"
        >
          <Plus className="w-2.5 h-2.5" />
          Create User
        </button>
      </div>

      {showNewUser && (
        <div className="p-3 bg-secondary/30 rounded-xl border border-purple-500/20 space-y-2 animate-fadeIn">
          <input
            type="text"
            placeholder="Username"
            value={newUser.username}
            onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
          />
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="super-admin">Super Admin</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleCreateUser}
              disabled={loading}
              className="flex-1 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-600 text-white hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Create'}
            </button>
            <button
              onClick={() => setShowNewUser(false)}
              className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        <div className="grid grid-cols-[1fr_1fr_80px_60px] gap-1 px-3 py-2 bg-secondary/30 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          <span>Username</span>
          <span>Email</span>
          <span>Role</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-6 text-xs text-muted-foreground">
              No users found
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-[1fr_1fr_80px_60px] gap-1 px-3 py-2 border-t border-border/30 hover:bg-secondary/20 transition-colors items-center"
              >
                <span className="text-xs font-semibold text-foreground truncate">{user.username}</span>
                <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full w-fit ${
                    user.role === 'super-admin'
                      ? 'bg-amber-500/20 text-amber-400'
                      : user.role === 'admin'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {user.role}
                </span>
                <div className="flex items-center justify-end gap-1">
                  <button
                    className="p-1 rounded text-[9px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                    title={user.status === 'active' ? 'Ban' : 'Activate'}
                  >
                    {user.status === 'active' ? '🚫' : '✅'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
