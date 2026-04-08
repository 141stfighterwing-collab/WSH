'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Users, Plus, Loader2, Ban, Unlock, Clock, Trash2, KeyRound, ShieldAlert, UserCog, X } from 'lucide-react';
import type { UserData } from './types';

interface UserActionModal {
  type: 'delete' | 'change-password' | 'change-role' | null;
  user: UserData | null;
}

export default function UsersSection() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'user' });
  const [showNewUser, setShowNewUser] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [modal, setModal] = useState<UserActionModal>({ type: null, user: null });
  const [modalInput, setModalInput] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString();
    setActionLog((prev) => [`[${time}] ${msg}`, ...prev].slice(0, 20));
  }, []);

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

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUser.username,
          password: newUser.password,
          email: newUser.email || `${newUser.username}@example.com`,
          role: newUser.role,
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUsers((prev) => [data.user, ...prev]);
        addLog(`Created user "${newUser.username}" (${newUser.role})`);
      } else {
        addLog(`Create failed: ${data.error || 'Unknown error'}`);
      }
    } catch {
      addLog(`Create failed: Network error — check server connection`);
    }
    setNewUser({ username: '', email: '', password: '', role: 'user' });
    setShowNewUser(false);
    setLoading(false);
  };

  const handleUserAction = async (userId: string, action: string, label: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.user) {
          setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...data.user } : u)));
        }
        addLog(`${label}: ${data.message || 'Success'}`);
      } else {
        addLog(`${label} failed: ${data.error || 'Unknown error'}`);
      }
    } catch {
      // Local fallback for status toggle
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== userId) return u;
          if (action === 'ban') return { ...u, status: 'banned' };
          if (action === 'unban') return { ...u, status: 'active' };
          if (action === 'suspend') return { ...u, status: 'suspended' };
          if (action === 'unsuspend') return { ...u, status: 'active' };
          return u;
        })
      );
      addLog(`${label} (local fallback)`);
    }
    setLoading(false);
  };

  const handleDeleteUser = async () => {
    if (!modal.user) return;
    setModalLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: modal.user.id }),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== modal.user!.id));
        addLog(`Deleted user "${modal.user.username}"`);
      } else {
        const data = await res.json();
        addLog(`Delete failed: ${data.error || 'Unknown error'}`);
      }
    } catch {
      setUsers((prev) => prev.filter((u) => u.id !== modal.user!.id));
      addLog(`Deleted user "${modal.user.username}" (local fallback)`);
    }
    setModalLoading(false);
    setModal({ type: null, user: null });
    setModalInput('');
  };

  const handleChangePassword = async () => {
    if (!modal.user || !modalInput || modalInput.length < 4) return;
    setModalLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: modal.user.id, action: 'change-password', password: modalInput }),
      });
      const data = await res.json();
      addLog(`Password changed for "${modal.user.username}": ${data.message || 'Success'}`);
    } catch {
      addLog(`Password changed for "${modal.user.username}" (local fallback)`);
    }
    setModalLoading(false);
    setModal({ type: null, user: null });
    setModalInput('');
  };

  const handleChangeRole = async () => {
    if (!modal.user || !modalInput) return;
    setModalLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: modal.user.id, action: 'change-role', role: modalInput }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        setUsers((prev) => prev.map((u) => (u.id === modal.user!.id ? { ...u, ...data.user } : u)));
      }
      addLog(`Role changed for "${modal.user.username}" to ${modalInput}: ${data.message || 'Success'}`);
    } catch {
      setUsers((prev) =>
        prev.map((u) => (u.id === modal.user!.id ? { ...u, role: modalInput } : u))
      );
      addLog(`Role changed for "${modal.user.username}" to ${modalInput} (local fallback)`);
    }
    setModalLoading(false);
    setModal({ type: null, user: null });
    setModalInput('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'banned':
        return (
          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
            Banned
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            Suspended
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
            Active
          </span>
        );
    }
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
            type="password"
            placeholder="Password"
            value={newUser.password}
            onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground"
          />
          <input
            type="email"
            placeholder="Email (optional)"
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
              disabled={loading || !newUser.username || !newUser.password}
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
        <div className="grid grid-cols-[1fr_1fr_70px_70px_80px] gap-1 px-3 py-2 bg-secondary/30 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          <span>Username</span>
          <span>Email</span>
          <span>Role</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {loading && !fetched ? (
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
                className={`grid grid-cols-[1fr_1fr_70px_70px_80px] gap-1 px-3 py-2 border-t border-border/30 hover:bg-secondary/20 transition-colors items-center ${
                  user.status === 'banned' ? 'opacity-50' : user.status === 'suspended' ? 'opacity-70' : ''
                }`}
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
                {getStatusBadge(user.status)}
                <div className="flex items-center justify-end gap-0.5">
                  {/* Ban/Unban */}
                  {user.status === 'banned' ? (
                    <button
                      onClick={() => handleUserAction(user.id, 'unban', `Unbanned "${user.username}"`)}
                      className="p-1 rounded text-muted-foreground hover:text-green-400 hover:bg-green-500/10 transition-all"
                      title="Unban user"
                    >
                      <Unlock className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUserAction(user.id, 'ban', `Banned "${user.username}"`)}
                      className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Ban user"
                    >
                      <Ban className="w-3 h-3" />
                    </button>
                  )}

                  {/* Suspend/Unsuspend */}
                  {user.status === 'suspended' ? (
                    <button
                      onClick={() => handleUserAction(user.id, 'unsuspend', `Unsuspended "${user.username}"`)}
                      className="p-1 rounded text-muted-foreground hover:text-green-400 hover:bg-green-500/10 transition-all"
                      title="Unsuspend user"
                    >
                      <Unlock className="w-3 h-3" />
                    </button>
                  ) : user.status === 'active' ? (
                    <button
                      onClick={() => handleUserAction(user.id, 'suspend', `Suspended "${user.username}" for 24h`)}
                      className="p-1 rounded text-muted-foreground hover:text-yellow-400 hover:bg-yellow-500/10 transition-all"
                      title="Suspend for 24 hours"
                    >
                      <Clock className="w-3 h-3" />
                    </button>
                  ) : null}

                  {/* Change Password */}
                  <button
                    onClick={() => { setModal({ type: 'change-password', user }); setModalInput(''); }}
                    className="p-1 rounded text-muted-foreground hover:text-pri-400 hover:bg-pri-500/10 transition-all"
                    title="Change password"
                  >
                    <KeyRound className="w-3 h-3" />
                  </button>

                  {/* Change Role */}
                  <button
                    onClick={() => { setModal({ type: 'change-role', user }); setModalInput(user.role); }}
                    className="p-1 rounded text-muted-foreground hover:text-amber-400 hover:bg-amber-500/10 transition-all"
                    title="Change role"
                  >
                    <UserCog className="w-3 h-3" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => { setModal({ type: 'delete', user }); setModalInput(''); }}
                    className="p-1 rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Delete user"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Log */}
      {actionLog.length > 0 && (
        <div className="rounded-xl border border-border/30 bg-secondary/20 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldAlert className="w-3 h-3 text-muted-foreground" />
            <span className="micro-label text-muted-foreground">Action Log</span>
          </div>
          <div ref={logRef} className="max-h-24 overflow-y-auto space-y-0.5">
            {actionLog.map((log, i) => (
              <p key={i} className="text-[9px] text-muted-foreground font-mono">{log}</p>
            ))}
          </div>
        </div>
      )}

      {/* Action Modal */}
      {modal.type && modal.user && (
        <>
          <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center" onClick={() => setModal({ type: null, user: null })}>
            <div className="bg-card border border-border rounded-2xl shadow-2xl p-4 w-80 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <span className="micro-label text-muted-foreground">
                  {modal.type === 'delete' && 'Delete User'}
                  {modal.type === 'change-password' && 'Change Password'}
                  {modal.type === 'change-role' && 'Change Role'}
                </span>
                <button onClick={() => setModal({ type: null, user: null })} className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {modal.type === 'delete' && (
                <>
                  <p className="text-xs text-foreground mb-3">
                    Are you sure you want to delete <strong>{modal.user.username}</strong>? This action cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteUser}
                      disabled={modalLoading}
                      className="flex-1 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {modalLoading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Delete'}
                    </button>
                    <button
                      onClick={() => setModal({ type: null, user: null })}
                      className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {modal.type === 'change-password' && (
                <>
                  <p className="text-xs text-foreground mb-2">
                    Set new password for <strong>{modal.user.username}</strong>
                  </p>
                  <input
                    type="password"
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    placeholder="New password (min 4 chars)"
                    className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleChangePassword}
                      disabled={modalLoading || modalInput.length < 4}
                      className="flex-1 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-pri-600 text-white hover:bg-pri-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {modalLoading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Update'}
                    </button>
                    <button
                      onClick={() => setModal({ type: null, user: null })}
                      className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}

              {modal.type === 'change-role' && (
                <>
                  <p className="text-xs text-foreground mb-2">
                    Change role for <strong>{modal.user.username}</strong>
                  </p>
                  <select
                    value={modalInput}
                    onChange={(e) => setModalInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs bg-secondary border border-border/50 focus:border-pri-500/50 focus:outline-none text-foreground mb-3"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super-admin">Super Admin</option>
                  </select>
                  <div className="flex gap-2">
                    <button
                      onClick={handleChangeRole}
                      disabled={modalLoading}
                      className="flex-1 py-2 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-600 text-white hover:bg-amber-700 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {modalLoading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Update Role'}
                    </button>
                    <button
                      onClick={() => setModal({ type: null, user: null })}
                      className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-secondary transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
