// =============================================================================
// ConstrutorPro - Empresa API (Company Settings)
// Allows company admins to manage their own company
// =============================================================================

import { NextRequest } from 'next/server';
import {
  requireAuth,
  successResponse,
  errorResponse,
  parseRequestBody,
  notFoundResponse,
} from '@/server/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schema
// -----------------------------------------------------------------------------

const updateCompanySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  tradingName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().length(2, 'Estado deve ter 2 caracteres').optional().nullable().or(z.literal('')),
  zipCode: z.string().optional().nullable(),
});

type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

// -----------------------------------------------------------------------------
// GET - Get Company by ID
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const { id } = await params;

  // Only allow access to own company (unless master admin)
  if (!context!.isMasterAdmin && context!.companyId !== id) {
    return notFoundResponse('Empresa não encontrada');
  }

  try {
    const company = await db.companies.findUnique({
      where: { id },
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
        logo: true,
        plan: true,
        isActive: true,
        planExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!company) {
      return notFoundResponse('Empresa não encontrada');
    }

    return successResponse(company);
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    return errorResponse('Erro ao carregar empresa', 500);
  }
}

// -----------------------------------------------------------------------------
// PUT - Update Company
// -----------------------------------------------------------------------------

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const { id } = await params;

  // Only company admins or master admin can update
  if (!context!.isCompanyAdmin && !context!.isMasterAdmin) {
    return errorResponse('Você não tem permissão para editar esta empresa', 403);
  }

  // Only allow access to own company (unless master admin)
  if (!context!.isMasterAdmin && context!.companyId !== id) {
    return notFoundResponse('Empresa não encontrada');
  }

  const bodyResult = await parseRequestBody<UpdateCompanyInput>(request, updateCompanySchema);

  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;

  try {
    // Check if company exists
    const existingCompany = await db.companies.findUnique({
      where: { id },
    });

    if (!existingCompany) {
      return notFoundResponse('Empresa não encontrada');
    }

    // Build update data with proper typing
    const updateData: {
      name?: string;
      tradingName?: string | null;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zipCode?: string | null;
    } = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.tradingName !== undefined) updateData.tradingName = data.tradingName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state || null;
    if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;

    // Update company
    const company = await db.companies.update({
      where: { id },
      data: updateData,
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
        logo: true,
        plan: true,
        isActive: true,
        planExpiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return successResponse(company, 'Empresa atualizada com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    return errorResponse('Erro ao atualizar empresa', 500);
  }
}
