// =============================================================================
// ConstrutorPro - Alert Utilities
// Sistema de geração de alertas automáticos
// =============================================================================

import { db } from '@/lib/db';

// Types
export type AlertType = 'info' | 'success' | 'warning' | 'error';

export interface CreateAlertInput {
  companyId: string;
  type: AlertType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

// =============================================================================
// Alert Creation Functions
// =============================================================================

/**
 * Cria um novo alerta no sistema
 */
export async function createAlert(input: CreateAlertInput) {
  return db.alerts.create({
    data: {
      companyId: input.companyId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
      isRead: false,
    },
  });
}

/**
 * Cria múltiplos alertas de uma vez
 */
export async function createAlerts(inputs: CreateAlertInput[]) {
  if (inputs.length === 0) return [];

  return db.alerts.createMany({
    data: inputs.map(input => ({
      companyId: input.companyId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
      isRead: false,
    })),
  });
}

/**
 * Verifica se já existe um alerta similar recente (últimas 24h)
 */
export async function hasRecentAlert(
  companyId: string,
  title: string,
  entityId?: string,
  hours: number = 24
): Promise<boolean> {
  const since = new Date();
  since.setHours(since.getHours() - hours);

  const existing = await db.alerts.findFirst({
    where: {
      companyId,
      title,
      entityId: entityId || null,
      createdAt: { gte: since },
    },
  });

  return !!existing;
}

// =============================================================================
// Specific Alert Generators
// =============================================================================

/**
 * Alerta de estoque baixo
 */
export async function createLowStockAlert(
  companyId: string,
  materialId: string,
  materialName: string,
  currentStock: number,
  minStock: number
) {
  const title = 'Estoque Baixo';
  const message = `O material "${materialName}" está com estoque baixo. Atual: ${currentStock}, Mínimo: ${minStock}`;

  // Evita alertas duplicados nas últimas 24h
  if (await hasRecentAlert(companyId, title, materialId)) {
    return null;
  }

  return createAlert({
    companyId,
    type: 'warning',
    title,
    message,
    entityType: 'material',
    entityId: materialId,
  });
}

/**
 * Alerta de projeto atrasado
 */
export async function createProjectDelayedAlert(
  companyId: string,
  projectId: string,
  projectName: string,
  daysDelayed: number
) {
  const title = 'Projeto Atrasado';
  const message = `O projeto "${projectName}" está atrasado há ${daysDelayed} dias`;

  // Evita alertas duplicados nas últimas 24h
  if (await hasRecentAlert(companyId, title, projectId)) {
    return null;
  }

  return createAlert({
    companyId,
    type: 'error',
    title,
    message,
    entityType: 'project',
    entityId: projectId,
  });
}

/**
 * Alerta de tarefa próxima do vencimento
 */
export async function createTaskDueSoonAlert(
  companyId: string,
  taskId: string,
  taskName: string,
  projectName: string,
  dueDate: Date
) {
  const title = 'Tarefa Próxima do Vencimento';
  const daysUntilDue = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const message = `A tarefa "${taskName}" do projeto "${projectName}" vence em ${daysUntilDue} dias`;

  // Evita alertas duplicados nas últimas 12h
  if (await hasRecentAlert(companyId, title, taskId, 12)) {
    return null;
  }

  return createAlert({
    companyId,
    type: daysUntilDue <= 1 ? 'error' : 'warning',
    title,
    message,
    entityType: 'task',
    entityId: taskId,
  });
}

/**
 * Alerta de pagamento pendente/vencido
 */
export async function createPaymentAlert(
  companyId: string,
  transactionId: string,
  description: string,
  value: number,
  dueDate: Date,
  isOverdue: boolean
) {
  const title = isOverdue ? 'Pagamento Vencido' : 'Pagamento Próximo do Vencimento';
  const formattedValue = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

  const message = isOverdue
    ? `O pagamento "${description}" de ${formattedValue} está vencido`
    : `O pagamento "${description}" de ${formattedValue} vence em breve`;

  // Evita alertas duplicados nas últimas 24h
  if (await hasRecentAlert(companyId, title, transactionId)) {
    return null;
  }

  return createAlert({
    companyId,
    type: isOverdue ? 'error' : 'warning',
    title,
    message,
    entityType: 'transaction',
    entityId: transactionId,
  });
}

/**
 * Alias for createPaymentAlert with isOverdue=true
 */
export async function createOverduePaymentAlert(
  companyId: string,
  transactionId: string,
  description: string,
  value: number,
  dueDate: Date
) {
  return createPaymentAlert(companyId, transactionId, description, value, dueDate, true);
}

/**
 * Alerta de orçamento acima do limite
 */
export async function createBudgetOverrunAlert(
  companyId: string,
  projectId: string,
  projectName: string,
  budgetValue: number,
  actualValue: number,
  overrunPercentage: number
) {
  const title = 'Estouro de Orçamento';
  const message = `O projeto "${projectName}" ultrapassou o orçamento em ${overrunPercentage.toFixed(1)}%. Orçado: ${budgetValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, Real: ${actualValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;

  // Evita alertas duplicados nas últimas 24h
  if (await hasRecentAlert(companyId, title, projectId)) {
    return null;
  }

  return createAlert({
    companyId,
    type: 'error',
    title,
    message,
    entityType: 'project',
    entityId: projectId,
  });
}

/**
 * Alerta de cotação recebida
 */
export async function createQuotationReceivedAlert(
  companyId: string,
  quotationId: string,
  supplierName: string,
  quotationName: string
) {
  const title = 'Nova Cotação Recebida';
  const message = `O fornecedor "${supplierName}" respondeu à cotação "${quotationName}"`;

  return createAlert({
    companyId,
    type: 'success',
    title,
    message,
    entityType: 'quotation',
    entityId: quotationId,
  });
}

/**
 * Alerta de projeto concluído
 */
export async function createProjectCompletedAlert(
  companyId: string,
  projectId: string,
  projectName: string
) {
  const title = 'Projeto Concluído';
  const message = `O projeto "${projectName}" foi marcado como concluído`;

  return createAlert({
    companyId,
    type: 'success',
    title,
    message,
    entityType: 'project',
    entityId: projectId,
  });
}

/**
 * Alerta de novo cliente cadastrado
 */
export async function createNewClientAlert(
  companyId: string,
  clientId: string,
  clientName: string
) {
  const title = 'Novo Cliente';
  const message = `O cliente "${clientName}" foi cadastrado com sucesso`;

  return createAlert({
    companyId,
    type: 'info',
    title,
    message,
    entityType: 'client',
    entityId: clientId,
  });
}

/**
 * Alerta de medição aprovada
 */
export async function createMeasurementApprovedAlert(
  companyId: string,
  measurementId: string,
  projectName: string,
  measurementNumber: number
) {
  const title = 'Medição Aprovada';
  const message = `A medição #${measurementNumber} do projeto "${projectName}" foi aprovada`;

  return createAlert({
    companyId,
    type: 'success',
    title,
    message,
    entityType: 'measurement',
    entityId: measurementId,
  });
}

// =============================================================================
// Scheduled Alert Checks (for cron jobs or background tasks)
// =============================================================================

/**
 * Verifica materiais com estoque baixo e gera alertas
 */
export async function checkLowStockMaterials(companyId?: string) {
  const where = companyId ? { companyId } : {};
  const materials = await db.materials.findMany({
    where: {
      ...where,
      stockQuantity: { not: null },
      minStock: { not: null },
    },
    select: {
      id: true,
      name: true,
      stockQuantity: true,
      minStock: true,
      companyId: true,
    },
  });

  const lowStockMaterials = materials.filter(
    m => m.stockQuantity !== null && m.minStock !== null && m.stockQuantity < m.minStock
  );

  const alerts: Awaited<ReturnType<typeof createAlert>>[] = [];
  for (const material of lowStockMaterials) {
    const alert = await createLowStockAlert(
      material.companyId,
      material.id,
      material.name,
      material.stockQuantity!.toNumber(),
      material.minStock!.toNumber()
    );
    if (alert) alerts.push(alert);
  }

  return alerts;
}

/**
 * Verifica projetos atrasados e gera alertas
 * Alias for backward compatibility
 */
export async function checkOverdueProjects(companyId?: string) {
  return checkDelayedProjects(companyId);
}

/**
 * Verifica projetos atrasados e gera alertas
 */
export async function checkDelayedProjects(companyId?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const where: { status: string; endDate: { lt: Date }; companyId?: string } = {
    status: 'active',
    endDate: { lt: today },
  };
  if (companyId) where.companyId = companyId;

  const projects = await db.projects.findMany({
    where,
    select: {
      id: true,
      name: true,
      endDate: true,
      companyId: true,
    },
  });

  const alerts: Awaited<ReturnType<typeof createAlert>>[] = [];
  for (const project of projects) {
    const daysDelayed = Math.ceil(
      (today.getTime() - (project.endDate?.getTime() || 0)) / (1000 * 60 * 60 * 24)
    );

    if (daysDelayed > 0) {
      const alert = await createProjectDelayedAlert(
        project.companyId,
        project.id,
        project.name,
        daysDelayed
      );
      if (alert) alerts.push(alert);
    }
  }

  return alerts;
}

/**
 * Verifica prazos de projetos próximos e gera alertas
 */
export async function checkProjectDeadlines(companyId?: string) {
  const today = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(today.getDate() + 7);

  const where: { status: string; endDate: { gte: Date; lte: Date }; companyId?: string } = {
    status: 'active',
    endDate: { gte: today, lte: sevenDaysFromNow },
  };
  if (companyId) where.companyId = companyId;

  const projects = await db.projects.findMany({
    where,
    select: {
      id: true,
      name: true,
      endDate: true,
      companyId: true,
    },
  });

  const alerts: Awaited<ReturnType<typeof createAlert>>[] = [];
  for (const project of projects) {
    if (project.endDate) {
      const daysUntilDue = Math.ceil(
        (project.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      const alert = await createAlert({
        companyId: project.companyId,
        type: daysUntilDue <= 3 ? 'warning' : 'info',
        title: 'Prazo de Projeto Próximo',
        message: `O projeto "${project.name}" tem prazo em ${daysUntilDue} dias`,
        entityType: 'project',
        entityId: project.id,
      });
      alerts.push(alert);
    }
  }

  return alerts;
}

/**
 * Verifica pagamentos próximos do vencimento ou vencidos
 * Alias for backward compatibility
 */
export async function checkOverduePayments(companyId?: string) {
  return checkPendingPayments(companyId);
}

/**
 * Verifica pagamentos próximos do vencimento ou vencidos
 */
export async function checkPendingPayments(companyId?: string) {
  const today = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(today.getDate() + 3);

  const where: { status: { in: string[] }; type: string; dueDate: { lte: Date }; companyId?: string } = {
    status: { in: ['pending', 'overdue'] },
    type: 'expense',
    dueDate: { lte: threeDaysFromNow },
  };
  if (companyId) where.companyId = companyId;

  const transactions = await db.transactions.findMany({
    where,
    select: {
      id: true,
      description: true,
      value: true,
      dueDate: true,
      status: true,
      companyId: true,
    },
  });

  const alerts: Awaited<ReturnType<typeof createAlert>>[] = [];
  for (const transaction of transactions) {
    const isOverdue = transaction.dueDate && new Date(transaction.dueDate) < today;
    const alert = await createPaymentAlert(
      transaction.companyId,
      transaction.id,
      transaction.description,
      Number(transaction.value),
      transaction.dueDate as Date,
      isOverdue || transaction.status === 'overdue'
    );
    if (alert) alerts.push(alert);
  }

  return alerts;
}

/**
 * Executa todas as verificações automáticas
 */
export async function runAllAlertChecks(companyId?: string) {
  const [lowStock, delayedProjects, projectDeadlines, pendingPayments] = await Promise.all([
    checkLowStockMaterials(companyId),
    checkDelayedProjects(companyId),
    checkProjectDeadlines(companyId),
    checkPendingPayments(companyId),
  ]);

  return {
    totalAlerts: lowStock.length + delayedProjects.length + projectDeadlines.length + pendingPayments.length,
    lowStock,
    delayedProjects,
    overdueProjects: delayedProjects, // Alias for backward compatibility
    projectDeadlines,
    pendingPayments,
    overduePayments: pendingPayments, // Alias for backward compatibility
  };
}
