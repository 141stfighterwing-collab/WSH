import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2).max(50),
  password: z.string().min(6),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, username, password } = registerSchema.parse(body);
    
    const result = await register(email, username, password);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
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
    console.error('Register API error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
