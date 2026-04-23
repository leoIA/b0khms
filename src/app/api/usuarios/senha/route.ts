// =============================================================================
// ConstrutorPro - Alterar Senha do Usuário API
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
import bcrypt from 'bcryptjs';

// -----------------------------------------------------------------------------
// Validation Schema
// -----------------------------------------------------------------------------

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string().min(8, 'Nova senha deve ter pelo menos 8 caracteres'),
});

type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// -----------------------------------------------------------------------------
// PUT - Change Current User Password
// -----------------------------------------------------------------------------

export async function PUT(request: NextRequest) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { user } = authResult.context!;
  const bodyResult = await parseRequestBody<ChangePasswordInput>(request, changePasswordSchema);

  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const { currentPassword, newPassword } = bodyResult.data;

  try {
    // Get current user with password
    const currentUser = await db.users.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!currentUser) {
      return errorResponse('Usuário não encontrado', 404);
    }

    // Check if user has a password (might be OAuth user)
    if (!currentUser.password) {
      return errorResponse('Este usuário não possui senha cadastrada. Faça login com o provedor original.', 400);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, currentUser.password);

    if (!isPasswordValid) {
      return errorResponse('Senha atual incorreta', 400);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.users.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return successResponse({ success: true }, 'Senha alterada com sucesso');
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    return errorResponse('Erro ao alterar senha', 500);
  }
}
