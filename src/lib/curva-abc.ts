// =============================================================================
// ConstrutorPro - Curva ABC (Análise Pareto de Custos)
// Classificação de itens por importância econômica para gestão de custos
// =============================================================================

import { Decimal } from '@prisma/client/runtime/library';

// =============================================================================
// Tipos e Interfaces
// =============================================================================

export interface ABCItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category?: string | null;
  compositionId?: string | null;
  /** Percentual do valor total */
  percentOfTotal: number;
  /** Percentual acumulado */
  cumulativePercent: number;
  /** Classe ABC */
  abcClass: 'A' | 'B' | 'C';
  /** Ranking (1 = maior valor) */
  rank: number;
  /** Quantidade acumulada de itens */
  cumulativeItemCount: number;
  /** Percentual de itens acumulado */
  cumulativeItemPercent: number;
}

export interface ABCAnalysisResult {
  /** Todos os itens classificados */
  items: ABCItem[];
  /** Estatísticas gerais */
  summary: {
    totalItems: number;
    totalValue: number;
    averageItemValue: number;
    medianItemValue: number;
    standardDeviation: number;
  };
  /** Resumo por classe */
  classSummary: {
    A: ABCClassSummary;
    B: ABCClassSummary;
    C: ABCClassSummary;
  };
  /** Configuração de thresholds usada */
  thresholds: ABCThresholds;
  /** Recomendações de gestão */
  recommendations: ABCRecommendation[];
  /** Dados para gráfico de Curva ABC */
  chartData: ABCChartDataPoint[];
}

export interface ABCClassSummary {
  class: 'A' | 'B' | 'C';
  itemCount: number;
  itemPercent: number;
  totalValue: number;
  valuePercent: number;
  averageValue: number;
  description: string;
  managementStrategy: string;
}

export interface ABCThresholds {
  /** Limite superior da classe A (percentual acumulado) */
  classA: number;
  /** Limite superior da classe B (percentual acumulado) */
  classB: number;
  /** Classe C é o restante */
  classC: number;
}

export interface ABCRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  actionItems: string[];
  targetClass: ('A' | 'B' | 'C')[];
}

export interface ABCChartDataPoint {
  rank: number;
  description: string;
  value: number;
  cumulativePercent: number;
  abcClass: 'A' | 'B' | 'C';
  itemPercent: number;
}

// =============================================================================
// Configurações Padrão
// =============================================================================

export const DEFAULT_ABC_THRESHOLDS: ABCThresholds = {
  classA: 80, // 80% do valor acumulado = Classe A
  classB: 95, // 95% do valor acumulado = Classe B
  classC: 100, // Restante = Classe C
};

export const CLASS_DESCRIPTIONS: Record<'A' | 'B' | 'C', { description: string; strategy: string }> = {
  A: {
    description: 'Itens de alta importância econômica - requerem gestão rigorosa',
    strategy: 'Controle rigoroso, negociações agressivas, estoque mínimo com entregas programadas',
  },
  B: {
    description: 'Itens de importância intermediária - gestão moderada',
    strategy: 'Controle moderado, estoque de segurança, compras periódicas',
  },
  C: {
    description: 'Itens de menor impacto econômico - gestão simplificada',
    strategy: 'Controle simplificado, estoque maior, compras por demanda ou consignado',
  },
};

// =============================================================================
// Funções Principais
// =============================================================================

/**
 * Realiza análise ABC completa de uma lista de itens
 */
export function performABCAnalysis(
  rawItems: Array<{
    id: string;
    description: string;
    unit: string;
    quantity: Decimal | number;
    unitPrice: Decimal | number;
    totalPrice: Decimal | number;
    category?: string | null;
    compositionId?: string | null;
  }>,
  thresholds: ABCThresholds = DEFAULT_ABC_THRESHOLDS
): ABCAnalysisResult {
  // Converter Decimal para number
  const items = rawItems.map((item) => ({
    ...item,
    quantity: typeof item.quantity === 'object' ? item.quantity.toNumber() : item.quantity,
    unitPrice: typeof item.unitPrice === 'object' ? item.unitPrice.toNumber() : item.unitPrice,
    totalPrice: typeof item.totalPrice === 'object' ? item.totalPrice.toNumber() : item.totalPrice,
  }));

  // Calcular valor total
  const totalValue = items.reduce((sum, item) => sum + item.totalPrice, 0);

  if (totalValue === 0) {
    return createEmptyResult(thresholds);
  }

  // Ordenar por valor decrescente
  const sortedItems = [...items].sort((a, b) => b.totalPrice - a.totalPrice);

  // Calcular percentuais e classificar
  let cumulativeValue = 0;
  const abcItems: ABCItem[] = sortedItems.map((item, index) => {
    const percentOfTotal = (item.totalPrice / totalValue) * 100;
    cumulativeValue += item.totalPrice;
    const cumulativePercent = (cumulativeValue / totalValue) * 100;

    // Determinar classe ABC
    let abcClass: 'A' | 'B' | 'C';
    if (cumulativePercent <= thresholds.classA) {
      abcClass = 'A';
    } else if (cumulativePercent <= thresholds.classB) {
      abcClass = 'B';
    } else {
      abcClass = 'C';
    }

    // Ajustar classe para itens que começam em A mas passam para B
    // (o primeiro item de B continua sendo classificado como B)
    const prevCumulative = cumulativePercent - percentOfTotal;
    if (prevCumulative < thresholds.classA && cumulativePercent > thresholds.classA) {
      abcClass = 'A'; // Item que cruza o limiar A
    }

    return {
      id: item.id,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      category: item.category,
      compositionId: item.compositionId,
      percentOfTotal,
      cumulativePercent,
      abcClass,
      rank: index + 1,
      cumulativeItemCount: index + 1,
      cumulativeItemPercent: 0, // Será calculado depois
    };
  });

  // Calcular percentual de itens acumulado
  const totalItems = abcItems.length;
  abcItems.forEach((item) => {
    item.cumulativeItemPercent = (item.cumulativeItemCount / totalItems) * 100;
  });

  // Reclassificar itens que estão na mesma classe de valor
  // Garantir consistência na classificação
  reclassifyItems(abcItems, thresholds);

  // Calcular estatísticas
  const values = abcItems.map((i) => i.totalPrice);
  const summary = {
    totalItems,
    totalValue,
    averageItemValue: totalValue / totalItems,
    medianItemValue: calculateMedian(values),
    standardDeviation: calculateStandardDeviation(values),
  };

  // Calcular resumo por classe
  const classSummary = calculateClassSummary(abcItems, totalItems, totalValue, thresholds);

  // Gerar dados para gráfico
  const chartData = generateChartData(abcItems);

  // Gerar recomendações
  const recommendations = generateRecommendations(classSummary, abcItems);

  return {
    items: abcItems,
    summary,
    classSummary,
    thresholds,
    recommendations,
    chartData,
  };
}

/**
 * Reclassifica itens para garantir consistência
 * (itens com mesmo valor percentual devem estar na mesma classe)
 */
function reclassifyItems(items: ABCItem[], thresholds: ABCThresholds): void {
  let currentClass: 'A' | 'B' | 'C' = 'A';
  let classAEnd = false;
  let classBEnd = false;

  for (const item of items) {
    if (!classAEnd && item.cumulativePercent > thresholds.classA) {
      classAEnd = true;
      currentClass = 'B';
    }
    if (!classBEnd && item.cumulativePercent > thresholds.classB) {
      classBEnd = true;
      currentClass = 'C';
    }
    item.abcClass = currentClass;
  }
}

/**
 * Calcula resumo por classe ABC
 */
function calculateClassSummary(
  items: ABCItem[],
  totalItems: number,
  totalValue: number,
  thresholds: ABCThresholds
): { A: ABCClassSummary; B: ABCClassSummary; C: ABCClassSummary } {
  const classes: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
  const summary: Record<'A' | 'B' | 'C', ABCClassSummary> = {} as Record<'A' | 'B' | 'C', ABCClassSummary>;

  for (const abcClass of classes) {
    const classItems = items.filter((i) => i.abcClass === abcClass);
    const itemCount = classItems.length;
    const classValue = classItems.reduce((sum, i) => sum + i.totalPrice, 0);

    summary[abcClass] = {
      class: abcClass,
      itemCount,
      itemPercent: (itemCount / totalItems) * 100,
      totalValue: classValue,
      valuePercent: (classValue / totalValue) * 100,
      averageValue: itemCount > 0 ? classValue / itemCount : 0,
      description: CLASS_DESCRIPTIONS[abcClass].description,
      managementStrategy: CLASS_DESCRIPTIONS[abcClass].strategy,
    };
  }

  return summary;
}

/**
 * Gera dados para gráfico de Curva ABC
 */
function generateChartData(items: ABCItem[]): ABCChartDataPoint[] {
  return items.map((item) => ({
    rank: item.rank,
    description: item.description.substring(0, 30) + (item.description.length > 30 ? '...' : ''),
    value: item.totalPrice,
    cumulativePercent: item.cumulativePercent,
    abcClass: item.abcClass,
    itemPercent: item.cumulativeItemPercent,
  }));
}

/**
 * Gera recomendações de gestão baseadas na análise ABC
 */
function generateRecommendations(
  classSummary: ABCAnalysisResult['classSummary'],
  items: ABCItem[]
): ABCRecommendation[] {
  const recommendations: ABCRecommendation[] = [];

  // Recomendações para Classe A
  if (classSummary.A.itemCount > 0) {
    const topItems = items.filter((i) => i.abcClass === 'A').slice(0, 5);

    recommendations.push({
      priority: 'high',
      category: 'Gestão de Custos',
      title: 'Foco nos Itens Classe A',
      description: `${classSummary.A.itemCount} itens (${classSummary.A.itemPercent.toFixed(1)}% do total) representam ${classSummary.A.valuePercent.toFixed(1)}% do valor do orçamento.`,
      actionItems: [
        'Negociar preços agressivamente com fornecedores',
        'Implementar controle rigoroso de quantidade e qualidade',
        'Considerar entregas programadas para reduzir estoque',
        'Avaliar substituições por alternativas mais econômicas',
        'Monitorar variação de preços mensalmente',
      ],
      targetClass: ['A'],
    });

    if (topItems.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Priorização',
        title: 'Top 5 Itens para Negociação',
        description: `Os itens "${topItems[0]?.description}", "${topItems[1]?.description}" e outros do topo da lista devem ser prioridade nas negociações.`,
        actionItems: topItems.map((item, i) => `${i + 1}. ${item.description} - R$ ${item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`),
        targetClass: ['A'],
      });
    }
  }

  // Recomendações para Classe B
  if (classSummary.B.itemCount > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'Gestão de Estoque',
      title: 'Gestão Moderada Classe B',
      description: `${classSummary.B.itemCount} itens (${classSummary.B.itemPercent.toFixed(1)}% do total) representam ${classSummary.B.valuePercent.toFixed(1)}% do valor.`,
      actionItems: [
        'Manter estoque de segurança adequado',
        'Realizar compras periódicas (mensal/trimestral)',
        'Comparar preços entre 3 fornecedores',
        'Avaliar lead time de entrega',
      ],
      targetClass: ['B'],
    });
  }

  // Recomendações para Classe C
  if (classSummary.C.itemCount > 0) {
    recommendations.push({
      priority: 'low',
      category: 'Otimização',
      title: 'Simplificação Classe C',
      description: `${classSummary.C.itemCount} itens (${classSummary.C.itemPercent.toFixed(1)}% do total) representam apenas ${classSummary.C.valuePercent.toFixed(1)}% do valor.`,
      actionItems: [
        'Consolidar pedidos para reduzir custo de aquisição',
        'Considerar estoque consignado com fornecedores',
        'Automatizar processo de reposição',
        'Agrupar itens por categoria para compras simplificadas',
      ],
      targetClass: ['C'],
    });
  }

  // Análise de concentração
  const concentrationRatio = classSummary.A.itemPercent;
  if (concentrationRatio < 10) {
    recommendations.push({
      priority: 'medium',
      category: 'Análise de Risco',
      title: 'Alta Concentração de Valor',
      description: 'Poucos itens concentram a maior parte do valor, indicando alto risco de variação de custos.',
      actionItems: [
        'Monitorar rigorosamente os fornecedores dos itens Classe A',
        'Desenvolver fontes alternativas de fornecimento',
        'Criar contratos de longo prazo com cláusulas de reajuste',
      ],
      targetClass: ['A'],
    });
  }

  return recommendations;
}

/**
 * Cria resultado vazio para casos sem dados
 */
function createEmptyResult(thresholds: ABCThresholds): ABCAnalysisResult {
  return {
    items: [],
    summary: {
      totalItems: 0,
      totalValue: 0,
      averageItemValue: 0,
      medianItemValue: 0,
      standardDeviation: 0,
    },
    classSummary: {
      A: { class: 'A', itemCount: 0, itemPercent: 0, totalValue: 0, valuePercent: 0, averageValue: 0, description: CLASS_DESCRIPTIONS.A.description, managementStrategy: CLASS_DESCRIPTIONS.A.strategy },
      B: { class: 'B', itemCount: 0, itemPercent: 0, totalValue: 0, valuePercent: 0, averageValue: 0, description: CLASS_DESCRIPTIONS.B.description, managementStrategy: CLASS_DESCRIPTIONS.B.strategy },
      C: { class: 'C', itemCount: 0, itemPercent: 0, totalValue: 0, valuePercent: 0, averageValue: 0, description: CLASS_DESCRIPTIONS.C.description, managementStrategy: CLASS_DESCRIPTIONS.C.strategy },
    },
    thresholds,
    recommendations: [],
    chartData: [],
  };
}

// =============================================================================
// Funções Estatísticas Auxiliares
// =============================================================================

/**
 * Calcula a mediana de um array de valores
 */
function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/**
 * Calcula o desvio padrão de um array de valores
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

  return Math.sqrt(variance);
}

// =============================================================================
// Funções de Exportação
// =============================================================================

/**
 * Exporta análise ABC para formato CSV
 */
export function exportABCToCSV(analysis: ABCAnalysisResult): string {
  const headers = [
    'Rank',
    'Classe',
    'Descrição',
    'Unidade',
    'Quantidade',
    'Preço Unitário',
    'Preço Total',
    '% do Total',
    '% Acumulado',
  ];

  const rows = analysis.items.map((item) => [
    item.rank,
    item.abcClass,
    `"${item.description.replace(/"/g, '""')}"`,
    item.unit,
    item.quantity.toFixed(2),
    item.unitPrice.toFixed(2),
    item.totalPrice.toFixed(2),
    item.percentOfTotal.toFixed(2),
    item.cumulativePercent.toFixed(2),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Gera relatório resumido da análise ABC
 */
export function generateABCReport(analysis: ABCAnalysisResult): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    '              ANÁLISE ABC - CURVA DE PARETO',
    '              ConstrutorPro - Sistema de Gestão',
    '═══════════════════════════════════════════════════════════════',
    '',
    '───────────────────────────────────────────────────────────────',
    '                    RESUMO GERAL',
    '───────────────────────────────────────────────────────────────',
    '',
    `Total de Itens: ${analysis.summary.totalItems}`,
    `Valor Total: R$ ${analysis.summary.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    `Valor Médio: R$ ${analysis.summary.averageItemValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    `Mediana: R$ ${analysis.summary.medianItemValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    '',
    '───────────────────────────────────────────────────────────────',
    '                 DISTRIBUIÇÃO POR CLASSE',
    '───────────────────────────────────────────────────────────────',
    '',
    `CLASSE A:`,
    `  Itens: ${analysis.classSummary.A.itemCount} (${analysis.classSummary.A.itemPercent.toFixed(1)}%)`,
    `  Valor: R$ ${analysis.classSummary.A.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${analysis.classSummary.A.valuePercent.toFixed(1)}%)`,
    `  Estratégia: ${CLASS_DESCRIPTIONS.A.strategy}`,
    '',
    `CLASSE B:`,
    `  Itens: ${analysis.classSummary.B.itemCount} (${analysis.classSummary.B.itemPercent.toFixed(1)}%)`,
    `  Valor: R$ ${analysis.classSummary.B.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${analysis.classSummary.B.valuePercent.toFixed(1)}%)`,
    `  Estratégia: ${CLASS_DESCRIPTIONS.B.strategy}`,
    '',
    `CLASSE C:`,
    `  Itens: ${analysis.classSummary.C.itemCount} (${analysis.classSummary.C.itemPercent.toFixed(1)}%)`,
    `  Valor: R$ ${analysis.classSummary.C.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${analysis.classSummary.C.valuePercent.toFixed(1)}%)`,
    `  Estratégia: ${CLASS_DESCRIPTIONS.C.strategy}`,
    '',
    '───────────────────────────────────────────────────────────────',
    '                    TOP 10 ITENS',
    '───────────────────────────────────────────────────────────────',
    '',
  ];

  analysis.items.slice(0, 10).forEach((item) => {
    lines.push(`${item.rank}. [${item.abcClass}] ${item.description}`);
    lines.push(`   R$ ${item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${item.percentOfTotal.toFixed(2)}%)`);
    lines.push('');
  });

  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
