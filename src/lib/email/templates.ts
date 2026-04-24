// =============================================================================
// ConstrutorPro - Email Templates
// Templates HTML responsivos para emails
// =============================================================================

import { EMAIL_CONFIG } from './config';

// =============================================================================
// Base Template
// =============================================================================

interface BaseTemplateData {
  title: string;
  previewText: string;
  userName?: string;
  companyName?: string;
  year?: number;
}

function getBaseStyles(): string {
  return `
    <style>
      /* Reset styles */
      body, html { margin: 0; padding: 0; width: 100% !important; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
      body { background-color: #f4f4f5; }
      
      /* Container */
      .email-container { max-width: 600px; margin: 0 auto; padding: 20px; }
      
      /* Card */
      .email-card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
      
      /* Header */
      .email-header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 40px; text-align: center; }
      .email-header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
      .email-header .logo { font-size: 28px; font-weight: 700; color: #ffffff; }
      .email-header .logo span { color: #60a5fa; }
      
      /* Content */
      .email-content { padding: 40px; }
      .email-content h2 { color: #1f2937; margin: 0 0 16px; font-size: 20px; font-weight: 600; }
      .email-content p { color: #4b5563; margin: 0 0 16px; font-size: 16px; line-height: 1.6; }
      .email-content .highlight { color: #2563eb; font-weight: 600; }
      
      /* Buttons */
      .email-button { display: inline-block; padding: 14px 28px; background: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 10px 0; }
      .email-button:hover { background: #1d4ed8; }
      .email-button-secondary { background: #f3f4f6; color: #1f2937 !important; }
      .email-button-secondary:hover { background: #e5e7eb; }
      .email-button-success { background: #16a34a; }
      .email-button-success:hover { background: #15803d; }
      .email-button-warning { background: #ea580c; }
      .email-button-warning:hover { background: #c2410c; }
      .email-button-danger { background: #dc2626; }
      .email-button-danger:hover { background: #b91c1c; }
      
      /* Alert boxes */
      .alert { padding: 16px 20px; border-radius: 8px; margin: 20px 0; }
      .alert-info { background: #eff6ff; border-left: 4px solid #2563eb; }
      .alert-success { background: #f0fdf4; border-left: 4px solid #16a34a; }
      .alert-warning { background: #fffbeb; border-left: 4px solid #ea580c; }
      .alert-danger { background: #fef2f2; border-left: 4px solid #dc2626; }
      .alert p { margin: 0; font-size: 14px; }
      
      /* Data table */
      .data-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      .data-table th, .data-table td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
      .data-table th { background: #f9fafb; font-weight: 600; color: #374151; }
      .data-table td { color: #4b5563; }
      .data-table .text-right { text-align: right; }
      .data-table .text-center { text-align: center; }
      .data-table .total { font-weight: 700; background: #f9fafb; }
      
      /* Footer */
      .email-footer { background: #f9fafb; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb; }
      .email-footer p { color: #6b7280; font-size: 14px; margin: 0 0 8px; }
      .email-footer a { color: #2563eb; text-decoration: none; }
      .email-footer .social-links { margin: 16px 0; }
      .email-footer .social-links a { margin: 0 8px; }
      
      /* Responsive */
      @media only screen and (max-width: 600px) {
        .email-container { padding: 10px; }
        .email-header { padding: 20px; }
        .email-content { padding: 20px; }
        .email-footer { padding: 20px; }
        .email-button { width: 100%; text-align: center; }
      }
    </style>
  `;
}

function wrapWithBaseTemplate(content: string, data: BaseTemplateData): string {
  const year = data.year || new Date().getFullYear();
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${data.title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  ${getBaseStyles()}
</head>
<body>
  <div class="email-container">
    <div class="email-card">
      <!-- Header -->
      <div class="email-header">
        <div class="logo">Construtor<span>Pro</span></div>
      </div>
      
      <!-- Content -->
      ${content}
      
      <!-- Footer -->
      <div class="email-footer">
        <p><strong>ConstrutorPro</strong> - Gestão de Construção</p>
        <p>Este email foi enviado para ${data.userName || 'você'} ${data.companyName ? `da empresa ${data.companyName}` : ''}</p>
        <p>
          <a href="${EMAIL_CONFIG.baseUrl}/configuracoes">Preferências de Email</a> · 
          <a href="${EMAIL_CONFIG.baseUrl}">Acessar Sistema</a>
        </p>
        <p style="color: #9ca3af; font-size: 12px;">© ${year} ConstrutorPro. Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// =============================================================================
// Template: Welcome
// =============================================================================

interface WelcomeTemplateData extends BaseTemplateData {
  loginUrl: string;
  temporaryPassword?: string;
  role?: string;
}

export function welcomeTemplate(data: WelcomeTemplateData): string {
  const content = `
    <div class="email-content">
      <h2>Bem-vindo ao ConstrutorPro! 🎉</h2>
      <p>Olá <strong>${data.userName || 'Usuário'}</strong>,</p>
      <p>Sua conta foi criada com sucesso! Você agora tem acesso à plataforma de gestão de construção mais completa do mercado brasileiro.</p>
      
      ${data.role ? `
        <div class="alert alert-info">
          <p><strong>Seu perfil:</strong> ${getRoleName(data.role)}</p>
        </div>
      ` : ''}
      
      ${data.temporaryPassword ? `
        <div class="alert alert-warning">
          <p><strong>Senha temporária:</strong> <code style="background: #fef3c7; padding: 4px 8px; border-radius: 4px;">${data.temporaryPassword}</code></p>
          <p style="margin-top: 8px;">Por segurança, altere sua senha após o primeiro acesso.</p>
        </div>
      ` : ''}
      
      <p style="text-align: center; margin-top: 30px;">
        <a href="${data.loginUrl}" class="email-button email-button-success">Acessar Sistema</a>
      </p>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Se você não solicitou esta conta, pode ignorar este email.
      </p>
    </div>
  `;
  
  return wrapWithBaseTemplate(content, { ...data, title: 'Bem-vindo ao ConstrutorPro' });
}

// =============================================================================
// Template: Password Reset
// =============================================================================

interface PasswordResetTemplateData extends BaseTemplateData {
  resetUrl: string;
  expiresIn: string;
}

export function passwordResetTemplate(data: PasswordResetTemplateData): string {
  const content = `
    <div class="email-content">
      <h2>Redefinição de Senha</h2>
      <p>Olá <strong>${data.userName || 'Usuário'}</strong>,</p>
      <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:</p>
      
      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.resetUrl}" class="email-button">Redefinir Senha</a>
      </p>
      
      <div class="alert alert-warning">
        <p><strong>⏱️ Este link expira em ${data.expiresIn}</strong></p>
        <p>Por segurança, o link de redefinição é válido apenas por um tempo limitado.</p>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        Se você não solicitou esta redefinição, ignore este email. Sua senha permanecerá inalterada.
      </p>
      
      <p style="color: #9ca3af; font-size: 13px; margin-top: 20px;">
        Não consegue clicar no botão? Copie e cole este link no seu navegador:<br>
        <a href="${data.resetUrl}" style="word-break: break-all; color: #2563eb;">${data.resetUrl}</a>
      </p>
    </div>
  `;
  
  return wrapWithBaseTemplate(content, { ...data, title: 'Redefinição de Senha - ConstrutorPro' });
}

// =============================================================================
// Template: Notification
// =============================================================================

interface NotificationTemplateData extends BaseTemplateData {
  notificationType: 'info' | 'success' | 'warning' | 'error';
  message: string;
  actionUrl?: string;
  actionText?: string;
  entityName?: string;
}

export function notificationTemplate(data: NotificationTemplateData): string {
  const alertClass = {
    info: 'alert-info',
    success: 'alert-success',
    warning: 'alert-warning',
    error: 'alert-danger',
  }[data.notificationType];
  
  const icon = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
  }[data.notificationType];
  
  const content = `
    <div class="email-content">
      <h2>${icon} ${data.title}</h2>
      <p>Olá <strong>${data.userName || 'Usuário'}</strong>,</p>
      
      <div class="alert ${alertClass}">
        <p>${data.message}</p>
      </div>
      
      ${data.entityName ? `
        <p style="color: #6b7280; font-size: 14px;">
          <strong>Referência:</strong> ${data.entityName}
        </p>
      ` : ''}
      
      ${data.actionUrl && data.actionText ? `
        <p style="text-align: center; margin-top: 30px;">
          <a href="${data.actionUrl}" class="email-button">${data.actionText}</a>
        </p>
      ` : ''}
    </div>
  `;
  
  return wrapWithBaseTemplate(content, data);
}

// =============================================================================
// Template: Project Created
// =============================================================================

interface ProjectCreatedTemplateData extends BaseTemplateData {
  projectName: string;
  projectCode: string;
  clientName?: string;
  startDate?: string;
  endDate?: string;
  budget?: string;
  projectUrl: string;
}

export function projectCreatedTemplate(data: ProjectCreatedTemplateData): string {
  const content = `
    <div class="email-content">
      <h2>🏗️ Novo Projeto Criado</h2>
      <p>Olá <strong>${data.userName || 'Usuário'}</strong>,</p>
      <p>Um novo projeto foi criado e você foi designado para acompanhar.</p>
      
      <table class="data-table">
        <tr>
          <th colspan="2" style="background: #2563eb; color: white;">Informações do Projeto</th>
        </tr>
        <tr>
          <td><strong>Nome</strong></td>
          <td>${data.projectName}</td>
        </tr>
        <tr>
          <td><strong>Código</strong></td>
          <td>${data.projectCode}</td>
        </tr>
        ${data.clientName ? `
          <tr>
            <td><strong>Cliente</strong></td>
            <td>${data.clientName}</td>
          </tr>
        ` : ''}
        ${data.startDate ? `
          <tr>
            <td><strong>Data Início</strong></td>
            <td>${data.startDate}</td>
          </tr>
        ` : ''}
        ${data.endDate ? `
          <tr>
            <td><strong>Data Previsão</strong></td>
            <td>${data.endDate}</td>
          </tr>
        ` : ''}
        ${data.budget ? `
          <tr>
            <td><strong>Orçamento</strong></td>
            <td class="text-right"><strong>${data.budget}</strong></td>
          </tr>
        ` : ''}
      </table>
      
      <p style="text-align: center; margin-top: 30px;">
        <a href="${data.projectUrl}" class="email-button">Ver Projeto</a>
      </p>
    </div>
  `;
  
  return wrapWithBaseTemplate(content, { ...data, title: `Novo Projeto: ${data.projectName}` });
}

// =============================================================================
// Template: Budget Approved/Rejected
// =============================================================================

interface BudgetStatusTemplateData extends BaseTemplateData {
  budgetName: string;
  budgetCode: string;
  projectName?: string;
  totalValue?: string;
  status: 'approved' | 'rejected';
  rejectedReason?: string;
  budgetUrl: string;
}

export function budgetStatusTemplate(data: BudgetStatusTemplateData): string {
  const isApproved = data.status === 'approved';
  
  const content = `
    <div class="email-content">
      <h2>${isApproved ? '✅ Orçamento Aprovado' : '❌ Orçamento Rejeitado'}</h2>
      <p>Olá <strong>${data.userName || 'Usuário'}</strong>,</p>
      <p>O orçamento <strong>${data.budgetName}</strong> foi ${isApproved ? 'aprovado' : 'rejeitado'}.</p>
      
      <table class="data-table">
        <tr>
          <th colspan="2">Detalhes do Orçamento</th>
        </tr>
        <tr>
          <td><strong>Nome</strong></td>
          <td>${data.budgetName}</td>
        </tr>
        <tr>
          <td><strong>Código</strong></td>
          <td>${data.budgetCode}</td>
        </tr>
        ${data.projectName ? `
          <tr>
            <td><strong>Projeto</strong></td>
            <td>${data.projectName}</td>
          </tr>
        ` : ''}
        ${data.totalValue ? `
          <tr class="total">
            <td><strong>Valor Total</strong></td>
            <td class="text-right"><strong>${data.totalValue}</strong></td>
          </tr>
        ` : ''}
      </table>
      
      ${!isApproved && data.rejectedReason ? `
        <div class="alert alert-danger">
          <p><strong>Motivo da rejeição:</strong></p>
          <p>${data.rejectedReason}</p>
        </div>
      ` : ''}
      
      <p style="text-align: center; margin-top: 30px;">
        <a href="${data.budgetUrl}" class="email-button ${isApproved ? 'email-button-success' : ''}">Ver Orçamento</a>
      </p>
    </div>
  `;
  
  return wrapWithBaseTemplate(content, { ...data, title: `Orçamento ${isApproved ? 'Aprovado' : 'Rejeitado'}: ${data.budgetName}` });
}

// =============================================================================
// Template: Payment Reminder
// =============================================================================

interface PaymentReminderTemplateData extends BaseTemplateData {
  transactionType: 'receivable' | 'payable';
  description: string;
  amount: string;
  dueDate: string;
  daysUntilDue: number;
  clientOrSupplier?: string;
  transactionUrl: string;
}

export function paymentReminderTemplate(data: PaymentReminderTemplateData): string {
  const isReceivable = data.transactionType === 'receivable';
  const isOverdue = data.daysUntilDue < 0;
  
  const content = `
    <div class="email-content">
      <h2>${isOverdue ? '🚨' : '💰'} ${isOverdue ? 'Pagamento Vencido' : 'Lembrete de Pagamento'}</h2>
      <p>Olá <strong>${data.userName || 'Usuário'}</strong>,</p>
      
      <div class="alert ${isOverdue ? 'alert-danger' : 'alert-warning'}">
        <p>
          ${isOverdue 
            ? `<strong>Atenção!</strong> Este pagamento está vencido há ${Math.abs(data.daysUntilDue)} dias.`
            : `<strong>Lembrete:</strong> Este pagamento vence em ${data.daysUntilDue} dias.`
          }
        </p>
      </div>
      
      <table class="data-table">
        <tr>
          <th colspan="2">Detalhes do ${isReceivable ? 'Recebimento' : 'Pagamento'}</th>
        </tr>
        <tr>
          <td><strong>Descrição</strong></td>
          <td>${data.description}</td>
        </tr>
        <tr>
          <td><strong>Valor</strong></td>
          <td class="text-right"><strong>${data.amount}</strong></td>
        </tr>
        <tr>
          <td><strong>Vencimento</strong></td>
          <td>${data.dueDate}</td>
        </tr>
        ${data.clientOrSupplier ? `
          <tr>
            <td><strong>${isReceivable ? 'Cliente' : 'Fornecedor'}</strong></td>
            <td>${data.clientOrSupplier}</td>
          </tr>
        ` : ''}
      </table>
      
      <p style="text-align: center; margin-top: 30px;">
        <a href="${data.transactionUrl}" class="email-button ${isOverdue ? 'email-button-danger' : ''}">
          Ver ${isReceivable ? 'Recebimento' : 'Pagamento'}
        </a>
      </p>
    </div>
  `;
  
  return wrapWithBaseTemplate(content, { ...data, title: `${isOverdue ? 'Vencido' : 'Lembrete'}: ${data.description}` });
}

// =============================================================================
// Template: Weekly Report
// =============================================================================

interface WeeklyReportTemplateData extends BaseTemplateData {
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
}

export function weeklyReportTemplate(data: WeeklyReportTemplateData): string {
  const content = `
    <div class="email-content">
      <h2>📊 Relatório Semanal</h2>
      <p>Olá <strong>${data.userName || 'Usuário'}</strong>,</p>
      <p>Aqui está o resumo da sua semana em números:</p>
      
      <p style="text-align: center; color: #6b7280; font-size: 14px; margin-bottom: 20px;">
        <strong>Período:</strong> ${data.period}
      </p>
      
      <!-- Projetos -->
      <table class="data-table">
        <tr>
          <th colspan="2" style="background: #2563eb; color: white;">📁 Projetos</th>
        </tr>
        <tr>
          <td>Projetos Ativos</td>
          <td class="text-center"><strong>${data.projectsActive}</strong></td>
        </tr>
        <tr>
          <td>Projetos Concluídos</td>
          <td class="text-center"><strong style="color: #16a34a;">${data.projectsCompleted}</strong></td>
        </tr>
        ${data.projectsDelayed > 0 ? `
          <tr>
            <td>Projetos Atrasados</td>
            <td class="text-center"><strong style="color: #dc2626;">${data.projectsDelayed}</strong></td>
          </tr>
        ` : ''}
      </table>
      
      <!-- Financeiro -->
      ${(data.totalRevenue || data.totalExpenses || data.pendingPayments || data.pendingReceipts) ? `
        <table class="data-table" style="margin-top: 20px;">
          <tr>
            <th colspan="2" style="background: #16a34a; color: white;">💰 Financeiro</th>
          </tr>
          ${data.totalRevenue ? `
            <tr>
              <td>Receita da Semana</td>
              <td class="text-right"><strong style="color: #16a34a;">${data.totalRevenue}</strong></td>
            </tr>
          ` : ''}
          ${data.totalExpenses ? `
            <tr>
              <td>Despesas da Semana</td>
              <td class="text-right"><strong style="color: #dc2626;">${data.totalExpenses}</strong></td>
            </tr>
          ` : ''}
          ${data.pendingPayments ? `
            <tr>
              <td>Pagamentos Pendentes</td>
              <td class="text-right"><strong>${data.pendingPayments}</strong></td>
            </tr>
          ` : ''}
          ${data.pendingReceipts ? `
            <tr>
              <td>Recebimentos Pendentes</td>
              <td class="text-right"><strong>${data.pendingReceipts}</strong></td>
            </tr>
          ` : ''}
        </table>
      ` : ''}
      
      <!-- Tarefas -->
      <table class="data-table" style="margin-top: 20px;">
        <tr>
          <th colspan="2" style="background: #ea580c; color: white;">✅ Tarefas</th>
        </tr>
        <tr>
          <td>Tarefas Concluídas</td>
          <td class="text-center"><strong style="color: #16a34a;">${data.tasksCompleted}</strong></td>
        </tr>
        <tr>
          <td>Tarefas Pendentes</td>
          <td class="text-center"><strong>${data.tasksPending}</strong></td>
        </tr>
      </table>
      
      <p style="text-align: center; margin-top: 30px;">
        <a href="${data.reportUrl}" class="email-button">Ver Relatório Completo</a>
      </p>
    </div>
  `;
  
  return wrapWithBaseTemplate(content, { ...data, title: 'Relatório Semanal - ConstrutorPro' });
}

// =============================================================================
// Template: Low Stock Alert
// =============================================================================

interface LowStockTemplateData extends BaseTemplateData {
  materials: Array<{
    name: string;
    code: string;
    currentQuantity: number;
    minimumQuantity: number;
    unit: string;
  }>;
  materialsUrl: string;
}

export function lowStockTemplate(data: LowStockTemplateData): string {
  const content = `
    <div class="email-content">
      <h2>📦 Alerta de Estoque Baixo</h2>
      <p>Olá <strong>${data.userName || 'Usuário'}</strong>,</p>
      <p>Os seguintes materiais estão com estoque abaixo do mínimo:</p>
      
      <table class="data-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>Código</th>
            <th class="text-center">Atual</th>
            <th class="text-center">Mínimo</th>
            <th class="text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.materials.map(m => `
            <tr>
              <td>${m.name}</td>
              <td>${m.code}</td>
              <td class="text-center"><strong style="color: #dc2626;">${m.currentQuantity} ${m.unit}</strong></td>
              <td class="text-center">${m.minimumQuantity} ${m.unit}</td>
              <td class="text-center">
                <span style="color: #dc2626; font-weight: bold;">⚠️ BAIXO</span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <p style="text-align: center; margin-top: 30px;">
        <a href="${data.materialsUrl}" class="email-button email-button-warning">Ver Materiais</a>
      </p>
    </div>
  `;
  
  return wrapWithBaseTemplate(content, { ...data, title: 'Alerta de Estoque Baixo - ConstrutorPro' });
}

// =============================================================================
// Template: Task Assigned
// =============================================================================

interface TaskAssignedTemplateData extends BaseTemplateData {
  taskName: string;
  projectName?: string;
  assignedBy?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
  taskUrl: string;
}

export function taskAssignedTemplate(data: TaskAssignedTemplateData): string {
  const priorityColors = {
    low: '#6b7280',
    medium: '#2563eb',
    high: '#ea580c',
    urgent: '#dc2626',
  };
  
  const priorityLabels = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    urgent: 'Urgente',
  };
  
  const content = `
    <div class="email-content">
      <h2>📋 Nova Tarefa Atribuída</h2>
      <p>Olá <strong>${data.userName || 'Usuário'}</strong>,</p>
      <p>Você foi designado para uma nova tarefa${data.assignedBy ? ` por <strong>${data.assignedBy}</strong>` : ''}.</p>
      
      <table class="data-table">
        <tr>
          <th colspan="2">Detalhes da Tarefa</th>
        </tr>
        <tr>
          <td><strong>Tarefa</strong></td>
          <td>${data.taskName}</td>
        </tr>
        ${data.projectName ? `
          <tr>
            <td><strong>Projeto</strong></td>
            <td>${data.projectName}</td>
          </tr>
        ` : ''}
        ${data.dueDate ? `
          <tr>
            <td><strong>Prazo</strong></td>
            <td>${data.dueDate}</td>
          </tr>
        ` : ''}
        <tr>
          <td><strong>Prioridade</strong></td>
          <td>
            <span style="color: ${priorityColors[data.priority]}; font-weight: bold;">
              ${priorityLabels[data.priority]}
            </span>
          </td>
        </tr>
      </table>
      
      ${data.description ? `
        <p style="margin-top: 16px;"><strong>Descrição:</strong></p>
        <p style="background: #f9fafb; padding: 12px; border-radius: 6px;">${data.description}</p>
      ` : ''}
      
      <p style="text-align: center; margin-top: 30px;">
        <a href="${data.taskUrl}" class="email-button">Ver Tarefa</a>
      </p>
    </div>
  `;
  
  return wrapWithBaseTemplate(content, { ...data, title: `Nova Tarefa: ${data.taskName}` });
}

// =============================================================================
// Helper Functions
// =============================================================================

function getRoleName(role: string): string {
  const roles: Record<string, string> = {
    master_admin: 'Administrador Master',
    company_admin: 'Administrador da Empresa',
    manager: 'Gerente',
    engineer: 'Engenheiro',
    finance: 'Financeiro',
    procurement: 'Compras',
    operations: 'Operações',
    viewer: 'Visualizador',
  };
  return roles[role] || role;
}
