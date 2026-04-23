// =============================================================================
// ConstrutorPro - API de Consulta de Municípios por UF (IBGE)
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { listarMunicipiosPorUF } from '@/lib/external-apis';

// -----------------------------------------------------------------------------
// GET - Listar municípios por UF
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { searchParams } = new URL(request.url);
  const uf = searchParams.get('uf');

  if (!uf) {
    return errorResponse('UF não informada.', 400);
  }

  // Validar UF
  const ufUpper = uf.toUpperCase();
  const ufsValidas = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  if (!ufsValidas.includes(ufUpper)) {
    return errorResponse('UF inválida.', 400);
  }

  const result = await listarMunicipiosPorUF(ufUpper);

  if (!result.success) {
    return errorResponse(result.error || 'Erro ao carregar municípios.', 500);
  }

  // Simplificar resposta
  const municipios = result.data!.map((municipio) => ({
    id: municipio.id,
    nome: municipio.nome,
    microrregiao: municipio.microrregiao.nome,
  }));

  return successResponse(municipios);
}
