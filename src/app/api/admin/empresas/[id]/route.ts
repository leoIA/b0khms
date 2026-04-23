// =============================================================================
// ConstrutorPro - Master Admin - Empresas API (Get, Update, Delete)
// =============================================================================

import { NextRequest } from 'next/server';
import {
  requireMasterAdmin,
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
  cnpj: z.string().length(14, 'CNPJ deve ter 14 dígitos').optional(),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().length(2, 'Estado deve ter 2 caracteres').optional().nullable().or(z.literal('')),
  zipCode: z.string().optional().nullable(),
  plan: z.enum(['starter', 'professional', 'enterprise']).optional(),
  isActive: z.boolean().optional(),
  planExpiresAt: z.string().optional().nullable(),
});

// -----------------------------------------------------------------------------
// GET - Get Company by ID
// -----------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireMasterAdmin();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { id } = await params;

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
        plan: true,
        isActive: true,
        planExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            users: true,
            projects: true,
            clients: true,
            suppliers: true,
            budgets: true,
          },
        },
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
  const authResult = await requireMasterAdmin();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { id } = await params;
  const bodyResult = await parseRequestBody<z.infer<typeof updateCompanySchema>>(request, updateCompanySchema);

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

    // Check CNPJ uniqueness if changing
    if (data.cnpj && data.cnpj !== existingCompany.cnpj) {
      const cnpjExists = await db.companies.findUnique({
        where: { cnpj: data.cnpj },
      });
      if (cnpjExists) {
        return errorResponse('Este CNPJ já está cadastrado', 400);
      }
    }

    // Check email uniqueness if changing
    if (data.email && data.email !== existingCompany.email) {
      const emailExists = await db.companies.findFirst({
        where: { email: data.email },
      });
      if (emailExists) {
        return errorResponse('Este email já está cadastrado para outra empresa', 400);
      }
    }

    // Build update data with proper typing
    const updateData: {
      name?: string;
      tradingName?: string | null;
      cnpj?: string;
      email?: string;
      phone?: string | null;
      address?: string | null;
      city?: string | null;
      state?: string | null;
      zipCode?: string | null;
      plan?: 'starter' | 'professional' | 'enterprise';
      isActive?: boolean;
      planExpiresAt?: Date | null;
    } = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.tradingName !== undefined) updateData.tradingName = data.tradingName;
    if (data.cnpj !== undefined) updateData.cnpj = data.cnpj;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;
    if (data.plan !== undefined) updateData.plan = data.plan;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.planExpiresAt !== undefined) {
      updateData.planExpiresAt = data.planExpiresAt ? new Date(data.planExpiresAt) : null;
    }

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

// -----------------------------------------------------------------------------
// DELETE - Delete Company
// -----------------------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireMasterAdmin();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { id } = await params;

  try {
    // Check if company exists
    const existingCompany = await db.companies.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        users: { select: { id: true } },
        projects: { select: { id: true } },
      },
    });

    if (!existingCompany) {
      return notFoundResponse('Empresa não encontrada');
    }

    // Delete company (cascade will handle related records)
    await db.companies.delete({
      where: { id },
    });

    return successResponse({ id }, 'Empresa excluída com sucesso');
  } catch (error) {
    console.error('Erro ao excluir empresa:', error);
    return errorResponse('Erro ao excluir empresa. Verifique se a empresa não possui dados associados.', 500);
  }
}
