// =============================================================================
// ConstrutorPro - RH Stats API
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;

  const [
    totalEmployees,
    activeEmployees,
    onVacation,
    onLeave,
    terminated,
  ] = await Promise.all([
    db.employees.count({
      where: { companyId: context!.companyId },
    }),
    db.employees.count({
      where: { companyId: context!.companyId, status: 'active' },
    }),
    db.employees.count({
      where: { companyId: context!.companyId, status: 'vacation' },
    }),
    db.employees.count({
      where: { companyId: context!.companyId, status: 'leave' },
    }),
    db.employees.count({
      where: { companyId: context!.companyId, status: 'terminated' },
    }),
  ]);

  return successResponse({
    totalEmployees,
    activeEmployees,
    onVacation,
    onLeave,
    terminated,
  });
}
