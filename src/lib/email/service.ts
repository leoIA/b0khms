// =============================================================================
// ConstrutorPro - Email Service
// Serviço de envio de emails com suporte a múltiplos provedores
// =============================================================================

import { EMAIL_CONFIG, type EmailData, type EmailResult, type EmailRecipient } from './config';
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
} from './templates';

// =============================================================================
// Email Queue (para rate limiting)
// =============================================================================

interface QueuedEmail {
  id: string;
  data: EmailData;
  attempts: number;
  nextAttempt: Date;
  createdAt: Date;
}

class EmailQueue {
  private queue: QueuedEmail[] = [];
  private sentCount: number = 0;
  private lastReset: Date = new Date();

  add(data: EmailData): string {
    const id = `email_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    this.queue.push({
      id,
      data,
      attempts: 0,
      nextAttempt: new Date(),
      createdAt: new Date(),
    });

    return id;
  }

  getNext(): QueuedEmail | undefined {
    this.resetCountersIfNeeded();
    
    if (this.sentCount >= EMAIL_CONFIG.rateLimit.maxEmailsPerMinute) {
      return undefined;
    }

    const email = this.queue.find(e => 
      e.attempts < 3 && e.nextAttempt <= new Date()
    );

    if (email) {
      email.attempts++;
    }

    return email;
  }

  markSent(): void {
    this.sentCount++;
  }

  reschedule(id: string, delayMs: number): void {
    const email = this.queue.find(e => e.id === id);
    if (email) {
      email.nextAttempt = new Date(Date.now() + delayMs);
    }
  }

  remove(id: string): void {
    const index = this.queue.findIndex(e => e.id === id);
    if (index >= 0) {
      this.queue.splice(index, 1);
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  private resetCountersIfNeeded(): void {
    const now = new Date();
    const diffMs = now.getTime() - this.lastReset.getTime();
    
    if (diffMs >= 60000) { // Reset a cada minuto
      this.sentCount = 0;
      this.lastReset = now;
    }
  }
}

const emailQueue = new EmailQueue();

// =============================================================================
// Email Service
// =============================================================================

class EmailService {
  private transporter: unknown = null;
  private initialized = false;

  /**
   * Inicializa o serviço de email
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    if (!EMAIL_CONFIG.features.enabled) {
      console.log('[Email] Service disabled. Set EMAIL_ENABLED=true to enable.');
      this.initialized = true;
      return;
    }

    try {
      // Dynamic import para evitar erros em ambientes sem nodemailer
      const nodemailer = await import('nodemailer').catch(() => null);
      
      if (nodemailer) {
        this.transporter = nodemailer.default.createTransport({
          host: EMAIL_CONFIG.smtp.host,
          port: EMAIL_CONFIG.smtp.port,
          secure: EMAIL_CONFIG.smtp.secure,
          auth: EMAIL_CONFIG.smtp.auth.user ? EMAIL_CONFIG.smtp.auth : undefined,
          tls: {
            rejectUnauthorized: String(process.env.NODE_ENV) === 'production',
          },
        });
        
        // Verificar conexão
        if (this.transporter && typeof (this.transporter as { verify?: () => Promise<void> }).verify === 'function') {
          await (this.transporter as { verify: () => Promise<void> }).verify();
          console.log('[Email] SMTP connection verified successfully');
        }
      } else {
        console.warn('[Email] Nodemailer not available. Emails will be logged only.');
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('[Email] Failed to initialize:', error);
      // Não lança erro, apenas loga e continua em modo log-only
      this.initialized = true;
    }
  }

  /**
   * Envia um email
   */
  async send(data: EmailData): Promise<EmailResult> {
    await this.initialize();

    if (!EMAIL_CONFIG.features.enabled) {
      return this.logEmail(data);
    }

    try {
      const to = Array.isArray(data.to) ? data.to.join(', ') : data.to;
      
      const mailOptions = {
        from: `"${EMAIL_CONFIG.from.name}" <${EMAIL_CONFIG.from.address}>`,
        to,
        subject: data.subject,
        html: data.html,
        text: data.text,
        replyTo: data.replyTo,
        cc: data.cc ? (Array.isArray(data.cc) ? data.cc.join(', ') : data.cc) : undefined,
        bcc: data.bcc ? (Array.isArray(data.bcc) ? data.bcc.join(', ') : data.bcc) : undefined,
        attachments: data.attachments?.map(a => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
          encoding: a.encoding,
        })),
        headers: data.headers,
      };

      if (this.transporter && typeof (this.transporter as { sendMail?: (options: unknown) => Promise<unknown> }).sendMail === 'function') {
        const result = await (this.transporter as { sendMail: (options: unknown) => Promise<{ messageId: string; accepted: string[]; rejected: string[] }> }).sendMail(mailOptions);
        
        console.log(`[Email] Sent successfully to ${to} (ID: ${result.messageId})`);
        
        return {
          success: true,
          messageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected,
        };
      } else {
        return this.logEmail(data);
      }
    } catch (error) {
      console.error('[Email] Send error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Envia email para fila (com rate limiting)
   */
  async queue(data: EmailData): Promise<string> {
    return emailQueue.add(data);
  }

  /**
   * Processa a fila de emails
   */
  async processQueue(): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    const email = emailQueue.getNext();
    if (!email) {
      return { processed, failed };
    }

    const result = await this.send(email.data);
    
    if (result.success) {
      emailQueue.markSent();
      emailQueue.remove(email.id);
      processed++;
    } else {
      if (email.attempts >= 3) {
        emailQueue.remove(email.id);
        failed++;
      } else {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, email.attempts), 60000);
        emailQueue.reschedule(email.id, delay);
      }
    }

    return { processed, failed };
  }

  /**
   * Log de email (para desenvolvimento/desabilitado)
   */
  private logEmail(data: EmailData): EmailResult {
    const to = Array.isArray(data.to) ? data.to.join(', ') : data.to;
    
    console.log('[Email] Would send email:', {
      to,
      subject: data.subject,
      templateId: data.templateId,
    });

    return {
      success: true,
      messageId: `log_${Date.now()}`,
      accepted: Array.isArray(data.to) ? data.to : [data.to],
      rejected: [],
    };
  }

  // ==========================================================================
  // Métodos de conveniência para templates específicos
  // ==========================================================================

  /**
   * Envia email de boas-vindas
   */
  async sendWelcome(
    to: string | EmailRecipient,
    data: {
      userName?: string;
      companyName?: string;
      loginUrl: string;
      temporaryPassword?: string;
      role?: string;
    }
  ): Promise<EmailResult> {
    const recipient = typeof to === 'string' ? { email: to, name: data.userName } : to;
    
    return this.send({
      to: recipient.email,
      subject: 'Bem-vindo ao ConstrutorPro! 🎉',
      html: welcomeTemplate({
        title: 'Bem-vindo ao ConstrutorPro',
        previewText: 'Sua conta foi criada com sucesso!',
        userName: recipient.name || data.userName,
        companyName: data.companyName,
        loginUrl: data.loginUrl,
        temporaryPassword: data.temporaryPassword,
        role: data.role,
      }),
      templateId: 'welcome',
      templateData: data,
    });
  }

  /**
   * Envia email de redefinição de senha
   */
  async sendPasswordReset(
    to: string | EmailRecipient,
    data: {
      userName?: string;
      resetUrl: string;
      expiresIn?: string;
    }
  ): Promise<EmailResult> {
    const recipient = typeof to === 'string' ? { email: to } : to;
    
    return this.send({
      to: recipient.email,
      subject: 'Redefinição de Senha - ConstrutorPro',
      html: passwordResetTemplate({
        title: 'Redefinição de Senha',
        previewText: 'Redefina sua senha clicando no link abaixo',
        userName: recipient.name || data.userName,
        resetUrl: data.resetUrl,
        expiresIn: data.expiresIn || '1 hora',
      }),
      templateId: 'password_reset',
      templateData: data,
    });
  }

  /**
   * Envia notificação por email
   */
  async sendNotification(
    to: string | EmailRecipient,
    data: {
      title: string;
      message: string;
      type?: 'info' | 'success' | 'warning' | 'error';
      userName?: string;
      actionUrl?: string;
      actionText?: string;
      entityName?: string;
    }
  ): Promise<EmailResult> {
    const recipient = typeof to === 'string' ? { email: to } : to;
    
    return this.send({
      to: recipient.email,
      subject: data.title,
      html: notificationTemplate({
        title: data.title,
        previewText: data.message,
        notificationType: data.type || 'info',
        message: data.message,
        userName: recipient.name || data.userName,
        actionUrl: data.actionUrl,
        actionText: data.actionText,
        entityName: data.entityName,
      }),
      templateId: 'notification',
      templateData: data,
    });
  }

  /**
   * Envia email de projeto criado
   */
  async sendProjectCreated(
    to: string | EmailRecipient | EmailRecipient[],
    data: {
      projectName: string;
      projectCode: string;
      clientName?: string;
      startDate?: string;
      endDate?: string;
      budget?: string;
      projectUrl: string;
    }
  ): Promise<EmailResult> {
    const recipients = Array.isArray(to) ? to : [to];
    const emails = recipients.map(r => typeof r === 'string' ? r : r.email);
    
    return this.send({
      to: emails,
      subject: `Novo Projeto: ${data.projectName} 🏗️`,
      html: projectCreatedTemplate({
        title: `Novo Projeto: ${data.projectName}`,
        previewText: `Projeto ${data.projectCode} foi criado`,
        projectName: data.projectName,
        projectCode: data.projectCode,
        clientName: data.clientName,
        startDate: data.startDate,
        endDate: data.endDate,
        budget: data.budget,
        projectUrl: data.projectUrl,
      }),
      templateId: 'project_created',
      templateData: data,
    });
  }

  /**
   * Envia email de status de orçamento
   */
  async sendBudgetStatus(
    to: string | EmailRecipient,
    data: {
      budgetName: string;
      budgetCode: string;
      projectName?: string;
      totalValue?: string;
      status: 'approved' | 'rejected';
      rejectedReason?: string;
      budgetUrl: string;
      userName?: string;
    }
  ): Promise<EmailResult> {
    const recipient = typeof to === 'string' ? { email: to } : to;
    
    return this.send({
      to: recipient.email,
      subject: `Orçamento ${data.status === 'approved' ? 'Aprovado' : 'Rejeitado'}: ${data.budgetName}`,
      html: budgetStatusTemplate({
        title: `Orçamento ${data.status === 'approved' ? 'Aprovado' : 'Rejeitado'}`,
        previewText: `Orçamento ${data.budgetCode} foi ${data.status === 'approved' ? 'aprovado' : 'rejeitado'}`,
        userName: recipient.name || data.userName,
        budgetName: data.budgetName,
        budgetCode: data.budgetCode,
        projectName: data.projectName,
        totalValue: data.totalValue,
        status: data.status,
        rejectedReason: data.rejectedReason,
        budgetUrl: data.budgetUrl,
      }),
      templateId: data.status === 'approved' ? 'budget_approved' : 'budget_rejected',
      templateData: data,
    });
  }

  /**
   * Envia lembrete de pagamento
   */
  async sendPaymentReminder(
    to: string | EmailRecipient,
    data: {
      transactionType: 'receivable' | 'payable';
      description: string;
      amount: string;
      dueDate: string;
      daysUntilDue: number;
      clientOrSupplier?: string;
      transactionUrl: string;
      userName?: string;
    }
  ): Promise<EmailResult> {
    const recipient = typeof to === 'string' ? { email: to } : to;
    
    return this.send({
      to: recipient.email,
      subject: data.daysUntilDue < 0 
        ? `🚨 Vencido: ${data.description}`
        : `💰 Lembrete: ${data.description}`,
      html: paymentReminderTemplate({
        title: data.daysUntilDue < 0 ? 'Pagamento Vencido' : 'Lembrete de Pagamento',
        previewText: `${data.description} - ${data.amount}`,
        userName: recipient.name || data.userName,
        transactionType: data.transactionType,
        description: data.description,
        amount: data.amount,
        dueDate: data.dueDate,
        daysUntilDue: data.daysUntilDue,
        clientOrSupplier: data.clientOrSupplier,
        transactionUrl: data.transactionUrl,
      }),
      templateId: data.daysUntilDue < 0 ? 'payment_overdue' : 'payment_reminder',
      templateData: data,
    });
  }

  /**
   * Envia relatório semanal
   */
  async sendWeeklyReport(
    to: string | EmailRecipient,
    data: {
      period: string;
      projectsActive: number;
      projectsCompleted: number;
      projectsDelayed: number;
      totalRevenue?: string;
      totalExpenses?: string;
      pendingPayments?: string;
      pendingReceipts?: string;
      tasksCompleted: number;
      tasksPending: number;
      reportUrl: string;
      userName?: string;
      companyName?: string;
    }
  ): Promise<EmailResult> {
    const recipient = typeof to === 'string' ? { email: to } : to;
    
    return this.send({
      to: recipient.email,
      subject: '📊 Relatório Semanal - ConstrutorPro',
      html: weeklyReportTemplate({
        title: 'Relatório Semanal',
        previewText: `Resumo da semana: ${data.period}`,
        userName: recipient.name || data.userName,
        companyName: data.companyName,
        period: data.period,
        projectsActive: data.projectsActive,
        projectsCompleted: data.projectsCompleted,
        projectsDelayed: data.projectsDelayed,
        totalRevenue: data.totalRevenue,
        totalExpenses: data.totalExpenses,
        pendingPayments: data.pendingPayments,
        pendingReceipts: data.pendingReceipts,
        tasksCompleted: data.tasksCompleted,
        tasksPending: data.tasksPending,
        reportUrl: data.reportUrl,
      }),
      templateId: 'weekly_report',
      templateData: data,
    });
  }

  /**
   * Envia alerta de estoque baixo
   */
  async sendLowStockAlert(
    to: string | EmailRecipient | EmailRecipient[],
    data: {
      materials: Array<{
        name: string;
        code: string;
        currentQuantity: number;
        minimumQuantity: number;
        unit: string;
      }>;
      materialsUrl: string;
      userName?: string;
      companyName?: string;
    }
  ): Promise<EmailResult> {
    const recipients = Array.isArray(to) ? to : [to];
    const emails = recipients.map(r => typeof r === 'string' ? r : r.email);
    
    return this.send({
      to: emails,
      subject: '📦 Alerta de Estoque Baixo - ConstrutorPro',
      html: lowStockTemplate({
        title: 'Alerta de Estoque Baixo',
        previewText: `${data.materials.length} material(is) com estoque baixo`,
        userName: data.userName,
        companyName: data.companyName,
        materials: data.materials,
        materialsUrl: data.materialsUrl,
      }),
      templateId: 'low_stock_alert',
      templateData: data,
    });
  }

  /**
   * Envia email de tarefa atribuída
   */
  async sendTaskAssigned(
    to: string | EmailRecipient,
    data: {
      taskName: string;
      projectName?: string;
      assignedBy?: string;
      dueDate?: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      description?: string;
      taskUrl: string;
      userName?: string;
    }
  ): Promise<EmailResult> {
    const recipient = typeof to === 'string' ? { email: to } : to;
    
    return this.send({
      to: recipient.email,
      subject: `📋 Nova Tarefa: ${data.taskName}`,
      html: taskAssignedTemplate({
        title: 'Nova Tarefa Atribuída',
        previewText: `Você foi designado para ${data.taskName}`,
        userName: recipient.name || data.userName,
        taskName: data.taskName,
        projectName: data.projectName,
        assignedBy: data.assignedBy,
        dueDate: data.dueDate,
        priority: data.priority,
        description: data.description,
        taskUrl: data.taskUrl,
      }),
      templateId: 'task_assigned',
      templateData: data,
    });
  }
}

// Exportar instância singleton
export const emailService = new EmailService();

// Exportar classes para testes
export { EmailService, EmailQueue, emailQueue };
