// =============================================================================
// ConstrutorPro - Perfil do Usuário API
// =============================================================================

import { NextRequest } from 'next/server';
import {
  requireAuth,
  successResponse,
  errorResponse,
  parseRequestBody,
} from '@/server/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validation Schema
// -----------------------------------------------------------------------------

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
  phone: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  avatar: z.string().url('URL inválida').optional().nullable().or(z.literal('')),
});

type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// -----------------------------------------------------------------------------
// GET - Get Current User Profile
// -----------------------------------------------------------------------------

export async function GET() {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { user } = authResult.context!;

  try {
    const userProfile = await db.users.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        position: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        companies: {
          select: {
            id: true,
            name: true,
            tradingName: true,
            plan: true,
          },
        },
      },
    });

    if (!userProfile) {
      return errorResponse('Usuário não encontrado', 404);
    }

    return successResponse(userProfile);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return errorResponse('Erro ao carregar perfil', 500);
  }
}

// -----------------------------------------------------------------------------
// PUT - Update Current User Profile
// -----------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { user } = authResult.context!;
  const bodyResult = await parseRequestBody<UpdateProfileInput>(request, updateProfileSchema);

  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;

  try {
    // Check email uniqueness if changing
    if (data.email && data.email !== user.email) {
      const emailExists = await db.users.findFirst({
        where: {
          email: data.email,
          NOT: { id: user.id },
        },
      });
      if (emailExists) {
        return errorResponse('Este email já está sendo usado por outro usuário', 400);
      }
    }

    // Build update data
    const updateData: {
      name?: string;
      email?: string;
      phone?: string | null;
      position?: string | null;
      avatar?: string | null;
    } = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.position !== undefined) updateData.position = data.position || null;
    if (data.avatar !== undefined) updateData.avatar = data.avatar || null;

    // Update user profile
    const updatedUser = await db.users.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        position: true,
        role: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        companies: {
          select: {
            id: true,
            name: true,
            tradingName: true,
            plan: true,
          },
        },
      },
    });

    return successResponse(updatedUser, 'Perfil atualizado com sucesso');
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return errorResponse('Erro ao atualizar perfil', 500);
  }
}
