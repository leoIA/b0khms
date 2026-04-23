// =============================================================================
// ConstrutorPro - Email Configuration
// Configurações do serviço de email
// =============================================================================

export const EMAIL_CONFIG = {
  // Configurações SMTP
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true para 465, false para outras portas
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },

  // Configurações do remetente
  from: {
    name: process.env.EMAIL_FROM_NAME || 'ConstrutorPro',
    address: process.env.EMAIL_FROM_ADDRESS || 'noreply@construtorpro.com.br',
  },

  // URL base para links nos emails
  baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',

  // Configurações de rate limiting
  rateLimit: {
    maxEmailsPerHour: parseInt(process.env.EMAIL_RATE_LIMIT || '100'),
    maxEmailsPerMinute: parseInt(process.env.EMAIL_RATE_LIMIT_MINUTE || '10'),
  },

  // Feature flags
  features: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    trackOpens: process.env.EMAIL_TRACK_OPENS === 'true',
    trackClicks: process.env.EMAIL_TRACK_CLICKS === 'true',
  },
} as const;

// Tipos de email suportados
export type EmailTemplateType =
  | 'welcome'
  | 'password_reset'
  | 'email_verification'
  | 'notification'
  | 'project_created'
  | 'project_completed'
  | 'budget_approved'
  | 'budget_rejected'
  | 'payment_reminder'
  | 'payment_overdue'
  | 'task_assigned'
  | 'task_completed'
  | 'deadline_alert'
  | 'low_stock_alert'
  | 'weekly_report'
  | 'monthly_report';

// Interface para dados do email
export interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  headers?: Record<string, string>;
  templateId?: EmailTemplateType;
  templateData?: Record<string, unknown>;
}

// Interface para anexos
export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
}

// Interface para resultado do envio
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  accepted?: string[];
  rejected?: string[];
}

// Interface para destinatário
export interface EmailRecipient {
  email: string;
  name?: string;
}
