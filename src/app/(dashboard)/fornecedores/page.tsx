// =============================================================================
// ConstrutorPro - Suppliers List Page
// =============================================================================

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Truck, Phone, Mail, MoreHorizontal, Pencil, Trash2, Eye, Package } from 'lucide-react';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { SUPPLIER_STATUS } from '@/lib/constants';

interface Supplier {
  id: string;
  name: string;
  tradeName: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  category: string | null;
  status: string;
  _count?: { materials: number };
}

async function fetchSuppliers(params: { search?: string; status?: string; page?: number; limit?: number }): Promise<{ success: boolean; data: { data: Supplier[]; pagination: { total: number; page: number; limit: number; totalPages: number } } }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  
  const response = await fetch(`/api/fornecedores?${query.toString()}`);
  return response.json();
}

async function deleteSupplier(id: string): Promise<void> {
  const response = await fetch(`/api/fornecedores/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Erro ao excluir fornecedor');
  }
}

const PAGE_SIZE = 10;

export default function SuppliersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search, statusFilter, page],
    queryFn: () => fetchSuppliers({ search, status: statusFilter, page, limit: PAGE_SIZE }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Sucesso', description: 'Fornecedor excluído com sucesso.' });
      setDeleteDialogOpen(false);
      setSupplierToDelete(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const getStatusBadge = (status: string) => {
    const config = SUPPLIER_STATUS[status as keyof typeof SUPPLIER_STATUS];
    return (
      <Badge variant={status === 'active' ? 'default' : status === 'blocked' ? 'destructive' : 'secondary'}>
        {config?.label || status}
      </Badge>
    );
  };

  const suppliers = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;
  const totalPages = data?.data?.pagination?.totalPages || Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground">Gerencie os fornecedores da sua construtora</p>
        </div>
        <Button asChild>
          <Link href="/fornecedores/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Fornecedor
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CNPJ ou categoria..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="blocked">Bloqueados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Lista de Fornecedores
            <Badge variant="secondary" className="ml-2">{total} registro{total !== 1 ? 's' : ''}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum fornecedor encontrado</h3>
              <p className="text-muted-foreground mt-1">
                {search || statusFilter !== 'all' ? 'Tente ajustar os filtros.' : 'Comece adicionando um novo fornecedor.'}
              </p>
              {!search && statusFilter === 'all' && (
                <Button asChild className="mt-4">
                  <Link href="/fornecedores/novo">
                    <Plus className="mr-2 h-4 w-4" />Adicionar Fornecedor
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Materiais</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        {supplier.tradeName && (
                          <p className="text-xs text-muted-foreground">{supplier.tradeName}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{supplier.cnpj || '-'}</TableCell>
                    <TableCell>
                      {supplier.email && (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />{supplier.email}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {supplier.category && <Badge variant="outline">{supplier.category}</Badge>}
                    </TableCell>
                    <TableCell>{getStatusBadge(supplier.status)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="flex items-center gap-1 w-fit">
                        <Package className="h-3 w-3" />{supplier._count?.materials || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/fornecedores/${supplier.id}`}><Eye className="mr-2 h-4 w-4" />Visualizar</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/fornecedores/${supplier.id}/editar`}><Pencil className="mr-2 h-4 w-4" />Editar</Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => { setSupplierToDelete(supplier); setDeleteDialogOpen(true); }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {suppliers.length > 0 && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o fornecedor "{supplierToDelete?.name}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => supplierToDelete && deleteMutation.mutate(supplierToDelete.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
