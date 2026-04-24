// =============================================================================
// ConstrutorPro - Projetos - Detalhes do Projeto
// =============================================================================

'use client';

import { useState } from 'react';
import { useSession } from '@/hooks/use-session';
import { redirect, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Pencil,
  MoreHorizontal,
  Building2,
  MapPin,
  Calendar,
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  ClipboardList,
  BarChart3,
  Plus,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudRain,
  Sun,
  Loader2,
} from 'lucide-react';
import { PROJECT_STATUS, SCHEDULE_STATUS, WEATHER_CONDITIONS } from '@/lib/constants';
import type { ProjectStatus, ScheduleStatus, DailyLogWeather } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/api';

// Types
interface Project {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  estimatedValue: number;
  actualValue: number;
  physicalProgress: number;
  financialProgress: number;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  manager: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface Schedule {
  id: string;
  name: string;
  status: ScheduleStatus;
  startDate: string;
  endDate: string;
  progress: number;
  _count?: {
    tasks: number;
  };
}

interface DailyLog {
  id: string;
  date: string;
  weather: DailyLogWeather;
  workersCount: number | null;
  summary: string;
  author: {
    name: string;
  };
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  value: number;
  date: string;
  status: string;
}

interface BudgetVsActual {
  project: {
    id: string;
    name: string;
    estimatedValue: number;
    actualValue: number;
    physicalProgress: number;
    financialProgress: number;
  };
  summary: {
    totalBudgeted: number;
    totalActualCosts: number;
    totalVariance: number;
    variancePercentage: number;
    budgetCount: number;
    itemCount: number;
  };
  budgetItems: Array<{
    id: string;
    budgetId: string;
    budgetName: string;
    description: string;
    unit: string;
    plannedQuantity: number;
    actualQuantity: number | null;
    unitPrice: number;
    plannedTotal: number;
    actualTotal: number;
    variance: number;
    variancePercentage: number;
    status: 'under_budget' | 'over_budget';
    composition: { id: string; code: string; name: string } | null;
  }>;
  summaryByCategory: Array<{
    category: string;
    plannedTotal: number;
    actualTotal: number;
    variance: number;
    itemCount: number;
  }>;
  actualCosts: Array<{
    id: string;
    description: string;
    value: number;
    date: string;
    category: string | null;
    budgetItemId: string | null;
    documentRef: string | null;
  }>;
  earnedValueMetrics: {
    plannedValue: number;
    earnedValue: number;
    actualCost: number;
    costVariance: number;
    scheduleVariance: number;
    costPerformanceIndex: number;
    schedulePerformanceIndex: number;
  };
}

// Fetch project details
async function fetchProject(id: string): Promise<Project> {
  const response = await fetch(`/api/projetos/${id}`);
  if (!response.ok) throw new Error('Erro ao carregar projeto');
  return response.json();
}

// Fetch project schedules
async function fetchSchedules(projectId: string): Promise<Schedule[]> {
  const response = await fetch(`/api/cronograma?projectId=${projectId}`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

// Fetch project daily logs
async function fetchDailyLogs(projectId: string): Promise<DailyLog[]> {
  const response = await fetch(`/api/diario-obra?projectId=${projectId}`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

// Fetch project transactions
async function fetchTransactions(projectId: string): Promise<Transaction[]> {
  const response = await fetch(`/api/financeiro?projectId=${projectId}`);
  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

// Fetch budget vs actual
async function fetchBudgetVsActual(projectId: string): Promise<BudgetVsActual> {
  const response = await fetch(`/api/projetos/${projectId}/budget-vs-actual`);
  if (!response.ok) throw new Error('Erro ao carregar dados orçamentários');
  return response.json();
}

// Status badge
function StatusBadge({ status }: { status: ProjectStatus }) {
  const config = PROJECT_STATUS[status];
  return (
    <Badge className={`${config.color} text-white`}>
      {config.label}
    </Badge>
  );
}

// Weather icon
function WeatherIcon({ weather }: { weather: DailyLogWeather }) {
  const config = WEATHER_CONDITIONS[weather];
  switch (weather) {
    case 'sunny':
      return <Sun className="h-4 w-4 text-yellow-500" />;
    case 'cloudy':
      return <Cloud className="h-4 w-4 text-gray-400" />;
    case 'rainy':
    case 'stormy':
      return <CloudRain className="h-4 w-4 text-blue-500" />;
    default:
      return null;
  }
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function ProjetoDetalhesPage() {
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [activeTab, setActiveTab] = useState('overview');

  // Redirect if not authenticated
  if (!sessionLoading && !isAuthenticated) {
    redirect('/login');
  }

  // Fetch project
  const {
    data: project,
    isLoading: projectLoading,
    error,
  } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
    enabled: isAuthenticated && !!projectId,
  });

  // Fetch schedules
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['schedules', projectId],
    queryFn: () => fetchSchedules(projectId),
    enabled: isAuthenticated && !!projectId && activeTab === 'schedule',
  });

  // Fetch daily logs
  const { data: dailyLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['dailyLogs', projectId],
    queryFn: () => fetchDailyLogs(projectId),
    enabled: isAuthenticated && !!projectId && activeTab === 'logs',
  });

  // Fetch transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', projectId],
    queryFn: () => fetchTransactions(projectId),
    enabled: isAuthenticated && !!projectId && activeTab === 'financial',
  });

  // Fetch budget vs actual
  const { data: budgetVsActual, isLoading: budgetVsActualLoading } = useQuery({
    queryKey: ['budgetVsActual', projectId],
    queryFn: () => fetchBudgetVsActual(projectId),
    enabled: isAuthenticated && !!projectId && activeTab === 'budget',
  });

  if (sessionLoading || projectLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projetos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projeto não encontrado</h1>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground">
              O projeto solicitado não foi encontrado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate financial summary
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.value, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.value, 0);
  const balance = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/projetos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <StatusBadge status={project.status} />
            </div>
            {project.code && (
              <p className="text-sm text-muted-foreground font-mono">{project.code}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/projetos/${projectId}/editar`}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2" />
                Gerar Relatório
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                Excluir Projeto
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Estimado</p>
                <p className="text-lg font-bold">
                  {formatCurrency(project.estimatedValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Real</p>
                <p className="text-lg font-bold">
                  {formatCurrency(project.actualValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progresso Físico</p>
                <p className="text-lg font-bold">{project.physicalProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progresso Financeiro</p>
                <p className="text-lg font-bold">{project.financialProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="budget">Orçado vs Real</TabsTrigger>
          <TabsTrigger value="schedule">Cronograma</TabsTrigger>
          <TabsTrigger value="logs">Diários</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Descrição</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    {project.description || 'Sem descrição'}
                  </p>
                </CardContent>
              </Card>

              {/* Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>Progresso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso Físico</span>
                      <span className="font-medium">{project.physicalProgress}%</span>
                    </div>
                    <Progress value={project.physicalProgress} className="h-3" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso Financeiro</span>
                      <span className="font-medium">{project.financialProgress}%</span>
                    </div>
                    <Progress
                      value={project.financialProgress}
                      className="h-3 bg-green-100 [&>div]:bg-green-500"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Location */}
              <Card>
                <CardHeader>
                  <CardTitle>Localização</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {project.address && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{project.address}</span>
                      </div>
                    )}
                    {project.city && project.state && (
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground invisible" />
                        <span className="text-muted-foreground">
                          {project.city}, {project.state}
                        </span>
                      </div>
                    )}
                    {!project.address && !project.city && (
                      <p className="text-muted-foreground">Sem endereço cadastrado</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Client */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  {project.client ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{project.client.name}</span>
                      </div>
                      {project.client.email && (
                        <p className="text-sm text-muted-foreground pl-6">
                          {project.client.email}
                        </p>
                      )}
                      {project.client.phone && (
                        <p className="text-sm text-muted-foreground pl-6">
                          {project.client.phone}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Sem cliente vinculado</p>
                  )}
                </CardContent>
              </Card>

              {/* Manager */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Gerente Responsável</CardTitle>
                </CardHeader>
                <CardContent>
                  {project.manager ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{project.manager.name}</span>
                      </div>
                      {project.manager.email && (
                        <p className="text-sm text-muted-foreground pl-6">
                          {project.manager.email}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Sem gerente definido</p>
                  )}
                </CardContent>
              </Card>

              {/* Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Datas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Início</span>
                    </div>
                    <span className="text-sm font-medium">
                      {project.startDate
                        ? new Date(project.startDate).toLocaleDateString('pt-BR')
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Término</span>
                    </div>
                    <span className="text-sm font-medium">
                      {project.endDate
                        ? new Date(project.endDate).toLocaleDateString('pt-BR')
                        : '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Notes */}
              {project.notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Observações</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {project.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Budget vs Actual Tab */}
        <TabsContent value="budget" className="space-y-6 mt-6">
          {budgetVsActualLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </CardContent>
            </Card>
          ) : !budgetVsActual ? (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Sem dados orçamentários</h3>
                <p className="text-muted-foreground mb-4">
                  Crie um orçamento aprovado para este projeto para visualizar a análise
                </p>
                <Button asChild>
                  <Link href={`/orcamentos/novo?projectId=${projectId}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Orçamento
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <DollarSign className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Orçado</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(budgetVsActual.summary.totalBudgeted)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <TrendingDown className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Real</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(budgetVsActual.summary.totalActualCosts)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${budgetVsActual.summary.totalVariance >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        {budgetVsActual.summary.totalVariance >= 0 ? (
                          <TrendingUp className="h-5 w-5 text-green-500" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Variação</p>
                        <p className={`text-lg font-bold ${budgetVsActual.summary.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(budgetVsActual.summary.totalVariance)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <BarChart3 className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">% Variação</p>
                        <p className={`text-lg font-bold ${budgetVsActual.summary.variancePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {budgetVsActual.summary.variancePercentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Earned Value Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Análise de Valor Agregado (EVM)</CardTitle>
                  <CardDescription>
                    Indicadores de desempenho do projeto
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Valor Planejado (PV)</p>
                      <p className="text-xl font-bold">{formatCurrency(budgetVsActual.earnedValueMetrics.plannedValue)}</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Valor Agregado (EV)</p>
                      <p className="text-xl font-bold">{formatCurrency(budgetVsActual.earnedValueMetrics.earnedValue)}</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Custo Real (AC)</p>
                      <p className="text-xl font-bold">{formatCurrency(budgetVsActual.earnedValueMetrics.actualCost)}</p>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm text-muted-foreground">Variação de Custo (CV)</p>
                      <p className={`text-xl font-bold ${budgetVsActual.earnedValueMetrics.costVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(budgetVsActual.earnedValueMetrics.costVariance)}
                      </p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Índice de Desempenho de Custo (CPI)</p>
                          <p className={`text-2xl font-bold ${budgetVsActual.earnedValueMetrics.costPerformanceIndex >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                            {budgetVsActual.earnedValueMetrics.costPerformanceIndex.toFixed(2)}
                          </p>
                        </div>
                        {budgetVsActual.earnedValueMetrics.costPerformanceIndex >= 1 ? (
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-8 w-8 text-red-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {budgetVsActual.earnedValueMetrics.costPerformanceIndex >= 1
                          ? 'Projeto sob controle de custos'
                          : 'Projeto acima do orçamento'}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Índice de Desempenho de Prazo (SPI)</p>
                          <p className={`text-2xl font-bold ${budgetVsActual.earnedValueMetrics.schedulePerformanceIndex >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                            {budgetVsActual.earnedValueMetrics.schedulePerformanceIndex.toFixed(2)}
                          </p>
                        </div>
                        {budgetVsActual.earnedValueMetrics.schedulePerformanceIndex >= 1 ? (
                          <CheckCircle2 className="h-8 w-8 text-green-500" />
                        ) : (
                          <Clock className="h-8 w-8 text-red-500" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {budgetVsActual.earnedValueMetrics.schedulePerformanceIndex >= 1
                          ? 'Projeto adiantado no cronograma'
                          : 'Projeto atrasado'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Budget Items Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Itens do Orçamento</CardTitle>
                  <CardDescription>
                    Comparativo detalhado por item
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Unidade</TableHead>
                          <TableHead className="text-right">Qtd. Planejada</TableHead>
                          <TableHead className="text-right">Preço Unit.</TableHead>
                          <TableHead className="text-right">Total Planejado</TableHead>
                          <TableHead className="text-right">Total Real</TableHead>
                          <TableHead className="text-right">Variação</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {budgetVsActual.budgetItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.description}</p>
                                {item.composition && (
                                  <p className="text-xs text-muted-foreground">
                                    {item.composition.code} - {item.composition.name}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell className="text-right">{item.plannedQuantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.plannedTotal)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.actualTotal)}</TableCell>
                            <TableCell className={`text-right font-medium ${item.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(item.variance)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.status === 'under_budget' ? 'default' : 'destructive'}>
                                {item.status === 'under_budget' ? 'No Orçamento' : 'Acima'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Summary by Category */}
              {budgetVsActual.summaryByCategory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Resumo por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {budgetVsActual.summaryByCategory.map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                          <div>
                            <p className="font-medium">{category.category}</p>
                            <p className="text-sm text-muted-foreground">
                              {category.itemCount} item(ns)
                            </p>
                          </div>
                          <div className="flex items-center gap-6 text-right">
                            <div>
                              <p className="text-sm text-muted-foreground">Planejado</p>
                              <p className="font-medium">{formatCurrency(category.plannedTotal)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Real</p>
                              <p className="font-medium">{formatCurrency(category.actualTotal)}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Variação</p>
                              <p className={`font-bold ${category.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(category.variance)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Cronogramas</h2>
            <Button asChild>
              <Link href={`/cronograma/novo?projectId=${projectId}`}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Cronograma
              </Link>
            </Button>
          </div>

          {schedulesLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </CardContent>
            </Card>
          ) : schedules.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum cronograma</h3>
                <p className="text-muted-foreground mb-4">
                  Crie um cronograma para este projeto
                </p>
                <Button asChild>
                  <Link href={`/cronograma/novo?projectId=${projectId}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Cronograma
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Término</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {SCHEDULE_STATUS[schedule.status]?.label || schedule.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(schedule.startDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {new Date(schedule.endDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={schedule.progress} className="h-2 w-16" />
                          <span className="text-sm">{schedule.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/cronograma/${schedule.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Daily Logs Tab */}
        <TabsContent value="logs" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Diário de Obra</h2>
            <Button asChild>
              <Link href={`/diario-obra/novo?projectId=${projectId}`}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Registro
              </Link>
            </Button>
          </div>

          {logsLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </CardContent>
            </Card>
          ) : dailyLogs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum registro</h3>
                <p className="text-muted-foreground mb-4">
                  Inicie o diário de obra para este projeto
                </p>
                <Button asChild>
                  <Link href={`/diario-obra/novo?projectId=${projectId}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Registro
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {dailyLogs.map((log) => (
                <Card key={log.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {new Date(log.date).toLocaleDateString('pt-BR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </CardTitle>
                        <CardDescription>
                          por {log.author.name}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <WeatherIcon weather={log.weather} />
                        {log.workersCount && (
                          <Badge variant="outline">{log.workersCount} trabalhadores</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {log.summary}
                    </p>
                    <div className="flex justify-end mt-3">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/diario-obra/${log.id}`}>
                          Ver detalhes
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Resumo Financeiro</h2>
            <Button asChild>
              <Link href={`/financeiro/novo?projectId=${projectId}`}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Transação
              </Link>
            </Button>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Receitas</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(totalIncome)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Despesas</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatCurrency(totalExpense)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${balance >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <DollarSign className={`h-5 w-5 ${balance >= 0 ? 'text-green-500' : 'text-red-500'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo</p>
                    <p className={`text-lg font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(balance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {transactionsLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              </CardContent>
            </Card>
          ) : transactions.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Sem transações</h3>
                <p className="text-muted-foreground mb-4">
                  Registre as transações financeiras do projeto
                </p>
                <Button asChild>
                  <Link href={`/financeiro/novo?projectId=${projectId}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Transação
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell className="capitalize">
                        {transaction.category}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{transaction.status}</Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
