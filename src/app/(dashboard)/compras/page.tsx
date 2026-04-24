// =============================================================================
// ConstrutorPro - Módulo de Compras e Pedidos de Compra
// =============================================================================

'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ShoppingCart,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
  Loader2,
  FileText,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/api';
import { toast } from 'sonner';

// Types
interface Supplier {
  id: string;
  name: string;
  tradeName?: string;
  cnpj?: string;
}

interface Project {
  id: string;
  name: string;
  code?: string;
}

interface Material {
  id: string;
  code: string;
  name: string;
  unit: string;
  unitCost: number;
  supplierId?: string;
}

interface PurchaseOrderItem {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  quantidadeRec: number;
  precoUnitario: number;
  valorTotal: number;
  materialId?: string;
}

interface PurchaseOrder {
  id: string;
  numero: string;
  dataEmissao: string;
  dataEntrega?: string;
  valorTotal: number;
  status: string;
  condicoesPagto?: string;
  observacoes?: string;
  supplier: Supplier;
  project?: Project;
  itens: PurchaseOrderItem[];
  criador?: { name: string };
}

interface PurchaseOrderListResponse {
  data: PurchaseOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  rascunho: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800', icon: FileText },
  enviado: { label: 'Enviado', color: 'bg-blue-100 text-blue-800', icon: Send },
  confirmado: { label: 'Confirmado', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  parcial: { label: 'Parcial', color: 'bg-yellow-100 text-yellow-800', icon: Package },
  recebido: { label: 'Recebido', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: XCircle },
};

function getStatusBadge(status: string) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.rascunho;
  return (
    <Badge variant="outline" className={config.color}>
      <config.icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}

export default function ComprasPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    },
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<PurchaseOrder | null>(null);
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    supplierId: '',
    projectId: '',
    dataEntrega: '',
    condicoesPagto: '',
    observacoes: '',
    itens: [{ descricao: '', unidade: '', quantidade: 0, precoUnitario: 0 }],
  });

  // Fetch purchase orders
  const { data, isLoading } = useQuery<PurchaseOrderListResponse>({
    queryKey: ['compras', page, search, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(search && { search }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });
      const res = await fetch(`/api/compras?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar pedidos');
      return res.json();
    },
    enabled: !!session?.user?.companyId,
  });

  // Fetch suppliers for form
  const { data: suppliersData } = useQuery<{ data: Supplier[] }>({
    queryKey: ['suppliers-compras'],
    queryFn: async () => {
      const res = await fetch('/api/fornecedores?limit=100');
      if (!res.ok) throw new Error('Erro ao carregar fornecedores');
      return res.json();
    },
    enabled: !!session?.user?.companyId && isCreateOpen,
  });

  // Fetch projects for form
  const { data: projectsData } = useQuery<{ data: Project[] }>({
    queryKey: ['projects-compras'],
    queryFn: async () => {
      const res = await fetch('/api/projetos?limit=100');
      if (!res.ok) throw new Error('Erro ao carregar projetos');
      return res.json();
    },
    enabled: !!session?.user?.companyId && isCreateOpen,
  });

  // Fetch materials for form
  const { data: materialsData } = useQuery<{ data: { data: Material[] } }>({
    queryKey: ['materials-compras'],
    queryFn: async () => {
      const res = await fetch('/api/materiais?limit=100');
      if (!res.ok) throw new Error('Erro ao carregar materiais');
      return res.json();
    },
    enabled: !!session?.user?.companyId && isCreateOpen,
  });

  // Create purchase order mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: data.supplierId,
          projectId: data.projectId || null,
          dataEntrega: data.dataEntrega ? new Date(data.dataEntrega) : null,
          condicoesPagto: data.condicoesPagto,
          observacoes: data.observacoes,
          itens: data.itens.filter(i => i.descricao).map((item, index) => ({
            descricao: item.descricao,
            unidade: item.unidade,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario,
            valorTotal: item.quantidade * item.precoUnitario,
            ordem: index,
          })),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error ?? 'Erro ao criar pedido');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      toast.success('Pedido de compra criado com sucesso!');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/compras/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir pedido');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      toast.success('Pedido excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      supplierId: '',
      projectId: '',
      dataEntrega: '',
      condicoesPagto: '',
      observacoes: '',
      itens: [{ descricao: '', unidade: '', quantidade: 0, precoUnitario: 0 }],
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      itens: [...formData.itens, { descricao: '', unidade: '', quantidade: 0, precoUnitario: 0 }],
    });
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItens = [...formData.itens];
    newItens[index] = { ...newItens[index], [field]: value };
    setFormData({ ...formData, itens: newItens });
  };

  const removeItem = (index: number) => {
    if (formData.itens.length > 1) {
      const newItens = formData.itens.filter((_, i) => i !== index);
      setFormData({ ...formData, itens: newItens });
    }
  };

  const suppliers = suppliersData?.data ?? [];
  const projects = projectsData?.data ?? [];
  const materials = materialsData?.data?.data ?? [];
  const pedidos = data?.data ?? [];
  const pagination = data?.pagination;

  if (status === 'loading' || isLoading) {
    return <ComprasSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pedidos de Compra</h1>
          <p className="text-muted-foreground">
            Gerencie pedidos de compra e acompanhe entregas
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Pedido de Compra</DialogTitle>
              <DialogDescription>
                Crie um novo pedido de compra para um fornecedor
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Fornecedor e Projeto */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fornecedor *</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(v) => setFormData({ ...formData, supplierId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Projeto</Label>
                  <Select
                    value={formData.projectId}
                    onValueChange={(v) => setFormData({ ...formData, projectId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o projeto (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Datas e Condições */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Entrega Prevista</Label>
                  <Input
                    type="date"
                    value={formData.dataEntrega}
                    onChange={(e) => setFormData({ ...formData, dataEntrega: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Condições de Pagamento</Label>
                  <Input
                    placeholder="Ex: 30/60/90 dias"
                    value={formData.condicoesPagto}
                    onChange={(e) => setFormData({ ...formData, condicoesPagto: e.target.value })}
                  />
                </div>
              </div>

              {/* Itens */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Itens do Pedido</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar Item
                  </Button>
                </div>
                <div className="border rounded-lg divide-y">
                  {formData.itens.map((item, index) => (
                    <div key={index} className="p-3 grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <Label className="text-xs">Descrição</Label>
                        <Input
                          placeholder="Descrição do item"
                          value={item.descricao}
                          onChange={(e) => updateItem(index, 'descricao', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Unidade</Label>
                        <Select
                          value={item.unidade}
                          onValueChange={(v) => updateItem(index, 'unidade', v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Un" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="un">Un</SelectItem>
                            <SelectItem value="m">m</SelectItem>
                            <SelectItem value="m2">m²</SelectItem>
                            <SelectItem value="m3">m³</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                            <SelectItem value="t">t</SelectItem>
                            <SelectItem value="l">l</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.quantidade || ''}
                          onChange={(e) => updateItem(index, 'quantidade', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Preço Unit.</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.precoUnitario || ''}
                          onChange={(e) => updateItem(index, 'precoUnitario', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs">Total</Label>
                        <div className="text-sm font-medium py-2">
                          {formatCurrency(item.quantidade * item.precoUnitario)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          disabled={formData.itens.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações adicionais..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                />
              </div>

              {/* Total */}
              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total do Pedido</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      formData.itens.reduce((sum, i) => sum + i.quantidade * i.precoUnitario, 0)
                    )}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.supplierId || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Criar Pedido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <ShoppingCart className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                <p className="text-2xl font-bold">{pagination?.total ?? 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rascunhos</p>
                <p className="text-2xl font-bold">
                  {pedidos.filter((p) => p.status === 'rascunho').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Send className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Enviados</p>
                <p className="text-2xl font-bold">
                  {pedidos.filter((p) => p.status === 'enviado' || p.status === 'confirmado').length}
                </p>
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
                <p className="text-sm text-muted-foreground">Recebidos</p>
                <p className="text-2xl font-bold">
                  {pedidos.filter((p) => p.status === 'recebido').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pedidos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="recebido">Recebido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Data Emissão</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingCart className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">Nenhum pedido encontrado</p>
                      <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar primeiro pedido
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                pedidos.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-mono">{pedido.numero}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{pedido.supplier.name}</p>
                        {pedido.supplier.cnpj && (
                          <p className="text-xs text-muted-foreground">{pedido.supplier.cnpj}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{pedido.project?.name ?? '-'}</TableCell>
                    <TableCell>{formatDate(pedido.dataEmissao)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(pedido.valorTotal)}
                    </TableCell>
                    <TableCell>{getStatusBadge(pedido.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedPedido(pedido)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Tem certeza que deseja excluir este pedido?')) {
                                deleteMutation.mutate(pedido.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} a{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
            {pagination.total} pedidos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={!!selectedPedido} onOpenChange={() => setSelectedPedido(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Pedido de Compra #{selectedPedido?.numero}</DialogTitle>
            <DialogDescription>
              {selectedPedido?.supplier.name} - {formatCurrency(selectedPedido?.valorTotal || 0)}
            </DialogDescription>
          </DialogHeader>
          {selectedPedido && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fornecedor</p>
                  <p className="font-medium">{selectedPedido.supplier.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Projeto</p>
                  <p className="font-medium">{selectedPedido.project?.name ?? 'Não definido'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data Emissão</p>
                  <p className="font-medium">{formatDate(selectedPedido.dataEmissao)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedPedido.status)}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Itens do Pedido</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Un.</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPedido.itens.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.descricao}</TableCell>
                        <TableCell>{item.unidade}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.precoUnitario)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.valorTotal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComprasSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
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
  );
}
