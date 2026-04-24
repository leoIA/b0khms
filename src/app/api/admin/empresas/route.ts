// =============================================================================
// ConstrutorPro - Master Admin - Empresas API (List & Create)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import {
  requireMasterAdmin,
  successResponse,
  errorResponse,
  parseRequestBody,
  calculatePagination,
  createPaginatedResponse,
} from '@/server/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schemas
// -----------------------------------------------------------------------------

const createCompanySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  tradingName: z.string().optional(),
  cnpj: z.string().length(14, 'CNPJ deve ter 14 dígitos'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2, 'Estado deve ter 2 caracteres').optional().or(z.literal('')),
  zipCode: z.string().optional(),
  plan: z.enum(['starter', 'professional', 'enterprise']),
  isActive: z.boolean().default(true),
});

type CreateCompanyInput = z.infer<typeof createCompanySchema>;

// -----------------------------------------------------------------------------
// GET - List Companies
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
    const plan = searchParams.get('plan');
    const isActive = searchParams.get('isActive');

    const { skip } = calculatePagination(page, limit);

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { tradingName: { contains: search } },
        { cnpj: { contains: search.replace(/\D/g, '') } },
        { email: { contains: search } },
      ];
    }

    if (plan && ['starter', 'professional', 'enterprise'].includes(plan)) {
      where.plan = plan;
    }

    if (isActive !== null && isActive !== 'all') {
      where.isActive = isActive === 'true';
    }

    // Fetch companies with counts
    const [companies, total] = await Promise.all([
      db.companies.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          tradingName: true,
          cnpj: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          zipCode: true,
          plan: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              users: true,
              projects: true,
              clients: true,
            },
          },
        },
      }),
      db.companies.count({ where }),
    ]);

    return NextResponse.json(
      createPaginatedResponse(companies, total, page, limit)
    );
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    return errorResponse('Erro ao carregar empresas', 500);
  }
}

// -----------------------------------------------------------------------------
// POST - Create Company
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authResult = await requireMasterAdmin();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody<CreateCompanyInput>(request, createCompanySchema);

  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;

  try {
    // Check if CNPJ already exists
    const existingCompany = await db.companies.findUnique({
      where: { cnpj: data.cnpj },
    });

    if (existingCompany) {
      return errorResponse('Este CNPJ já está cadastrado', 400);
    }

    // Check if email already exists
    const existingEmail = await db.companies.findFirst({
      where: { email: data.email },
    });

    if (existingEmail) {
      return errorResponse('Este email já está cadastrado para outra empresa', 400);
    }

    // Create company
    const company = await db.companies.create({
      data: {
        id: crypto.randomUUID(),
        name: data.name,
        tradingName: data.tradingName || null,
        cnpj: data.cnpj,
        email: data.email,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        plan: data.plan,
        isActive: data.isActive,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        tradingName: true,
        cnpj: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        plan: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(company, 'Empresa criada com sucesso');
  } catch (error) {
    console.error('Erro ao criar empresa:', error);
    return errorResponse('Erro ao criar empresa', 500);
  }
}
