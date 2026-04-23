// =============================================================================
// ConstrutorPro - Relatórios
// =============================================================================

'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Download,
  Building2,
  DollarSign,
  Package,
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileDown,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/api';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

// Types
interface Project {
  id: string;
  name: string;
  code?: string;
  status: string;
  physicalProgress: number;
  financialProgress: number;
  estimatedValue: number;
  actualValue: number;
  startDate?: string;
  endDate?: string;
  client?: { name: string };
}

interface Transaction {
  id: string;
  type: string;
  category: string;
  value: number;
  date: string;
  dueDate?: string;
  status: string;
  description: string;
  projectId?: string;
  project?: { id: string; name: string };
}

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingIncome: number;
  pendingExpenses: number;
}

interface Material {
  id: string;
  code: string;
  name: string;
  unit: string;
  unitCost: number;
  stockQuantity: number | null;
  minStock: number | null;
  category?: string;
  supplier?: { name: string };
}

interface DailyLog {
  id: string;
  date: string;
  weather: string;
  workersCount: number | null;
  summary: string;
  project: { id: string; name: string };
  observations?: string;
}

// Fetch functions
async function fetchProjects(): Promise<{ data: Project[] }> {
  const response = await fetch('/api/projetos?limit=100');
  return response.json();
}

async function fetchTransactions(): Promise<{ data: { data: Transaction[] } }> {
  const response = await fetch('/api/financeiro?limit=100');
  return response.json();
}

async function fetchDashboard(): Promise<{ data: DashboardStats }> {
  const response = await fetch('/api/financeiro/dashboard');
  return response.json();
}

async function fetchMaterials(): Promise<{ data: { data: Material[] } }> {
  const response = await fetch('/api/materiais?limit=100');
  return response.json();
}

async function fetchDailyLogs(): Promise<{ data: { data: DailyLog[] } }> {
  const response = await fetch('/api/diario-obra?limit=100');
  return response.json();
}

// Chart colors
const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const chartConfig: ChartConfig = {
  income: { label: 'Receitas', color: '#22c55e' },
  expense: { label: 'Despesas', color: '#ef4444' },
  balance: { label: 'Saldo', color: '#3b82f6' },
};

// =============================================================================
// CSV Generation Functions
// =============================================================================

function generateProjectsCSV(projects: Project[]): string {
  const headers = [
    'Código',
    'Nome',
    'Cliente',
    'Status',
    'Data Início',
    'Data Fim',
    'Valor Estimado',
    'Valor Real',
    'Progresso Físico (%)',
    'Progresso Financeiro (%)',
  ];
  
  const rows = projects.map((p) => [
    p.code || '',
    p.name,
    p.client?.name || '',
    p.status === 'active' ? 'Em Andamento' :
    p.status === 'planning' ? 'Planejamento' :
    p.status === 'completed' ? 'Concluído' :
    p.status === 'paused' ? 'Pausado' : 'Cancelado',
    p.startDate ? formatDate(p.startDate) : '',
    p.endDate ? formatDate(p.endDate) : '',
    p.estimatedValue.toFixed(2),
    p.actualValue.toFixed(2),
    p.physicalProgress.toFixed(1),
    p.financialProgress.toFixed(1),
  ]);
  
  return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}

function generateFinancialCSV(transactions: Transaction[]): string {
  const headers = [
    'Data',
    'Tipo',
    'Categoria',
    'Descrição',
    'Valor',
    'Data Vencimento',
    'Status',
    'Projeto',
  ];
  
  const rows = transactions.map((t) => [
    formatDate(t.date),
    t.type === 'income' ? 'Receita' : 'Despesa',
    t.category === 'material' ? 'Material' :
    t.category === 'labor' ? 'Mão de Obra' :
    t.category === 'equipment' ? 'Equipamento' :
    t.category === 'service' ? 'Serviço' :
    t.category === 'tax' ? 'Imposto' :
    t.category === 'administrative' ? 'Administrativo' : 'Outros',
    `"${t.description.replace(/"/g, '""')}"`,
    t.value.toFixed(2),
    t.dueDate ? formatDate(t.dueDate) : '',
    t.status === 'pending' ? 'Pendente' :
    t.status === 'partial' ? 'Parcial' :
    t.status === 'paid' ? 'Pago' :
    t.status === 'overdue' ? 'Vencido' : 'Cancelado',
    t.project?.name || '',
  ]);
  
  return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}

function generateResourcesCSV(materials: Material[]): string {
  const headers = [
    'Código',
    'Nome',
    'Categoria',
    'Unidade',
    'Custo Unitário',
    'Estoque Atual',
    'Estoque Mínimo',
    'Status Estoque',
    'Fornecedor',
  ];
  
  const rows = materials.map((m) => {
    const isLowStock = m.stockQuantity !== null && 
                       m.minStock !== null && 
                       m.stockQuantity < m.minStock;
    return [
      m.code,
      `"${m.name.replace(/"/g, '""')}"`,
      m.category || '',
      m.unit,
      m.unitCost.toFixed(2),
      m.stockQuantity?.toFixed(2) || '0',
      m.minStock?.toFixed(2) || '0',
      isLowStock ? 'Estoque Baixo' : 'Normal',
      m.supplier?.name || '',
    ];
  });
  
  return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}

function generateActivitiesCSV(logs: DailyLog[]): string {
  const headers = [
    'Data',
    'Projeto',
    'Tempo',
    'Trabalhadores',
    'Resumo',
    'Observações',
  ];
  
  const rows = logs.map((log) => [
    formatDate(log.date),
    log.project.name,
    log.weather === 'sunny' ? 'Ensolarado' :
    log.weather === 'cloudy' ? 'Nublado' :
    log.weather === 'rainy' ? 'Chuvoso' : 'Tempestade',
    log.workersCount?.toString() || '0',
    `"${log.summary.replace(/"/g, '""')}"`,
    log.observations ? `"${log.observations.replace(/"/g, '""')}"` : '',
  ]);
  
  return [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
}

// =============================================================================
// Download Function
// =============================================================================

function downloadCSV(csvContent: string, filename: string) {
  // Add BOM for Excel compatibility with UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export default function RelatoriosPage() {
  const { toast } = useToast();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [reportType, setReportType] = useState('projects');
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Fetch data
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-report'],
    queryFn: fetchProjects,
  });

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions-report'],
    queryFn: fetchTransactions,
  });

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard-report'],
    queryFn: fetchDashboard,
  });

  const { data: materialsData, isLoading: materialsLoading } = useQuery({
    queryKey: ['materials-report'],
    queryFn: fetchMaterials,
  });

  const { data: dailyLogsData, isLoading: dailyLogsLoading } = useQuery({
    queryKey: ['daily-logs-report'],
    queryFn: fetchDailyLogs,
  });

  const projects = projectsData?.data || [];
  const transactions = transactionsData?.data?.data || [];
  const dashboard = dashboardData?.data;
  const materials = materialsData?.data?.data || [];
  const dailyLogs = dailyLogsData?.data?.data || [];

  // =============================================================================
  // Filter Functions
  // =============================================================================

  const filterByDateRange = useCallback(<T extends { date?: string; startDate?: string }>(items: T[], dateField: keyof T = 'date'): T[] => {
    if (!dateFrom && !dateTo) return items;
    
    return items.filter((item) => {
      const itemDate = item[dateField] as string | undefined;
      if (!itemDate) return false;
      
      try {
        const date = parseISO(itemDate);
        
        if (dateFrom && dateTo) {
          return isWithinInterval(date, {
            start: startOfDay(parseISO(dateFrom)),
            end: endOfDay(parseISO(dateTo)),
          });
        }
        
        if (dateFrom) {
          return date >= startOfDay(parseISO(dateFrom));
        }
        
        if (dateTo) {
          return date <= endOfDay(parseISO(dateTo));
        }
        
        return true;
      } catch {
        return false;
      }
    });
  }, [dateFrom, dateTo]);

  const filterByProject = useCallback(<T extends { projectId?: string; project?: { id: string } }>(items: T[]): T[] => {
    if (selectedProject === 'all') return items;
    return items.filter((item) => {
      if (item.projectId) return item.projectId === selectedProject;
      if (item.project) return item.project.id === selectedProject;
      return false;
    });
  }, [selectedProject]);

  // =============================================================================
  // Filtered Data
  // =============================================================================

  const filteredProjects = useMemo(() => {
    let filtered = projects;
    
    // Filter by date range (using startDate)
    filtered = filterByDateRange(filtered, 'startDate');
    
    // Filter by project selection (for projects, this means filter by the project itself)
    if (selectedProject !== 'all') {
      filtered = filtered.filter((p) => p.id === selectedProject);
    }
    
    return filtered;
  }, [projects, dateFrom, dateTo, selectedProject, filterByDateRange]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    filtered = filterByDateRange(filtered, 'date');
    filtered = filterByProject(filtered);
    return filtered;
  }, [transactions, filterByDateRange, filterByProject]);

  const filteredDailyLogs = useMemo(() => {
    let filtered = dailyLogs;
    filtered = filterByDateRange(filtered, 'date');
    filtered = filterByProject(filtered);
    return filtered;
  }, [dailyLogs, filterByDateRange, filterByProject]);

  // =============================================================================
  // Process data for charts
  // =============================================================================

  const projectsByStatus = filteredProjects.reduce((acc, project) => {
    const status = project.status;
    if (!acc[status]) acc[status] = 0;
    acc[status]++;
    return acc;
  }, {} as Record<string, number>);

  const statusChartData = Object.entries(projectsByStatus).map(([status, count]) => ({
    name: status === 'active' ? 'Em Andamento' :
          status === 'planning' ? 'Planejamento' :
          status === 'completed' ? 'Concluído' :
          status === 'paused' ? 'Pausado' : 'Cancelado',
    value: count,
  }));

  const expensesByCategory = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      if (!acc[t.category]) acc[t.category] = 0;
      acc[t.category] += t.value;
      return acc;
    }, {} as Record<string, number>);

  const categoryChartData = Object.entries(expensesByCategory).map(([category, value]) => ({
    name: category === 'material' ? 'Material' :
          category === 'labor' ? 'Mão de Obra' :
          category === 'equipment' ? 'Equipamento' :
          category === 'service' ? 'Serviço' :
          category === 'tax' ? 'Imposto' :
          category === 'administrative' ? 'Administrativo' : 'Outros',
    value,
  }));

  // Monthly data for line chart
  const monthlyData = filteredTransactions.reduce((acc, t) => {
    const month = new Date(t.date).toLocaleDateString('pt-BR', { month: 'short' });
    if (!acc[month]) acc[month] = { month, receitas: 0, despesas: 0 };
    if (t.type === 'income') acc[month].receitas += t.value;
    else acc[month].despesas += t.value;
    return acc;
  }, {} as Record<string, { month: string; receitas: number; despesas: number }>);

  const monthlyChartData = Object.values(monthlyData).slice(-6);

  // =============================================================================
  // Export Handler
  // =============================================================================

  const handleExport = () => {
    let csvContent = '';
    let filename = '';
    const today = format(new Date(), 'yyyy-MM-dd');

    switch (reportType) {
      case 'projects':
        csvContent = generateProjectsCSV(filteredProjects);
        filename = `relatorio_projetos_${today}.csv`;
        break;
      case 'financial':
        csvContent = generateFinancialCSV(filteredTransactions);
        filename = `relatorio_financeiro_${today}.csv`;
        break;
      case 'resources':
        csvContent = generateResourcesCSV(materials);
        filename = `relatorio_recursos_${today}.csv`;
        break;
      case 'activities':
        csvContent = generateActivitiesCSV(filteredDailyLogs);
        filename = `relatorio_atividades_${today}.csv`;
        break;
    }

    if (csvContent) {
      downloadCSV(csvContent, filename);
      toast({
        title: 'Exportação concluída',
        description: `O arquivo ${filename} foi baixado com sucesso.`,
      });
    } else {
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o relatório.',
        variant: 'destructive',
      });
    }
  };

  // =============================================================================
  // PDF Export Handler
  // =============================================================================

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const params = new URLSearchParams();
      params.set('type', reportType);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (selectedProject !== 'all') params.set('projectId', selectedProject);

      const response = await fetch(`/api/relatorios/pdf?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Erro ao gerar PDF');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'PDF exportado com sucesso',
        description: 'O relatório em PDF foi baixado automaticamente.',
      });
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o relatório PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  // =============================================================================
  // Excel Export Handler
  // =============================================================================

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const params = new URLSearchParams();
      params.set('type', reportType);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      if (selectedProject !== 'all') params.set('projectId', selectedProject);

      const response = await fetch(`/api/relatorios/excel?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Erro ao gerar Excel');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Excel exportado com sucesso',
        description: 'O relatório em Excel foi baixado automaticamente.',
      });
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o relatório Excel.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingExcel(false);
    }
  };

  const isLoading = projectsLoading || transactionsLoading || dashboardLoading || materialsLoading || dailyLogsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">
          Visualize e exporte relatórios da sua construtora
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="projects">Projetos</SelectItem>
                  <SelectItem value="financial">Financeiro</SelectItem>
                  <SelectItem value="resources">Recursos</SelectItem>
                  <SelectItem value="activities">Atividades</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Projeto</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os projetos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {(dateFrom || dateTo || selectedProject !== 'all') && (
            <div className="mt-4 text-sm text-muted-foreground">
              Filtros ativos: 
              {dateFrom && ` De ${formatDate(dateFrom)}`}
              {dateTo && ` até ${formatDate(dateTo)}`}
              {selectedProject !== 'all' && ` | Projeto: ${projects.find(p => p.id === selectedProject)?.name}`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Report Sections */}
      {reportType === 'projects' && (
        <div className="space-y-6">
          {/* Projects Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Projetos</p>
                    <p className="text-2xl font-bold">{filteredProjects.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Em Andamento</p>
                    <p className="text-2xl font-bold">
                      {filteredProjects.filter(p => p.status === 'active').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900">
                    <FileText className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Concluídos</p>
                    <p className="text-2xl font-bold">
                      {filteredProjects.filter(p => p.status === 'completed').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                    <Calendar className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Total</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(filteredProjects.reduce((sum, p) => sum + p.estimatedValue, 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects Chart */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Projetos por Status
                </CardTitle>
                <CardDescription>Distribuição dos projetos por situação atual</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Progresso dos Projetos
                </CardTitle>
                <CardDescription>Progresso físico e financeiro</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredProjects.slice(0, 5).map(p => ({
                      name: p.name.substring(0, 15),
                      'Progresso Físico': p.physicalProgress,
                      'Progresso Financeiro': p.financialProgress,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="Progresso Físico" fill="#3b82f6" />
                      <Bar dataKey="Progresso Financeiro" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Export Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleExport} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
                <Button onClick={handleExportExcel} disabled={isExportingExcel} variant="secondary">
                  {isExportingExcel ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                  )}
                  Exportar Excel
                </Button>
                <Button onClick={handleExportPDF} disabled={isExportingPDF}>
                  {isExportingPDF ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Exportar PDF
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {filteredProjects.length} projeto(s) serão exportados
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'financial' && (
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Receitas</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(dashboard?.totalIncome || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Despesas</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(dashboard?.totalExpenses || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo</p>
                    <p className={`text-2xl font-bold ${(dashboard?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(dashboard?.balance || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                    <DollarSign className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">A Receber</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(dashboard?.pendingIncome || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Receitas vs Despesas
                </CardTitle>
                <CardDescription>Evolução mensal</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Line type="monotone" dataKey="receitas" stroke="#22c55e" name="Receitas" />
                      <Line type="monotone" dataKey="despesas" stroke="#ef4444" name="Despesas" />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Despesas por Categoria
                </CardTitle>
                <CardDescription>Distribuição de gastos</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Export Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleExport} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
                <Button onClick={handleExportExcel} disabled={isExportingExcel} variant="secondary">
                  {isExportingExcel ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                  )}
                  Exportar Excel
                </Button>
                <Button onClick={handleExportPDF} disabled={isExportingPDF}>
                  {isExportingPDF ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Exportar PDF
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {filteredTransactions.length} transação(ões) serão exportadas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'resources' && (
        <div className="space-y-6">
          {/* Resources Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Materiais</p>
                    <p className="text-2xl font-bold">{materials.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                    <Package className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Baixo</p>
                    <p className="text-2xl font-bold text-red-600">
                      {materials.filter(m => 
                        m.stockQuantity !== null && 
                        m.minStock !== null && 
                        m.stockQuantity < m.minStock
                      ).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                    <Package className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Estoque Normal</p>
                    <p className="text-2xl font-bold text-green-600">
                      {materials.filter(m => 
                        m.stockQuantity === null || 
                        m.minStock === null || 
                        m.stockQuantity >= m.minStock
                      ).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                    <DollarSign className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor em Estoque</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(
                        materials.reduce((sum, m) => 
                          sum + (m.unitCost * (m.stockQuantity || 0)), 0
                        )
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Relatório de Recursos
              </CardTitle>
              <CardDescription>
                Materiais, equipamentos e fornecedores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Este relatório apresenta informações sobre o estoque de materiais,
                utilização de equipamentos e desempenho dos fornecedores.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleExport} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
                <Button onClick={handleExportExcel} disabled={isExportingExcel} variant="secondary">
                  {isExportingExcel ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                  )}
                  Exportar Excel
                </Button>
                <Button onClick={handleExportPDF} disabled={isExportingPDF}>
                  {isExportingPDF ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Exportar PDF
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {materials.length} material(is) serão exportados
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'activities' && (
        <div className="space-y-6">
          {/* Activities Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                    <ClipboardList className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Registros</p>
                    <p className="text-2xl font-bold">{filteredDailyLogs.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                    <Calendar className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Dias Trabalhados</p>
                    <p className="text-2xl font-bold">
                      {new Set(filteredDailyLogs.map(l => l.date)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                    <ClipboardList className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Trabalhadores</p>
                    <p className="text-2xl font-bold">
                      {filteredDailyLogs.reduce((sum, l) => sum + (l.workersCount || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
                    <Building2 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Projetos Envolvidos</p>
                    <p className="text-2xl font-bold">
                      {new Set(filteredDailyLogs.map(l => l.project.id)).size}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Relatório de Atividades
              </CardTitle>
              <CardDescription>
                Registros do diário de obra e atividades realizadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Este relatório apresenta o histórico de atividades realizadas nos projetos,
                incluindo registros do diário de obra, equipes envolvidas e ocorrências.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleExport} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
                <Button onClick={handleExportExcel} disabled={isExportingExcel} variant="secondary">
                  {isExportingExcel ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                  )}
                  Exportar Excel
                </Button>
                <Button onClick={handleExportPDF} disabled={isExportingPDF}>
                  {isExportingPDF ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}
                  Exportar PDF
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {filteredDailyLogs.length} registro(s) serão exportados
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
