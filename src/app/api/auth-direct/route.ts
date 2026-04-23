// Login direto sem NextAuth
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { SignJWT, jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'default-secret-key-change-in-production'
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 });
    }

    const user = await db.users.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true, email: true, name: true, role: true, password: true, 
        isActive: true, companyId: true,
        companies: { select: { id: true, name: true, plan: true, isActive: true } },
      },
    });

    if (!user || !user.password || !user.isActive) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const token = await new SignJWT({
      id: user.id, email: user.email, name: user.name, 
      role: user.role, companyId: user.companyId, companyName: user.companies?.name
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(SECRET_KEY);

    const response = NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
    
    response.cookies.set('auth-token', token, {
      httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 604800
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
