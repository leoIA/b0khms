// =============================================================================
// ConstrutorPro - Nova Cotação
// =============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  Loader2,
  FileText,
  Calendar,
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatCurrency } from '@/lib/api'
import { toast } from 'sonner'
import Link from 'next/link'

// Types
interface Supplier {
  id: string
  name: string
  tradeName?: string
  cnpj?: string
}

interface Project {
  id: string
  name: string
  code?: string
}

interface QuotationItem {
  description: string
  unit: string
  quantity: number
  notes?: string
}

const UNITS = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'm2', label: 'Metro quadrado (m²)' },
  { value: 'm3', label: 'Metro cúbico (m³)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 't', label: 'Tonelada (t)' },
  { value: 'l', label: 'Litro (l)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'cj', label: 'Conjunto (cj)' },
  { value: 'pç', label: 'Peça (pç)' },
  { value: 'hr', label: 'Hora (hr)' },
  { value: 'dia', label: 'Diária (dia)' },
]

export default function NovaCotacaoPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login')
    },
  })

  const router = useRouter()
  const queryClient = useQueryClient()

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    projectId: '',
    description: '',
    deadline: '',
    notes: '',
    items: [{ description: '', unit: 'un', quantity: 1, notes: '' }] as QuotationItem[],
    supplierIds: [] as string[],
  })

  const [showSuccess, setShowSuccess] = useState(false)
  const [createdId, setCreatedId] = useState('')

  // Fetch suppliers
  const { data: suppliersData } = useQuery<{ data: Supplier[] }>({
    queryKey: ['suppliers-cotacoes'],
    queryFn: async () => {
      const res = await fetch('/api/fornecedores?limit=100')
      if (!res.ok) throw new Error('Erro ao carregar fornecedores')
      return res.json()
    },
    enabled: !!session?.user?.companyId,
  })

  // Fetch projects
  const { data: projectsData } = useQuery<{ data: Project[] }>({
    queryKey: ['projects-cotacoes'],
    queryFn: async () => {
      const res = await fetch('/api/projetos?limit=100')
      if (!res.ok) throw new Error('Erro ao carregar projetos')
      return res.json()
    },
    enabled: !!session?.user?.companyId,
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/cotacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          code: data.code || undefined,
          projectId: data.projectId || undefined,
          description: data.description || undefined,
          deadline: data.deadline || undefined,
          notes: data.notes || undefined,
          quotation_items: data.items.filter(i => i.description).map((item, index) => ({
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            notes: item.notes || undefined,
            order: index,
          })),
          supplierIds: data.supplierIds.length > 0 ? data.supplierIds : undefined,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error ?? 'Erro ao criar cotação')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      setCreatedId(data.id)
      setShowSuccess(true)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', unit: 'un', quantity: 1, notes: '' }],
    })
  }

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = [...formData.items]
    newItems[index] = { ...newItems[index], [field]: value }
    setFormData({ ...formData, items: newItems })
  }

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index)
      setFormData({ ...formData, items: newItems })
    }
  }

  const toggleSupplier = (supplierId: string) => {
    const newIds = formData.supplierIds.includes(supplierId)
      ? formData.supplierIds.filter(id => id !== supplierId)
      : [...formData.supplierIds, supplierId]
    setFormData({ ...formData, supplierIds: newIds })
  }

  const suppliers = suppliersData?.data ?? []
  const projects = projectsData?.data ?? []

  if (status === 'loading') {
    return <LoadingSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/cotacoes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Cotação</h1>
          <p className="text-muted-foreground">
            Crie uma nova solicitação de cotação para fornecedores
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
              <CardDescription>
                Dados de identificação da cotação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Cotação Materiais Estruturais"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Código</Label>
                  <Input
                    id="code"
                    placeholder="Ex: COT-2024-001"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Projeto</Label>
                  <Select
                    value={formData.projectId}
                    onValueChange={(v) => setFormData({ ...formData, projectId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um projeto (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code ? `${p.code} - ` : ''}{p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deadline">Prazo de Resposta</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descrição geral da cotação..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Itens da Cotação</CardTitle>
                  <CardDescription>
                    Materiais ou serviços a serem cotados
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Item {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={formData.items.length === 1}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-6 space-y-1">
                        <Label className="text-xs">Descrição *</Label>
                        <Input
                          placeholder="Descrição do item"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Unidade</Label>
                        <Select
                          value={item.unit}
                          onValueChange={(v) => updateItem(index, 'unit', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNITS.map((u) => (
                              <SelectItem key={u.value} value={u.value}>
                                {u.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3 space-y-1">
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          type="number"
                          min={0.01}
                          step="0.01"
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Observações</Label>
                      <Input
                        placeholder="Observações adicionais (opcional)"
                        value={item.notes || ''}
                        onChange={(e) => updateItem(index, 'notes', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Observações Gerais</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Observações adicionais para os fornecedores..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Suppliers Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Fornecedores</CardTitle>
              <CardDescription>
                Selecione os fornecedores que receberão a cotação
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suppliers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum fornecedor cadastrado.
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {suppliers.map((supplier) => (
                    <button
                      key={supplier.id}
                      type="button"
                      onClick={() => toggleSupplier(supplier.id)}
                      className={`w-full p-3 text-left rounded-lg border transition-colors ${
                        formData.supplierIds.includes(supplier.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{supplier.name}</p>
                          {supplier.tradeName && (
                            <p className="text-xs text-muted-foreground">{supplier.tradeName}</p>
                          )}
                        </div>
                        {formData.supplierIds.includes(supplier.id) && (
                          <Badge variant="default" className="bg-primary">Selecionado</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-4">
                {formData.supplierIds.length} fornecedor(es) selecionado(s)
              </p>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Button
                className="w-full"
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.name || formData.items.filter(i => i.description).length === 0 || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Rascunho
              </Button>
              <Button
                variant="outline"
                className="w-full"
                asChild
              >
                <Link href="/cotacoes">Cancelar</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itens:</span>
                <span className="font-medium">
                  {formData.items.filter(i => i.description).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fornecedores:</span>
                <span className="font-medium">
                  {formData.supplierIds.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Success Dialog */}
      <AlertDialog open={showSuccess} onOpenChange={setShowSuccess}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cotação Criada!</AlertDialogTitle>
            <AlertDialogDescription>
              A cotação foi criada com sucesso. O que deseja fazer agora?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogAction asChild>
              <Link href="/cotacoes">Ver Lista</Link>
            </AlertDialogAction>
            <AlertDialogAction asChild>
              <Link href={`/cotacoes/${createdId}`}>Ver Cotação</Link>
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
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
