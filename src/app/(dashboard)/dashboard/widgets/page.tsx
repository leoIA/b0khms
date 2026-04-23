'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  LayoutDashboard,
  Settings,
  Trash2,
  RefreshCw,
  Gauge,
  LineChart,
  BarChart3,
  PieChart,
  Table2,
  Activity,
  TrendingUp,
  Radar,
  ScatterChart as ScatterIcon,
} from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// Types
interface DashboardWidget {
  id: string
  name: string
  type: 'kpi' | 'chart' | 'table' | 'gauge' | 'progress' | 'radar' | 'scatter' | 'custom'
  dataSource: string
  queryConfig: Record<string, unknown>
  displayConfig?: {
    colors?: string[]
    thresholds?: Array<{ value: number; color: string; label?: string }>
    format?: 'text' | 'number' | 'currency' | 'date' | 'datetime' | 'percent'
    prefix?: string
    suffix?: string
    decimals?: number
    showTrend?: boolean
    comparisonPeriod?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  }
  position: { x: number; y: number; w: number; h: number }
  order: number
  refreshInterval?: number
  lastRefreshedAt?: string
  createdAt: string
}

// Widget type configuration
const widgetTypes = [
  { value: 'kpi', label: 'KPI', icon: TrendingUp, description: 'Indicador chave de performance' },
  { value: 'chart', label: 'Gráfico', icon: BarChart3, description: 'Gráficos de barras, linhas, pizza' },
  { value: 'table', label: 'Tabela', icon: Table2, description: 'Dados em formato tabular' },
  { value: 'gauge', label: 'Gauge', icon: Gauge, description: 'Medidor circular de progresso' },
  { value: 'progress', label: 'Progresso', icon: Activity, description: 'Barra de progresso' },
  { value: 'radar', label: 'Radar', icon: Radar, description: 'Gráfico de aranha para múltiplas dimensões' },
  { value: 'scatter', label: 'Dispersão', icon: ScatterIcon, description: 'Gráfico de dispersão para correlações' },
] as const

const dataSources = [
  { value: 'projects', label: 'Projetos' },
  { value: 'budgets', label: 'Orçamentos' },
  { value: 'transactions', label: 'Transações' },
  { value: 'daily_logs', label: 'Diário de Obra' },
  { value: 'medicoes', label: 'Medições' },
  { value: 'purchase_orders', label: 'Ordens de Compra' },
  { value: 'clients', label: 'Clientes' },
  { value: 'suppliers', label: 'Fornecedores' },
] as const

// Form schema
const widgetFormSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  type: z.enum(['kpi', 'chart', 'table', 'gauge', 'progress', 'radar', 'scatter', 'custom']),
  dataSource: z.enum(['projects', 'budgets', 'transactions', 'daily_logs', 'medicoes', 'purchase_orders', 'clients', 'suppliers']),
  refreshInterval: z.number().min(30).max(3600).optional(),
  position: z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    w: z.number().min(1).max(12),
    h: z.number().min(1).max(12),
  }),
})

type WidgetFormValues = z.infer<typeof widgetFormSchema>

// Fetch functions
async function fetchWidgets(): Promise<DashboardWidget[]> {
  const response = await fetch('/api/dashboard/widgets')
  if (!response.ok) throw new Error('Erro ao carregar widgets')
  return response.json().then(data => data.data)
}

async function createWidget(data: WidgetFormValues): Promise<DashboardWidget> {
  const response = await fetch('/api/dashboard/widgets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      queryConfig: { limit: 100 },
      displayConfig: {},
    }),
  })
  if (!response.ok) throw new Error('Erro ao criar widget')
  return response.json()
}

async function deleteWidget(id: string): Promise<void> {
  const response = await fetch(`/api/dashboard/widgets/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Erro ao excluir widget')
}

async function refreshWidget(id: string): Promise<unknown> {
  const response = await fetch(`/api/dashboard/widgets/${id}/refresh`, {
    method: 'POST',
  })
  if (!response.ok) throw new Error('Erro ao atualizar widget')
  return response.json()
}

export default function WidgetsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  
  // Fetch widgets
  const { data: widgets, isLoading, error } = useQuery({
    queryKey: ['dashboard-widgets'],
    queryFn: fetchWidgets,
  })
  
  // Create mutation
  const createMutation = useMutation({
    mutationFn: createWidget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] })
      toast({
        title: 'Widget criado',
        description: 'O widget foi adicionado ao dashboard.',
      })
      setIsCreateOpen(false)
      form.reset()
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar widget',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteWidget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] })
      toast({
        title: 'Widget excluído',
        description: 'O widget foi removido do dashboard.',
      })
      setDeleteId(null)
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao excluir widget',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
  
  // Refresh mutation
  const refreshMutation = useMutation({
    mutationFn: refreshWidget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] })
      toast({
        title: 'Widget atualizado',
        description: 'Os dados do widget foram atualizados.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
  
  // Form
  const form = useForm<WidgetFormValues>({
    resolver: zodResolver(widgetFormSchema),
    defaultValues: {
      name: '',
      type: 'kpi',
      dataSource: 'projects',
      refreshInterval: 300,
      position: { x: 0, y: 0, w: 4, h: 2 },
    },
  })
  
  const onSubmit = (data: WidgetFormValues) => {
    createMutation.mutate(data)
  }
  
  // Get widget type info
  const getWidgetTypeInfo = (type: string) => {
    return widgetTypes.find(t => t.value === type) || widgetTypes[0]
  }
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-80 mt-2" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Erro ao carregar widgets. Tente novamente.</p>
          <Button className="mt-4" onClick={() => queryClient.invalidateQueries({ queryKey: ['dashboard-widgets'] })}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Widgets do Dashboard</h1>
          <p className="text-muted-foreground">
            Gerencie os widgets personalizados do seu dashboard
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Widget
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Widget</DialogTitle>
              <DialogDescription>
                Adicione um novo widget ao seu dashboard personalizado.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Receita Mensal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {widgetTypes.map(type => {
                            const Icon = type.icon
                            return (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <span>{type.label}</span>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        {getWidgetTypeInfo(form.watch('type'))?.description}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="dataSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fonte de Dados</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a fonte" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {dataSources.map(source => (
                            <SelectItem key={source.value} value={source.value}>
                              {source.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="position.w"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Largura</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={12}
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="position.h"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Altura</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={12}
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="refreshInterval"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Intervalo de Atualização (segundos)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={30}
                          max={3600}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription>
                        Mínimo 30s, máximo 3600s (1 hora)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Criando...' : 'Criar Widget'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Widget Grid */}
      {widgets && widgets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {widgets.map((widget) => {
            const typeInfo = getWidgetTypeInfo(widget.type)
            const TypeIcon = typeInfo.icon
            
            return (
              <Card key={widget.id} className="relative group">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-muted">
                        <TypeIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{widget.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {typeInfo.label}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => refreshMutation.mutate(widget.id)}
                        disabled={refreshMutation.isPending}
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(widget.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Fonte:</span>
                      <Badge variant="outline" className="text-xs">
                        {dataSources.find(s => s.value === widget.dataSource)?.label || widget.dataSource}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Posição:</span>
                      <span className="text-xs">
                        {widget.position.w}x{widget.position.h}
                      </span>
                    </div>
                    {widget.refreshInterval && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Atualização:</span>
                        <span className="text-xs">
                          a cada {widget.refreshInterval}s
                        </span>
                      </div>
                    )}
                    {widget.lastRefreshedAt && (
                      <div className="text-xs text-muted-foreground">
                        Última atualização: {new Date(widget.lastRefreshedAt).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum widget configurado</h3>
              <p className="text-muted-foreground mt-2">
                Adicione widgets personalizados ao seu dashboard para visualizar seus dados.
              </p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Widget
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir widget?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O widget será permanentemente removido do dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
