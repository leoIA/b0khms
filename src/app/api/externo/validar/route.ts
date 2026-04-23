// =============================================================================
// ConstrutorPro - API de Validação de Documentos
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { validarCNPJ, validarCPF, formatarCNPJ, formatarCPF } from '@/lib/external-apis';

// -----------------------------------------------------------------------------
// GET - Validar documento (CPF ou CNPJ)
// -----------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { searchParams } = new URL(request.url);
  const documento = searchParams.get('documento');
  const tipo = searchParams.get('tipo'); // 'cpf' ou 'cnpj'

  if (!documento) {
    return errorResponse('Documento não informado.', 400);
  }

  // Limpar formatação
  const documentoLimpo = documento.replace(/\D/g, '');

  // Detectar tipo automaticamente se não informado
  const tipoDocumento = tipo?.toLowerCase() || (documentoLimpo.length === 11 ? 'cpf' : 'cnpj');

  if (tipoDocumento === 'cpf') {
    if (documentoLimpo.length !== 11) {
      return successResponse({
        valido: false,
        tipo: 'cpf',
        documento: documentoLimpo,
        erro: 'CPF deve conter 11 dígitos.',
      });
    }

    const valido = validarCPF(documentoLimpo);

    return successResponse({
      valido,
      tipo: 'cpf',
      documento: valido ? formatarCPF(documentoLimpo) : documento,
      documentoLimpo,
      mensagem: valido ? 'CPF válido' : 'CPF inválido',
    });
  }

  if (tipoDocumento === 'cnpj') {
    if (documentoLimpo.length !== 14) {
      return successResponse({
        valido: false,
        tipo: 'cnpj',
        documento: documentoLimpo,
        erro: 'CNPJ deve conter 14 dígitos.',
      });
    }

    const valido = validarCNPJ(documentoLimpo);

    return successResponse({
      valido,
      tipo: 'cnpj',
      documento: valido ? formatarCNPJ(documentoLimpo) : documento,
      documentoLimpo,
      mensagem: valido ? 'CNPJ válido' : 'CNPJ inválido',
    });
  }

  return errorResponse('Tipo de documento inválido. Use "cpf" ou "cnpj".', 400);
}
