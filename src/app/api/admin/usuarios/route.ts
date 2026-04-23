// =============================================================================
// ConstrutorPro - Master Admin - Usuários API (List)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  requireMasterAdmin,
  errorResponse,
  calculatePagination,
  createPaginatedResponse,
} from '@/server/auth';
import { db } from '@/lib/db';

// -----------------------------------------------------------------------------
// GET - List Users
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireMasterAdmin();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');
    const companyId = searchParams.get('companyId');

    const { skip } = calculatePagination(page, limit);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== null && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    if (companyId) {
      if (companyId === 'none') {
        where.companyId = null;
      } else {
        where.companyId = companyId;
      }
    }

    // Fetch users with company info
    const [users, total] = await Promise.all([
      db.users.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          companies: {
            select: {
              id: true,
              name: true,
              plan: true,
            },
          },
        },
      }),
      db.users.count({ where }),
    ]);

    // Format response
    const formattedUsers = users.map((user) => ({
      ...user,
      lastLoginAt: user.lastLoginAt?.toISOString() || null,
      createdAt: user.createdAt.toISOString(),
    }));

    return NextResponse.json(
      createPaginatedResponse(formattedUsers, total, page, limit)
    );
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return errorResponse('Erro ao carregar usuários', 500);
  }
}
