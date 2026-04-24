'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Package,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  RefreshCw,
} from 'lucide-react';

interface StockAlert {
  materialId: string;
  materialCode: string;
  materialName: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  suggestedOrder: number;
  daysUntilStockout: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  supplier: {
    id: string;
    name: string;
    leadTime: number;
  } | null;
  avgDailyConsumption: number;
  lastPurchaseDate: string | null;
  lastPurchasePrice: number;
  estimatedCost: number;
}

interface StockAlertReport {
  generatedAt: string;
  totalMaterials: number;
  alertCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  alerts: StockAlert[];
  summary: {
    totalEstimatedCost: number;
    materialsNeedingAttention: number;
    potentialStockouts: number;
  };
}

export function StockAlertsDashboard() {
  const [report, setReport] = useState<StockAlertReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/materiais/alertas');
      const data = await response.json();
      if (data.success) {
        setReport(data.data);
      }
    } catch (error) {
      console.error('Failed to load stock alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getPriorityBadge = (priority: StockAlert['priority']) => {
    const variants = {
      critical: 'bg-red-500 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-blue-500 text-white',
    };

    const labels = {
      critical: 'Crítico',
      high: 'Alto',
      medium: 'Médio',
      low: 'Baixo',
    };

    return (
      <Badge className={variants[priority]}>
        {labels[priority]}
      </Badge>
    );
  };

  const getPriorityIcon = (priority: StockAlert['priority']) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'medium':
        return <Info className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Nenhum dado disponível</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Críticos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{report.alertCount.critical}</div>
            <p className="text-sm text-red-600">Requer ação imediata</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Alta Prioridade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{report.alertCount.high}</div>
            <p className="text-sm text-orange-600">Pedir em breve</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              Materiais Analisados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{report.totalMaterials}</div>
            <p className="text-sm text-muted-foreground">Total no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              Custo Estimado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(report.summary.totalEstimatedCost)}
            </div>
            <p className="text-sm text-muted-foreground">Para reposição</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Level Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Risco de Ruptura
          </CardTitle>
          <CardDescription>
            Materiais com potencial de ficar sem estoque nos próximos dias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.summary.potentialStockouts > 0 ? (
              <div className="flex items-center gap-4">
                <Progress 
                  value={(report.summary.potentialStockouts / report.alerts.length) * 100} 
                  className="flex-1"
                />
                <span className="text-sm font-medium">
                  {report.summary.potentialStockouts} materiais em risco
                </span>
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhum material em risco imediato de ruptura</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Alertas de Estoque</CardTitle>
              <CardDescription>
                Gerado em: {new Date(report.generatedAt).toLocaleString('pt-BR')}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadAlerts}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {report.alerts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-center">Estoque Atual</TableHead>
                  <TableHead className="text-center">Mínimo</TableHead>
                  <TableHead className="text-center">Dias até Zerar</TableHead>
                  <TableHead className="text-center">Sugerido Pedir</TableHead>
                  <TableHead className="text-right">Custo Est.</TableHead>
                  <TableHead>Fornecedor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.alerts.map((alert) => (
                  <TableRow key={alert.materialId} className={
                    alert.priority === 'critical' ? 'bg-red-50' : 
                    alert.priority === 'high' ? 'bg-orange-50' : ''
                  }>
                    <TableCell>{getPriorityIcon(alert.priority)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{alert.materialName}</div>
                        <div className="text-xs text-muted-foreground">{alert.materialCode}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={alert.currentStock <= alert.minStock ? 'text-red-600 font-bold' : ''}>
                        {alert.currentStock}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{alert.minStock}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={alert.daysUntilStockout <= 3 ? 'destructive' : 'outline'}>
                        {alert.daysUntilStockout} dias
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {alert.suggestedOrder}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(alert.estimatedCost)}
                    </TableCell>
                    <TableCell>
                      {alert.supplier ? (
                        <span className="text-sm">{alert.supplier.name}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Não definido</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhum alerta de estoque no momento. Todos os materiais estão com níveis adequados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Ações Sugeridas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {report.summary.materialsNeedingAttention > 0 && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span>Materiais que precisam de atenção imediata</span>
                <Badge>{report.summary.materialsNeedingAttention}</Badge>
              </div>
            )}
            {report.summary.potentialStockouts > 0 && (
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-red-700">Potenciais rupturas nos próximos 7 dias</span>
                <Badge variant="destructive">{report.summary.potentialStockouts}</Badge>
              </div>
            )}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span>Custo total estimado para reposição</span>
              <Badge className="bg-green-500">
                {formatCurrency(report.summary.totalEstimatedCost)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
