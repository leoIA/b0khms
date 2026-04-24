// =============================================================================
// ConstrutorPro - RH Dashboard Page
// =============================================================================

'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, Clock, Banknote, Plane, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface RHStats {
  totalEmployees: number;
  activeEmployees: number;
  onVacation: number;
  onLeave: number;
  terminated: number;
  totalPayroll: number;
}

async function fetchRHStats(): Promise<{ success: boolean; data: RHStats }> {
  const response = await fetch('/api/rh/stats');
  return response.json();
}

export default function RHPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['rh-stats'],
    queryFn: fetchRHStats,
  });

  const stats = data?.data;

  const cards = [
    {
      title: 'Total de Funcionários',
      value: stats?.totalEmployees || 0,
      icon: Users,
      href: '/rh/funcionarios',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Ativos',
      value: stats?.activeEmployees || 0,
      icon: TrendingUp,
      href: '/rh/funcionarios?status=active',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Em Férias',
      value: stats?.onVacation || 0,
      icon: Plane,
      href: '/rh/ferias',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      title: 'Afastados',
      value: stats?.onLeave || 0,
      icon: AlertTriangle,
      href: '/rh/afastamentos',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recursos Humanos</h1>
        <p className="text-muted-foreground">
          Gerencie funcionários, ponto, folha de pagamento e benefícios
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{card.value}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Access */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/rh/funcionarios">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Funcionários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Cadastro e gestão de funcionários da empresa. Visualize dados pessoais, trabalhistas e financeiros.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/rh/ponto">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Controle de Ponto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Registro de entrada e saída. Visualize o histórico de ponto dos funcionários.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/rh/folha">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Folha de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Cálculo e gestão da folha de pagamento. Gere holerites e gerencie pagamentos.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/rh/ferias">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plane className="h-5 w-5" />
                Férias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Gestão de férias dos funcionários. Programe e aprove períodos de gozo.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/rh/afastamentos">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Afastamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Controle de afastamentos médicos, licenças e outras ausências.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
