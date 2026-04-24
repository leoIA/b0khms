// =============================================================================
// ConstrutorPro - EVM API
// API para análise de Valor Agregado (Earned Value Management)
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import { db } from '@/lib/db';
import { calculateProjectEVM } from '@/lib/evm';

// =============================================================================
// GET - Obter dados EVM do projeto
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { user } = authResult.context!;
  const { id: projectId } = await params;

  try {
    // Verificar acesso ao projeto
    if (!user.companyId) {
      return errorResponse('Usuário sem empresa associada', 403);
    }

    const project = await db.projects.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId,
      },
    });

    if (!project) {
      return errorResponse('Projeto não encontrado', 404);
    }

    // Calcular EVM
    const evmData = await calculateProjectEVM(projectId);

    return NextResponse.json({
      success: true,
      data: evmData,
    });
  } catch (error) {
    console.error('Erro na API EVM:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao calcular EVM',
      500
    );
  }
}
