// =============================================================================
// ConstrutorPro - Checkout API
// POST /api/checkout
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import { z } from 'zod';
import { createCheckoutPreference, createSubscription } from '@/lib/mercadopago';
import { db } from '@/lib/db';
import type { CompanyPlan } from '@/types';

// -----------------------------------------------------------------------------
// Validation Schema
// -----------------------------------------------------------------------------

const checkoutSchema = z.object({
  plan: z.enum(['starter', 'professional', 'enterprise']),
  billingCycle: z.enum(['monthly', 'annual']),
  paymentType: z.enum(['one_time', 'subscription']).default('subscription'),
});

// -----------------------------------------------------------------------------
// POST Handler
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if (!authResult.success) {
      return errorResponse(authResult.error!, authResult.status);
    }

    const { context } = authResult;
    const companyId = context!.companyId;
    const userId = context!.user.id;

    // Validate input
    const body = await request.json();
    const validationResult = checkoutSchema.safeParse(body);
    
    if (!validationResult.success) {
      return errorResponse('Dados inválidos', 400);
    }

    const { plan, billingCycle, paymentType } = validationResult.data;

    // Get company info
    const company = await db.companies.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        email: true,
        cnpj: true,
        customerId: true,
      },
    });

    if (!company) {
      return errorResponse('Empresa não encontrada', 404);
    }

    // Create checkout preference or subscription
    let checkoutUrl: string;
    let externalReference: string;

    if (paymentType === 'subscription') {
      const subscription = await createSubscription({
        plan: plan as CompanyPlan,
        billingCycle,
        companyId,
        companyName: company.name,
        companyEmail: company.email,
      });
      
      checkoutUrl = subscription.init_point;
      externalReference = subscription.id;
    } else {
      const preference = await createCheckoutPreference({
        plan: plan as CompanyPlan,
        billingCycle,
        companyId,
        companyName: company.name,
        companyEmail: company.email,
      });
      
      checkoutUrl = preference.init_point;
      externalReference = preference.external_reference;
    }

    // Log the checkout attempt
    await db.subscriptions_history.create({
      data: {
        companyId,
        action: 'checkout_initiated',
        toPlan: plan,
        performedBy: userId,
        metadata: JSON.stringify({
          billingCycle,
          paymentType,
          externalReference,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl,
        externalReference,
      },
    });

  } catch (error) {
    console.error('[Checkout] Error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao processar checkout',
      500
    );
  }
}
