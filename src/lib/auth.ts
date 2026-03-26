import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './db';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface UserPayload {
  id: string;
  email: string;
  username: string;
  role: string;
  permission: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    
    if (!token) return null;
    
    const payload = verifyToken(token);
    if (!payload) return null;
    
    const user = await prisma.user.findUnique({
      where: { id: payload.id }
    });
    
    if (!user || user.status !== 'active') return null;
    
    return payload;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<{ success: boolean; user?: UserPayload; token?: string; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }
    
    if (user.status !== 'active') {
      return { success: false, error: 'Account is not active' };
    }
    
    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      return { success: false, error: 'Invalid credentials' };
    }
    
    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      permission: user.permission,
    };
    
    const token = generateToken(payload);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });
    
    return { success: true, user: payload, token };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
}

export async function register(email: string, username: string, password: string): Promise<{ success: boolean; user?: UserPayload; token?: string; error?: string }> {
  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return { success: false, error: 'Email already registered' };
      }
      return { success: false, error: 'Username already taken' };
    }
    
    const hashedPassword = await hashPassword(password);
    
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: 'user',
        permission: 'edit',
        status: 'active',
      }
    });
    
    const payload: UserPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      permission: user.permission,
    };
    
    const token = generateToken(payload);
    
    return { success: true, user: payload, token };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'An error occurred during registration' };
  }
}
