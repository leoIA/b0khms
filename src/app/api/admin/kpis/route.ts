// =============================================================================
// ConstrutorPro - Master Admin KPIs API
// Retorna métricas de alto nível do SaaS para o painel master
// =============================================================================

import { NextResponse } from 'next/server';
import { requireMasterAdmin, successResponse, errorResponse } from '@/server/auth';
import { db } from '@/lib/db';
import { COMPANY_PLANS } from '@/lib/constants';
import type { CompanyPlan } from '@/types';

// Preços mensais dos planos (em reais)
const PLAN_PRICES: Record<CompanyPlan, number> = {
  trial: 0,
  starter: 299,
  professional: 799,
  enterprise: 1999,
};

export async function GET() {
  // Verificar se é master admin
  const authResult = await requireMasterAdmin();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  try {
    // Buscar dados em paralelo
    const [
      companies,
      users,
      recentCompanies,
    ] = await Promise.all([
      // Todas as empresas
      db.companies.findMany({
        select: {
          id: true,
          name: true,
          plan: true,
          isActive: true,
          createdAt: true,
          users: {
            select: { id: true },
          },
        },
      }),
      // Todos os usuários
      db.users.findMany({
        select: {
          id: true,
          role: true,
          isActive: true,
        },
      }),
      // Empresas recentes (últimos 30 dias)
      db.companies.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          id: true,
          name: true,
          plan: true,
          createdAt: true,
          users: {
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Calcular KPIs de empresas
    const companiesStats = {
      total: companies.length,
      active: companies.filter((c) => c.isActive).length,
      inactive: companies.filter((c) => !c.isActive).length,
      newThisMonth: recentCompanies.length,
    };

    // Calcular distribuição de planos
    const plansDistribution = {
      trial: companies.filter((c) => c.plan === 'trial').length,
      starter: companies.filter((c) => c.plan === 'starter').length,
      professional: companies.filter((c) => c.plan === 'professional').length,
      enterprise: companies.filter((c) => c.plan === 'enterprise').length,
    };

    // Calcular KPIs de usuários
    const usersByRole: Record<string, number> = {};
    users.forEach((user) => {
      const role = user.role;
      usersByRole[role] = (usersByRole[role] || 0) + 1;
    });

    const usersStats = {
      total: users.length,
      active: users.filter((u) => u.isActive).length,
      byRole: usersByRole,
    };

    // Calcular MRR (Monthly Recurring Revenue)
    // Note: Trial users don't contribute to MRR
    const mrr = companies
      .filter((c) => c.isActive && c.plan !== 'trial')
      .reduce((total, company) => total + (PLAN_PRICES[company.plan as CompanyPlan] || 0), 0);

    // Calcular crescimento (simulado - em produção viria de dados históricos)
    const lastMonthMrr = mrr * 0.92; // Simulação de crescimento de ~8%
    const growth = lastMonthMrr > 0 ? ((mrr - lastMonthMrr) / lastMonthMrr) * 100 : 0;

    const revenueStats = {
      mrr,
      growth,
      projected: mrr * 12,
    };

    // Formatar empresas recentes
    const formattedRecentCompanies = recentCompanies.map((company) => ({
      id: company.id,
      name: company.name,
      plan: company.plan,
      createdAt: company.createdAt.toISOString(),
      usersCount: company.users.length,
    }));

    // Dados de crescimento mensal (simulado - em produção viria de tabela de analytics)
    const monthlyGrowth = [
      { month: 'Set/2024', companies: 2, users: 8 },
      { month: 'Out/2024', companies: 3, users: 12 },
      { month: 'Nov/2024', companies: 2, users: 15 },
      { month: 'Dez/2024', companies: 4, users: 22 },
      { month: 'Jan/2025', companies: 3, users: 18 },
      { month: 'Fev/2025', companies: 5, users: 25 },
    ];

    return successResponse({
      companies: companiesStats,
      users: usersStats,
      plans: plansDistribution,
      revenue: revenueStats,
      recentCompanies: formattedRecentCompanies,
      monthlyGrowth,
    });
  } catch (error) {
    console.error('Erro ao buscar KPIs:', error);
    return errorResponse('Erro ao carregar dados do painel', 500);
  }
}
