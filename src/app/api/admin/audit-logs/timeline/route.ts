// =============================================================================
// ConstrutorPro - User Activity Timeline API
// API para visualização de timeline de atividades de usuários
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/server/auth';
import { db } from '@/lib/db';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface TimelineEvent {
  id: string;
  type: 'login' | 'action' | 'data_access' | 'data_modification' | 'security';
  action: string;
  actionLabel: string;
  timestamp: Date;
  ipAddress: string | null;
  device: string | null;
  browser: string | null;
  location: string | null;
  resourceType: string | null;
  resourceName: string | null;
  status: string;
  severity: string;
  metadata?: Record<string, unknown>;
}

interface TimelineGroup {
  date: string;
  label: string;
  events: TimelineEvent[];
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const ACTION_LABELS: Record<string, string> = {
  // Authentication
  login: 'Login realizado',
  logout: 'Logout realizado',
  login_failed: 'Tentativa de login falhou',
  password_change: 'Senha alterada',
  password_reset_request: 'Solicitação de reset de senha',
  password_reset_complete: 'Senha redefinida',
  session_revoked: 'Sessão revogada',
  session_revoked_all: 'Todas as sessões revogadas',
  // 2FA
  '2fa_enabled': 'Autenticação 2FA ativada',
  '2fa_disabled': 'Autenticação 2FA desativada',
  '2fa_verified': 'Verificação 2FA realizada',
  '2fa_failed': 'Falha na verificação 2FA',
  '2fa_backup_used': 'Código de backup usado',
  // Users
  user_created: 'Usuário criado',
  user_updated: 'Usuário atualizado',
  user_deleted: 'Usuário excluído',
  user_role_changed: 'Role do usuário alterada',
  user_activated: 'Usuário ativado',
  user_deactivated: 'Usuário desativado',
  // Company
  company_created: 'Empresa criada',
  company_updated: 'Empresa atualizada',
  company_deleted: 'Empresa excluída',
  plan_changed: 'Plano alterado',
  // Data
  data_export: 'Dados exportados',
  data_import: 'Dados importados',
  report_generated: 'Relatório gerado',
  project_created: 'Projeto criado',
  project_updated: 'Projeto atualizado',
  project_deleted: 'Projeto excluído',
  budget_created: 'Orçamento criado',
  budget_approved: 'Orçamento aprovado',
  budget_rejected: 'Orçamento rejeitado',
  transaction_created: 'Transação criada',
  transaction_updated: 'Transação atualizada',
  // System
  api_key_created: 'API Key criada',
  api_key_revoked: 'API Key revogada',
  webhook_created: 'Webhook criado',
  webhook_triggered: 'Webhook disparado',
  system_config_changed: 'Configuração do sistema alterada',
  security_alert: 'Alerta de segurança',
};

const TYPE_MAPPING: Record<string, TimelineEvent['type']> = {
  authentication: 'login',
  authorization: 'security',
  data_access: 'data_access',
  data_modification: 'data_modification',
  user_management: 'action',
  company_management: 'action',
  system: 'security',
};

const DATE_LOCALE = 'pt-BR';

// -----------------------------------------------------------------------------
// GET - User Activity Timeline
// -----------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const isMasterAdmin = context?.isMasterAdmin ?? false;
  const { searchParams } = new URL(request.url);

  // Target user ID (defaults to current user for non-admins)
  const targetUserId = isMasterAdmin && searchParams.get('userId') 
    ? searchParams.get('userId') 
    : context!.user.id;

  // Date range
  const startDate = searchParams.get('startDate') 
    ? new Date(searchParams.get('startDate')!) 
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
  
  const endDate = searchParams.get('endDate') 
    ? new Date(searchParams.get('endDate')!) 
    : new Date();

  // Filters
  const typeFilter = searchParams.get('type')?.split(',') as TimelineEvent['type'][] | undefined;
  const severityFilter = searchParams.get('severity')?.split(',') || undefined;

  // Pagination
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '100');

  // Get audit logs for user
  const logs = await db.audit_logs.findMany({
    where: {
      userId: targetUserId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(severityFilter && { severity: { in: severityFilter } }),
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      users: { select: { id: true, name: true, email: true } },
      companies: { select: { id: true, name: true } },
    },
  });

  const total = await db.audit_logs.count({
    where: {
      userId: targetUserId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(severityFilter && { severity: { in: severityFilter } }),
    },
  });

  // Transform logs to timeline events
  const events: TimelineEvent[] = logs.map(log => ({
    id: log.id,
    type: TYPE_MAPPING[log.category] || 'action',
    action: log.action,
    actionLabel: ACTION_LABELS[log.action] || log.action,
    timestamp: log.createdAt,
    ipAddress: log.ipAddress,
    device: log.device,
    browser: log.browser,
    location: log.location,
    resourceType: log.resourceType,
    resourceName: log.resourceName,
    status: log.status,
    severity: log.severity,
    metadata: log.metadata ? JSON.parse(log.metadata) : undefined,
  }));

  // Apply type filter if specified
  const filteredEvents = typeFilter 
    ? events.filter(e => typeFilter.includes(e.type))
    : events;

  // Group events by date
  const groupedEvents = groupEventsByDate(filteredEvents);

  // Get user summary
  const summary = await getUserSummary(targetUserId!, startDate, endDate);

  return successResponse({
    events: filteredEvents,
    groupedEvents,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    summary,
  });
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

function groupEventsByDate(events: TimelineEvent[]): TimelineGroup[] {
  const groups: Map<string, TimelineEvent[]> = new Map();

  for (const event of events) {
    const dateKey = event.timestamp.toISOString().split('T')[0];
    
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(event);
  }

  return Array.from(groups.entries()).map(([date, events]) => ({
    date,
    label: formatDateLabel(new Date(date)),
    events,
  }));
}

function formatDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Hoje';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Ontem';
  }

  return date.toLocaleDateString(DATE_LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

async function getUserSummary(
  userId: string, 
  startDate: Date, 
  endDate: Date
): Promise<{
  totalActions: number;
  logins: number;
  failedLogins: number;
  dataExports: number;
  criticalActions: number;
  mostUsedDevice: string | null;
  mostUsedBrowser: string | null;
  uniqueIps: number;
}> {
  const logs = await db.audit_logs.findMany({
    where: {
      userId,
      createdAt: { gte: startDate, lte: endDate },
    },
    select: {
      action: true,
      device: true,
      browser: true,
      ipAddress: true,
      severity: true,
    },
  });

  const deviceCounts: Record<string, number> = {};
  const browserCounts: Record<string, number> = {};
  const ipSet = new Set<string>();

  let logins = 0;
  let failedLogins = 0;
  let dataExports = 0;
  let criticalActions = 0;

  for (const log of logs) {
    if (log.action === 'login') logins++;
    if (log.action === 'login_failed') failedLogins++;
    if (log.action === 'data_export') dataExports++;
    if (log.severity === 'critical') criticalActions++;

    if (log.device) deviceCounts[log.device] = (deviceCounts[log.device] || 0) + 1;
    if (log.browser) browserCounts[log.browser] = (browserCounts[log.browser] || 0) + 1;
    if (log.ipAddress) ipSet.add(log.ipAddress);
  }

  const mostUsedDevice = Object.entries(deviceCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
  
  const mostUsedBrowser = Object.entries(browserCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    totalActions: logs.length,
    logins,
    failedLogins,
    dataExports,
    criticalActions,
    mostUsedDevice,
    mostUsedBrowser,
    uniqueIps: ipSet.size,
  };
}
