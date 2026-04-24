// =============================================================================
// ConstrutorPro - EVM (Earned Value Management) Library
// Funções para cálculo e análise de Valor Agregado
// =============================================================================

import { db } from '@/lib/db';
import { Decimal } from '@prisma/client/runtime/library';

// =============================================================================
// Tipos e Interfaces
// =============================================================================

export interface EVMMetrics {
  // Valores básicos
  plannedValue: number;      // PV - Valor Planejado
  earnedValue: number;       // EV - Valor Agregado
  actualCost: number;        // AC - Custo Real
  
  // Variações
  costVariance: number;      // CV = EV - AC
  scheduleVariance: number;  // SV = EV - PV
  varianceAtCompletion: number; // VAC = BAC - EAC
  
  // Índices
  costPerformanceIndex: number;   // CPI = EV / AC
  schedulePerformanceIndex: number; // SPI = EV / PV
  
  // Previsões
  estimateAtCompletion: number;   // EAC
  estimateToComplete: number;     // ETC = EAC - AC
  toCompletePerformanceIndex: number; // TCPI
  
  // Percentuais
  percentComplete: number;  // % concluído
  percentSpent: number;     // % gasto
  
  // Status
  costStatus: 'under_budget' | 'on_budget' | 'over_budget';
  scheduleStatus: 'ahead' | 'on_schedule' | 'behind';
  overallStatus: 'good' | 'warning' | 'critical';
}

export interface EVMPeriod {
  period: string;
  date: Date;
  plannedValue: number;
  earnedValue: number;
  actualCost: number;
  cumulativePV: number;
  cumulativeEV: number;
  cumulativeAC: number;
}

export interface EVMTrend {
  period: string;
  cpi: number;
  spi: number;
}

export interface EVMForecast {
  // EAC por diferentes métodos
  eacAcquiescent: number;     // EAC = AC + (BAC - EV)
  eacCpi: number;             // EAC = AC + (BAC - EV) / CPI
  eacCpiSpi: number;          // EAC = AC + (BAC - EV) / (CPI * SPI)
  
  // Previsões de prazo
  estimatedDuration: number;  // Duração estimada total
  timeRemaining: number;      // Tempo restante
  
  // Risco
  riskLevel: 'low' | 'medium' | 'high';
  riskMessage: string;
}

export interface ProjectEVMData {
  projectId: string;
  projectName: string;
  budgetAtCompletion: number; // BAC
  totalDuration: number;      // Duração total planejada (dias)
  elapsedDays: number;        // Dias decorridos
  remainingDays: number;      // Dias restantes
  metrics: EVMMetrics;
  periods: EVMPeriod[];
  trends: EVMTrend[];
  forecast: EVMForecast;
}

// =============================================================================
// Funções de Cálculo EVM
// =============================================================================

/**
 * Calcula métricas EVM completas para um projeto
 */
export async function calculateProjectEVM(projectId: string): Promise<ProjectEVMData> {
  // Buscar projeto
  const project = await db.projects.findUnique({
    where: { id: projectId },
    include: {
      budgets: {
        where: { status: 'approved' },
        include: {
          budget_items: true,
        },
      },
      schedules: {
        include: {
          schedule_tasks: true,
        },
      },
    },
  });

  if (!project) {
    throw new Error('Projeto não encontrado');
  }

  // Calcular BAC (Budget at Completion)
  const budgetAtCompletion = project.budgets.reduce((sum, budget) => {
    const value = budget.totalValue.toNumber();
    return sum + value;
  }, 0);

  // Calcular datas
  const startDate = project.startDate ? new Date(project.startDate) : new Date();
  const endDate = project.endDate ? new Date(project.endDate) : new Date();
  const today = new Date();
  
  const totalDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.min(
    Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
    totalDuration
  );
  const remainingDays = Math.max(totalDuration - elapsedDays, 0);

  // Calcular PV (Planned Value) - Valor que deveria ter sido realizado
  const progressPercent = elapsedDays / totalDuration;
  const plannedValue = budgetAtCompletion * progressPercent;

  // Buscar custos reais
  const actualCosts = await db.actual_costs.findMany({
    where: { projectId },
  });

  // Calcular AC (Actual Cost) - Custo real incorrido
  const actualCost = actualCosts.reduce((sum, cost) => {
    return sum + cost.value.toNumber();
  }, 0);

  // Calcular EV (Earned Value) - Valor realmente agregado
  // Baseado no progresso físico do projeto
  const physicalProgress = project.physicalProgress / 100;
  const earnedValue = budgetAtCompletion * physicalProgress;

  // Calcular métricas derivadas
  const metrics = calculateEVMMetrics(
    plannedValue,
    earnedValue,
    actualCost,
    budgetAtCompletion
  );

  // Calcular períodos para gráfico (por mês)
  const periods = await calculateEVMPeriods(projectId, startDate, endDate, budgetAtCompletion);

  // Calcular tendências
  const trends = calculateEVMTrends(periods);

  // Calcular previsões
  const forecast = calculateEVMForecast(
    metrics,
    totalDuration,
    elapsedDays,
    budgetAtCompletion
  );

  return {
    projectId: project.id,
    projectName: project.name,
    budgetAtCompletion,
    totalDuration,
    elapsedDays,
    remainingDays,
    metrics,
    periods,
    trends,
    forecast,
  };
}

/**
 * Calcula métricas EVM básicas
 */
export function calculateEVMMetrics(
  pv: number,
  ev: number,
  ac: number,
  bac: number
): EVMMetrics {
  // Variações
  const costVariance = ev - ac;
  const scheduleVariance = ev - pv;
  
  // Índices
  const costPerformanceIndex = ac > 0 ? ev / ac : 0;
  const schedulePerformanceIndex = pv > 0 ? ev / pv : 0;
  
  // EAC (Estimate at Completion) - Método CPI
  const estimateAtCompletion = costPerformanceIndex > 0 
    ? ac + (bac - ev) / costPerformanceIndex 
    : bac;
  
  // ETC (Estimate to Complete)
  const estimateToComplete = Math.max(estimateAtCompletion - ac, 0);
  
  // VAC (Variance at Completion)
  const varianceAtCompletion = bac - estimateAtCompletion;
  
  // TCPI (To-Complete Performance Index)
  const toCompletePerformanceIndex = (bac - ev) / (bac - ac);
  
  // Percentuais
  const percentComplete = bac > 0 ? (ev / bac) * 100 : 0;
  const percentSpent = bac > 0 ? (ac / bac) * 100 : 0;
  
  // Status de custo
  let costStatus: EVMMetrics['costStatus'];
  if (costPerformanceIndex >= 1) {
    costStatus = 'under_budget';
  } else if (costPerformanceIndex >= 0.95) {
    costStatus = 'on_budget';
  } else {
    costStatus = 'over_budget';
  }
  
  // Status de prazo
  let scheduleStatus: EVMMetrics['scheduleStatus'];
  if (schedulePerformanceIndex >= 1) {
    scheduleStatus = 'ahead';
  } else if (schedulePerformanceIndex >= 0.95) {
    scheduleStatus = 'on_schedule';
  } else {
    scheduleStatus = 'behind';
  }
  
  // Status geral
  let overallStatus: EVMMetrics['overallStatus'];
  if (costPerformanceIndex >= 1 && schedulePerformanceIndex >= 1) {
    overallStatus = 'good';
  } else if (costPerformanceIndex >= 0.9 && schedulePerformanceIndex >= 0.9) {
    overallStatus = 'warning';
  } else {
    overallStatus = 'critical';
  }

  return {
    plannedValue: pv,
    earnedValue: ev,
    actualCost: ac,
    costVariance,
    scheduleVariance,
    varianceAtCompletion,
    costPerformanceIndex,
    schedulePerformanceIndex,
    estimateAtCompletion,
    estimateToComplete,
    toCompletePerformanceIndex,
    percentComplete,
    percentSpent,
    costStatus,
    scheduleStatus,
    overallStatus,
  };
}

/**
 * Calcula dados de períodos para gráfico de Curva S
 */
async function calculateEVMPeriods(
  projectId: string,
  startDate: Date,
  endDate: Date,
  bac: number
): Promise<EVMPeriod[]> {
  const periods: EVMPeriod[] = [];
  const today = new Date();
  
  // Gerar períodos mensais
  let currentDate = new Date(startDate);
  let cumulativePV = 0;
  let cumulativeEV = 0;
  let cumulativeAC = 0;

  while (currentDate <= endDate) {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    
    const periodLabel = currentDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    
    // PV acumulado até esta data
    const daysUntilDate = Math.ceil(
      (Math.min(nextMonth.getTime(), endDate.getTime()) - startDate.getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    cumulativePV = bac * (daysUntilDate / totalDays);
    
    // Buscar custos reais até esta data
    const costsUntilDate = await db.actual_costs.findMany({
      where: {
        projectId,
        date: { lte: nextMonth },
      },
    });
    cumulativeAC = costsUntilDate.reduce((sum, c) => sum + c.value.toNumber(), 0);
    
    // EV acumulado (baseado no progresso proporcional)
    if (nextMonth <= today) {
      cumulativeEV = cumulativePV * 0.9; // Simplificação: 90% do planejado
    }

    periods.push({
      period: periodLabel,
      date: new Date(currentDate),
      plannedValue: cumulativePV,
      earnedValue: cumulativeEV,
      actualCost: cumulativeAC,
      cumulativePV,
      cumulativeEV,
      cumulativeAC,
    });

    currentDate = nextMonth;
  }

  return periods;
}

/**
 * Calcula tendências de CPI e SPI
 */
function calculateEVMTrends(periods: EVMPeriod[]): EVMTrend[] {
  return periods.map((period) => ({
    period: period.period,
    cpi: period.actualCost > 0 
      ? period.earnedValue / period.actualCost 
      : 1,
    spi: period.plannedValue > 0 
      ? period.earnedValue / period.plannedValue 
      : 1,
  }));
}

/**
 * Calcula previsões EVM
 */
function calculateEVMForecast(
  metrics: EVMMetrics,
  totalDuration: number,
  elapsedDays: number,
  bac: number
): EVMForecast {
  const { actualCost, earnedValue, costPerformanceIndex, schedulePerformanceIndex } = metrics;
  
  // EAC por diferentes métodos
  const eacAcquiescent = actualCost + (bac - earnedValue);
  const eacCpi = costPerformanceIndex > 0 
    ? actualCost + (bac - earnedValue) / costPerformanceIndex 
    : bac;
  const eacCpiSpi = (costPerformanceIndex * schedulePerformanceIndex) > 0
    ? actualCost + (bac - earnedValue) / (costPerformanceIndex * schedulePerformanceIndex)
    : bac;
  
  // Previsão de prazo
  const estimatedDuration = schedulePerformanceIndex > 0
    ? elapsedDays / schedulePerformanceIndex
    : totalDuration;
  const timeRemaining = Math.max(estimatedDuration - elapsedDays, 0);
  
  // Nível de risco
  let riskLevel: EVMForecast['riskLevel'];
  let riskMessage: string;
  
  if (costPerformanceIndex >= 1 && schedulePerformanceIndex >= 1) {
    riskLevel = 'low';
    riskMessage = 'Projeto dentro do orçamento e cronograma. Continue monitorando.';
  } else if (costPerformanceIndex >= 0.9 && schedulePerformanceIndex >= 0.9) {
    riskLevel = 'medium';
    riskMessage = 'Atenção: Desvios moderados no orçamento e/ou cronograma. Ação corretiva recomendada.';
  } else {
    riskLevel = 'high';
    riskMessage = 'ALERTA: Desvios significativos detectados. Ação corretiva imediata necessária.';
  }

  return {
    eacAcquiescent,
    eacCpi,
    eacCpiSpi,
    estimatedDuration,
    timeRemaining,
    riskLevel,
    riskMessage,
  };
}

/**
 * Gera dados para gráfico de Curva S
 */
export function generateSCurveData(periods: EVMPeriod[]): {
  labels: string[];
  pv: number[];
  ev: number[];
  ac: number[];
} {
  return {
    labels: periods.map(p => p.period),
    pv: periods.map(p => p.cumulativePV),
    ev: periods.map(p => p.cumulativeEV),
    ac: periods.map(p => p.cumulativeAC),
  };
}

/**
 * Formata valor para exibição
 */
export function formatEVMValue(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Formata percentual para exibição
 */
export function formatEVMPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

/**
 * Retorna descrição do status EVM
 */
export function getEVMStatusDescription(metrics: EVMMetrics): {
  cost: string;
  schedule: string;
  overall: string;
} {
  const descriptions = {
    cost: '',
    schedule: '',
    overall: '',
  };

  // Descrição de custo
  if (metrics.costPerformanceIndex >= 1) {
    descriptions.cost = `Projeto sob controle de custos. Para cada R$ 1 gasto, foram agregados R$ ${metrics.costPerformanceIndex.toFixed(2)} em valor.`;
  } else {
    descriptions.cost = `Projeto acima do orçamento. Para cada R$ 1 gasto, foram agregados apenas R$ ${metrics.costPerformanceIndex.toFixed(2)} em valor.`;
  }

  // Descrição de prazo
  if (metrics.schedulePerformanceIndex >= 1) {
    descriptions.schedule = `Projeto adiantado. O progresso real está ${((metrics.schedulePerformanceIndex - 1) * 100).toFixed(1)}% acima do planejado.`;
  } else {
    descriptions.schedule = `Projeto atrasado. O progresso real está ${((1 - metrics.schedulePerformanceIndex) * 100).toFixed(1)}% abaixo do planejado.`;
  }

  // Descrição geral
  switch (metrics.overallStatus) {
    case 'good':
      descriptions.overall = 'Projeto saudável. Continue mantendo o controle.';
      break;
    case 'warning':
      descriptions.overall = 'Atenção: Desvios detectados. Monitore de perto.';
      break;
    case 'critical':
      descriptions.overall = 'Crítico: Ações corretivas urgentes necessárias.';
      break;
  }

  return descriptions;
}
