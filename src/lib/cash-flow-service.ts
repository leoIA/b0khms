/**
 * Fluxo de Caixa Projetado (Cash Flow Forecast)
 * 
 * Projects future cash flow based on:
 * - Receivables (accounts receivable)
 * - Payables (accounts payable)
 * - Historical patterns
 * - Project milestones
 */

import { db } from '@/lib/db';

export interface CashFlowEntry {
  date: Date;
  type: 'inflow' | 'outflow';
  category: string;
  description: string;
  projected: number;
  actual: number | null;
  probability: number; // 0-1
  source: 'confirmed' | 'projected' | 'historical';
}

export interface CashFlowDay {
  date: Date;
  openingBalance: number;
  inflows: number;
  outflows: number;
  netFlow: number;
  closingBalance: number;
  entries: CashFlowEntry[];
}

export interface CashFlowReport {
  startDate: Date;
  endDate: Date;
  openingBalance: number;
  closingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  days: CashFlowDay[];
  weeklySummary: WeeklySummary[];
  monthlySummary: MonthlySummary[];
  alerts: CashFlowAlert[];
  scenarios: {
    pessimistic: number;
    expected: number;
    optimistic: number;
  };
}

export interface WeeklySummary {
  weekStart: Date;
  weekEnd: Date;
  inflows: number;
  outflows: number;
  netFlow: number;
}

export interface MonthlySummary {
  month: string;
  inflows: number;
  outflows: number;
  netFlow: number;
}

export interface CashFlowAlert {
  type: 'low_balance' | 'negative_balance' | 'large_outflow' | 'concentration';
  date: Date;
  message: string;
  severity: 'warning' | 'critical' | 'info';
  amount: number;
}

/**
 * Calculate projected cash flow
 */
export async function calculateCashFlow(
  companyId: string,
  startDate: Date,
  endDate: Date,
  options?: {
    includeScenarios?: boolean;
    scenarioAdjustment?: number;
  }
): Promise<CashFlowReport> {
  // Get current balance (simplified - sum of all transactions)
  const transactions = await db.transactions.findMany({
    where: {
      companyId,
      status: 'paid',
    },
  });

  const openingBalance = transactions.reduce((sum, t) => {
    return t.type === 'receita' 
      ? sum + Number(t.value) 
      : sum - Number(t.value);
  }, 0);

  // Get pending receivables
  const receivables = await db.transactions.findMany({
    where: {
      companyId,
      type: 'receita',
      status: 'pending',
      dueDate: { gte: startDate, lte: endDate },
    },
    include: {
      projects: { select: { name: true } },
      clients: { select: { name: true } },
    },
  });

  // Get pending payables
  const payables = await db.transactions.findMany({
    where: {
      companyId,
      type: 'despesa',
      status: { in: ['pending', 'overdue'] },
      dueDate: { gte: startDate, lte: endDate },
    },
    include: {
      projects: { select: { name: true } },
      suppliers: { select: { name: true } },
    },
  });

  // Get project milestones (for projected revenue)
  const projects = await db.projects.findMany({
    where: {
      companyId,
      status: 'in_progress',
    },
    include: {
      schedules: {
        include: {
          schedule_tasks: {
            where: {
              status: { in: ['pending', 'in_progress'] },
            },
          },
        },
      },
    },
  });

  // Build daily cash flow
  const days: CashFlowDay[] = [];
  const currentDate = new Date(startDate);
  let runningBalance = openingBalance;

  while (currentDate <= endDate) {
    const dayEntries: CashFlowEntry[] = [];
    let dayInflows = 0;
    let dayOutflows = 0;

    // Add receivables for this day
    const dayReceivables = receivables.filter(r => {
      const dueDate = r.dueDate ? new Date(r.dueDate) : null;
      return dueDate && dueDate.toDateString() === currentDate.toDateString();
    });

    for (const receivable of dayReceivables) {
      const amount = Number(receivable.value);
      dayInflows += amount;
      dayEntries.push({
        date: new Date(currentDate),
        type: 'inflow',
        category: receivable.category,
        description: `${receivable.description}${receivable.clients ? ` - ${receivable.clients.name}` : ''}`,
        projected: amount,
        actual: null,
        probability: 0.85,
        source: 'confirmed',
      });
    }

    // Add payables for this day
    const dayPayables = payables.filter(p => {
      const dueDate = p.dueDate ? new Date(p.dueDate) : null;
      return dueDate && dueDate.toDateString() === currentDate.toDateString();
    });

    for (const payable of dayPayables) {
      const amount = Number(payable.value);
      dayOutflows += amount;
      dayEntries.push({
        date: new Date(currentDate),
        type: 'outflow',
        category: payable.category,
        description: `${payable.description}${payable.suppliers ? ` - ${payable.suppliers.name}` : ''}`,
        projected: amount,
        actual: null,
        probability: 0.95,
        source: 'confirmed',
      });
    }

    // Add projected revenues from project milestones
    for (const project of projects) {
      for (const schedule of project.schedules || []) {
        for (const task of schedule.schedule_tasks || []) {
          if (task.endDate && new Date(task.endDate).toDateString() === currentDate.toDateString()) {
            // Estimate revenue based on project value and task progress
            const projectValue = Number(project.estimatedValue) || 0;
            const taskValue = projectValue * 0.1; // Simplified: assume each task is 10% of project
            const projectedRevenue = taskValue * (Number(task.progress) || 0) / 100;
            
            if (projectedRevenue > 0) {
              dayInflows += projectedRevenue;
              dayEntries.push({
                date: new Date(currentDate),
                type: 'inflow',
                category: 'Receita Projetada',
                description: `${project.name} - ${task.name}`,
                projected: projectedRevenue,
                actual: null,
                probability: 0.6,
                source: 'projected',
              });
            }
          }
        }
      }
    }

    const netFlow = dayInflows - dayOutflows;
    runningBalance += netFlow;

    days.push({
      date: new Date(currentDate),
      openingBalance: runningBalance - netFlow,
      inflows: dayInflows,
      outflows: dayOutflows,
      netFlow,
      closingBalance: runningBalance,
      entries: dayEntries,
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Generate alerts
  const alerts = generateCashFlowAlerts(days);

  // Weekly summary
  const weeklySummary = generateWeeklySummary(days);

  // Monthly summary
  const monthlySummary = generateMonthlySummary(days);

  // Scenarios
  const scenarios = calculateScenarios(openingBalance, days, options?.scenarioAdjustment);

  return {
    startDate,
    endDate,
    openingBalance,
    closingBalance: runningBalance,
    totalInflows: days.reduce((sum, d) => sum + d.inflows, 0),
    totalOutflows: days.reduce((sum, d) => sum + d.outflows, 0),
    netCashFlow: days.reduce((sum, d) => sum + d.netFlow, 0),
    days,
    weeklySummary,
    monthlySummary,
    alerts,
    scenarios,
  };
}

function generateCashFlowAlerts(days: CashFlowDay[]): CashFlowAlert[] {
  const alerts: CashFlowAlert[] = [];

  for (const day of days) {
    // Negative balance alert
    if (day.closingBalance < 0) {
      alerts.push({
        type: 'negative_balance',
        date: day.date,
        message: `Saldo negativo projetado: ${formatCurrency(day.closingBalance)}`,
        severity: 'critical',
        amount: day.closingBalance,
      });
    }
    // Low balance warning
    else if (day.closingBalance < 10000) {
      alerts.push({
        type: 'low_balance',
        date: day.date,
        message: `Saldo baixo projetado: ${formatCurrency(day.closingBalance)}`,
        severity: 'warning',
        amount: day.closingBalance,
      });
    }

    // Large outflow alert
    if (day.outflows > 50000) {
      alerts.push({
        type: 'large_outflow',
        date: day.date,
        message: `Grande saída projetada: ${formatCurrency(day.outflows)}`,
        severity: 'info',
        amount: day.outflows,
      });
    }
  }

  return alerts;
}

function generateWeeklySummary(days: CashFlowDay[]): WeeklySummary[] {
  const weeks: WeeklySummary[] = [];
  
  for (let i = 0; i < days.length; i += 7) {
    const weekDays = days.slice(i, i + 7);
    if (weekDays.length > 0) {
      weeks.push({
        weekStart: weekDays[0].date,
        weekEnd: weekDays[weekDays.length - 1].date,
        inflows: weekDays.reduce((sum, d) => sum + d.inflows, 0),
        outflows: weekDays.reduce((sum, d) => sum + d.outflows, 0),
        netFlow: weekDays.reduce((sum, d) => sum + d.netFlow, 0),
      });
    }
  }

  return weeks;
}

function generateMonthlySummary(days: CashFlowDay[]): MonthlySummary[] {
  const months: Record<string, MonthlySummary> = {};

  for (const day of days) {
    const monthKey = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!months[monthKey]) {
      months[monthKey] = {
        month: monthKey,
        inflows: 0,
        outflows: 0,
        netFlow: 0,
      };
    }

    months[monthKey].inflows += day.inflows;
    months[monthKey].outflows += day.outflows;
    months[monthKey].netFlow += day.netFlow;
  }

  return Object.values(months);
}

function calculateScenarios(
  openingBalance: number,
  days: CashFlowDay[],
  adjustment?: number
): { pessimistic: number; expected: number; optimistic: number } {
  const expectedInflows = days.reduce((sum, d) => {
    return sum + d.entries
      .filter(e => e.type === 'inflow')
      .reduce((s, e) => s + e.projected * e.probability, 0);
  }, 0);

  const expectedOutflows = days.reduce((sum, d) => {
    return sum + d.entries
      .filter(e => e.type === 'outflow')
      .reduce((s, e) => s + e.projected * e.probability, 0);
  }, 0);

  const baseResult = openingBalance + expectedInflows - expectedOutflows;

  return {
    pessimistic: baseResult * 0.7,
    expected: baseResult,
    optimistic: baseResult * 1.3,
  };
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Export cash flow report
 */
export function exportCashFlow(report: CashFlowReport, format: 'csv' | 'json'): string {
  if (format === 'json') {
    return JSON.stringify(report, null, 2);
  }

  // CSV export
  const lines = [
    'Data,Saldo Inicial,Entradas,Saídas,Fluxo Líquido,Saldo Final',
  ];

  for (const day of report.days) {
    lines.push(
      `${day.date.toISOString().split('T')[0]},${day.openingBalance.toFixed(2)},${day.inflows.toFixed(2)},${day.outflows.toFixed(2)},${day.netFlow.toFixed(2)},${day.closingBalance.toFixed(2)}`
    );
  }

  return lines.join('\n');
}
