// =============================================================================
// ConstrutorPro - Usuários API
// For listing users in dropdowns (project managers, task assignments, etc.)
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';

// -----------------------------------------------------------------------------
// GET - List Users
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const search = searchParams.get('search');
  const role = searchParams.get('role');
  const isActiveParam = searchParams.get('isActive');
  const companyIdParam = searchParams.get('companyId');

  // Determine if user is master admin
  const isMasterAdmin = context!.isMasterAdmin;

  // Build where clause
  const where: Record<string, unknown> = {};

  // Company filter: regular users can only see their own company
  // Master admin can optionally filter by companyId
  if (isMasterAdmin && companyIdParam) {
    where.companyId = companyIdParam;
  } else if (!isMasterAdmin) {
    where.companyId = context!.companyId;
  }

  // Default to active users only (unless explicitly requesting inactive)
  if (isActiveParam === null) {
    where.isActive = true;
  } else if (isActiveParam !== 'all') {
    where.isActive = isActiveParam === 'true';
  }

  // Role filter
  if (role) {
    where.role = role;
  }

  // Search filter (name or email)
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  try {
    const users = await db.users.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
      },
    });

    return successResponse(users);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    return errorResponse('Erro ao carregar usuários.', 500);
  }
}
