'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Info,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface CashFlowDay {
  date: string;
  openingBalance: number;
  inflows: number;
  outflows: number;
  netFlow: number;
  closingBalance: number;
}

interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  inflows: number;
  outflows: number;
  netFlow: number;
}

interface CashFlowAlert {
  type: 'low_balance' | 'negative_balance' | 'large_outflow' | 'concentration';
  date: string;
  message: string;
  severity: 'warning' | 'critical' | 'info';
  amount: number;
}

interface CashFlowReport {
  startDate: string;
  endDate: string;
  openingBalance: number;
  closingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  netCashFlow: number;
  days: CashFlowDay[];
  weeklySummary: WeeklySummary[];
  alerts: CashFlowAlert[];
  scenarios: {
    pessimistic: number;
    expected: number;
    optimistic: number;
  };
}

export function CashFlowDashboard() {
  const [cashFlow, setCashFlow] = useState<CashFlowReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    loadCashFlow();
  }, [days]);

  const loadCashFlow = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/financeiro/fluxo-caixa?days=${days}`);
      const data = await response.json();
      if (data.success) {
        setCashFlow(data.data);
      }
    } catch (error) {
      console.error('Failed to load cash flow:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    window.open(`/api/financeiro/fluxo-caixa?days=${days}&format=csv`, '_blank');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!cashFlow) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = cashFlow.days.map((day) => ({
    date: formatDate(day.date),
    saldo: day.closingBalance,
    entradas: day.inflows,
    saidas: day.outflows,
  }));

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo Inicial</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(cashFlow.openingBalance)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <ArrowUpCircle className="h-4 w-4 text-green-500" />
              Total Entradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(cashFlow.totalInflows)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <ArrowDownCircle className="h-4 w-4 text-red-500" />
              Total Saídas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(cashFlow.totalOutflows)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo Final Projetado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${cashFlow.closingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(cashFlow.closingBalance)}
            </div>
            <div className="text-sm text-muted-foreground">
              Fluxo líquido: {formatCurrency(cashFlow.netCashFlow)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cenários Projetados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-sm text-red-600 mb-1">Pessimista</div>
              <div className="text-xl font-bold text-red-700">
                {formatCurrency(cashFlow.scenarios.pessimistic)}
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-600 mb-1">Esperado</div>
              <div className="text-xl font-bold text-blue-700">
                {formatCurrency(cashFlow.scenarios.expected)}
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-600 mb-1">Otimista</div>
              <div className="text-xl font-bold text-green-700">
                {formatCurrency(cashFlow.scenarios.optimistic)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {cashFlow.alerts.length > 0 && (
        <div className="space-y-2">
          {cashFlow.alerts.slice(0, 5).map((alert, index) => (
            <Alert key={index} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
              {getAlertIcon(alert.severity)}
              <AlertTitle>{alert.type.replace('_', ' ').toUpperCase()}</AlertTitle>
              <AlertDescription>
                {formatDate(alert.date)}: {alert.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Projeção de Fluxo de Caixa</CardTitle>
              <CardDescription>
                {formatDate(cashFlow.startDate)} a {formatDate(cashFlow.endDate)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value, 10))}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value={7}>7 dias</option>
                <option value={15}>15 dias</option>
                <option value={30}>30 dias</option>
                <option value={60}>60 dias</option>
                <option value={90}>90 dias</option>
              </select>
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <ReferenceLine y={0} stroke="#666" />
              <Area
                type="monotone"
                dataKey="saldo"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                name="Saldo"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Weekly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Semana</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Saídas</TableHead>
                <TableHead className="text-right">Fluxo Líquido</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashFlow.weeklySummary.map((week, index) => (
                <TableRow key={index}>
                  <TableCell>
                    {formatDate(week.weekStart)} - {formatDate(week.weekEnd)}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(week.inflows)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(week.outflows)}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${week.netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(week.netFlow)}
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
