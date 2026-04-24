// =============================================================================
// ConstrutorPro - Dashboard Executivo Avançado
// Com Curva S, KPIs EVM e Análise Orçado vs Realizado
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Building2,
  Users,
  FolderKanban,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Calendar,
  BarChart3,
  LineChart,
  PieChart,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
  BarChart,
  Bar,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ComposedChart,
} from 'recharts';
import { PROJECT_STATUS } from '@/lib/constants';
import { formatCurrency } from '@/lib/api';
import type { ProjectStatus } from '@/types';

interface DashboardStats {
  projects: {
    total: number;
    active: number;
    completed: number;
    delayed: number;
    paused: number;
  };
  financial: {
    projectedRevenue: number;
    actualRevenue: number;
    projectedCosts: number;
    actualCosts: number;
    profitMargin: number;
  };
  clients: {
    total: number;
    active: number;
  };
  suppliers: {
    total: number;
    active: number;
  };
}

interface RecentProject {
  id: string;
  name: string;
  status: ProjectStatus;
  physicalProgress: number;
  financialProgress: number;
  estimatedValue: number;
}

interface CurveSData {
  month: string;
  planejado: number;
  realizado: number;
  acumuladoPlanejado: number;
  acumuladoRealizado: number;
}

interface EVMData {
  spi: number; // Schedule Performance Index
  cpi: number; // Cost Performance Index
  ev: number;  // Earned Value
  pv: number;  // Planned Value
  ac: number;  // Actual Cost
  bac: number; // Budget at Completion
  eac: number; // Estimate at Completion
  etc: number; // Estimate to Complete
  vac: number; // Variance at Completion
}

interface BudgetVsActual {
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [curveSData, setCurveSData] = useState<CurveSData[]>([]);
  const [evmData, setEvmData] = useState<EVMData | null>(null);
  const [budgetVsActual, setBudgetVsActual] = useState<BudgetVsActual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch('/api/dashboard');
        if (!response.ok) throw new Error('Falha ao carregar dados');
        const data = await response.json();
        setStats(data.stats);
        setRecentProjects(data.recentProjects || []);

        // Generate simulated Curva S data based on projects
        const curveData = generateCurveSData(data.stats);
        setCurveSData(curveData);

        // Calculate EVM metrics
        const evm = calculateEVMMetrics(data.stats);
        setEvmData(evm);

        // Generate budget vs actual data
        const budgetData = generateBudgetVsActual(data.stats);
        setBudgetVsActual(budgetData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  // Generate Curva S data
  function generateCurveSData(stats: DashboardStats): CurveSData[] {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const totalBudget = stats.financial.projectedRevenue || 1000000;
    const progressRate = stats.projects.active > 0 ? stats.financial.actualRevenue / totalBudget : 0;

    let acumuladoPlanejado = 0;
    let acumuladoRealizado = 0;

    return months.map((month, index) => {
      // S-curve formula: slower at start, faster in middle, slower at end
      const t = (index + 1) / 12;
      const planejado = totalBudget * (3 * Math.pow(t, 2) - 2 * Math.pow(t, 3)) / 12;
      const realizado = planejado * (0.85 + Math.random() * 0.3); // Simulated variance

      acumuladoPlanejado += planejado;
      acumuladoRealizado += realizado * progressRate;

      return {
        month,
        planejado: Math.round(planejado),
        realizado: Math.round(realizado * progressRate),
        acumuladoPlanejado: Math.round(acumuladoPlanejado),
        acumuladoRealizado: Math.round(acumuladoRealizado),
      };
    });
  }

  // Calculate EVM metrics
  function calculateEVMMetrics(stats: DashboardStats): EVMData {
    const pv = stats.financial.projectedCosts || 0;
    const ac = stats.financial.actualCosts || 0;
    const ev = stats.financial.actualRevenue * 0.6 || 0; // Simplified EV calculation
    const bac = stats.financial.projectedRevenue || 0;

    const spi = pv > 0 ? ev / pv : 1;
    const cpi = ac > 0 ? ev / ac : 1;
    const eac = cpi > 0 ? bac / cpi : bac;
    const etc = eac - ac;
    const vac = bac - eac;

    return {
      spi: Math.round(spi * 100) / 100,
      cpi: Math.round(cpi * 100) / 100,
      ev: Math.round(ev),
      pv: Math.round(pv),
      ac: Math.round(ac),
      bac: Math.round(bac),
      eac: Math.round(eac),
      etc: Math.round(etc),
      vac: Math.round(vac),
    };
  }

  // Generate Budget vs Actual by category
  function generateBudgetVsActual(stats: DashboardStats): BudgetVsActual[] {
    const categories = [
      { name: 'Materiais', budgetPct: 0.35, actualVariance: 0.08 },
      { name: 'Mão de Obra', budgetPct: 0.30, actualVariance: 0.05 },
      { name: 'Equipamentos', budgetPct: 0.15, actualVariance: -0.03 },
      { name: 'Serviços', budgetPct: 0.12, actualVariance: 0.02 },
      { name: 'Administrativo', budgetPct: 0.05, actualVariance: -0.01 },
      { name: 'Outros', budgetPct: 0.03, actualVariance: 0.00 },
    ];

    const totalBudget = stats.financial.projectedCosts || 500000;

    return categories.map(cat => {
      const budgeted = totalBudget * cat.budgetPct;
      const actual = budgeted * (1 + cat.actualVariance * (Math.random() * 0.5 + 0.75));
      return {
        category: cat.name,
        budgeted: Math.round(budgeted),
        actual: Math.round(actual),
        variance: Math.round(actual - budgeted),
      };
    });
  }

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

  if (!stats) {
    return null;
  }

  // Chart configurations
  const curveSChartConfig: ChartConfig = {
    acumuladoPlanejado: { label: 'Planejado Acum.', color: '#3B82F6' },
    acumuladoRealizado: { label: 'Realizado Acum.', color: '#10B981' },
    planejado: { label: 'Planejado', color: '#93C5FD' },
    realizado: { label: 'Realizado', color: '#6EE7B7' },
  };

  const budgetChartConfig: ChartConfig = {
    budgeted: { label: 'Orçado', color: '#3B82F6' },
    actual: { label: 'Realizado', color: '#10B981' },
  };

  const pieChartConfig: ChartConfig = {
    active: { label: 'Ativos', color: '#10B981' },
    completed: { label: 'Concluídos', color: '#3B82F6' },
    delayed: { label: 'Atrasados', color: '#EF4444' },
    paused: { label: 'Pausados', color: '#F59E0B' },
  };

  const projectPieData = [
    { name: 'Ativos', value: stats.projects.active, fill: '#10B981' },
    { name: 'Concluídos', value: stats.projects.completed, fill: '#3B82F6' },
    { name: 'Atrasados', value: stats.projects.delayed, fill: '#EF4444' },
    { name: 'Pausados', value: stats.projects.paused, fill: '#F59E0B' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Executivo</h1>
          <p className="text-muted-foreground">
            Visão geral com KPIs, Curva S e Análise EVM
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/widgets">
              <Settings className="h-4 w-4 mr-1" />
              Widgets
            </Link>
          </Button>
          <Badge variant="outline" className="text-sm">
            <Calendar className="h-4 w-4 mr-1" />
            {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </Badge>
        </div>
      </div>

      {/* EVM KPI Cards */}
      {evmData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SPI (Desempenho)</CardTitle>
              <Target className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{(evmData.spi * 100).toFixed(0)}%</span>
                {evmData.spi >= 1 ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <ArrowUpRight className="h-3 w-3 mr-1" />No prazo
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <ArrowDownRight className="h-3 w-3 mr-1" />Atrasado
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Schedule Performance Index
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CPI (Custo)</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">{(evmData.cpi * 100).toFixed(0)}%</span>
                {evmData.cpi >= 1 ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <ArrowDownRight className="h-3 w-3 mr-1" />Economia
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <ArrowUpRight className="h-3 w-3 mr-1" />Acima
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cost Performance Index
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Agregado</CardTitle>
              <Activity className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(evmData.ev)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Earned Value (EV)
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">VAC (Previsão)</CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${evmData.vac >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(evmData.vac)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Variance at Completion
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projects.active}</div>
            <p className="text-xs text-muted-foreground">
              de {stats.projects.total} projetos no total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clients.active}</div>
            <p className="text-xs text-muted-foreground">
              de {stats.clients.total} clientes cadastrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Prevista</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.financial.projectedRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Realizado: {formatCurrency(stats.financial.actualRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem de Lucro</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.financial.profitMargin.toFixed(1)}%</div>
            <Progress value={stats.financial.profitMargin} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Concluídos</p>
                <p className="text-2xl font-bold">{stats.projects.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                <AlertCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Atrasados</p>
                <p className="text-2xl font-bold">{stats.projects.delayed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Pausados</p>
                <p className="text-2xl font-bold">{stats.projects.paused}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Fornecedores</p>
                <p className="text-2xl font-bold">{stats.suppliers.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="curva-s" className="space-y-4">
        <TabsList>
          <TabsTrigger value="curva-s">
            <LineChart className="h-4 w-4 mr-2" />
            Curva S
          </TabsTrigger>
          <TabsTrigger value="orcado-realizado">
            <BarChart3 className="h-4 w-4 mr-2" />
            Orçado vs Realizado
          </TabsTrigger>
          <TabsTrigger value="projetos">
            <PieChart className="h-4 w-4 mr-2" />
            Status Projetos
          </TabsTrigger>
        </TabsList>

        {/* Curva S Tab */}
        <TabsContent value="curva-s" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Curva S - Evolução Físico-Financeira</CardTitle>
              <CardDescription>
                Acompanhamento acumulado planejado vs realizado ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={curveSChartConfig} className="h-[400px] w-full">
                <RechartsLineChart data={curveSData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="acumuladoPlanejado"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    name="Acum. Planejado"
                  />
                  <Area
                    type="monotone"
                    dataKey="acumuladoRealizado"
                    stroke="#10B981"
                    fill="#10B981"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    name="Acum. Realizado"
                  />
                </RechartsLineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orçado vs Realizado Tab */}
        <TabsContent value="orcado-realizado" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orçado vs Realizado por Categoria</CardTitle>
              <CardDescription>
                Comparativo de custos previstos e efetivos por categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={budgetChartConfig} className="h-[400px] w-full">
                <ComposedChart data={budgetVsActual} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="category" tickLine={false} axisLine={false} />
                  <YAxis
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="budgeted" fill="#3B82F6" name="Orçado" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" fill="#10B981" name="Realizado" radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Variance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Variação por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {budgetVsActual.map((item) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <span className="font-medium">{item.category}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        Orçado: {formatCurrency(item.budgeted)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Realizado: {formatCurrency(item.actual)}
                      </span>
                      <Badge
                        variant={item.variance > 0 ? 'destructive' : 'default'}
                        className={item.variance <= 0 ? 'bg-green-100 text-green-800' : ''}
                      >
                        {item.variance > 0 ? '+' : ''}{formatCurrency(item.variance)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status Projetos Tab */}
        <TabsContent value="projetos" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Projetos</CardTitle>
                <CardDescription>
                  Status atual dos projetos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={pieChartConfig} className="h-[300px] w-full">
                  <ResponsiveContainer>
                    <RechartsPieChart>
                      <Pie
                        data={projectPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {projectPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo Executivo</CardTitle>
                <CardDescription>
                  Indicadores consolidados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {evmData && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Valor Planejado (PV)</p>
                        <p className="text-xl font-bold">{formatCurrency(evmData.pv)}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Custo Real (AC)</p>
                        <p className="text-xl font-bold">{formatCurrency(evmData.ac)}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Orçamento Total (BAC)</p>
                        <p className="text-xl font-bold">{formatCurrency(evmData.bac)}</p>
                      </div>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm text-muted-foreground">Estimativa Final (EAC)</p>
                        <p className="text-xl font-bold">{formatCurrency(evmData.eac)}</p>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Progresso Geral</span>
                        <span className="text-sm text-muted-foreground">
                          {((stats.projects.completed / Math.max(stats.projects.total, 1)) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress
                        value={(stats.projects.completed / Math.max(stats.projects.total, 1)) * 100}
                        className="h-3"
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Projetos Recentes</CardTitle>
          <CardDescription>
            Acompanhe o progresso dos seus projetos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum projeto encontrado
            </div>
          ) : (
            <div className="space-y-4">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/70 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-medium">{project.name}</p>
                      <Badge variant="outline">
                        {PROJECT_STATUS[project.status]?.label || project.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Progresso Físico</p>
                        <Progress value={project.physicalProgress} className="h-2 mt-1" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {project.physicalProgress.toFixed(0)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Progresso Financeiro</p>
                        <Progress value={project.financialProgress} className="h-2 mt-1" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {project.financialProgress.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-muted-foreground">Valor Estimado</p>
                    <p className="font-semibold">{formatCurrency(project.estimatedValue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-80 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
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
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
