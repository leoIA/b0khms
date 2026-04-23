// =============================================================================
// ConstrutorPro - API de Consulta de Estados (IBGE)
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { listarEstados } from '@/lib/external-apis';

// -----------------------------------------------------------------------------
// GET - Listar estados do Brasil
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const result = await listarEstados();

  if (!result.success) {
    return errorResponse(result.error || 'Erro ao carregar estados.', 500);
  }

  // Simplificar resposta
  const estados = result.data!.map((estado) => ({
    id: estado.id,
    sigla: estado.sigla,
    nome: estado.nome,
    regiao: estado.regiao.nome,
  }));

  return successResponse(estados);
}
