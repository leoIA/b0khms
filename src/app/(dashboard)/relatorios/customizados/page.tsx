'use client'

import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Play,
  Calendar,
  Clock,
  Users,
  BarChart3,
  PieChart,
  Table2,
  LayoutDashboard,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Types
interface CustomReport {
  id: string
  name: string
  description: string | null
  category: string
  type: string
  dataSource: string
  createdAt: string
  updatedAt: string
  isPublic: boolean
  isDefault: boolean
  tags: string[] | null
  users: {
    id: string
    name: string
    email: string
  }
  _count?: {
    report_schedules: number
    report_executions: number
  }
}

interface ReportsListResponse {
  data: CustomReport[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

// Category labels
const categoryLabels: Record<string, string> = {
  general: 'Geral',
  financial: 'Financeiro',
  project: 'Projetos',
  operational: 'Operacional',
  custom: 'Personalizado',
}

// Type icons
const typeIcons: Record<string, React.ReactNode> = {
  table: <Table2 className="h-4 w-4" />,
  chart: <BarChart3 className="h-4 w-4" />,
  pivot: <PieChart className="h-4 w-4" />,
  dashboard: <LayoutDashboard className="h-4 w-4" />,
}

// Type labels
const typeLabels: Record<string, string> = {
  table: 'Tabela',
  chart: 'Gráfico',
  pivot: 'Tabela Dinâmica',
  dashboard: 'Dashboard',
}

// Data source labels
const dataSourceLabels: Record<string, string> = {
  projects: 'Projetos',
  budgets: 'Orçamentos',
  budget_items: 'Itens de Orçamento',
  transactions: 'Transações',
  daily_logs: 'Diário de Obra',
  medicoes: 'Medições',
  purchase_orders: 'Ordens de Compra',
  quotations: 'Cotações',
  clients: 'Clientes',
  suppliers: 'Fornecedores',
  materials: 'Materiais',
  compositions: 'Composições',
  schedules: 'Cronogramas',
  actual_costs: 'Custos Reais',
}

// Fetch functions
async function fetchReports(params: URLSearchParams): Promise<ReportsListResponse> {
  const response = await fetch(`/api/relatorios?${params.toString()}`)
  if (!response.ok) throw new Error('Erro ao carregar relatórios')
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

export default function RelatoriosCustomizadosPage() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [type, setType] = useState<string>('all')
  const [page, setPage] = useState(1)

  // Build query params
  const params = new URLSearchParams()
  params.set('page', page.toString())
  params.set('limit', '20')
  if (search) params.set('search', search)
  if (category !== 'all') params.set('category', category)
  if (type !== 'all') params.set('type', type)

  // Fetch reports
  const { data, isLoading, error } = useQuery({
    queryKey: ['custom-reports', search, category, type, page],
    queryFn: () => fetchReports(params),
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] })
      toast({
        title: 'Relatório excluído',
        description: 'O relatório foi excluído com sucesso.',
      })
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
    mutationFn: duplicateReport,
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] })
      toast({
        title: 'Relatório duplicado',
        description: `O relatório "${report.name}" foi criado com sucesso.`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao duplicar',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">Erro ao carregar relatórios. Tente novamente.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios Customizados</h1>
          <p className="text-muted-foreground">
            Crie e gerencie relatórios personalizados para sua empresa
          </p>
        </div>
        <Button asChild>
          <Link href="/relatorios/customizados/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Relatório
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar relatórios..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1) }}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                <SelectItem value="general">Geral</SelectItem>
                <SelectItem value="financial">Financeiro</SelectItem>
                <SelectItem value="project">Projetos</SelectItem>
                <SelectItem value="operational">Operacional</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => { setType(v); setPage(1) }}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="table">Tabela</SelectItem>
                <SelectItem value="chart">Gráfico</SelectItem>
                <SelectItem value="pivot">Tabela Dinâmica</SelectItem>
                <SelectItem value="dashboard">Dashboard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relatórios
          </CardTitle>
          <CardDescription>
            {data?.pagination.total ?? 0} relatório(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 flex-1" />
                </div>
              ))}
            </div>
          ) : data?.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">Nenhum relatório encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece criando seu primeiro relatório customizado
              </p>
              <Button asChild>
                <Link href="/relatorios/customizados/novo">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Relatório
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fonte de Dados</TableHead>
                  <TableHead>Criado por</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {typeIcons[report.type]}
                        <div>
                          <div className="font-medium">{report.name}</div>
                          {report.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {report.description}
                            </div>
                          )}
                        </div>
                        {report.isDefault && (
                          <Badge variant="secondary" className="ml-2">
                            Padrão
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {categoryLabels[report.category] || report.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{typeLabels[report.type] || report.type}</TableCell>
                    <TableCell>
                      {dataSourceLabels[report.dataSource] || report.dataSource}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {report.users.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(report.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/relatorios/customizados/${report.id}`}>
                              <Play className="mr-2 h-4 w-4" />
                              Executar
                            </Link>
                          </DropdownMenuItem>
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
                            onClick={() => duplicateMutation.mutate(report.id)}
                            disabled={duplicateMutation.isPending}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
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
                                  onClick={() => deleteMutation.mutate(report.id)}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {data && data.pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Página {data.pagination.page} de {data.pagination.pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
                  disabled={page === data.pagination.pages}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
