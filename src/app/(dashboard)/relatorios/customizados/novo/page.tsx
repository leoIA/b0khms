'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Save,
  Play,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Table2,
  BarChart3,
  PieChart,
  LayoutDashboard,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type {
  DataSource,
  ReportCategory,
  ReportType,
  FilterConfig,
  FilterOperator,
  SortConfig,
  ColumnConfig,
  ChartType,
} from '@/validators/reports'

// =============================================================================
// Constants
// =============================================================================

const DATA_SOURCES: { value: DataSource; label: string; icon: React.ReactNode }[] = [
  { value: 'projects', label: 'Projetos', icon: <Table2 className="h-4 w-4" /> },
  { value: 'budgets', label: 'Orçamentos', icon: <Table2 className="h-4 w-4" /> },
  { value: 'budget_items', label: 'Itens de Orçamento', icon: <Table2 className="h-4 w-4" /> },
  { value: 'transactions', label: 'Transações', icon: <Table2 className="h-4 w-4" /> },
  { value: 'daily_logs', label: 'Diário de Obra', icon: <Table2 className="h-4 w-4" /> },
  { value: 'medicoes', label: 'Medições', icon: <Table2 className="h-4 w-4" /> },
  { value: 'purchase_orders', label: 'Ordens de Compra', icon: <Table2 className="h-4 w-4" /> },
  { value: 'quotations', label: 'Cotações', icon: <Table2 className="h-4 w-4" /> },
  { value: 'clients', label: 'Clientes', icon: <Table2 className="h-4 w-4" /> },
  { value: 'suppliers', label: 'Fornecedores', icon: <Table2 className="h-4 w-4" /> },
  { value: 'materials', label: 'Materiais', icon: <Table2 className="h-4 w-4" /> },
  { value: 'compositions', label: 'Composições', icon: <Table2 className="h-4 w-4" /> },
  { value: 'schedules', label: 'Cronogramas', icon: <Table2 className="h-4 w-4" /> },
  { value: 'actual_costs', label: 'Custos Reais', icon: <Table2 className="h-4 w-4" /> },
]

const CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: 'general', label: 'Geral' },
  { value: 'financial', label: 'Financeiro' },
  { value: 'project', label: 'Projetos' },
  { value: 'operational', label: 'Operacional' },
  { value: 'custom', label: 'Personalizado' },
]

const REPORT_TYPES: { value: ReportType; label: string; icon: React.ReactNode }[] = [
  { value: 'table', label: 'Tabela', icon: <Table2 className="h-4 w-4" /> },
  { value: 'chart', label: 'Gráfico', icon: <BarChart3 className="h-4 w-4" /> },
  { value: 'pivot', label: 'Tabela Dinâmica', icon: <PieChart className="h-4 w-4" /> },
  { value: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
]

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'bar', label: 'Barras' },
  { value: 'line', label: 'Linhas' },
  { value: 'pie', label: 'Pizza' },
  { value: 'donut', label: 'Rosca' },
  { value: 'area', label: 'Área' },
  { value: 'scatter', label: 'Dispersão' },
]

const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'eq', label: 'Igual a' },
  { value: 'ne', label: 'Diferente de' },
  { value: 'gt', label: 'Maior que' },
  { value: 'gte', label: 'Maior ou igual a' },
  { value: 'lt', label: 'Menor que' },
  { value: 'lte', label: 'Menor ou igual a' },
  { value: 'contains', label: 'Contém' },
  { value: 'starts_with', label: 'Começa com' },
  { value: 'ends_with', label: 'Termina com' },
  { value: 'in', label: 'Está em' },
  { value: 'not_in', label: 'Não está em' },
  { value: 'between', label: 'Entre' },
  { value: 'is_null', label: 'É nulo' },
  { value: 'is_not_null', label: 'Não é nulo' },
]

// Campos disponíveis por data source
const DATA_SOURCE_FIELDS: Record<DataSource, { field: string; label: string; type: string }[]> = {
  projects: [
    { field: 'name', label: 'Nome', type: 'text' },
    { field: 'code', label: 'Código', type: 'text' },
    { field: 'status', label: 'Status', type: 'text' },
    { field: 'estimatedValue', label: 'Valor Estimado', type: 'number' },
    { field: 'actualValue', label: 'Valor Real', type: 'number' },
    { field: 'physicalProgress', label: 'Progresso Físico', type: 'number' },
    { field: 'financialProgress', label: 'Progresso Financeiro', type: 'number' },
    { field: 'startDate', label: 'Data Início', type: 'date' },
    { field: 'endDate', label: 'Data Fim', type: 'date' },
    { field: 'createdAt', label: 'Criado em', type: 'date' },
  ],
  budgets: [
    { field: 'name', label: 'Nome', type: 'text' },
    { field: 'code', label: 'Código', type: 'text' },
    { field: 'status', label: 'Status', type: 'text' },
    { field: 'totalValue', label: 'Valor Total', type: 'number' },
    { field: 'discount', label: 'Desconto', type: 'number' },
    { field: 'validUntil', label: 'Válido Até', type: 'date' },
    { field: 'createdAt', label: 'Criado em', type: 'date' },
  ],
  budget_items: [
    { field: 'description', label: 'Descrição', type: 'text' },
    { field: 'unit', label: 'Unidade', type: 'text' },
    { field: 'quantity', label: 'Quantidade', type: 'number' },
    { field: 'unitPrice', label: 'Preço Unitário', type: 'number' },
    { field: 'totalPrice', label: 'Preço Total', type: 'number' },
  ],
  transactions: [
    { field: 'type', label: 'Tipo', type: 'text' },
    { field: 'category', label: 'Categoria', type: 'text' },
    { field: 'description', label: 'Descrição', type: 'text' },
    { field: 'value', label: 'Valor', type: 'number' },
    { field: 'date', label: 'Data', type: 'date' },
    { field: 'dueDate', label: 'Vencimento', type: 'date' },
    { field: 'status', label: 'Status', type: 'text' },
  ],
  daily_logs: [
    { field: 'date', label: 'Data', type: 'date' },
    { field: 'weather', label: 'Clima', type: 'text' },
    { field: 'summary', label: 'Resumo', type: 'text' },
    { field: 'workersCount', label: 'Qtd. Trabalhadores', type: 'number' },
    { field: 'createdAt', label: 'Criado em', type: 'date' },
  ],
  medicoes: [
    { field: 'numero', label: 'Número', type: 'number' },
    { field: 'dataInicio', label: 'Data Início', type: 'date' },
    { field: 'dataFim', label: 'Data Fim', type: 'date' },
    { field: 'valorTotal', label: 'Valor Total', type: 'number' },
    { field: 'status', label: 'Status', type: 'text' },
  ],
  purchase_orders: [
    { field: 'numero', label: 'Número', type: 'text' },
    { field: 'dataEmissao', label: 'Data Emissão', type: 'date' },
    { field: 'dataEntrega', label: 'Data Entrega', type: 'date' },
    { field: 'valorTotal', label: 'Valor Total', type: 'number' },
    { field: 'status', label: 'Status', type: 'text' },
  ],
  quotations: [
    { field: 'name', label: 'Nome', type: 'text' },
    { field: 'code', label: 'Código', type: 'text' },
    { field: 'status', label: 'Status', type: 'text' },
    { field: 'deadline', label: 'Prazo', type: 'date' },
  ],
  clients: [
    { field: 'name', label: 'Nome', type: 'text' },
    { field: 'email', label: 'Email', type: 'text' },
    { field: 'phone', label: 'Telefone', type: 'text' },
    { field: 'cpfCnpj', label: 'CPF/CNPJ', type: 'text' },
    { field: 'city', label: 'Cidade', type: 'text' },
    { field: 'state', label: 'Estado', type: 'text' },
    { field: 'status', label: 'Status', type: 'text' },
  ],
  suppliers: [
    { field: 'name', label: 'Nome', type: 'text' },
    { field: 'tradeName', label: 'Nome Fantasia', type: 'text' },
    { field: 'cnpj', label: 'CNPJ', type: 'text' },
    { field: 'email', label: 'Email', type: 'text' },
    { field: 'phone', label: 'Telefone', type: 'text' },
    { field: 'category', label: 'Categoria', type: 'text' },
    { field: 'status', label: 'Status', type: 'text' },
  ],
  materials: [
    { field: 'code', label: 'Código', type: 'text' },
    { field: 'name', label: 'Nome', type: 'text' },
    { field: 'unit', label: 'Unidade', type: 'text' },
    { field: 'unitCost', label: 'Custo Unitário', type: 'number' },
    { field: 'stockQuantity', label: 'Qtd. Estoque', type: 'number' },
    { field: 'category', label: 'Categoria', type: 'text' },
  ],
  compositions: [
    { field: 'code', label: 'Código', type: 'text' },
    { field: 'name', label: 'Nome', type: 'text' },
    { field: 'unit', label: 'Unidade', type: 'text' },
    { field: 'totalCost', label: 'Custo Total', type: 'number' },
    { field: 'totalPrice', label: 'Preço Total', type: 'number' },
    { field: 'profitMargin', label: 'Margem de Lucro', type: 'number' },
  ],
  schedules: [
    { field: 'name', label: 'Nome', type: 'text' },
    { field: 'status', label: 'Status', type: 'text' },
    { field: 'progress', label: 'Progresso', type: 'number' },
    { field: 'startDate', label: 'Data Início', type: 'date' },
    { field: 'endDate', label: 'Data Fim', type: 'date' },
  ],
  actual_costs: [
    { field: 'description', label: 'Descrição', type: 'text' },
    { field: 'value', label: 'Valor', type: 'number' },
    { field: 'date', label: 'Data', type: 'date' },
    { field: 'category', label: 'Categoria', type: 'text' },
  ],
}

// =============================================================================
// Component
// =============================================================================

export default function NovoRelatorioPage() {
  const router = useRouter()
  const { toast } = useToast()

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ReportCategory>('general')
  const [type, setType] = useState<ReportType>('table')
  const [dataSource, setDataSource] = useState<DataSource | ''>('')
  const [isPublic, setIsPublic] = useState(false)
  const [cacheEnabled, setCacheEnabled] = useState(true)
  const [cacheDuration, setCacheDuration] = useState(300)

  // Query config state
  const [filters, setFilters] = useState<FilterConfig[]>([])
  const [sorts, setSorts] = useState<SortConfig[]>([])
  const [limit, setLimit] = useState(1000)

  // Chart config state
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [chartXAxis, setChartXAxis] = useState('')
  const [chartYAxis, setChartYAxis] = useState<string[]>([])
  const [showLegend, setShowLegend] = useState(true)

  // Column config state
  const [columns, setColumns] = useState<ColumnConfig[]>([])

  // Get available fields for selected data source
  const availableFields = useMemo(() => {
    if (!dataSource) return []
    return DATA_SOURCE_FIELDS[dataSource] || []
  }, [dataSource])

  // Update columns when data source changes
  const handleDataSourceChange = (value: DataSource) => {
    setDataSource(value)
    const fields = DATA_SOURCE_FIELDS[value] || []
    setColumns(fields.map(f => ({
      field: f.field,
      label: f.label,
      visible: true,
      format: f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text',
    })))
    setFilters([])
    setSorts([])
    setChartXAxis('')
    setChartYAxis([])
  }

  // Add filter
  const addFilter = () => {
    if (!dataSource) return
    const firstField = availableFields[0]?.field || ''
    setFilters([...filters, {
      field: firstField,
      operator: 'eq',
      value: '',
    }])
  }

  // Update filter
  const updateFilter = (index: number, updates: Partial<FilterConfig>) => {
    const newFilters = [...filters]
    newFilters[index] = { ...newFilters[index], ...updates }
    setFilters(newFilters)
  }

  // Remove filter
  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index))
  }

  // Add sort
  const addSort = () => {
    if (!dataSource) return
    const firstField = availableFields[0]?.field || ''
    setSorts([...sorts, { field: firstField, direction: 'asc' }])
  }

  // Update sort
  const updateSort = (index: number, updates: Partial<SortConfig>) => {
    const newSorts = [...sorts]
    newSorts[index] = { ...newSorts[index], ...updates }
    setSorts(newSorts)
  }

  // Remove sort
  const removeSort = (index: number) => {
    setSorts(sorts.filter((_, i) => i !== index))
  }

  // Move sort up/down
  const moveSort = (index: number, direction: 'up' | 'down') => {
    const newSorts = [...sorts]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newSorts.length) return
    ;[newSorts[index], newSorts[newIndex]] = [newSorts[newIndex], newSorts[index]]
    setSorts(newSorts)
  }

  // Create report mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/relatorios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          category,
          type,
          dataSource,
          queryConfig: {
            filters: filters.length > 0 ? filters : undefined,
            sort: sorts.length > 0 ? sorts : undefined,
            limit,
          },
          columnConfig: columns.length > 0 ? columns : undefined,
          chartConfig: type === 'chart' ? {
            type: chartType,
            xAxis: chartXAxis,
            yAxis: chartYAxis,
            showLegend,
          } : undefined,
          isPublic,
          cacheEnabled,
          cacheDuration,
        }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar relatório')
      }
      return response.json()
    },
    onSuccess: (report) => {
      toast({
        title: 'Relatório criado',
        description: `O relatório "${report.name}" foi criado com sucesso.`,
      })
      router.push(`/relatorios/customizados/${report.id}`)
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar relatório',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  // Handle save
  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe um nome para o relatório.',
        variant: 'destructive',
      })
      return
    }
    if (!dataSource) {
      toast({
        title: 'Fonte de dados obrigatória',
        description: 'Selecione uma fonte de dados.',
        variant: 'destructive',
      })
      return
    }
    createMutation.mutate()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Novo Relatório</h1>
            <p className="text-muted-foreground">
              Crie um relatório customizado para sua empresa
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>
                Defina o nome e categoria do relatório
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Relatório de Custos por Projeto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o objetivo deste relatório..."
                  rows={3}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as ReportCategory)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Relatório</Label>
                  <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <div className="flex items-center gap-2">
                            {t.icon}
                            {t.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Source */}
          <Card>
            <CardHeader>
              <CardTitle>Fonte de Dados</CardTitle>
              <CardDescription>
                Selecione a origem dos dados do relatório
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={dataSource} onValueChange={handleDataSourceChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fonte de dados..." />
                </SelectTrigger>
                <SelectContent>
                  {DATA_SOURCES.map((ds) => (
                    <SelectItem key={ds.value} value={ds.value}>
                      <div className="flex items-center gap-2">
                        {ds.icon}
                        {ds.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Query Builder */}
          {dataSource && (
            <Card>
              <CardHeader>
                <CardTitle>Configuração da Consulta</CardTitle>
                <CardDescription>
                  Defina filtros e ordenação dos dados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="filters">
                  <TabsList>
                    <TabsTrigger value="filters">Filtros</TabsTrigger>
                    <TabsTrigger value="sort">Ordenação</TabsTrigger>
                    <TabsTrigger value="columns">Colunas</TabsTrigger>
                    {type === 'chart' && (
                      <TabsTrigger value="chart">Gráfico</TabsTrigger>
                    )}
                  </TabsList>

                  {/* Filters Tab */}
                  <TabsContent value="filters" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Adicione filtros para refinar os dados
                      </p>
                      <Button size="sm" variant="outline" onClick={addFilter}>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Filtro
                      </Button>
                    </div>
                    {filters.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg">
                        Nenhum filtro configurado
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filters.map((filter, index) => (
                          <div key={index} className="flex items-end gap-2 p-3 border rounded-lg">
                            <div className="flex-1 grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Campo</Label>
                                <Select
                                  value={filter.field}
                                  onValueChange={(v) => updateFilter(index, { field: v })}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableFields.map((f) => (
                                      <SelectItem key={f.field} value={f.field}>
                                        {f.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Operador</Label>
                                <Select
                                  value={filter.operator}
                                  onValueChange={(v) => updateFilter(index, { operator: v as FilterOperator })}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {FILTER_OPERATORS.map((op) => (
                                      <SelectItem key={op.value} value={op.value}>
                                        {op.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Valor</Label>
                                <Input
                                  className="h-8"
                                  value={String(filter.value)}
                                  onChange={(e) => updateFilter(index, { value: e.target.value })}
                                  disabled={filter.operator === 'is_null' || filter.operator === 'is_not_null'}
                                />
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeFilter(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Sort Tab */}
                  <TabsContent value="sort" className="space-y-4 mt-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Defina a ordem dos resultados
                      </p>
                      <Button size="sm" variant="outline" onClick={addSort}>
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar Ordenação
                      </Button>
                    </div>
                    {sorts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg">
                        Nenhuma ordenação configurada
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sorts.map((sort, index) => (
                          <div key={index} className="flex items-end gap-2 p-3 border rounded-lg">
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => moveSort(index, 'up')}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => moveSort(index, 'down')}
                                disabled={index === sorts.length - 1}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex-1 grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="text-xs">Campo</Label>
                                <Select
                                  value={sort.field}
                                  onValueChange={(v) => updateSort(index, { field: v })}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableFields.map((f) => (
                                      <SelectItem key={f.field} value={f.field}>
                                        {f.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Direção</Label>
                                <Select
                                  value={sort.direction}
                                  onValueChange={(v) => updateSort(index, { direction: v as 'asc' | 'desc' })}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="asc">Crescente</SelectItem>
                                    <SelectItem value="desc">Decrescente</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => removeSort(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="space-y-2 pt-4">
                      <Label>Limite de registros</Label>
                      <Input
                        type="number"
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        min={1}
                        max={10000}
                        className="w-32"
                      />
                    </div>
                  </TabsContent>

                  {/* Columns Tab */}
                  <TabsContent value="columns" className="space-y-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      Configure as colunas que serão exibidas
                    </p>
                    <div className="border rounded-lg divide-y">
                      {columns.map((col, index) => (
                        <div key={col.field} className="flex items-center gap-4 p-3">
                          <Switch
                            checked={col.visible}
                            onCheckedChange={(checked) => {
                              const newCols = [...columns]
                              newCols[index] = { ...col, visible: checked }
                              setColumns(newCols)
                            }}
                          />
                          <div className="flex-1">
                            <p className="font-medium">{col.label || col.field}</p>
                            <p className="text-sm text-muted-foreground">{col.field}</p>
                          </div>
                          <Select
                            value={col.format || 'text'}
                            onValueChange={(v) => {
                              const newCols = [...columns]
                              newCols[index] = { ...col, format: v as ColumnConfig['format'] }
                              setColumns(newCols)
                            }}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Texto</SelectItem>
                              <SelectItem value="number">Número</SelectItem>
                              <SelectItem value="currency">Moeda</SelectItem>
                              <SelectItem value="date">Data</SelectItem>
                              <SelectItem value="datetime">Data/Hora</SelectItem>
                              <SelectItem value="percent">Porcentagem</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Chart Tab */}
                  {type === 'chart' && (
                    <TabsContent value="chart" className="space-y-4 mt-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Tipo de Gráfico</Label>
                          <Select value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CHART_TYPES.map((ct) => (
                                <SelectItem key={ct.value} value={ct.value}>
                                  {ct.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Eixo X</Label>
                          <Select value={chartXAxis} onValueChange={setChartXAxis}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableFields.map((f) => (
                                <SelectItem key={f.field} value={f.field}>
                                  {f.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Eixo Y (valores)</Label>
                        <div className="flex flex-wrap gap-2">
                          {availableFields
                            .filter(f => f.type === 'number')
                            .map((f) => (
                              <Badge
                                key={f.field}
                                variant={chartYAxis.includes(f.field) ? 'default' : 'outline'}
                                className="cursor-pointer"
                                onClick={() => {
                                  if (chartYAxis.includes(f.field)) {
                                    setChartYAxis(chartYAxis.filter(y => y !== f.field))
                                  } else {
                                    setChartYAxis([...chartYAxis, f.field])
                                  }
                                }}
                              >
                                {f.label}
                              </Badge>
                            ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={showLegend}
                          onCheckedChange={setShowLegend}
                        />
                        <Label>Exibir legenda</Label>
                      </div>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Options */}
          <Card>
            <CardHeader>
              <CardTitle>Opções</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Relatório Público</Label>
                  <p className="text-sm text-muted-foreground">
                    Visível para todos da empresa
                  </p>
                </div>
                <Switch checked={isPublic} onCheckedChange={setIsPublic} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Habilitar Cache</Label>
                  <p className="text-sm text-muted-foreground">
                    Armazena resultados em cache
                  </p>
                </div>
                <Switch checked={cacheEnabled} onCheckedChange={setCacheEnabled} />
              </div>
              {cacheEnabled && (
                <div className="space-y-2">
                  <Label>Duração do Cache (segundos)</Label>
                  <Input
                    type="number"
                    value={cacheDuration}
                    onChange={(e) => setCacheDuration(Number(e.target.value))}
                    min={60}
                    max={86400}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Nome</span>
                <span className="font-medium">{name || '-'}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Categoria</span>
                <Badge variant="outline">
                  {CATEGORIES.find(c => c.value === category)?.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tipo</span>
                <div className="flex items-center gap-2">
                  {REPORT_TYPES.find(t => t.value === type)?.icon}
                  <span>{REPORT_TYPES.find(t => t.value === type)?.label}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fonte de Dados</span>
                <span className="font-medium">
                  {DATA_SOURCES.find(ds => ds.value === dataSource)?.label || '-'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Filtros</span>
                <span className="font-medium">{filters.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ordenação</span>
                <span className="font-medium">{sorts.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Limite</span>
                <span className="font-medium">{limit} registros</span>
              </div>
            </CardContent>
          </Card>

          {/* Validation */}
          {(!name || !dataSource) && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 text-amber-800">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-medium">Preencha os campos obrigatórios</p>
                    <ul className="text-sm list-disc list-inside">
                      {!name && <li>Nome do relatório</li>}
                      {!dataSource && <li>Fonte de dados</li>}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
