// =============================================================================
// ConstrutorPro - API Curva ABC
// Análise Pareto de custos de orçamentos
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorResponse } from '@/server/auth';
import { db } from '@/lib/db';
import {
  performABCAnalysis,
  exportABCToCSV,
  generateABCReport,
  DEFAULT_ABC_THRESHOLDS,
  ABCThresholds,
} from '@/lib/curva-abc';

// =============================================================================
// GET - Obter análise ABC de um orçamento
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
  const { id } = await params;
  const { searchParams } = new URL(request.url);

  // Parâmetros opcionais
  const format = searchParams.get('format') || 'json'; // json, csv, report
  const classA = searchParams.get('classA');
  const classB = searchParams.get('classB');

  try {
    // Buscar orçamento
    const budget = await db.budgets.findFirst({
      where: {
        id,
        companyId: user.companyId || undefined,
      },
      include: {
        budget_items: {
          include: {
            compositions: {
              select: {
                code: true,
                name: true,
              },
            },
          },
          orderBy: {
            totalPrice: 'desc',
          },
        },
      },
    });

    if (!budget) {
      return errorResponse('Orçamento não encontrado', 404);
    }

    // Preparar itens para análise
    const items = budget.budget_items.map((item) => ({
      id: item.id,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      category: null,
      compositionId: item.compositionId,
    }));

    // Configurar thresholds customizados
    const thresholds: ABCThresholds = {
      classA: classA ? parseFloat(classA) : DEFAULT_ABC_THRESHOLDS.classA,
      classB: classB ? parseFloat(classB) : DEFAULT_ABC_THRESHOLDS.classB,
      classC: 100,
    };

    // Realizar análise ABC
    const analysis = performABCAnalysis(items, thresholds);

    // Retornar no formato solicitado
    switch (format) {
      case 'csv':
        return new NextResponse(exportABCToCSV(analysis), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="curva-abc-${budget.code || budget.id}.csv"`,
          },
        });

      case 'report':
        return new NextResponse(generateABCReport(analysis), {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Content-Disposition': `attachment; filename="relatorio-abc-${budget.code || budget.id}.txt"`,
          },
        });

      default:
        return NextResponse.json({
          success: true,
          data: {
            budget: {
              id: budget.id,
              name: budget.name,
              code: budget.code,
              totalValue: budget.totalValue,
            },
            analysis,
          },
        });
    }
  } catch (error) {
    console.error('Erro na análise ABC:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Erro ao processar análise ABC',
      500
    );
  }
}
