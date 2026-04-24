// =============================================================================
// ConstrutorPro - Subscription Status API
// GET /api/subscription/status
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { db } from '@/lib/db';

// -----------------------------------------------------------------------------
// GET Handler
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId } = authResult.context!;

  const company = await db.companies.findUnique({
    where: { id: companyId },
    select: {
      plan: true,
      planExpiresAt: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      isActive: true,
      subscriptionId: true,
      paymentMethod: true,
      lastPaymentAt: true,
      nextPaymentAt: true,
    },
  });

  if (!company) {
    return errorResponse('Empresa não encontrada', 404);
  }

  return successResponse({
    plan: company.plan,
    planExpiresAt: company.planExpiresAt,
    subscriptionStatus: company.subscriptionStatus,
    trialEndsAt: company.trialEndsAt,
    isActive: company.isActive,
    subscriptionId: company.subscriptionId,
    paymentMethod: company.paymentMethod,
    lastPaymentAt: company.lastPaymentAt,
    nextPaymentAt: company.nextPaymentAt,
  });
}
