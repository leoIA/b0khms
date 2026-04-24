// =============================================================================
// ConstrutorPro - Email Module
// Exportações do serviço de email
// =============================================================================

export { emailService, emailQueue, EmailService } from './service';
export { EMAIL_CONFIG } from './config';
export type {
  EmailTemplateType,
  EmailData,
  EmailAttachment,
  EmailResult,
  EmailRecipient,
} from './config';

// Templates
export {
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
