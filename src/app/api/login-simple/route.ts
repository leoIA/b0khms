// =============================================================================
// ConstrutorPro - Simple Login API (for testing)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    console.log('[Login Simple] Attempt:', email);

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    const user = await db.users.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        password: true,
        isActive: true,
        companyId: true,
        companies: {
          select: {
            id: true,
            name: true,
            plan: true,
            isActive: true,
          },
        },
      },
    });

    if (!user || !user.password) {
      console.log('[Login Simple] User not found');
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      console.log('[Login Simple] User inactive');
      return NextResponse.json(
        { success: false, error: 'Usuário inativo' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      console.log('[Login Simple] Invalid password');
      return NextResponse.json(
        { success: false, error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    console.log('[Login Simple] Success:', user.email);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        companyName: user.companies?.name,
      },
    });
  } catch (error) {
    console.error('[Login Simple] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
