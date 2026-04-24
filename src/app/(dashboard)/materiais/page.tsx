// =============================================================================
// ConstrutorPro - Materiais List Page
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertTriangle,
  Package,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/api';
import { MEASUREMENT_UNITS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

interface Material {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  unitCost: number;
  unitPrice: number | null;
  stockQuantity: number | null;
  minStock: number | null;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  supplier: {
    id: string;
    name: string;
    status: string;
  } | null;
  isLowStock: boolean;
}

interface MaterialsResponse {
  data: Material[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Supplier {
  id: string;
  name: string;
}

const MATERIAL_CATEGORIES = [
  'Estrutural',
  'Acabamento',
  'Hidráulico',
  'Elétrico',
  'Revestimento',
  'Pintura',
  'Madeira',
  'Metalúrgico',
  'Ferramentas',
  'Segurança',
  'Outros',
];

export default function MateriaisPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login');
    },
  });

  const { toast } = useToast();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [supplierFilter, setSupplierFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      fetchMaterials();
      fetchSuppliers();
    }
  }, [session, pagination.page, sortBy, sortOrder, categoryFilter, supplierFilter, activeFilter, lowStockFilter]);

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
      });
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);
      if (supplierFilter) params.append('supplierId', supplierFilter);
      if (activeFilter) params.append('isActive', activeFilter);
      if (lowStockFilter) params.append('lowStock', 'true');

      const response = await fetch(`/api/materiais?${params.toString()}`);
      const data: MaterialsResponse = await response.json();

      if (data.data) {
        setMaterials(data.data);
        setPagination((prev) => ({ ...prev, ...data.pagination }));
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os materiais.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/fornecedores?limit=100');
      const data = await response.json();
      if (data.data) {
        setSuppliers(data.data);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchMaterials();
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/materiais/${deleteId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Material excluído com sucesso.',
        });
        fetchMaterials();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Não foi possível excluir o material.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir material.',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  const getUnitLabel = (unit: string) => {
    return MEASUREMENT_UNITS.find((u) => u.value === unit)?.label || unit;
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  if (status === 'loading') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Materiais</h1>
          <p className="text-muted-foreground">
            Gerencie o cadastro de materiais da sua empresa
          </p>
        </div>
        <Button asChild>
          <Link href="/materiais/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo Material
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar materiais..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {MATERIAL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="true">Ativos</SelectItem>
                  <SelectItem value="false">Inativos</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" variant="secondary">
                Buscar
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={lowStockFilter ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => {
                  setLowStockFilter(!lowStockFilter);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Estoque Baixo
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Materials Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('code')}
                    className="h-8 px-2"
                  >
                    Código
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('name')}
                    className="h-8 px-2"
                  >
                    Nome
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSort('unitCost')}
                    className="h-8 px-2"
                  >
                    Custo Unit.
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-center">Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : materials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        Nenhum material encontrado
                      </p>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/materiais/novo">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Material
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                materials.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="font-mono">{material.code}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{material.name}</p>
                        {material.category && (
                          <p className="text-xs text-muted-foreground">
                            {material.category}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getUnitLabel(material.unit)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(material.unitCost)}
                    </TableCell>
                    <TableCell className="text-right">
                      {material.unitPrice
                        ? formatCurrency(material.unitPrice)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {material.supplier ? (
                        <Link
                          href={`/fornecedores/${material.supplier.id}`}
                          className="text-primary hover:underline"
                        >
                          {material.supplier.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {material.isLowStock && (
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        )}
                        <span
                          className={
                            material.isLowStock ? 'text-destructive font-medium' : ''
                          }
                        >
                          {material.stockQuantity !== null
                            ? material.stockQuantity.toLocaleString('pt-BR')
                            : '-'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={material.isActive ? 'default' : 'secondary'}
                      >
                        {material.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/materiais/${material.id}/editar`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Editar
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(material.id)}
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
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {(pagination.page - 1) * pagination.limit + 1} a{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
            {pagination.total} materiais
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Material</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este material? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
