// =============================================================================
// ConstrutorPro - SINAPI API
// Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import {
  SINAPI_COMPOSICOES,
  SINAPI_MATERIAIS,
  SINAPI_MAO_DE_OBRA,
  SINAPI_CATEGORIAS,
  searchComposicoes,
  getComposicoesByCategoria,
  getComposicaoByCodigo,
} from '@/lib/sinapi/data';

// GET - Listar composições SINAPI
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const categoria = searchParams.get('categoria');
  const codigo = searchParams.get('codigo');
  const tipo = searchParams.get('tipo') || 'composicoes';

  try {
    // Buscar composição específica por código
    if (codigo) {
      const composicao = getComposicaoByCodigo(codigo);
      if (!composicao) {
        return errorResponse('Composição não encontrada', 404);
      }
      return NextResponse.json({ composicao });
    }

    // Retornar tipos diferentes de dados
    switch (tipo) {
      case 'materiais':
        return NextResponse.json({
          materiais: SINAPI_MATERIAIS,
          total: SINAPI_MATERIAIS.length,
        });

      case 'mao-de-obra':
        return NextResponse.json({
          maoDeObra: SINAPI_MAO_DE_OBRA,
          total: SINAPI_MAO_DE_OBRA.length,
        });

      case 'categorias':
        return NextResponse.json({
          categorias: SINAPI_CATEGORIAS,
          total: SINAPI_CATEGORIAS.length,
        });

      case 'composicoes':
      default:
        // Buscar por termo
        if (search) {
          const resultados = searchComposicoes(search);
          return NextResponse.json({
            composicoes: resultados,
            total: resultados.length,
            query: search,
          });
        }

        // Filtrar por categoria
        if (categoria) {
          const composicoes = getComposicoesByCategoria(categoria);
          return NextResponse.json({
            composicoes,
            total: composicoes.length,
            categoria,
          });
        }

        // Retornar todas as composições
        return NextResponse.json({
          composicoes: SINAPI_COMPOSICOES,
          total: SINAPI_COMPOSICOES.length,
          categorias: SINAPI_CATEGORIAS,
        });
    }
  } catch (error) {
    console.error('Erro ao buscar dados SINAPI:', error);
    return errorResponse('Erro ao buscar dados SINAPI', 500);
  }
}
