// =============================================================================
// ConstrutorPro - Dashboard de Vendas
// =============================================================================

'use client';

import { useState, useMemo } from 'react';
import { useSession } from '@/hooks/use-session';
import { redirect } from 'next/navigation';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  Target,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Eye,
  Calendar,
  ArrowUpRight,
  Plus,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';

// Status colors for charts
const STATUS_COLORS: Record<string, string> = {
  draft: '#6b7280',
  sent: '#eab308',
  viewed: '#6366f1',
  accepted: '#22c55e',
  rejected: '#ef4444',
  expired: '#f97316',
};

// Types
interface SalesMetrics {
  summary: {
    totalProposals: number;
    draftProposals: number;
    sentProposals: number;
    acceptedProposals: number;
    rejectedProposals: number;
    expiredProposals: number;
    totalValue: number;
    acceptedValue: number;
    pendingValue: number;
    conversionRate: number;
    avgProposalValue: number;
    avgTimeToAcceptance: number;
  };
  proposalsByStatus: Array<{
    status: string;
    label: string;
    count: number;
    value: number;
  }>;
  monthlyData: Array<{
    month: string;
    count: number;
    totalValue: number;
  }>;
  topClients: Array<{
    clientId: string | null;
    clientName: string;
    proposalsCount: number;
    totalValue: number;
  }>;
  expiringSoon: Array<{
    id: string;
    number: string;
    title: string;
    totalValue: number;
    validUntil: string;
    clients: { id: string; name: string } | null;
  }>;
  pendingFollowups: Array<{
    id: string;
    type: string;
    title: string;
    scheduledAt: string;
    proposals: { id: string; number: string; title: string };
    users: { id: string; name: string };
  }>;
  recentProposals: Array<{
    id: string;
    number: string;
    title: string;
    status: string;
    totalValue: number;
    createdAt: string;
    clients: { id: string; name: string } | null;
  }>;
  funnel: {
    draft: number;
    sent: number;
    viewed: number;
    accepted: number;
  };
}

// Fetch metrics
async function fetchSalesMetrics(period: string): Promise<SalesMetrics> {
  const response = await fetch(`/api/vendas/metrics?period=${period}`);
  if (!response.ok) throw new Error('Erro ao carregar métricas');
  return response.json().then(r => r.data);
}

// Metric Card Component
function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = 'primary',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`p-2 rounded-lg bg-${color}/10`}>
            <Icon className={`h-5 w-5 text-${color}`} />
          </div>
        </div>
        {trend && trendValue && (
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : null}
            <span className={`text-sm ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : ''}`}>
              {trendValue}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Funnel Chart Component
function FunnelChart({ funnel }: { funnel: SalesMetrics['funnel'] }) {
  const data = [
    { name: 'Rascunhos', value: funnel.draft, color: '#6b7280' },
    { name: 'Enviadas', value: funnel.sent, color: '#eab308' },
    { name: 'Visualizadas', value: funnel.viewed, color: '#6366f1' },
    { name: 'Aceitas', value: funnel.accepted, color: '#22c55e' },
  ];

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Funil de Vendas</CardTitle>
        <CardDescription>Acompanhe o progresso das propostas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">
                    {item.value} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <Progress
                  value={percentage}
                  className="h-3"
                  style={{
                    backgroundColor: `${item.color}20`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Status Distribution Pie Chart
function StatusChart({ data }: { data: SalesMetrics['proposalsByStatus'] }) {
  const chartData = data.filter(d => d.count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Distribuição por Status</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
                nameKey="label"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [value, name]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Sem dados para exibir
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Monthly Trend Chart
function MonthlyChart({ data }: { data: SalesMetrics['monthlyData'] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evolução Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            Sem dados para exibir
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Evolução Mensal</CardTitle>
        <CardDescription>Propostas criadas e valores por mês</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis yAxisId="left" orientation="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'totalValue') return formatCurrency(value);
                return value;
              }}
            />
            <Legend />
            <Bar yAxisId="left" dataKey="count" name="Quantidade" fill="#3b82f6" />
            <Bar yAxisId="right" dataKey="totalValue" name="Valor Total" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Status Badge
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: 'Rascunho', className: 'bg-gray-500' },
    sent: { label: 'Enviada', className: 'bg-yellow-500' },
    viewed: { label: 'Visualizada', className: 'bg-indigo-500' },
    accepted: { label: 'Aceita', className: 'bg-green-500' },
    rejected: { label: 'Rejeitada', className: 'bg-red-500' },
    expired: { label: 'Expirada', className: 'bg-orange-500' },
  };

  const { label, className } = config[status] || config.draft;

  return (
    <Badge variant="outline" className={`${className} text-white border-0`}>
      {label}
    </Badge>
  );
}

export default function VendasDashboardPage() {
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const [period, setPeriod] = useState('month');

  // Redirect if not authenticated
  if (!sessionLoading && !isAuthenticated) {
    redirect('/login');
  }

  // Fetch metrics
  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['sales-metrics', period],
    queryFn: () => fetchSalesMetrics(period),
    enabled: isAuthenticated,
  });

  if (sessionLoading || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive">
            Erro ao carregar métricas. Tente novamente.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Vendas</h1>
          <p className="text-muted-foreground">
            Acompanhe as métricas e performance das suas propostas comerciais
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild>
            <Link href="/propostas/novo">
              <Plus className="h-4 w-4 mr-2" />
              Nova Proposta
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Total de Propostas"
          value={metrics.summary.totalProposals}
          subtitle={`${formatCurrency(metrics.summary.totalValue)} em valor total`}
          icon={FileText}
          color="primary"
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${metrics.summary.conversionRate.toFixed(1)}%`}
          subtitle={`${metrics.summary.acceptedProposals} propostas aceitas`}
          icon={Target}
          trend={metrics.summary.conversionRate > 20 ? 'up' : 'neutral'}
          trendValue="meta: 20%"
          color="green-500"
        />
        <MetricCard
          title="Valor Pendente"
          value={formatCurrency(metrics.summary.pendingValue)}
          subtitle={`${metrics.summary.sentProposals} propostas aguardando`}
          icon={Clock}
          color="yellow-500"
        />
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(metrics.summary.avgProposalValue)}
          subtitle={`${metrics.summary.avgTimeToAcceptance.toFixed(0)} dias para aceitar`}
          icon={DollarSign}
          color="blue-500"
        />
      </div>

      {/* Second Row KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Rascunhos"
          value={metrics.summary.draftProposals}
          icon={FileText}
          color="gray-500"
        />
        <MetricCard
          title="Enviadas"
          value={metrics.summary.sentProposals}
          icon={Send}
          color="yellow-500"
        />
        <MetricCard
          title="Aceitas"
          value={metrics.summary.acceptedProposals}
          icon={CheckCircle2}
          color="green-500"
        />
        <MetricCard
          title="Rejeitadas"
          value={metrics.summary.rejectedProposals}
          icon={XCircle}
          color="red-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <FunnelChart funnel={metrics.funnel} />
        <StatusChart data={metrics.proposalsByStatus} />
      </div>

      {/* Monthly Chart */}
      <MonthlyChart data={metrics.monthlyData} />

      {/* Two Columns: Expiring & Top Clients */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Expiring Soon */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Propostas a Expirar
            </CardTitle>
            <CardDescription>Propostas que expiram nos próximos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.expiringSoon.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma proposta expirando em breve
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proposta</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Expira</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.expiringSoon.map((proposal) => (
                    <TableRow key={proposal.id}>
                      <TableCell>
                        <Link href={`/propostas/${proposal.id}`} className="hover:underline">
                          <p className="font-mono text-xs">{proposal.number}</p>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {proposal.clients?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(proposal.totalValue)}
                      </TableCell>
                      <TableCell>
                        <span className="text-orange-500">
                          {formatDate(proposal.validUntil)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Top Clientes
            </CardTitle>
            <CardDescription>Clientes com maior volume de propostas</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum dado disponível
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Propostas</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.topClients.slice(0, 5).map((client, index) => (
                    <TableRow key={client.clientId || index}>
                      <TableCell className="font-medium">{client.clientName}</TableCell>
                      <TableCell className="text-center">{client.proposalsCount}</TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(client.totalValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Proposals */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Propostas Recentes</CardTitle>
          <CardDescription>Últimas atualizações de propostas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Criada em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.recentProposals.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell>
                    <Link href={`/propostas/${proposal.id}`} className="hover:underline">
                      <span className="font-mono text-xs">{proposal.number}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{proposal.title}</TableCell>
                  <TableCell>{proposal.clients?.name || '-'}</TableCell>
                  <TableCell>
                    <StatusBadge status={proposal.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(proposal.totalValue)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(proposal.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
