/**
 * DRE por Obra (Demonstrativo de Resultado)
 * 
 * Financial statement for construction projects
 * Implements Brazilian construction accounting standards
 */

import { db } from '@/lib/db';

// DRE Categories
export const DRE_CATEGORIES = {
  RECEITA: {
    RECEITA_BRUTA: 'receita_bruta',
    DEDUCOES: 'deducoes',
    RECEITA_LIQUIDA: 'receita_liquida',
  },
  CUSTOS: {
    CUSTO_MATERIAIS: 'custo_materiais',
    CUSTO_MAO_OBRA: 'custo_mao_obra',
    CUSTO_EQUIPAMENTOS: 'custo_equipamentos',
    CUSTO_SERVICOS: 'custo_servicos',
    CUSTO_INDIRETO: 'custo_indireto',
    CUSTO_TOTAL: 'custo_total',
  },
  MARGEM: {
    MARGEM_BRUTA: 'margem_bruta',
    DESPESAS_OPERACIONAIS: 'despesas_operacionais',
    RESULTADO_OPERACIONAL: 'resultado_operacional',
  },
  RESULTADO: {
    RESULTADO_LIQUIDO: 'resultado_liquido',
    MARGEM_LIQUIDA: 'margem_liquida',
    ROI: 'roi',
  },
} as const;

export interface DREItem {
  category: string;
  description: string;
  value: number;
  percentage: number;
  subItems?: DREItem[];
}

export interface DREReport {
  projectId: string;
  projectName: string;
  period: {
    start: Date;
    end: Date;
  };
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custos: {
    materiais: number;
    maoObra: number;
    equipamentos: number;
    servicos: number;
    indiretos: number;
    total: number;
  };
  margemBruta: number;
  margemBrutaPercent: number;
  despesasOperacionais: number;
  resultadoOperacional: number;
  impostos: number;
  resultadoLiquido: number;
  margemLiquidaPercent: number;
  roi: number;
  items: DREItem[];
  comparison?: {
    previousPeriod: DREReport | null;
    variation: Record<string, number>;
  };
}

/**
 * Calculate DRE for a project
 */
export async function calculateDRE(
  projectId: string,
  periodStart: Date,
  periodEnd: Date,
  options?: { includeComparison?: boolean }
): Promise<DREReport> {
  // Get project info
  const project = await db.projects.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      estimatedValue: true,
      actualValue: true,
    },
  });

  if (!project) {
    throw new Error('Projeto não encontrado');
  }

  // Get all transactions for the period
  const transactions = await db.transactions.findMany({
    where: {
      projectId,
      date: {
        gte: periodStart,
        lte: periodEnd,
      },
      status: 'paid',
    },
  });

  // Get budget items for cost analysis
  const budgets = await db.budgets.findMany({
    where: { projectId },
    include: {
      budget_items: {
        include: {
          compositions: {
            include: {
              composition_items: true,
            },
          },
        },
      },
    },
  });

  // Get measurements for revenue recognition
  const measurements = await db.medicoes.findMany({
    where: {
      projectId,
      status: 'approved',
      dataInicio: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    include: {
      medicao_items: true,
    },
  });

  // Calculate revenue
  const receitaBruta = measurements.reduce((sum, m) => {
    return sum + (m.medicao_items?.reduce((s, item) => s + Number(item.valorTotal || 0), 0) || 0);
  }, 0);

  // Calculate deductions (taxes, discounts)
  const deducoes = transactions
    .filter(t => t.type === 'despesa' && t.category?.toLowerCase().includes('imposto'))
    .reduce((sum, t) => sum + Number(t.value), 0);

  const receitaLiquida = receitaBruta - deducoes;

  // Calculate costs by category
  const costTransactions = transactions.filter(t => t.type === 'despesa');
  
  const custos = {
    materiais: costTransactions
      .filter(t => t.category?.toLowerCase().includes('material'))
      .reduce((sum, t) => sum + Number(t.value), 0),
    maoObra: costTransactions
      .filter(t => t.category?.toLowerCase().includes('mão') || t.category?.toLowerCase().includes('pessoal'))
      .reduce((sum, t) => sum + Number(t.value), 0),
    equipamentos: costTransactions
      .filter(t => t.category?.toLowerCase().includes('equipamento') || t.category?.toLowerCase().includes('aluguel'))
      .reduce((sum, t) => sum + Number(t.value), 0),
    servicos: costTransactions
      .filter(t => t.category?.toLowerCase().includes('serviço') || t.category?.toLowerCase().includes('terceiro'))
      .reduce((sum, t) => sum + Number(t.value), 0),
    indiretos: costTransactions
      .filter(t => 
        !t.category?.toLowerCase().includes('material') &&
        !t.category?.toLowerCase().includes('mão') &&
        !t.category?.toLowerCase().includes('pessoal') &&
        !t.category?.toLowerCase().includes('equipamento') &&
        !t.category?.toLowerCase().includes('aluguel') &&
        !t.category?.toLowerCase().includes('serviço') &&
        !t.category?.toLowerCase().includes('terceiro') &&
        !t.category?.toLowerCase().includes('imposto')
      )
      .reduce((sum, t) => sum + Number(t.value), 0),
    total: 0,
  };
  custos.total = custos.materiais + custos.maoObra + custos.equipamentos + custos.servicos + custos.indiretos;

  // Calculate margins
  const margemBruta = receitaLiquida - custos.total;
  const margemBrutaPercent = receitaLiquida > 0 ? (margemBruta / receitaLiquida) * 100 : 0;

  // Despesas operacionais (overhead)
  const despesasOperacionais = costTransactions
    .filter(t => t.category?.toLowerCase().includes('administrativo') || t.category?.toLowerCase().includes('overhead'))
    .reduce((sum, t) => sum + Number(t.value), 0);

  const resultadoOperacional = margemBruta - despesasOperacionais;

  // Calculate taxes on profit
  const impostos = Math.max(0, resultadoOperacional * 0.15); // Simplified tax calculation

  const resultadoLiquido = resultadoOperacional - impostos;
  const margemLiquidaPercent = receitaLiquida > 0 ? (resultadoLiquido / receitaLiquida) * 100 : 0;

  // ROI calculation
  const investedCapital = Number(project.estimatedValue) || receitaBruta;
  const roi = investedCapital > 0 ? (resultadoLiquido / investedCapital) * 100 : 0;

  // Build DRE items structure
  const items: DREItem[] = [
    {
      category: DRE_CATEGORIES.RECEITA.RECEITA_BRUTA,
      description: 'Receita Bruta',
      value: receitaBruta,
      percentage: 100,
    },
    {
      category: DRE_CATEGORIES.RECEITA.DEDUCOES,
      description: 'Deduções (Impostos s/ Vendas)',
      value: -deducoes,
      percentage: receitaBruta > 0 ? (deducoes / receitaBruta) * 100 : 0,
    },
    {
      category: DRE_CATEGORIES.RECEITA.RECEITA_LIQUIDA,
      description: 'Receita Líquida',
      value: receitaLiquida,
      percentage: receitaBruta > 0 ? (receitaLiquida / receitaBruta) * 100 : 0,
    },
    {
      category: DRE_CATEGORIES.CUSTOS.CUSTO_TOTAL,
      description: 'Custos dos Serviços Prestados',
      value: -custos.total,
      percentage: receitaLiquida > 0 ? (custos.total / receitaLiquida) * 100 : 0,
      subItems: [
        {
          category: DRE_CATEGORIES.CUSTOS.CUSTO_MATERIAIS,
          description: 'Materiais',
          value: -custos.materiais,
          percentage: receitaLiquida > 0 ? (custos.materiais / receitaLiquida) * 100 : 0,
        },
        {
          category: DRE_CATEGORIES.CUSTOS.CUSTO_MAO_OBRA,
          description: 'Mão de Obra',
          value: -custos.maoObra,
          percentage: receitaLiquida > 0 ? (custos.maoObra / receitaLiquida) * 100 : 0,
        },
        {
          category: DRE_CATEGORIES.CUSTOS.CUSTO_EQUIPAMENTOS,
          description: 'Equipamentos',
          value: -custos.equipamentos,
          percentage: receitaLiquida > 0 ? (custos.equipamentos / receitaLiquida) * 100 : 0,
        },
        {
          category: DRE_CATEGORIES.CUSTOS.CUSTO_SERVICOS,
          description: 'Serviços de Terceiros',
          value: -custos.servicos,
          percentage: receitaLiquida > 0 ? (custos.servicos / receitaLiquida) * 100 : 0,
        },
        {
          category: DRE_CATEGORIES.CUSTOS.CUSTO_INDIRETO,
          description: 'Custos Indiretos',
          value: -custos.indiretos,
          percentage: receitaLiquida > 0 ? (custos.indiretos / receitaLiquida) * 100 : 0,
        },
      ],
    },
    {
      category: DRE_CATEGORIES.MARGEM.MARGEM_BRUTA,
      description: 'Margem Bruta',
      value: margemBruta,
      percentage: margemBrutaPercent,
    },
    {
      category: DRE_CATEGORIES.MARGEM.DESPESAS_OPERACIONAIS,
      description: 'Despesas Operacionais',
      value: -despesasOperacionais,
      percentage: receitaLiquida > 0 ? (despesasOperacionais / receitaLiquida) * 100 : 0,
    },
    {
      category: DRE_CATEGORIES.MARGEM.RESULTADO_OPERACIONAL,
      description: 'Resultado Operacional (EBIT)',
      value: resultadoOperacional,
      percentage: receitaLiquida > 0 ? (resultadoOperacional / receitaLiquida) * 100 : 0,
    },
    {
      category: 'impostos',
      description: 'Impostos s/ Lucro',
      value: -impostos,
      percentage: receitaLiquida > 0 ? (impostos / receitaLiquida) * 100 : 0,
    },
    {
      category: DRE_CATEGORIES.RESULTADO.RESULTADO_LIQUIDO,
      description: 'Resultado Líquido',
      value: resultadoLiquido,
      percentage: margemLiquidaPercent,
    },
    {
      category: DRE_CATEGORIES.RESULTADO.ROI,
      description: 'ROI (Retorno s/ Investimento)',
      value: roi,
      percentage: 0,
    },
  ];

  const report: DREReport = {
    projectId,
    projectName: project.name,
    period: {
      start: periodStart,
      end: periodEnd,
    },
    receitaBruta,
    deducoes,
    receitaLiquida,
    custos,
    margemBruta,
    margemBrutaPercent,
    despesasOperacionais,
    resultadoOperacional,
    impostos,
    resultadoLiquido,
    margemLiquidaPercent,
    roi,
    items,
  };

  // Include comparison with previous period if requested
  if (options?.includeComparison) {
    const previousPeriodStart = new Date(periodStart);
    previousPeriodStart.setMonth(previousPeriodStart.getMonth() - 1);
    const previousPeriodEnd = new Date(periodStart);
    previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);

    try {
      const previousDRE = await calculateDRE(projectId, previousPeriodStart, previousPeriodEnd);
      
      report.comparison = {
        previousPeriod: previousDRE,
        variation: {
          receitaBruta: calculateVariation(receitaBruta, previousDRE.receitaBruta),
          receitaLiquida: calculateVariation(receitaLiquida, previousDRE.receitaLiquida),
          custos: calculateVariation(custos.total, previousDRE.custos.total),
          margemBruta: calculateVariation(margemBruta, previousDRE.margemBruta),
          resultadoLiquido: calculateVariation(resultadoLiquido, previousDRE.resultadoLiquido),
        },
      };
    } catch {
      report.comparison = {
        previousPeriod: null,
        variation: {},
      };
    }
  }

  return report;
}

/**
 * Calculate percentage variation between two values
 */
function calculateVariation(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Get DRE summary for all projects
 */
export async function getAllProjectsDRE(
  companyId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<DREReport[]> {
  const projects = await db.projects.findMany({
    where: { companyId },
    select: { id: true },
  });

  const reports: DREReport[] = [];

  for (const project of projects) {
    try {
      const dre = await calculateDRE(project.id, periodStart, periodEnd);
      reports.push(dre);
    } catch (error) {
      console.error(`Failed to calculate DRE for project ${project.id}:`, error);
    }
  }

  return reports;
}

/**
 * Export DRE to different formats
 */
export function exportDRE(report: DREReport, format: 'json' | 'csv' | 'pdf'): string | Buffer {
  switch (format) {
    case 'json':
      return JSON.stringify(report, null, 2);
    
    case 'csv':
      return generateDRECSV(report);
    
    case 'pdf':
      // PDF generation would require a PDF library
      throw new Error('PDF export not implemented');
    
    default:
      throw new Error('Invalid export format');
  }
}

function generateDRECSV(report: DREReport): string {
  const lines = [
    `DRE - Demonstrativo de Resultado`,
    `Projeto: ${report.projectName}`,
    `Período: ${report.period.start.toISOString().split('T')[0]} a ${report.period.end.toISOString().split('T')[0]}`,
    '',
    'Categoria,Descrição,Valor,Percentual',
  ];

  for (const item of report.items) {
    lines.push(`${item.category},${item.description},${item.value.toFixed(2)},${item.percentage.toFixed(2)}%`);
    
    if (item.subItems) {
      for (const subItem of item.subItems) {
        lines.push(`  ${subItem.category},${subItem.description},${subItem.value.toFixed(2)},${subItem.percentage.toFixed(2)}%`);
      }
    }
  }

  return lines.join('\n');
}
