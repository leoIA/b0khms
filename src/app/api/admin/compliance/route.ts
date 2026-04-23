// =============================================================================
// ConstrutorPro - Compliance Reports API
// API para geração de relatórios de conformidade (LGPD)
// =============================================================================

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/server/auth';
import { db } from '@/lib/db';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ComplianceReport {
  generatedAt: Date;
  period: {
    startDate: Date;
    endDate: Date;
  };
  company: {
    id: string;
    name: string;
    cnpj: string;
  };
  summary: {
    totalEvents: number;
    uniqueUsers: number;
    criticalEvents: number;
    failedAttempts: number;
    dataExports: number;
    dataDeletions: number;
  };
  sections: {
    dataAccess: ComplianceSection;
    dataModification: ComplianceSection;
    authentication: ComplianceSection;
    userManagement: ComplianceSection;
    security: ComplianceSection;
  };
  recommendations: string[];
}

interface ComplianceSection {
  total: number;
  byAction: Record<string, number>;
  byUser: Array<{ userId: string; userName: string; count: number }>;
  timeline: Array<{ date: string; count: number }>;
}

// -----------------------------------------------------------------------------
// GET - Generate Compliance Report
// -----------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const isMasterAdmin = context?.isMasterAdmin ?? false;
  const { searchParams } = new URL(request.url);

  // Only master admins can generate reports for any company
  const companyId = isMasterAdmin && searchParams.get('companyId')
    ? searchParams.get('companyId')
    : context!.companyId;

  if (!companyId) {
    return errorResponse('ID da empresa é obrigatório', 400);
  }

  // Date range
  const startDate = searchParams.get('startDate')
    ? new Date(searchParams.get('startDate')!)
    : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Last 90 days

  const endDate = searchParams.get('endDate')
    ? new Date(searchParams.get('endDate')!)
    : new Date();

  // Report format
  const format = searchParams.get('format') || 'json';

  // Generate report
  const report = await generateComplianceReport(companyId, startDate, endDate);

  if (format === 'csv') {
    return generateCSVReport(report);
  }

  return successResponse(report);
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

async function generateComplianceReport(
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<ComplianceReport> {
  // Get company info
  const company = await db.companies.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, cnpj: true },
  });

  if (!company) {
    throw new Error('Empresa não encontrada');
  }

  // Get all audit logs for the period
  const logs = await db.audit_logs.findMany({
    where: {
      companyId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      users: { select: { id: true, name: true } },
    },
  });

  // Calculate summary
  const uniqueUsers = new Set(logs.filter(l => l.userId).map(l => l.userId));
  const criticalEvents = logs.filter(l => l.severity === 'critical');
  const failedAttempts = logs.filter(l => l.status === 'failure' || l.status === 'blocked');
  const dataExports = logs.filter(l => l.action === 'data_export');
  const dataDeletions = logs.filter(l => 
    ['user_deleted', 'project_deleted', 'company_deleted'].includes(l.action)
  );

  // Generate sections
  const dataAccess = generateSection(
    logs.filter(l => l.category === 'data_access'),
    startDate,
    endDate
  );

  const dataModification = generateSection(
    logs.filter(l => l.category === 'data_modification'),
    startDate,
    endDate
  );

  const authentication = generateSection(
    logs.filter(l => l.category === 'authentication'),
    startDate,
    endDate
  );

  const userManagement = generateSection(
    logs.filter(l => l.category === 'user_management'),
    startDate,
    endDate
  );

  const security = generateSection(
    logs.filter(l => l.category === 'system' || l.action === 'security_alert'),
    startDate,
    endDate
  );

  // Generate recommendations
  const recommendations = generateRecommendations({
    criticalEvents: criticalEvents.length,
    failedAttempts: failedAttempts.length,
    dataExports: dataExports.length,
    dataDeletions: dataDeletions.length,
    uniqueUsersCount: uniqueUsers.size,
    logs,
  });

  return {
    generatedAt: new Date(),
    period: {
      startDate,
      endDate,
    },
    company: {
      id: company.id,
      name: company.name,
      cnpj: company.cnpj,
    },
    summary: {
      totalEvents: logs.length,
      uniqueUsers: uniqueUsers.size,
      criticalEvents: criticalEvents.length,
      failedAttempts: failedAttempts.length,
      dataExports: dataExports.length,
      dataDeletions: dataDeletions.length,
    },
    sections: {
      dataAccess,
      dataModification,
      authentication,
      userManagement,
      security,
    },
    recommendations,
  };
}

function generateSection(
  logs: Array<{ action: string; userId: string | null; users?: { id: string; name: string } | null; createdAt: Date }>,
  startDate: Date,
  endDate: Date
): ComplianceSection {
  // By action
  const byAction: Record<string, number> = {};
  for (const log of logs) {
    byAction[log.action] = (byAction[log.action] || 0) + 1;
  }

  // By user
  const userCounts: Record<string, { userName: string; count: number }> = {};
  for (const log of logs) {
    if (log.userId) {
      const userName = log.users?.name || 'Desconhecido';
      if (!userCounts[log.userId]) {
        userCounts[log.userId] = { userName, count: 0 };
      }
      userCounts[log.userId].count++;
    }
  }

  const byUser = Object.entries(userCounts)
    .map(([userId, data]) => ({ userId, userName: data.userName, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Timeline (daily)
  const timeline: Array<{ date: string; count: number }> = [];
  const dayCounts: Record<string, number> = {};
  
  for (const log of logs) {
    const dateKey = log.createdAt.toISOString().split('T')[0];
    dayCounts[dateKey] = (dayCounts[dateKey] || 0) + 1;
  }

  // Fill in all dates in range
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateKey = current.toISOString().split('T')[0];
    timeline.push({
      date: dateKey,
      count: dayCounts[dateKey] || 0,
    });
    current.setDate(current.getDate() + 1);
  }

  return {
    total: logs.length,
    byAction,
    byUser,
    timeline,
  };
}

function generateRecommendations(data: {
  criticalEvents: number;
  failedAttempts: number;
  dataExports: number;
  dataDeletions: number;
  uniqueUsersCount: number;
  logs: Array<{ action: string; severity: string }>;
}): string[] {
  const recommendations: string[] = [];

  if (data.criticalEvents > 0) {
    recommendations.push(
      `Foram detectados ${data.criticalEvents} eventos críticos. Recomenda-se revisar imediatamente esses eventos para garantir a segurança dos dados.`
    );
  }

  if (data.failedAttempts > 10) {
    recommendations.push(
      `Alto número de tentativas falhas (${data.failedAttempts}). Considere implementar medidas adicionais de segurança como bloqueio temporário de conta ou CAPTCHA.`
    );
  }

  if (data.dataExports > 50) {
    recommendations.push(
      `Volume significativo de exportações de dados (${data.dataExports}). Verifique se há necessidade de restringir permissões de exportação ou implementar logs mais detalhados.`
    );
  }

  if (data.dataDeletions > 5) {
    recommendations.push(
      `${data.dataDeletions} exclusões de dados registradas. Certifique-se de que há processo de backup adequado e que exclusões seguem política de retenção de dados.`
    );
  }

  // Check for 2FA disabled
  const twoFADisabled = data.logs.filter(l => l.action === '2fa_disabled').length;
  if (twoFADisabled > 0) {
    recommendations.push(
      `${twoFADisabled} desativações de autenticação de dois fatores detectadas. Recomenda-se investigar se foram ações autorizadas.`
    );
  }

  // Check for role changes
  const roleChanges = data.logs.filter(l => l.action === 'user_role_changed').length;
  if (roleChanges > 0) {
    recommendations.push(
      `${roleChanges} alterações de role de usuário. Verifique se todas as alterações seguem o princípio do menor privilégio.`
    );
  }

  // Default recommendations
  if (recommendations.length === 0) {
    recommendations.push(
      'Nenhum problema crítico detectado. Continue monitorando os logs de auditoria regularmente.',
      'Considere realizar uma revisão trimestral das políticas de acesso e permissões.',
      'Mantenha os usuários treinados sobre boas práticas de segurança.',
    );
  }

  return recommendations;
}

function generateCSVReport(report: ComplianceReport): Response {
  const rows: string[][] = [];

  // Header
  rows.push(['Relatório de Conformidade - LGPD', report.company.name]);
  rows.push(['Período', `${report.period.startDate.toISOString()} - ${report.period.endDate.toISOString()}`]);
  rows.push(['Gerado em', report.generatedAt.toISOString()]);
  rows.push([]);

  // Summary
  rows.push(['RESUMO']);
  rows.push(['Total de Eventos', String(report.summary.totalEvents)]);
  rows.push(['Usuários Únicos', String(report.summary.uniqueUsers)]);
  rows.push(['Eventos Críticos', String(report.summary.criticalEvents)]);
  rows.push(['Tentativas Falhas', String(report.summary.failedAttempts)]);
  rows.push(['Exportações de Dados', String(report.summary.dataExports)]);
  rows.push(['Exclusões de Dados', String(report.summary.dataDeletions)]);
  rows.push([]);

  // Sections
  for (const [sectionName, section] of Object.entries(report.sections)) {
    rows.push([sectionName.toUpperCase()]);
    rows.push(['Ação', 'Quantidade']);
    for (const [action, count] of Object.entries(section.byAction)) {
      rows.push([action, count.toString()]);
    }
    rows.push([]);
  }

  // Recommendations
  rows.push(['RECOMENDAÇÕES']);
  for (const rec of report.recommendations) {
    rows.push([rec]);
  }

  // Convert to CSV
  const csv = rows.map(row => row.join(';')).join('\n');
  
  return new Response('\ufeff' + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="compliance-report-${report.company.cnpj}-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
