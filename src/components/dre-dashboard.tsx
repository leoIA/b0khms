'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DollarSign,
  Percent,
  BarChart3,
  PieChart,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from 'recharts';

interface DREItem {
  category: string;
  description: string;
  value: number;
  percentage: number;
  subItems?: DREItem[];
}

interface DREReport {
  projectId: string;
  projectName: string;
  period: {
    start: string;
    end: string;
  };
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custos: {
    materiais: number;
    maoObra: number;
    equipamentos: number;
    servicos: number;
    indiretos: number;
    total: number;
  };
  margemBruta: number;
  margemBrutaPercent: number;
  despesasOperacionais: number;
  resultadoOperacional: number;
  impostos: number;
  resultadoLiquido: number;
  margemLiquidaPercent: number;
  roi: number;
  items: DREItem[];
  comparison?: {
    previousPeriod: DREReport | null;
    variation: Record<string, number>;
  };
}

interface DREDashboardProps {
  projectId: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

export function DREDashboard({ projectId }: DREDashboardProps) {
  const [dre, setDre] = useState<DREReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadDRE();
  }, [projectId, period]);

  const loadDRE = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/projetos/${projectId}/dre?startDate=${period.start}&endDate=${period.end}&comparison=true`
      );
      const data = await response.json();
      if (data.success) {
        setDre(data.data);
      }
    } catch (error) {
      console.error('Failed to load DRE:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    window.open(
      `/api/projetos/${projectId}/dre?startDate=${period.start}&endDate=${period.end}&format=csv`,
      '_blank'
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!dre) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Nenhum dado disponível para o período selecionado</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const costChartData = [
    { name: 'Materiais', value: dre.custos.materiais },
    { name: 'Mão de Obra', value: dre.custos.maoObra },
    { name: 'Equipamentos', value: dre.custos.equipamentos },
    { name: 'Serviços', value: dre.custos.servicos },
    { name: 'Indiretos', value: dre.custos.indiretos },
  ];

  const resultChartData = [
    { name: 'Receita Líquida', value: dre.receitaLiquida, fill: '#3b82f6' },
    { name: 'Custos', value: -dre.custos.total, fill: '#ef4444' },
    { name: 'Margem Bruta', value: dre.margemBruta, fill: dre.margemBruta >= 0 ? '#10b981' : '#ef4444' },
    { name: 'Resultado', value: dre.resultadoLiquido, fill: dre.resultadoLiquido >= 0 ? '#10b981' : '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Receita Líquida</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dre.receitaLiquida)}</div>
            {dre.comparison?.variation.receitaLiquida !== undefined && (
              <div className={`text-sm flex items-center gap-1 ${dre.comparison.variation.receitaLiquida >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dre.comparison.variation.receitaLiquida >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {formatPercent(dre.comparison.variation.receitaLiquida)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Custos Totais</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dre.custos.total)}</div>
            <div className="text-sm text-muted-foreground">
              {formatPercent(dre.receitaLiquida > 0 ? (dre.custos.total / dre.receitaLiquida) * 100 : 0)} da receita
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resultado Líquido</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dre.resultadoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(dre.resultadoLiquido)}
            </div>
            {dre.comparison?.variation.resultadoLiquido !== undefined && (
              <div className={`text-sm flex items-center gap-1 ${dre.comparison.variation.resultadoLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dre.comparison.variation.resultadoLiquido >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {formatPercent(dre.comparison.variation.resultadoLiquido)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>ROI</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dre.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(dre.roi)}
            </div>
            <div className="text-sm text-muted-foreground">Retorno sobre investimento</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Demonstrativo
          </TabsTrigger>
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Gráficos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Demonstrativo de Resultado</CardTitle>
                  <CardDescription>
                    Período: {new Date(dre.period.start).toLocaleDateString('pt-BR')} a {new Date(dre.period.end).toLocaleDateString('pt-BR')}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Descrição</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dre.items.map((item, index) => (
                    <>
                      <TableRow key={index} className={item.category.includes('resultado') || item.category.includes('margem') ? 'bg-muted/50 font-medium' : ''}>
                        <TableCell className={item.subItems ? 'font-medium' : ''}>
                          {item.description}
                        </TableCell>
                        <TableCell className={`text-right ${item.value < 0 ? 'text-red-600' : item.value > 0 ? 'text-green-600' : ''}`}>
                          {formatCurrency(item.value)}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.percentage !== 0 ? formatPercent(item.percentage) : '-'}
                        </TableCell>
                      </TableRow>
                      {item.subItems?.map((subItem, subIndex) => (
                        <TableRow key={`${index}-${subIndex}`} className="bg-muted/30">
                          <TableCell className="pl-8 text-muted-foreground">
                            {subItem.description}
                          </TableCell>
                          <TableCell className={`text-right ${subItem.value < 0 ? 'text-red-600' : ''}`}>
                            {formatCurrency(subItem.value)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatPercent(subItem.percentage)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cost Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribuição de Custos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={costChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {costChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Result Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Resultado Financeiro
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={resultChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="value">
                      {resultChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
