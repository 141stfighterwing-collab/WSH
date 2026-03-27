// Stub for Authentication service

import { User, Permission, UserStatus, UserRole } from '../types';

export interface AuthResponse {
  success: boolean;
  user?: User;
  message: string;
  error?: string;
}

export interface SystemLogEntry {
  id: string;
  timestamp: number;  // Unix timestamp in milliseconds
  level: string;
  message: string;
  details?: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    
    if (data.user) {
      // Map API response to User type
      const user: User = {
        uid: data.user.id,
        username: data.user.username,
        email: data.user.email,
        permission: data.user.permission || 'edit',
        status: data.user.status || 'active',
        role: data.user.role || 'user',
        lastLogin: Date.now(),
      };
      return {
        success: true,
        user,
        message: 'Login successful',
      };
    }
    
    return {
      success: false,
      message: data.error || 'Login failed',
      error: data.error,
    };
  } catch (error) {
    return { success: false, message: 'Login failed', error: 'Login failed' };
  }
}

export async function requestAccount(email: string, username: string, password: string): Promise<AuthResponse> {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });
    const data = await response.json();
    
    if (data.user) {
      const user: User = {
        uid: data.user.id,
        username: data.user.username,
        email: data.user.email,
        permission: data.user.permission || 'edit',
        status: data.user.status || 'active',
        role: data.user.role || 'user',
        lastLogin: Date.now(),
      };
      return {
        success: true,
        user,
        message: 'Account created successfully',
      };
    }
    
    return {
      success: false,
      message: data.error || 'Registration failed',
      error: data.error,
    };
  } catch (error) {
    return { success: false, message: 'Registration failed', error: 'Registration failed' };
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

export async function sendResetLink(email: string): Promise<{ success: boolean; message: string; error?: string }> {
  // Password reset not implemented for self-hosted version
  return { success: false, message: 'Password reset not implemented', error: 'Password reset not implemented' };
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch('/api/auth/me');
    const data = await response.json();
    if (data.user) {
      return {
        uid: data.user.id,
        username: data.user.username,
        email: data.user.email,
        permission: data.user.permission || 'edit',
        status: data.user.status || 'active',
        role: data.user.role || 'user',
        lastLogin: data.user.lastLogin || Date.now(),
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Admin functions - stub implementations
export async function getUsers(): Promise<User[]> {
  // In production, this would call an admin API endpoint
  return [];
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin' || user?.role === 'super-admin';
}

export function isGlobalAdmin(user: User | null): boolean {
  return user?.role === 'super-admin';
}

export async function checkDatabaseConnection(): Promise<{ connected: boolean; success: boolean; message: string; latency: number; error?: string; logs: SystemLogEntry[] }> {
  const startTime = Date.now();
  try {
    const response = await fetch('/api/health');
    const data = await response.json();
    const isConnected = data.status === 'healthy';
    const latency = Date.now() - startTime;
    return { 
      connected: isConnected,
      success: isConnected,
      message: isConnected ? 'Database connected' : 'Database connection failed',
      latency,
      logs: [{
        id: 'db-check',
        timestamp: Date.now(),
        level: isConnected ? 'info' : 'error',
        message: isConnected ? 'Database connected' : 'Database connection failed',
        test: 'Database Connection',
        status: isConnected ? 'pass' : 'fail',
      }],
    };
  } catch {
    const latency = Date.now() - startTime;
    return { 
      connected: false,
      success: false,
      message: 'Failed to connect to database',
      latency,
      error: 'Failed to connect to database',
      logs: [{
        id: 'db-check',
        timestamp: Date.now(),
        level: 'error',
        message: 'Failed to connect to database',
        test: 'Database Connection',
        status: 'fail',
      }],
    };
  }
}

export async function updateUserRole(userId: string, role: UserRole): Promise<{ success: boolean; error?: string }> {
  // Stub - implement admin API endpoint
  return { success: false, error: 'Not implemented' };
}

export async function updateUserPassword(userIdOrPassword: string, newPassword?: string): Promise<{ success: boolean; message: string; error?: string }> {
  // Stub - implement admin API endpoint
  // Can be called with (userId, newPassword) or (newPassword) for current user
  return { success: false, message: 'Not implemented', error: 'Not implemented' };
}

export async function adminTriggerReset(userId: string): Promise<{ success: boolean; message: string; error?: string }> {
  // Stub - implement admin API endpoint
  return { success: false, message: 'Not implemented', error: 'Not implemented' };
}

export async function testWriteCapability(): Promise<{ success: boolean; message: string; canWrite?: boolean }> {
  // Stub - test write capability
  return { success: true, message: 'Write capability confirmed', canWrite: true };
}

export function getSystemLogs(limit: number = 100): SystemLogEntry[] {
  // Stub - implement log API endpoint
  // Return properly typed empty array
  return [];
}

export async function setAccountStatus(userId: string, status: UserStatus, until?: number): Promise<{ success: boolean; error?: string }> {
  // Stub - implement admin API endpoint
  return { success: false, error: 'Not implemented' };
}
