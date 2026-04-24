'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  ScatterChart as RechartsScatterChart,
  Scatter,
  ZAxis,
  RadarChart as RechartsRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts'
import {
  GaugeChart,
  RadarChart,
  ScatterChart,
} from '@/components/charts'
import {
  ArrowLeft,
  Play,
  Pencil,
  Calendar,
  Copy,
  Trash2,
  Download,
  MoreHorizontal,
  RefreshCw,
  Clock,
  Users,
  FileText,
  BarChart3,
  PieChart,
  Table2,
  LayoutDashboard,
  Loader2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format as formatDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatCurrency } from '@/lib/api'

// Types
interface CustomReport {
  id: string
  name: string
  description: string | null
  category: string
  type: string
  dataSource: string
  queryConfig: {
    filters?: Array<{ field: string; operator: string; value: unknown }>
    sort?: Array<{ field: string; direction: string }>
    limit?: number
  }
  columnConfig?: Array<{
    field: string
    label?: string
    visible: boolean
    format?: string
  }>
  chartConfig?: {
    type: string
    xAxis?: string
    yAxis?: string[]
    showLegend?: boolean
  }
  isPublic: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
  users: {
    id: string
    name: string
    email: string
  }
  report_schedules?: Array<{
    id: string
    name: string
    frequency: string
    isActive: boolean
  }>
  report_executions?: Array<{
    id: string
    status: string
    recordCount: number
    createdAt: string
    users?: { name: string }
  }>
}

interface ExecutionResult {
  data: Record<string, unknown>[]
  total: number
  aggregations?: Record<string, number>
}

// Labels
const categoryLabels: Record<string, string> = {
  general: 'Geral',
  financial: 'Financeiro',
  project: 'Projetos',
  operational: 'Operacional',
  custom: 'Personalizado',
}

const typeIcons: Record<string, React.ReactNode> = {
  table: <Table2 className="h-4 w-4" />,
  chart: <BarChart3 className="h-4 w-4" />,
  pivot: <PieChart className="h-4 w-4" />,
  dashboard: <LayoutDashboard className="h-4 w-4" />,
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

// Fetch functions
async function fetchReport(id: string): Promise<CustomReport> {
  const response = await fetch(`/api/relatorios/${id}`)
  if (!response.ok) throw new Error('Erro ao carregar relatório')
  return response.json()
}

async function executeReport(id: string): Promise<ExecutionResult> {
  const response = await fetch(`/api/relatorios/${id}/executar`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Erro ao executar relatório')
  return response.json()
}

async function deleteReport(id: string): Promise<void> {
  const response = await fetch(`/api/relatorios/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao excluir relatório')
  }
}

async function duplicateReport(id: string): Promise<CustomReport> {
  const response = await fetch(`/api/relatorios/${id}/duplicar`, {
    method: 'POST',
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Erro ao duplicar relatório')
  }
  return response.json()
}

export default function RelatorioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const reportId = params.id as string

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [executionData, setExecutionData] = useState<ExecutionResult | null>(null)

  // Fetch report
  const { data: report, isLoading, error } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => fetchReport(reportId),
  })

  // Execute report mutation
  const executeMutation = useMutation({
    mutationFn: () => executeReport(reportId),
    onSuccess: (result) => {
      setExecutionData(result)
      toast({
        title: 'Relatório executado',
        description: `${result.total} registro(s) encontrado(s)`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao executar',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteReport(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] })
      toast({
        title: 'Relatório excluído',
        description: 'O relatório foi excluído com sucesso.',
      })
      router.push('/relatorios/customizados')
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: () => duplicateReport(reportId),
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] })
      toast({
        title: 'Relatório duplicado',
        description: `O relatório "${newReport.name}" foi criado.`,
      })
      router.push(`/relatorios/customizados/${newReport.id}`)
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao duplicar',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Auto-execute on load
  useEffect(() => {
    if (report && !executionData && !executeMutation.isPending) {
      executeMutation.mutate()
    }
  }, [report])

  // Format value based on type
  const formatValue = (value: unknown, format?: string): string => {
    if (value === null || value === undefined) return '-'
    
    switch (format) {
      case 'currency':
        return formatCurrency(Number(value))
      case 'number':
        return Number(value).toLocaleString('pt-BR')
      case 'percent':
        return `${Number(value).toFixed(1)}%`
      case 'date':
        return formatDate(new Date(String(value)), 'dd/MM/yyyy', { locale: ptBR })
      case 'datetime':
        return formatDate(new Date(String(value)), 'dd/MM/yyyy HH:mm', { locale: ptBR })
      default:
        return String(value)
    }
  }

  // Export to CSV
  const exportToCSV = () => {
    if (!executionData || !report) return
    
    const columns = report.columnConfig?.filter(c => c.visible) || 
      Object.keys(executionData.data[0] || {}).map(field => ({ field, visible: true }))
    
    const headers = columns.map(c => c.label || c.field)
    const rows = executionData.data.map(row => 
      columns.map(c => formatValue(row[c.field], c.format))
    )
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${report.name.replace(/\s+/g, '_')}_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !report) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Erro ao carregar relatório. Tente novamente.</p>
          <Button className="mt-4" onClick={() => router.push('/relatorios/customizados')}>
            Voltar para lista
          </Button>
        </CardContent>
      </Card>
    )
  }

  const visibleColumns = report.columnConfig?.filter(c => c.visible) || []

  // Chart configuration
  const chartConfig: ChartConfig = {}
  if (report.chartConfig?.yAxis) {
    report.chartConfig.yAxis.forEach((field, i) => {
      chartConfig[field] = {
        label: field,
        color: COLORS[i % COLORS.length],
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/relatorios/customizados">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{report.name}</h1>
              {report.isDefault && (
                <Badge variant="secondary">Padrão</Badge>
              )}
              {report.isPublic && (
                <Badge variant="outline">Público</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {report.description || 'Sem descrição'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => executeMutation.mutate()}
            disabled={executeMutation.isPending}
          >
            {executeMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Atualizar
          </Button>
          <Button variant="outline" onClick={exportToCSV} disabled={!executionData}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/relatorios/customizados/${report.id}/editar`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/relatorios/customizados/${report.id}/agendamentos`}>
                  <Calendar className="mr-2 h-4 w-4" />
                  Agendamentos
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => duplicateMutation.mutate()}
                disabled={duplicateMutation.isPending}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {typeIcons[report.type]}
                <span className="ml-2">
                  {report.type === 'table' ? 'Tabela' : report.type === 'chart' ? 'Gráfico' : report.type}
                </span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Tipo</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{report.users.name}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Criado por</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {formatDate(new Date(report.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Criado em</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {executionData?.total ?? 0} registros
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">Total</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {typeIcons[report.type]}
            Resultados
          </CardTitle>
          <CardDescription>
            Categoria: {categoryLabels[report.category] || report.category}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {executeMutation.isPending ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : executionData?.data && executionData.data.length > 0 ? (
            report.type === 'chart' && report.chartConfig ? (
              // Chart View
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {report.chartConfig.type === 'bar' ? (
                    <BarChart data={executionData.data.slice(0, 20)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey={report.chartConfig.xAxis} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {report.chartConfig.showLegend && (
                        <ChartLegend content={<ChartLegendContent />} />
                      )}
                      {report.chartConfig.yAxis?.map((field, i) => (
                        <Bar 
                          key={field}
                          dataKey={field} 
                          fill={COLORS[i % COLORS.length]} 
                          radius={[4, 4, 0, 0]} 
                        />
                      ))}
                    </BarChart>
                  ) : report.chartConfig.type === 'line' ? (
                    <LineChart data={executionData.data.slice(0, 20)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey={report.chartConfig.xAxis} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {report.chartConfig.showLegend && (
                        <ChartLegend content={<ChartLegendContent />} />
                      )}
                      {report.chartConfig.yAxis?.map((field, i) => (
                        <Line 
                          key={field}
                          dataKey={field} 
                          stroke={COLORS[i % COLORS.length]} 
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  ) : report.chartConfig.type === 'area' ? (
                    <AreaChart data={executionData.data.slice(0, 20)}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey={report.chartConfig.xAxis} 
                        tickLine={false} 
                        axisLine={false} 
                      />
                      <YAxis tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {report.chartConfig.showLegend && (
                        <ChartLegend content={<ChartLegendContent />} />
                      )}
                      {report.chartConfig.yAxis?.map((field, i) => (
                        <Area 
                          key={field}
                          dataKey={field} 
                          fill={COLORS[i % COLORS.length]}
                          fillOpacity={0.3}
                          stroke={COLORS[i % COLORS.length]} 
                        />
                      ))}
                    </AreaChart>
                  ) : (report.chartConfig.type === 'pie' || report.chartConfig.type === 'donut') ? (
                    <RechartsPieChart>
                      <Pie
                        data={executionData.data.slice(0, 10).map((item, i) => ({
                          name: String(item[report.chartConfig!.xAxis || 'name']),
                          value: Number(item[report.chartConfig!.yAxis?.[0] || 'value']) || 0,
                          fill: COLORS[i % COLORS.length],
                        }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={report.chartConfig.type === 'donut' ? 60 : 0}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {executionData.data.slice(0, 10).map((_, i) => (
                          <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RechartsPieChart>
                  ) : report.chartConfig.type === 'scatter' ? (
                    <RechartsScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        dataKey={report.chartConfig.xAxis || 'x'} 
                        name={report.chartConfig.xAxis || 'X'}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis 
                        type="number" 
                        dataKey={report.chartConfig.yAxis?.[0] || 'y'} 
                        name={report.chartConfig.yAxis?.[0] || 'Y'}
                        tick={{ fontSize: 11 }}
                      />
                      <ZAxis type="number" range={[50, 400]} />
                      <ChartTooltip cursor={{ strokeDasharray: "3 3" }} />
                      <Scatter 
                        name="Dados" 
                        data={executionData.data.slice(0, 100)} 
                        fill={COLORS[0]}
                      />
                      {report.chartConfig.showLegend && (
                        <ChartLegend content={<ChartLegendContent />} />
                      )}
                    </RechartsScatterChart>
                  ) : report.chartConfig.type === 'radar' ? (
                    <RechartsRadarChart 
                      cx="50%" 
                      cy="50%" 
                      outerRadius="70%" 
                      data={executionData.data.slice(0, 12)}
                    >
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis 
                        dataKey={report.chartConfig.xAxis || 'category'} 
                        tick={{ fontSize: 11, fill: "#64748b" }}
                      />
                      <PolarRadiusAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      {report.chartConfig.yAxis?.map((field, i) => (
                        <Radar
                          key={field}
                          name={field}
                          dataKey={field}
                          stroke={COLORS[i % COLORS.length]}
                          fill={COLORS[i % COLORS.length]}
                          fillOpacity={0.3}
                        />
                      ))}
                      <ChartTooltip />
                      {report.chartConfig.showLegend && (
                        <ChartLegend content={<ChartLegendContent />} />
                      )}
                    </RechartsRadarChart>
                  ) : report.chartConfig.type === 'gauge' ? (
                    <div className="flex flex-wrap justify-center gap-4">
                      {executionData.data.slice(0, 4).map((item, i) => {
                        const value = Number(item[report.chartConfig!.yAxis?.[0] || 'value']) || 0
                        const maxValue = Math.max(...executionData.data.slice(0, 20).map(d => 
                          Number(d[report.chartConfig!.yAxis?.[0] || 'value']) || 0
                        ))
                        return (
                          <GaugeChart
                            key={i}
                            value={value}
                            max={maxValue > 0 ? maxValue : 100}
                            title={String(item[report.chartConfig!.xAxis || 'name'])}
                            size={150}
                            thresholds={{
                              low: { value: 33, color: "#ef4444" },
                              medium: { value: 66, color: "#f59e0b" },
                              high: { value: 100, color: "#22c55e" },
                            }}
                          />
                        )
                      })}
                    </div>
                  ) : (
                    <BarChart data={executionData.data.slice(0, 20)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey={report.chartConfig.xAxis} />
                      <YAxis />
                      <ChartTooltip />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            ) : (
              // Table View
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.length > 0 ? (
                        visibleColumns.map((col) => (
                          <TableHead key={col.field}>
                            {col.label || col.field}
                          </TableHead>
                        ))
                      ) : (
                        Object.keys(executionData.data[0]).map((key) => (
                          <TableHead key={key}>{key}</TableHead>
                        ))
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {executionData.data.slice(0, 100).map((row, i) => (
                      <TableRow key={i}>
                        {visibleColumns.length > 0 ? (
                          visibleColumns.map((col) => (
                            <TableCell key={col.field}>
                              {formatValue(row[col.field], col.format)}
                            </TableCell>
                          ))
                        ) : (
                          Object.entries(row).map(([key, value]) => (
                            <TableCell key={key}>
                              {formatValue(value)}
                            </TableCell>
                          ))
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {executionData.total > 100 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Mostrando 100 de {executionData.total} registros
                  </p>
                )}
              </div>
            )
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum dado encontrado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Executions */}
      {report.report_executions && report.report_executions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Execuções Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.report_executions.slice(0, 5).map((exec) => (
                <div key={exec.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant={exec.status === 'completed' ? 'default' : 'destructive'}>
                      {exec.status === 'completed' ? 'Concluído' : 'Erro'}
                    </Badge>
                    <span className="text-sm">
                      {exec.recordCount} registros
                    </span>
                    {exec.users && (
                      <span className="text-sm text-muted-foreground">
                        por {exec.users.name}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(new Date(exec.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O relatório &quot;{report.name}&quot;
              será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
