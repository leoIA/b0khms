// =============================================================================
// ConstrutorPro - Master Admin - Reset User Password
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

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// -----------------------------------------------------------------------------
// POST - Reset User Password
// -----------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireMasterAdmin();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { id } = await params;
  const bodyResult = await parseRequestBody<ResetPasswordInput>(request, resetPasswordSchema);

  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const { newPassword } = bodyResult.data;

  try {
    // Check if user exists
    const existingUser = await db.users.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return notFoundResponse('Usuário não encontrado');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.users.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return successResponse({ success: true }, 'Senha redefinida com sucesso');
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    return errorResponse('Erro ao redefinir senha', 500);
  }
}
