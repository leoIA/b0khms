// =============================================================================
// ConstrutorPro - ABC Analysis Dashboard
// Dashboard de análise ABC (Curva de Pareto) para orçamentos
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  ComposedChart,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Download,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Package,
  DollarSign,
  BarChart3,
  Target,
  Lightbulb,
} from 'lucide-react';

// =============================================================================
// Tipos
// =============================================================================

interface ABCItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  percentOfTotal: number;
  cumulativePercent: number;
  abcClass: 'A' | 'B' | 'C';
  rank: number;
}

interface ABCClassSummary {
  class: 'A' | 'B' | 'C';
  itemCount: number;
  itemPercent: number;
  totalValue: number;
  valuePercent: number;
  averageValue: number;
  description: string;
  managementStrategy: string;
}

interface ABCRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  actionItems: string[];
  targetClass: ('A' | 'B' | 'C')[];
}

interface ABCAnalysisResult {
  items: ABCItem[];
  summary: {
    totalItems: number;
    totalValue: number;
    averageItemValue: number;
    medianItemValue: number;
    standardDeviation: number;
  };
  classSummary: {
    A: ABCClassSummary;
    B: ABCClassSummary;
    C: ABCClassSummary;
  };
  chartData: Array<{
    rank: number;
    description: string;
    value: number;
    cumulativePercent: number;
    abcClass: 'A' | 'B' | 'C';
    itemPercent: number;
  }>;
  recommendations: ABCRecommendation[];
}

interface ABCAnalysisDashboardProps {
  budgetId: string;
}

// =============================================================================
// Cores para classes ABC
// =============================================================================

const CLASS_COLORS = {
  A: { main: '#ef4444', light: '#fecaca', bg: 'bg-red-50 dark:bg-red-950' },
  B: { main: '#f59e0b', light: '#fde68a', bg: 'bg-yellow-50 dark:bg-yellow-950' },
  C: { main: '#22c55e', light: '#bbf7d0', bg: 'bg-green-50 dark:bg-green-950' },
};

const PIE_COLORS = ['#ef4444', '#f59e0b', '#22c55e'];

// =============================================================================
// Componente Principal
// =============================================================================

export function ABCAnalysisDashboard({ budgetId }: ABCAnalysisDashboardProps) {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<ABCAnalysisResult | null>(null);
  const [budgetInfo, setBudgetInfo] = useState<{
    id: string;
    name: string;
    code: string | null;
    totalValue: number;
  } | null>(null);

  // Dialog states
  const [recommendationDialogOpen, setRecommendationDialogOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<ABCRecommendation | null>(null);

  // Carregar análise
  useEffect(() => {
    loadAnalysis();
  }, [budgetId]);

  async function loadAnalysis() {
    setLoading(true);
    try {
      const response = await fetch(`/api/orcamentos/${budgetId}/curva-abc`);
      const data = await response.json();

      if (data.success) {
        setBudgetInfo(data.data.budget);
        setAnalysis(data.data.analysis);
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao carregar análise ABC.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao conectar com o servidor.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  // Exportar CSV
  async function exportCSV() {
    try {
      const response = await fetch(`/api/orcamentos/${budgetId}/curva-abc?format=csv`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `curva-abc-${budgetInfo?.code || budgetId}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: 'Arquivo CSV exportado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao exportar CSV.',
        variant: 'destructive',
      });
    }
  }

  // Exportar relatório
  async function exportReport() {
    try {
      const response = await fetch(`/api/orcamentos/${budgetId}/curva-abc?format=report`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-abc-${budgetInfo?.code || budgetId}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Sucesso',
        description: 'Relatório exportado com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao exportar relatório.',
        variant: 'destructive',
      });
    }
  }

  // Formatar moeda
  function formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  // Obter cor da classe
  function getClassColor(abcClass: 'A' | 'B' | 'C'): string {
    return CLASS_COLORS[abcClass].main;
  }

  // Renderizar loading
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Renderizar vazio
  if (!analysis || analysis.items.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum item encontrado para análise.</p>
            <p className="text-sm mt-2">Adicione itens ao orçamento para visualizar a Curva ABC.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Dados para gráfico de pizza
  const pieData = [
    { name: 'Classe A', value: analysis.classSummary.A.valuePercent, count: analysis.classSummary.A.itemCount },
    { name: 'Classe B', value: analysis.classSummary.B.valuePercent, count: analysis.classSummary.B.itemCount },
    { name: 'Classe C', value: analysis.classSummary.C.valuePercent, count: analysis.classSummary.C.itemCount },
  ];

  // Dados para gráfico de barras por classe
  const barData = [
    {
      name: 'Classe A',
      itens: analysis.classSummary.A.itemPercent,
      valor: analysis.classSummary.A.valuePercent,
    },
    {
      name: 'Classe B',
      itens: analysis.classSummary.B.itemPercent,
      valor: analysis.classSummary.B.valuePercent,
    },
    {
      name: 'Classe C',
      itens: analysis.classSummary.C.itemPercent,
      valor: analysis.classSummary.C.valuePercent,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Análise ABC - Curva de Pareto
          </h2>
          <p className="text-muted-foreground">
            Classificação de itens por importância econômica
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-2 h-4 w-4" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <FileText className="mr-2 h-4 w-4" />
            Relatório
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Itens</p>
                <p className="text-2xl font-bold">{analysis.summary.totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(analysis.summary.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Target className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Médio</p>
                <p className="text-2xl font-bold">{formatCurrency(analysis.summary.averageItemValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <BarChart3 className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Itens Classe A</p>
                <p className="text-2xl font-bold">{analysis.classSummary.A.itemCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Classes ABC - Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Classe A */}
        <Card className={`border-l-4 border-l-red-500`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge className="bg-red-500 hover:bg-red-600">A</Badge>
                Classe A
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {analysis.classSummary.A.itemPercent.toFixed(1)}% dos itens
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Itens</span>
                <span className="font-medium">{analysis.classSummary.A.itemCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor</span>
                <span className="font-medium">{formatCurrency(analysis.classSummary.A.totalValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">% do Total</span>
                <span className="font-bold text-red-600">{analysis.classSummary.A.valuePercent.toFixed(1)}%</span>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Alta importância - gestão rigorosa
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Classe B */}
        <Card className={`border-l-4 border-l-yellow-500`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge className="bg-yellow-500 hover:bg-yellow-600">B</Badge>
                Classe B
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {analysis.classSummary.B.itemPercent.toFixed(1)}% dos itens
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Itens</span>
                <span className="font-medium">{analysis.classSummary.B.itemCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor</span>
                <span className="font-medium">{formatCurrency(analysis.classSummary.B.totalValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">% do Total</span>
                <span className="font-bold text-yellow-600">{analysis.classSummary.B.valuePercent.toFixed(1)}%</span>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Importância intermediária - gestão moderada
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Classe C */}
        <Card className={`border-l-4 border-l-green-500`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Badge className="bg-green-500 hover:bg-green-600">C</Badge>
                Classe C
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {analysis.classSummary.C.itemPercent.toFixed(1)}% dos itens
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Itens</span>
                <span className="font-medium">{analysis.classSummary.C.itemCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor</span>
                <span className="font-medium">{formatCurrency(analysis.classSummary.C.totalValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">% do Total</span>
                <span className="font-bold text-green-600">{analysis.classSummary.C.valuePercent.toFixed(1)}%</span>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Menor impacto - gestão simplificada
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Curva ABC - Gráfico Principal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Curva ABC (Pareto)
            </CardTitle>
            <CardDescription>
              Distribuição acumulada do valor por item
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={analysis.chartData.slice(0, 30)}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="rank"
                    label={{ value: 'Ranking', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    yAxisId="left"
                    label={{ value: 'Valor (R$)', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 100]}
                    label={{ value: '% Acumulado', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'cumulativePercent') return `${value.toFixed(1)}%`;
                      return formatCurrency(value);
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="value"
                    name="Valor"
                    fill="#3b82f6"
                    opacity={0.7}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="cumulativePercent"
                    name="% Acumulado"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                  {/* Linhas de threshold */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    data={analysis.chartData.slice(0, 30).map(() => ({ rank: 0, cumulativePercent: 80 }))}
                    dataKey="cumulativePercent"
                    stroke="#ef4444"
                    strokeDasharray="5 5"
                    dot={false}
                    name="Limite A (80%)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Distribuição por Classe
            </CardTitle>
            <CardDescription>
              Participação de cada classe no valor total
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, value, count }) => `${name}: ${value.toFixed(1)}% (${count} itens)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparativo Itens vs Valor */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Comparativo Itens vs Valor
          </CardTitle>
          <CardDescription>
            Proporção de itens e valor por classe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
                <Legend />
                <Bar dataKey="itens" name="% Itens" fill="#3b82f6" />
                <Bar dataKey="valor" name="% Valor" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Itens */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento dos Itens</CardTitle>
          <CardDescription>
            Todos os itens classificados por ordem de valor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead className="w-16">Classe</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead className="text-right">Preço Unit.</TableHead>
                  <TableHead className="text-right">Preço Total</TableHead>
                  <TableHead className="text-right">% Total</TableHead>
                  <TableHead className="text-right">% Acum.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.items.slice(0, 20).map((item) => (
                  <TableRow key={item.id} className={CLASS_COLORS[item.abcClass].bg}>
                    <TableCell className="font-medium">{item.rank}</TableCell>
                    <TableCell>
                      <Badge
                        style={{ backgroundColor: getClassColor(item.abcClass) }}
                        className="text-white"
                      >
                        {item.abcClass}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={item.description}>
                      {item.description}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.totalPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.percentOfTotal.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {item.cumulativePercent.toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {analysis.items.length > 20 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Mostrando 20 de {analysis.items.length} itens. Exporte para ver todos.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Recomendações de Gestão
          </CardTitle>
          <CardDescription>
            Ações sugeridas baseadas na análise ABC
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysis.recommendations.map((rec, index) => (
              <Alert
                key={index}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  setSelectedRecommendation(rec);
                  setRecommendationDialogOpen(true);
                }}
              >
                <div className="flex items-start gap-3">
                  {rec.priority === 'high' ? (
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  ) : rec.priority === 'medium' ? (
                    <Info className="h-5 w-5 text-yellow-500 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <AlertTitle className="flex items-center gap-2">
                      {rec.title}
                      <Badge variant="outline" className="text-xs">
                        {rec.category}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription className="mt-1">
                      {rec.description}
                    </AlertDescription>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Recomendação */}
      <Dialog open={recommendationDialogOpen} onOpenChange={setRecommendationDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRecommendation?.priority === 'high' ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : selectedRecommendation?.priority === 'medium' ? (
                <Info className="h-5 w-5 text-yellow-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              {selectedRecommendation?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedRecommendation?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Ações Recomendadas:</h4>
              <ul className="space-y-2">
                {selectedRecommendation?.actionItems.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Classe(s) alvo:</span>
              {selectedRecommendation?.targetClass.map((cls) => (
                <Badge
                  key={cls}
                  style={{ backgroundColor: getClassColor(cls) }}
                  className="text-white"
                >
                  {cls}
                </Badge>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
