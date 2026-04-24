// =============================================================================
// ConstrutorPro - Detalhes da Cotação
// =============================================================================

'use client'

import { useState, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  ArrowLeft,
  MoreHorizontal,
  Send,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Calendar,
  Building2,
  Package,
  TrendingDown,
  Users,
  Mail,
  Loader2,
  Download,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatCurrency, formatDate } from '@/lib/api'
import { toast } from 'sonner'

// Types
interface QuotationItem {
  id: string
  description: string
  unit: string
  quantity: number
  notes?: string
  order: number
}

interface QuotationResponseItem {
  id: string
  unitPrice: number | null
  totalPrice: number | null
  notes?: string
  quotationItemId: string
}

interface QuotationResponse {
  id: string
  status: string
  totalValue: number | null
  respondedAt?: string
  notes?: string
  supplierId: string
  supplier: {
    id: string
    name: string
    tradeName?: string
    cnpj?: string
    email?: string
  }
  quotation_response_items: QuotationResponseItem[]
}

interface Quotation {
  id: string
  name: string
  code: string | null
  status: string
  description?: string
  deadline?: string
  notes?: string
  createdAt: string
  updatedAt: string
  project?: {
    id: string
    name: string
    code?: string
  }
  quotation_items: QuotationItem[]
  quotation_responses: QuotationResponse[]
}

// Status config
const QUOTATION_STATUS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800', icon: FileText },
  sent: { label: 'Enviada', color: 'bg-blue-100 text-blue-800', icon: Send },
  responded: { label: 'Respondida', color: 'bg-purple-100 text-purple-800', icon: CheckCircle2 },
  approved: { label: 'Aprovada', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  rejected: { label: 'Rejeitada', color: 'bg-red-100 text-red-800', icon: XCircle },
  cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-600', icon: XCircle },
}

const RESPONSE_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  responded: { label: 'Respondida', color: 'bg-green-100 text-green-800' },
  declined: { label: 'Recusada', color: 'bg-red-100 text-red-800' },
}

// Fetch quotation
async function fetchQuotation(id: string): Promise<Quotation> {
  const response = await fetch(`/api/cotacoes/${id}`)
  if (!response.ok) throw new Error('Erro ao carregar cotação')
  const data = await response.json()

  // Convert Decimal values
  return {
    ...data,
    quotation_items: data.quotation_items?.map((item: Record<string, unknown>) => {
      const qty = item.quantity as number | { toNumber: () => number } | null
      return {
        ...item,
        quantity: qty != null
          ? (typeof qty === 'object' && 'toNumber' in qty
              ? qty.toNumber()
              : Number(qty))
          : 0,
      }
    }) || [],
    quotation_responses: data.quotation_responses?.map((resp: Record<string, unknown>) => {
      const totalVal = resp.totalValue as number | { toNumber: () => number } | null
      return {
        ...resp,
        totalValue: totalVal != null
          ? (typeof totalVal === 'object' && 'toNumber' in totalVal
              ? totalVal.toNumber()
              : Number(totalVal))
          : null,
        quotation_response_items: (resp.quotation_response_items as Array<Record<string, unknown>>)?.map((item) => {
          const unitP = item.unitPrice as number | { toNumber: () => number } | null
          const totalP = item.totalPrice as number | { toNumber: () => number } | null
          return {
            ...item,
            unitPrice: unitP != null
              ? (typeof unitP === 'object' && 'toNumber' in unitP
                  ? unitP.toNumber()
                  : Number(unitP))
              : null,
            totalPrice: totalP != null
              ? (typeof totalP === 'object' && 'toNumber' in totalP
                  ? totalP.toNumber()
                  : Number(totalP))
              : null,
          }
        }) || [],
      }
    }) || [],
  }
}

export default function CotacaoDetalhePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CotacaoDetalheContent />
    </Suspense>
  )
}

function CotacaoDetalheContent() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login')
    },
  })

  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const queryClient = useQueryClient()
  const [showDelete, setShowDelete] = useState(false)

  // Fetch quotation
  const { data: quotation, isLoading, error } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => fetchQuotation(id),
    enabled: !!id && !!session?.user?.companyId,
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cotacoes/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir cotação')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      toast.success('Cotação excluída com sucesso!')
      router.push('/cotacoes')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  // Send quotation
  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/cotacoes/${id}/send`, { method: 'POST' })
      if (!res.ok) throw new Error('Erro ao enviar cotação')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] })
      toast.success('Cotação enviada para os fornecedores!')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  if (status === 'loading' || isLoading) {
    return <LoadingSkeleton />
  }

  if (error || !quotation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cotacoes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Cotação não encontrada</h1>
        </div>
      </div>
    )
  }

  const statusConfig = QUOTATION_STATUS[quotation.status] || QUOTATION_STATUS.draft

  // Get best price for each item
  const getBestPrice = (itemId: string): { price: number; supplier: string } | null => {
    let best: { price: number; supplier: string } | null = null
    for (const response of quotation.quotation_responses) {
      const item = response.quotation_response_items.find(i => i.quotationItemId === itemId)
      if (item?.unitPrice && (!best || item.unitPrice < best.price)) {
        best = { price: item.unitPrice, supplier: response.supplier.name }
      }
    }
    return best
  }

  // Calculate totals
  const totalItems = quotation.quotation_items.length
  const totalSuppliers = quotation.quotation_responses.length
  const respondedCount = quotation.quotation_responses.filter(r => r.status === 'responded').length
  const bestTotalValue = quotation.quotation_responses
    .filter(r => r.totalValue)
    .sort((a, b) => (a.totalValue || 0) - (b.totalValue || 0))[0]?.totalValue

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cotacoes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{quotation.name}</h1>
              <Badge className={statusConfig.color}>
                <statusConfig.icon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {quotation.code && <span className="font-mono mr-2">{quotation.code}</span>}
              Criada em {formatDate(quotation.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {quotation.status === 'draft' && (
            <Button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending || totalSuppliers === 0}
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar para Fornecedores
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Mail className="h-4 w-4 mr-2" />
                Enviar por Email
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Cotação
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Package className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Itens</p>
                <p className="text-2xl font-bold">{totalItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fornecedores</p>
                <p className="text-2xl font-bold">{totalSuppliers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Respondidas</p>
                <p className="text-2xl font-bold">{respondedCount}/{totalSuppliers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingDown className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Melhor Valor</p>
                <p className="text-2xl font-bold">
                  {bestTotalValue ? formatCurrency(bestTotalValue) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="itens" className="space-y-4">
        <TabsList>
          <TabsTrigger value="itens">Itens da Cotação</TabsTrigger>
          <TabsTrigger value="respostas">Respostas dos Fornecedores</TabsTrigger>
          <TabsTrigger value="comparativo">Comparativo de Preços</TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="itens">
          <Card>
            <CardHeader>
              <CardTitle>Itens Solicitados</CardTitle>
              <CardDescription>
                Lista de materiais e serviços a serem cotados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead>Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotation.quotation_items.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono">{index + 1}</TableCell>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-muted-foreground">{item.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Details */}
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Projeto
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quotation.project ? (
                  <div>
                    <p className="font-medium">{quotation.project.name}</p>
                    {quotation.project.code && (
                      <p className="text-sm text-muted-foreground">{quotation.project.code}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum projeto vinculado</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Prazo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quotation.deadline ? (
                  <div>
                    <p className="font-medium">{formatDate(quotation.deadline)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(quotation.deadline) > new Date() ? 'Dentro do prazo' : 'Prazo expirado'}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Sem prazo definido</p>
                )}
              </CardContent>
            </Card>
          </div>

          {quotation.notes && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{quotation.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Responses Tab */}
        <TabsContent value="respostas">
          <Card>
            <CardHeader>
              <CardTitle>Respostas dos Fornecedores</CardTitle>
              <CardDescription>
                Cotações recebidas de cada fornecedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quotation.quotation_responses.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    Nenhum fornecedor selecionado para esta cotação
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quotation.quotation_responses.map((response) => {
                    const respStatus = RESPONSE_STATUS[response.status] || RESPONSE_STATUS.pending
                    return (
                      <Card key={response.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <p className="font-medium">{response.supplier.name}</p>
                              {response.supplier.tradeName && (
                                <p className="text-sm text-muted-foreground">
                                  {response.supplier.tradeName}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {response.totalValue && (
                                <span className="text-lg font-bold text-green-600">
                                  {formatCurrency(response.totalValue)}
                                </span>
                              )}
                              <Badge className={respStatus.color}>
                                {respStatus.label}
                              </Badge>
                            </div>
                          </div>

                          {response.status === 'responded' && (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Item</TableHead>
                                  <TableHead className="text-right">Qtd</TableHead>
                                  <TableHead className="text-right">Preço Unit.</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {response.quotation_response_items.map((item, idx) => {
                                  const quotationItem = quotation.quotation_items.find(
                                    q => q.id === item.quotationItemId
                                  )
                                  return (
                                    <TableRow key={item.id}>
                                      <TableCell>
                                        {quotationItem?.description || `Item ${idx + 1}`}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {quotationItem?.quantity || '-'}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {item.unitPrice ? formatCurrency(item.unitPrice) : '-'}
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {item.totalPrice ? formatCurrency(item.totalPrice) : '-'}
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          )}

                          {response.notes && (
                            <p className="text-sm text-muted-foreground mt-4">
                              Obs: {response.notes}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparison Tab */}
        <TabsContent value="comparativo">
          <Card>
            <CardHeader>
              <CardTitle>Comparativo de Preços</CardTitle>
              <CardDescription>
                Comparação de preços entre fornecedores
              </CardDescription>
            </CardHeader>
            <CardContent>
              {quotation.quotation_responses.filter(r => r.status === 'responded').length < 2 ? (
                <div className="text-center py-8">
                  <TrendingDown className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    São necessárias pelo menos 2 respostas para o comparativo
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        {quotation.quotation_responses
                          .filter(r => r.status === 'responded')
                          .map((r) => (
                            <TableHead key={r.id} className="text-right">
                              {r.supplier.name}
                            </TableHead>
                          ))}
                        <TableHead className="text-right">Melhor Preço</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotation.quotation_items.map((item) => {
                        const bestPrice = getBestPrice(item.id)
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.description}</TableCell>
                            <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                            {quotation.quotation_responses
                              .filter(r => r.status === 'responded')
                              .map((response) => {
                                const respItem = response.quotation_response_items.find(
                                  ri => ri.quotationItemId === item.id
                                )
                                const isBest = bestPrice && respItem?.unitPrice === bestPrice.price
                                return (
                                  <TableCell
                                    key={response.id}
                                    className={`text-right ${isBest ? 'text-green-600 font-bold' : ''}`}
                                  >
                                    {respItem?.unitPrice ? formatCurrency(respItem.unitPrice) : '-'}
                                    {isBest && ' ✓'}
                                  </TableCell>
                                )
                              })}
                            <TableCell className="text-right font-bold text-green-600">
                              {bestPrice ? formatCurrency(bestPrice.price) : '-'}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {/* Total row */}
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={2}>TOTAL</TableCell>
                        {quotation.quotation_responses
                          .filter(r => r.status === 'responded')
                          .map((response) => {
                            const isBest = bestTotalValue === response.totalValue
                            return (
                              <TableCell
                                key={response.id}
                                className={`text-right ${isBest ? 'text-green-600' : ''}`}
                              >
                                {response.totalValue ? formatCurrency(response.totalValue) : '-'}
                              </TableCell>
                            )
                          })}
                        <TableCell className="text-right text-green-600">
                          {bestTotalValue ? formatCurrency(bestTotalValue) : '-'}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cotação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A cotação "{quotation.name}" será permanentemente removida.
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

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
