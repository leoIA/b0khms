// =============================================================================
// ConstrutorPro - Master Admin - Usuários API (Get, Update)
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
import bcrypt from 'bcryptjs';

// -----------------------------------------------------------------------------
// Validation Schema
// -----------------------------------------------------------------------------

const updateUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  role: z.enum(['master_admin', 'company_admin', 'manager', 'engineer', 'finance', 'procurement', 'operations', 'viewer']).optional(),
  isActive: z.boolean().optional(),
});

type UpdateUserInput = z.infer<typeof updateUserSchema>;

// -----------------------------------------------------------------------------
// GET - Get User by ID
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
    const user = await db.users.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        companies: {
          select: {
            id: true,
            name: true,
            plan: true,
          },
        },
      },
    });

    if (!user) {
      return notFoundResponse('Usuário não encontrado');
    }

    return successResponse(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return errorResponse('Erro ao carregar usuário', 500);
  }
}

// -----------------------------------------------------------------------------
// PUT - Update User
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
  const bodyResult = await parseRequestBody<UpdateUserInput>(request, updateUserSchema);

  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;

  try {
    // Check if user exists
    const existingUser = await db.users.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return notFoundResponse('Usuário não encontrado');
    }

    // Check email uniqueness if changing
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await db.users.findUnique({
        where: { email: data.email },
      });
      if (emailExists) {
        return errorResponse('Este email já está cadastrado', 400);
      }
    }

    // Build update data with proper typing
    const updateData: {
      name?: string;
      email?: string;
      role?: 'master_admin' | 'company_admin' | 'manager' | 'engineer' | 'finance' | 'procurement' | 'operations' | 'viewer';
      isActive?: boolean;
    } = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Update user
    const user = await db.users.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        companies: {
          select: {
            id: true,
            name: true,
            plan: true,
          },
        },
      },
    });

    return successResponse(user, 'Usuário atualizado com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return errorResponse('Erro ao atualizar usuário', 500);
  }
}
