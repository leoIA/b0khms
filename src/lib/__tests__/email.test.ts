// =============================================================================
// ConstrutorPro - Email Service Tests
// Testes unitários para o serviço de email
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  welcomeTemplate,
  passwordResetTemplate,
  notificationTemplate,
  projectCreatedTemplate,
  budgetStatusTemplate,
  paymentReminderTemplate,
  weeklyReportTemplate,
  lowStockTemplate,
  taskAssignedTemplate,
} from '../email/templates';
import { EMAIL_CONFIG } from '../email/config';

// =============================================================================
// Configuration Tests
// =============================================================================

describe('Email Configuration', () => {
  it('should have default SMTP configuration', () => {
    expect(EMAIL_CONFIG.smtp.host).toBeDefined();
    expect(EMAIL_CONFIG.smtp.port).toBeDefined();
    expect(typeof EMAIL_CONFIG.smtp.secure).toBe('boolean');
  });

  it('should have sender configuration', () => {
    expect(EMAIL_CONFIG.from.name).toBeDefined();
    expect(EMAIL_CONFIG.from.address).toBeDefined();
  });

  it('should have rate limiting configuration', () => {
    expect(EMAIL_CONFIG.rateLimit.maxEmailsPerHour).toBeGreaterThan(0);
    expect(EMAIL_CONFIG.rateLimit.maxEmailsPerMinute).toBeGreaterThan(0);
  });

  it('should have feature flags', () => {
    expect(typeof EMAIL_CONFIG.features.enabled).toBe('boolean');
    expect(typeof EMAIL_CONFIG.features.trackOpens).toBe('boolean');
    expect(typeof EMAIL_CONFIG.features.trackClicks).toBe('boolean');
  });
});

// =============================================================================
// Template Tests - Welcome
// =============================================================================

describe('Welcome Template', () => {
  it('should generate valid HTML for welcome email', () => {
    const html = welcomeTemplate({
      title: 'Bem-vindo ao ConstrutorPro',
      previewText: 'Sua conta foi criada',
      userName: 'João Silva',
      loginUrl: 'https://app.construtorpro.com/login',
    });

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Bem-vindo ao ConstrutorPro');
    expect(html).toContain('João Silva');
    expect(html).toContain('https://app.construtorpro.com/login');
    expect(html).toContain('ConstrutorPro');
  });

  it('should include temporary password when provided', () => {
    const html = welcomeTemplate({
      title: 'Bem-vindo',
      previewText: 'Conta criada',
      userName: 'Maria',
      loginUrl: 'https://app.construtorpro.com/login',
      temporaryPassword: 'TempPass123!',
    });

    expect(html).toContain('TempPass123!');
    expect(html).toContain('Senha temporária');
  });

  it('should include role information when provided', () => {
    const html = welcomeTemplate({
      title: 'Bem-vindo',
      previewText: 'Conta criada',
      userName: 'Pedro',
      loginUrl: 'https://app.construtorpro.com/login',
      role: 'manager',
    });

    expect(html).toContain('Gerente');
    expect(html).toContain('Seu perfil');
  });
});

// =============================================================================
// Template Tests - Password Reset
// =============================================================================

describe('Password Reset Template', () => {
  it('should generate valid HTML for password reset email', () => {
    const html = passwordResetTemplate({
      title: 'Redefinição de Senha',
      previewText: 'Redefina sua senha',
      userName: 'João',
      resetUrl: 'https://app.construtorpro.com/reset?token=abc123',
      expiresIn: '1 hora',
    });

    expect(html).toContain('Redefinição de Senha');
    expect(html).toContain('João');
    expect(html).toContain('https://app.construtorpro.com/reset?token=abc123');
    expect(html).toContain('1 hora');
  });

  it('should include security warning', () => {
    const html = passwordResetTemplate({
      title: 'Redefinição',
      previewText: 'Redefina',
      resetUrl: 'https://example.com/reset',
      expiresIn: '30 minutos',
    });

    expect(html).toContain('expira');
    expect(html).toContain('solicitação');
  });
});

// =============================================================================
// Template Tests - Notification
// =============================================================================

describe('Notification Template', () => {
  it('should generate info notification', () => {
    const html = notificationTemplate({
      title: 'Atualização do Sistema',
      previewText: 'Nova versão disponível',
      notificationType: 'info',
      message: 'Uma nova versão do sistema está disponível.',
    });

    expect(html).toContain('Atualização do Sistema');
    expect(html).toContain('alert-info');
    expect(html).toContain('Uma nova versão do sistema');
  });

  it('should generate success notification', () => {
    const html = notificationTemplate({
      title: 'Sucesso!',
      previewText: 'Operação realizada',
      notificationType: 'success',
      message: 'Orçamento aprovado com sucesso.',
    });

    expect(html).toContain('alert-success');
    expect(html).toContain('✅');
  });

  it('should generate warning notification', () => {
    const html = notificationTemplate({
      title: 'Atenção',
      previewText: 'Prazo próximo',
      notificationType: 'warning',
      message: 'O prazo vence em 2 dias.',
    });

    expect(html).toContain('alert-warning');
    expect(html).toContain('⚠️');
  });

  it('should generate error notification', () => {
    const html = notificationTemplate({
      title: 'Erro',
      previewText: 'Falha na operação',
      notificationType: 'error',
      message: 'Não foi possível processar sua solicitação.',
    });

    expect(html).toContain('alert-danger');
    expect(html).toContain('❌');
  });

  it('should include action button when provided', () => {
    const html = notificationTemplate({
      title: 'Teste',
      previewText: 'Teste',
      notificationType: 'info',
      message: 'Mensagem de teste',
      actionUrl: 'https://example.com/action',
      actionText: 'Clique aqui',
    });

    expect(html).toContain('https://example.com/action');
    expect(html).toContain('Clique aqui');
  });
});

// =============================================================================
// Template Tests - Project Created
// =============================================================================

describe('Project Created Template', () => {
  it('should generate valid HTML for project created email', () => {
    const html = projectCreatedTemplate({
      title: 'Novo Projeto',
      previewText: 'Projeto criado',
      projectName: 'Residencial ABC',
      projectCode: 'PRJ-001',
      clientName: 'Cliente XYZ',
      startDate: '01/01/2024',
      endDate: '31/12/2024',
      budget: 'R$ 500.000,00',
      projectUrl: 'https://app.construtorpro.com/projects/1',
    });

    expect(html).toContain('Novo Projeto Criado');
    expect(html).toContain('Residencial ABC');
    expect(html).toContain('PRJ-001');
    expect(html).toContain('Cliente XYZ');
    expect(html).toContain('R$ 500.000,00');
    expect(html).toContain('🏗️');
  });
});

// =============================================================================
// Template Tests - Budget Status
// =============================================================================

describe('Budget Status Template', () => {
  it('should generate approved budget email', () => {
    const html = budgetStatusTemplate({
      title: 'Orçamento Aprovado',
      previewText: 'Seu orçamento foi aprovado',
      budgetName: 'Orçamento Reforma',
      budgetCode: 'ORC-001',
      projectName: 'Projeto Alpha',
      totalValue: 'R$ 150.000,00',
      status: 'approved',
      budgetUrl: 'https://app.construtorpro.com/budgets/1',
    });

    expect(html).toContain('Orçamento Aprovado');
    expect(html).toContain('✅');
    expect(html).toContain('R$ 150.000,00');
  });

  it('should generate rejected budget email with reason', () => {
    const html = budgetStatusTemplate({
      title: 'Orçamento Rejeitado',
      previewText: 'Seu orçamento foi rejeitado',
      budgetName: 'Orçamento Reforma',
      budgetCode: 'ORC-002',
      status: 'rejected',
      rejectedReason: 'Valor acima do orçamento disponível',
      budgetUrl: 'https://app.construtorpro.com/budgets/2',
    });

    expect(html).toContain('Orçamento Rejeitado');
    expect(html).toContain('❌');
    expect(html).toContain('Valor acima do orçamento disponível');
  });
});

// =============================================================================
// Template Tests - Payment Reminder
// =============================================================================

describe('Payment Reminder Template', () => {
  it('should generate upcoming payment reminder', () => {
    const html = paymentReminderTemplate({
      title: 'Lembrete de Pagamento',
      previewText: 'Pagamento em breve',
      transactionType: 'payable',
      description: 'Fornecedor ABC',
      amount: 'R$ 5.000,00',
      dueDate: '15/01/2024',
      daysUntilDue: 5,
      transactionUrl: 'https://app.construtorpro.com/transactions/1',
    });

    expect(html).toContain('Lembrete de Pagamento');
    expect(html).toContain('vence em 5 dias');
    expect(html).toContain('alert-warning');
  });

  it('should generate overdue payment alert', () => {
    const html = paymentReminderTemplate({
      title: 'Pagamento Vencido',
      previewText: 'Pagamento atrasado',
      transactionType: 'receivable',
      description: 'Cliente XYZ',
      amount: 'R$ 10.000,00',
      dueDate: '01/01/2024',
      daysUntilDue: -10,
      transactionUrl: 'https://app.construtorpro.com/transactions/2',
    });

    expect(html).toContain('Pagamento Vencido');
    expect(html).toContain('vencido há 10 dias');
    expect(html).toContain('alert-danger');
    expect(html).toContain('🚨');
  });
});

// =============================================================================
// Template Tests - Weekly Report
// =============================================================================

describe('Weekly Report Template', () => {
  it('should generate complete weekly report', () => {
    const html = weeklyReportTemplate({
      title: 'Relatório Semanal',
      previewText: 'Resumo da semana',
      period: '01/01/2024 a 07/01/2024',
      projectsActive: 5,
      projectsCompleted: 2,
      projectsDelayed: 1,
      totalRevenue: 'R$ 100.000,00',
      totalExpenses: 'R$ 60.000,00',
      pendingPayments: 'R$ 20.000,00',
      pendingReceipts: 'R$ 50.000,00',
      tasksCompleted: 15,
      tasksPending: 5,
      reportUrl: 'https://app.construtorpro.com/reports/weekly',
    });

    expect(html).toContain('Relatório Semanal');
    expect(html).toContain('5');
    expect(html).toContain('2');
    expect(html).toContain('R$ 100.000,00');
    expect(html).toContain('📊');
  });
});

// =============================================================================
// Template Tests - Low Stock Alert
// =============================================================================

describe('Low Stock Template', () => {
  it('should generate low stock alert with multiple materials', () => {
    const html = lowStockTemplate({
      title: 'Alerta de Estoque Baixo',
      previewText: 'Materiais com estoque baixo',
      materials: [
        { name: 'Cimento', code: 'MAT-001', currentQuantity: 10, minimumQuantity: 50, unit: 'sacos' },
        { name: 'Areia', code: 'MAT-002', currentQuantity: 5, minimumQuantity: 20, unit: 'm³' },
      ],
      materialsUrl: 'https://app.construtorpro.com/materials',
    });

    expect(html).toContain('Alerta de Estoque Baixo');
    expect(html).toContain('Cimento');
    expect(html).toContain('Areia');
    expect(html).toContain('10 sacos');
    expect(html).toContain('BAIXO');
  });
});

// =============================================================================
// Template Tests - Task Assigned
// =============================================================================

describe('Task Assigned Template', () => {
  it('should generate task assigned email', () => {
    const html = taskAssignedTemplate({
      title: 'Nova Tarefa',
      previewText: 'Você foi designado',
      taskName: 'Revisar Orçamento',
      projectName: 'Residencial ABC',
      assignedBy: 'Carlos Silva',
      dueDate: '15/01/2024',
      priority: 'high',
      description: 'Revisar e aprovar o orçamento final',
      taskUrl: 'https://app.construtorpro.com/tasks/1',
    });

    expect(html).toContain('Nova Tarefa Atribuída');
    expect(html).toContain('Revisar Orçamento');
    expect(html).toContain('Carlos Silva');
    expect(html).toContain('Alta');
  });

  it('should show urgent priority in red', () => {
    const html = taskAssignedTemplate({
      title: 'Tarefa Urgente',
      previewText: 'Tarefa urgente',
      taskName: 'Resolver Problema',
      priority: 'urgent',
      taskUrl: 'https://example.com',
    });

    expect(html).toContain('Urgente');
    expect(html).toContain('#dc2626'); // Red color for urgent
  });
});

// =============================================================================
// Email Service Tests (Mocked)
// =============================================================================

describe('Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have sendWelcome method', async () => {
    const { emailService } = await import('../email/service');
    expect(typeof emailService.sendWelcome).toBe('function');
  });

  it('should have sendPasswordReset method', async () => {
    const { emailService } = await import('../email/service');
    expect(typeof emailService.sendPasswordReset).toBe('function');
  });

  it('should have sendNotification method', async () => {
    const { emailService } = await import('../email/service');
    expect(typeof emailService.sendNotification).toBe('function');
  });

  it('should have sendProjectCreated method', async () => {
    const { emailService } = await import('../email/service');
    expect(typeof emailService.sendProjectCreated).toBe('function');
  });

  it('should have sendBudgetStatus method', async () => {
    const { emailService } = await import('../email/service');
    expect(typeof emailService.sendBudgetStatus).toBe('function');
  });

  it('should have sendPaymentReminder method', async () => {
    const { emailService } = await import('../email/service');
    expect(typeof emailService.sendPaymentReminder).toBe('function');
  });

  it('should have sendWeeklyReport method', async () => {
    const { emailService } = await import('../email/service');
    expect(typeof emailService.sendWeeklyReport).toBe('function');
  });

  it('should have sendLowStockAlert method', async () => {
    const { emailService } = await import('../email/service');
    expect(typeof emailService.sendLowStockAlert).toBe('function');
  });

  it('should have sendTaskAssigned method', async () => {
    const { emailService } = await import('../email/service');
    expect(typeof emailService.sendTaskAssigned).toBe('function');
  });

  it('should have queue method for rate limiting', async () => {
    const { emailService } = await import('../email/service');
    expect(typeof emailService.queue).toBe('function');
  });

  it('should have processQueue method', async () => {
    const { emailService } = await import('../email/service');
    expect(typeof emailService.processQueue).toBe('function');
  });
});

// =============================================================================
// Email Queue Tests
// =============================================================================

describe('Email Queue', () => {
  it('should add email to queue', async () => {
    const { EmailQueue } = await import('../email/service');
    const queue = new EmailQueue();
    
    const id = queue.add({
      to: 'test@example.com',
      subject: 'Test',
      html: '<p>Test</p>',
    });

    expect(id).toBeDefined();
    expect(id).toMatch(/^email_/);
    expect(queue.getQueueLength()).toBeGreaterThan(0);
  });

  it('should get next email from queue', async () => {
    const { EmailQueue } = await import('../email/service');
    const queue = new EmailQueue();
    
    queue.add({
      to: 'next@example.com',
      subject: 'Next Test',
      html: '<p>Test</p>',
    });

    const email = queue.getNext();
    expect(email).toBeDefined();
    expect(email?.data.subject).toBe('Next Test');
  });

  it('should remove email from queue', async () => {
    const { EmailQueue } = await import('../email/service');
    const queue = new EmailQueue();
    
    const id = queue.add({
      to: 'remove@example.com',
      subject: 'Remove Test',
      html: '<p>Test</p>',
    });

    const beforeLength = queue.getQueueLength();
    queue.remove(id);
    const afterLength = queue.getQueueLength();

    expect(afterLength).toBeLessThan(beforeLength);
  });
});
