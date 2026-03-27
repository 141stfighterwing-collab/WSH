import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);
    
    let result = await login(email, password);
    
    if (!result.success && !email.includes('@')) {
      const user = await prisma.user.findFirst({
        where: { username: email }
      });
      if (user) {
        result = await login(user.email, password);
      }
    }
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }
    
    const response = NextResponse.json({ 
      success: true, 
      user: result.user 
    });
    
    response.cookies.set('auth_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
