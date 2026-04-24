// =============================================================================
// ConstrutorPro - API de Consulta de CEP
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { consultarCEPComCache, formatarCEP } from '@/lib/external-apis';

// -----------------------------------------------------------------------------
// GET - Consultar CEP via ViaCEP
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { searchParams } = new URL(request.url);
  const cep = searchParams.get('cep');

  if (!cep) {
    return errorResponse('CEP não informado.', 400);
  }

  // Limpar formatação
  const cepLimpo = cep.replace(/\D/g, '');

  if (cepLimpo.length !== 8) {
    return errorResponse('CEP deve conter 8 dígitos.', 400);
  }

  // Consultar
  const result = await consultarCEPComCache(cepLimpo);

  if (!result.success) {
    return errorResponse(result.error || 'Erro ao consultar CEP.', 400);
  }

  // Retornar dados
  return successResponse({
    cep: formatarCEP(cepLimpo),
    cepLimpo,
    logradouro: result.data!.logradouro,
    complemento: result.data!.complemento,
    bairro: result.data!.bairro,
    localidade: result.data!.localidade,
    uf: result.data!.uf,
    ibge: result.data!.ibge,
    gia: result.data!.gia,
    ddd: result.data!.ddd,
    siafi: result.data!.siafi,
    formatted: result.data!.formatted,
  });
}
