// =============================================================================
// ConstrutorPro - API de Consulta de CNPJ
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { consultarCNPJComCache, formatarCNPJ, validarCNPJ } from '@/lib/external-apis';

// -----------------------------------------------------------------------------
// GET - Consultar CNPJ na Receita Federal
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { searchParams } = new URL(request.url);
  const cnpj = searchParams.get('cnpj');

  if (!cnpj) {
    return errorResponse('CNPJ não informado.', 400);
  }

  // Limpar formatação
  const cnpjLimpo = cnpj.replace(/\D/g, '');

  if (cnpjLimpo.length !== 14) {
    return errorResponse('CNPJ deve conter 14 dígitos.', 400);
  }

  // Validar dígitos verificadores
  if (!validarCNPJ(cnpjLimpo)) {
    return errorResponse('CNPJ inválido.', 400);
  }

  // Consultar
  const result = await consultarCNPJComCache(cnpjLimpo);

  if (!result.success) {
    return errorResponse(result.error || 'Erro ao consultar CNPJ.', 400);
  }

  // Retornar dados formatados
  return successResponse({
    cnpj: formatarCNPJ(cnpjLimpo),
    cnpjLimpo,
    razaoSocial: result.data!.razao_social,
    nomeFantasia: result.data!.nome_fantasia,
    situacao: result.data!.situacao,
    tipo: result.data!.tipo,
    porte: result.data!.porte,
    dataAbertura: result.data!.data_abertura,
    atividadePrincipal: result.data!.atividade_principal,
    endereco: {
      logradouro: result.data!.logradouro,
      numero: result.data!.numero,
      complemento: result.data!.complemento,
      bairro: result.data!.bairro,
      municipio: result.data!.municipio,
      uf: result.data!.uf,
      cep: result.data!.cep,
    },
    contato: {
      email: result.data!.email,
      telefone: result.data!.telefone,
    },
    capitalSocial: result.data!.capital_social,
    formatted: result.data!.formatted,
  });
}
