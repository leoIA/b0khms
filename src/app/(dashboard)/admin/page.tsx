// =============================================================================
// ConstrutorPro - Master Admin Dashboard
// Painel de controle para administradores master do SaaS
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { COMPANY_PLANS } from '@/lib/constants';
import type { CompanyPlan } from '@/types';

interface SaaSKPIs {
  companies: {
    total: number;
    active: number;
    inactive: number;
    newThisMonth: number;
  };
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  plans: {
    starter: number;
    professional: number;
    enterprise: number;
  };
  revenue: {
    mrr: number;
    growth: number;
    projected: number;
  };
  recentCompanies: Array<{
    id: string;
    name: string;
    plan: CompanyPlan;
    createdAt: string;
    usersCount: number;
  }>;
  monthlyGrowth: Array<{
    month: string;
    companies: number;
    users: number;
  }>;
}

export default function MasterAdminPage() {
  const [kpis, setKpis] = useState<SaaSKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchKPIs() {
      try {
        const response = await fetch('/api/admin/kpis');
        if (!response.ok) {
          throw new Error('Falha ao carregar dados');
        }
        const data = await response.json();
        setKpis(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }

    fetchKPIs();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!kpis) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const planColors: Record<CompanyPlan, string> = {
    trial: 'bg-yellow-500',
    starter: 'bg-gray-500',
    professional: 'bg-blue-500',
    enterprise: 'bg-purple-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel Master</h1>
        <p className="text-muted-foreground">
          Visão geral do SaaS ConstrutorPro
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total de Empresas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.companies.total}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <span className="text-green-600 flex items-center">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +{kpis.companies.newThisMonth}
              </span>
              <span className="ml-2">este mês</span>
            </div>
          </CardContent>
        </Card>

        {/* Total de Usuários */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.users.total}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.users.active} usuários ativos
            </p>
          </CardContent>
        </Card>

        {/* MRR */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.revenue.mrr)}</div>
            <div className="flex items-center text-xs mt-1">
              {kpis.revenue.growth >= 0 ? (
                <span className="text-green-600 flex items-center">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +{kpis.revenue.growth.toFixed(1)}%
                </span>
              ) : (
                <span className="text-red-600 flex items-center">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  {kpis.revenue.growth.toFixed(1)}%
                </span>
              )}
              <span className="text-muted-foreground ml-1">vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        {/* Projeção */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projeção Anual</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.revenue.projected)}</div>
            <p className="text-xs text-muted-foreground">
              Baseado no MRR atual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution & Recent Companies */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Plan Distribution */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Distribuição de Planos</CardTitle>
            <CardDescription>
              Empresas por tipo de assinatura
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(kpis.plans).map(([plan, count]) => {
              const percentage = kpis.companies.total > 0
                ? (count / kpis.companies.total) * 100
                : 0;
              const planInfo = COMPANY_PLANS[plan as CompanyPlan];
              return (
                <div key={plan} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${planColors[plan as CompanyPlan]}`} />
                      <span className="text-sm font-medium">{planInfo.label}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{count} empresas</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Companies */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Empresas Recentes</CardTitle>
            <CardDescription>
              Últimas empresas cadastradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {kpis.recentCompanies.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{company.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {company.usersCount} usuários
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className={planColors[company.plan].replace('bg-', 'border- text-')}
                    >
                      {COMPANY_PLANS[company.plan].label}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
              {kpis.recentCompanies.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma empresa cadastrada recentemente
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users by Role & Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Users by Role */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários por Função</CardTitle>
            <CardDescription>
              Distribuição de usuários por papel no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(kpis.users.byRole).map(([role, count]) => (
                <div
                  key={role}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <span className="text-sm capitalize">{role.replace('_', ' ')}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Growth */}
        <Card>
          <CardHeader>
            <CardTitle>Crescimento Mensal</CardTitle>
            <CardDescription>
              Novas empresas e usuários por mês
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {kpis.monthlyGrowth.slice(-6).map((month) => (
                <div
                  key={month.month}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-muted-foreground">{month.month}</span>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 text-blue-500" />
                      <span className="text-sm">{month.companies}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-green-500" />
                      <span className="text-sm">{month.users}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
