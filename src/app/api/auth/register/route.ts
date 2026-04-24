// =============================================================================
// ConstrutorPro - Registration API
// POST /api/auth/register
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schema
// -----------------------------------------------------------------------------

const registerSchema = z.object({
  company: z.object({
    name: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
    cnpj: z.string().length(14, 'CNPJ deve conter 14 dígitos'),
    email: z.string().email('Email inválido'),
    phone: z.string().optional(),
  }),
  admin: z.object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string()
      .min(8, 'Senha deve ter pelo menos 8 caracteres')
      .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
      .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  }),
  plan: z.enum(['starter', 'professional', 'enterprise']),
  billingCycle: z.enum(['monthly', 'annual']),
});

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function generateTrialEndDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date;
}

// -----------------------------------------------------------------------------
// POST Handler
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = registerSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Dados inválidos',
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }

    const { company, admin, plan, billingCycle } = validationResult.data;

    // Check if CNPJ already exists
    const existingCompany = await db.companies.findUnique({
      where: { cnpj: company.cnpj },
    });

    if (existingCompany) {
      return NextResponse.json(
        { success: false, error: 'Este CNPJ já está cadastrado.' },
        { status: 400 }
      );
    }

    // Check if admin email already exists
    const existingUser = await db.users.findUnique({
      where: { email: admin.email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Este email já está cadastrado.' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(admin.password, 10);

    // Calculate trial end date
    const trialEndsAt = generateTrialEndDate();

    // Create company and admin user in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create company with trial
      const newCompany = await tx.companies.create({
        data: {
          name: company.name,
          cnpj: company.cnpj,
          email: company.email.toLowerCase(),
          phone: company.phone || null,
          plan: 'trial', // Start with trial
          trialEndsAt,
          subscriptionStatus: 'trial',
          isActive: true,
        },
      });

      // Create admin user
      const newUser = await tx.users.create({
        data: {
          name: admin.name,
          email: admin.email.toLowerCase(),
          password: hashedPassword,
          role: 'company_admin',
          companyId: newCompany.id,
          isActive: true,
        },
      });

      // Log subscription history
      await tx.subscriptions_history.create({
        data: {
          companyId: newCompany.id,
          action: 'created',
          toPlan: 'trial',
          reason: 'Novo cadastro - período de teste',
          performedBy: newUser.id,
          metadata: JSON.stringify({
            selectedPlan: plan,
            billingCycle,
            trialDays: 14,
          }),
        },
      });

      return { company: newCompany, user: newUser };
    });

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Conta criada com sucesso!',
      data: {
        companyId: result.company.id,
        userId: result.user.id,
        trialEndsAt: result.company.trialEndsAt,
      },
    });

  } catch (error) {
    console.error('[Register] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor. Tente novamente.' },
      { status: 500 }
    );
  }
}
