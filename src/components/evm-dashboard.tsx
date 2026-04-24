// =============================================================================
// ConstrutorPro - EVM Dashboard Component
// Dashboard de Valor Agregado com gráficos e métricas
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  BarChart3,
  Activity,
  Target,
  Info,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import {
  ProjectEVMData,
  EVMMetrics,
  EVMForecast,
  formatEVMValue,
  formatEVMPercent,
  getEVMStatusDescription,
} from '@/lib/evm';

interface EVMDashboardProps {
  projectId: string;
}

export function EVMDashboard({ projectId }: EVMDashboardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [evmData, setEvmData] = useState<ProjectEVMData | null>(null);

  useEffect(() => {
    loadEVMData();
  }, [projectId]);

  async function loadEVMData() {
    setLoading(true);
    try {
      const response = await fetch(`/api/projetos/${projectId}/evm`);
      if (!response.ok) throw new Error('Erro ao carregar dados EVM');
      const data = await response.json();
      setEvmData(data);
    } catch (error) {
      console.error('Erro ao carregar EVM:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados de valor agregado.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <EVMDashboardSkeleton />;
  }

  if (!evmData) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Dados insuficientes</h3>
          <p className="text-muted-foreground">
            É necessário ter orçamentos aprovados e custos registrados para calcular o EVM.
          </p>
        </CardContent>
      </Card>
    );
  }

  const statusDescriptions = getEVMStatusDescription(evmData.metrics);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Análise de Valor Agregado (EVM)</h2>
          <p className="text-muted-foreground">
            {evmData.projectName} • BAC: {formatEVMValue(evmData.budgetAtCompletion)}
          </p>
        </div>
        <Badge 
          variant={evmData.metrics.overallStatus === 'good' ? 'default' : 
                   evmData.metrics.overallStatus === 'warning' ? 'secondary' : 'destructive'}
          className="text-sm px-4 py-2"
        >
          {evmData.metrics.overallStatus === 'good' ? 'Saudável' :
           evmData.metrics.overallStatus === 'warning' ? 'Atenção' : 'Crítico'}
        </Badge>
      </div>

      {/* Status Alert */}
      {evmData.forecast.riskLevel !== 'low' && (
        <Alert variant={evmData.forecast.riskLevel === 'high' ? 'destructive' : 'default'}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {evmData.forecast.riskLevel === 'high' ? 'Alerta Crítico' : 'Atenção'}
          </AlertTitle>
          <AlertDescription>
            {evmData.forecast.riskMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Valor Planejado (PV)"
          value={evmData.metrics.plannedValue}
          icon={<Target className="h-5 w-5" />}
          description="Valor que deveria ter sido realizado"
          color="blue"
        />
        <MetricCard
          title="Valor Agregado (EV)"
          value={evmData.metrics.earnedValue}
          icon={<Activity className="h-5 w-5" />}
          description="Valor realmente realizado"
          color="green"
        />
        <MetricCard
          title="Custo Real (AC)"
          value={evmData.metrics.actualCost}
          icon={<DollarSign className="h-5 w-5" />}
          description="Custo efetivamente incorrido"
          color="orange"
        />
        <MetricCard
          title="Variação de Custo (CV)"
          value={evmData.metrics.costVariance}
          icon={evmData.metrics.costVariance >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          description="EV - AC"
          color={evmData.metrics.costVariance >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Performance Indices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Índices de Desempenho
          </CardTitle>
          <CardDescription>
            Indicadores chave de performance do projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {/* CPI Card */}
            <div className="p-6 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Índice de Desempenho de Custo (CPI)</p>
                  <p className={`text-3xl font-bold ${
                    evmData.metrics.costPerformanceIndex >= 1 ? 'text-green-600' :
                    evmData.metrics.costPerformanceIndex >= 0.9 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {evmData.metrics.costPerformanceIndex.toFixed(2)}
                  </p>
                </div>
                {evmData.metrics.costPerformanceIndex >= 1 ? (
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                ) : (
                  <AlertTriangle className={`h-10 w-10 ${
                    evmData.metrics.costPerformanceIndex >= 0.9 ? 'text-yellow-500' : 'text-red-500'
                  }`} />
                )}
              </div>
              <Progress 
                value={Math.min(evmData.metrics.costPerformanceIndex * 100, 150)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-3">
                {statusDescriptions.cost}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={evmData.metrics.costStatus === 'under_budget' ? 'default' : 'destructive'} className="ml-2">
                    {evmData.metrics.costStatus === 'under_budget' ? 'Sob orçamento' :
                     evmData.metrics.costStatus === 'on_budget' ? 'No orçamento' : 'Acima do orçamento'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* SPI Card */}
            <div className="p-6 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-muted-foreground">Índice de Desempenho de Prazo (SPI)</p>
                  <p className={`text-3xl font-bold ${
                    evmData.metrics.schedulePerformanceIndex >= 1 ? 'text-green-600' :
                    evmData.metrics.schedulePerformanceIndex >= 0.9 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {evmData.metrics.schedulePerformanceIndex.toFixed(2)}
                  </p>
                </div>
                {evmData.metrics.schedulePerformanceIndex >= 1 ? (
                  <CheckCircle2 className="h-10 w-10 text-green-500" />
                ) : (
                  <Clock className={`h-10 w-10 ${
                    evmData.metrics.schedulePerformanceIndex >= 0.9 ? 'text-yellow-500' : 'text-red-500'
                  }`} />
                )}
              </div>
              <Progress 
                value={Math.min(evmData.metrics.schedulePerformanceIndex * 100, 150)} 
                className="h-2"
              />
              <p className="text-xs text-muted-foreground mt-3">
                {statusDescriptions.schedule}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant={evmData.metrics.scheduleStatus === 'ahead' ? 'default' : 'destructive'} className="ml-2">
                    {evmData.metrics.scheduleStatus === 'ahead' ? 'Adiantado' :
                     evmData.metrics.scheduleStatus === 'on_schedule' ? 'No prazo' : 'Atrasado'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* S-Curve Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Curva S - Evolução do Valor</CardTitle>
          <CardDescription>
            Comparativo entre valores planejados, agregados e custos reais ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evmData.periods}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => formatEVMValue(value)}
                  labelStyle={{ color: '#000' }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="cumulativePV"
                  name="PV (Planejado)"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeEV"
                  name="EV (Agregado)"
                  stroke="#22c55e"
                  fill="#22c55e"
                  fillOpacity={0.1}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeAC"
                  name="AC (Real)"
                  stroke="#f97316"
                  fill="#f97316"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Tendência de Desempenho</CardTitle>
          <CardDescription>
            Evolução dos índices CPI e SPI ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evmData.trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis domain={[0.5, 1.5]} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cpi"
                  name="CPI"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="spi"
                  name="SPI"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                {/* Reference line at 1.0 */}
                <Line
                  type="monotone"
                  dataKey={() => 1}
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  dot={false}
                  name="Meta"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Previsões EVM
          </CardTitle>
          <CardDescription>
            Estimativas de conclusão do projeto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* EAC Methods */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Estimativa no Término (EAC)</h4>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Método Simples</p>
                  <p className="text-lg font-bold">{formatEVMValue(evmData.forecast.eacAcquiescent)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Método CPI</p>
                  <p className="text-lg font-bold">{formatEVMValue(evmData.forecast.eacCpi)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Método CPI × SPI</p>
                  <p className="text-lg font-bold">{formatEVMValue(evmData.forecast.eacCpiSpi)}</p>
                </div>
              </div>
            </div>

            {/* Time Forecast */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Previsão de Prazo</h4>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Duração Total Estimada</p>
                  <p className="text-lg font-bold">{Math.round(evmData.forecast.estimatedDuration)} dias</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Tempo Restante</p>
                  <p className="text-lg font-bold">{Math.round(evmData.forecast.timeRemaining)} dias</p>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Resumo</h4>
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">ETC (Custo para Completar)</p>
                  <p className="text-lg font-bold">{formatEVMValue(evmData.metrics.estimateToComplete)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">VAC (Variação no Término)</p>
                  <p className={`text-lg font-bold ${evmData.metrics.varianceAtCompletion >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatEVMValue(evmData.metrics.varianceAtCompletion)}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">TCPI (Índice Necessário)</p>
                  <p className={`text-lg font-bold ${evmData.metrics.toCompletePerformanceIndex <= 1 ? 'text-green-600' : 'text-red-600'}`}>
                    {evmData.metrics.toCompletePerformanceIndex.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Progresso Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">% Concluído (EV/BAC)</span>
                <span className="font-bold">{formatEVMPercent(evmData.metrics.percentComplete)}</span>
              </div>
              <Progress value={evmData.metrics.percentComplete} className="h-3" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">% Gasto (AC/BAC)</span>
                <span className={`font-bold ${evmData.metrics.percentSpent > evmData.metrics.percentComplete ? 'text-red-600' : ''}`}>
                  {formatEVMPercent(evmData.metrics.percentSpent)}
                </span>
              </div>
              <Progress 
                value={evmData.metrics.percentSpent} 
                className="h-3 bg-orange-100 [&>div]:bg-orange-500" 
              />
            </div>
          </div>
          
          <Separator className="my-6" />
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <p>
              O projeto está {evmData.elapsedDays} de {evmData.totalDuration} dias decorridos 
              ({formatEVMPercent((evmData.elapsedDays / evmData.totalDuration) * 100)} do prazo).
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// Subcomponentes
// =============================================================================

interface MetricCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description: string;
  color: 'blue' | 'green' | 'orange' | 'red';
}

function MetricCard({ title, value, icon, description, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-500',
    green: 'bg-green-500/10 text-green-500',
    orange: 'bg-orange-500/10 text-orange-500',
    red: 'bg-red-500/10 text-red-500',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-lg font-bold ${color === 'green' || color === 'red' ? `text-${color}-600` : ''}`}>
              {formatEVMValue(value)}
            </p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EVMDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-48" />
      <Skeleton className="h-64" />
    </div>
  );
}
