// =============================================================================
// ConstrutorPro - Cotações - Listagem
// =============================================================================

'use client';

import { useState, Suspense } from 'react';
import { useSession } from '@/hooks/use-session';
import { redirect, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/api';

// Types
interface QuotationItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
}

interface QuotationResponse {
  id: string;
  supplierId: string;
  status: string;
  totalValue: number | null;
  supplier: {
    id: string;
    name: string;
  };
}

interface Quotation {
  id: string;
  name: string;
  code: string | null;
  status: string;
  deadline: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  items: QuotationItem[];
  responses: QuotationResponse[];
  _count: {
    items: number;
    responses: number;
  };
}

interface QuotationListResponse {
  data: Quotation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Status config
const QUOTATION_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-500', icon: <FileText className="h-3 w-3" /> },
  sent: { label: 'Enviada', color: 'bg-blue-500', icon: <Send className="h-3 w-3" /> },
  responded: { label: 'Respondida', color: 'bg-purple-500', icon: <CheckCircle2 className="h-3 w-3" /> },
  approved: { label: 'Aprovada', color: 'bg-green-500', icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Rejeitada', color: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelada', color: 'bg-gray-400', icon: <AlertCircle className="h-3 w-3" /> },
};

// Fetch quotations
async function fetchQuotations(params: URLSearchParams): Promise<QuotationListResponse> {
  const response = await fetch(`/api/cotacoes?${params.toString()}`);
  if (!response.ok) throw new Error('Erro ao carregar cotações');
  return response.json();
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CotacoesPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <CotacoesContent />
    </Suspense>
  );
}

function CotacoesContent() {
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  // Redirect if not authenticated
  if (!sessionLoading && !isAuthenticated) {
    redirect('/login');
  }

  // Build query params
  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('limit', '10');
  if (search) queryParams.set('search', search);
  if (statusFilter) queryParams.set('status', statusFilter);

  // Fetch quotations
  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['quotations', page, search, statusFilter],
    queryFn: () => fetchQuotations(queryParams),
    enabled: isAuthenticated,
  });

  const quotations = response?.data || [];
  const pagination = response?.pagination;

  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    router.push(`/cotacoes?search=${search}${statusFilter ? `&status=${statusFilter}` : ''}`);
  };

  if (sessionLoading || isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Cotações</h1>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground">
              Erro ao carregar cotações. Tente novamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cotações</h1>
          <p className="text-muted-foreground">
            Gerencie solicitações de cotação para fornecedores
          </p>
        </div>
        <Button asChild>
          <Link href="/cotacoes/novo">
            <Plus className="h-4 w-4 mr-2" />
            Nova Cotação
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cotações..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {Object.entries(QUOTATION_STATUS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      {quotations.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma cotação encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {search || statusFilter
                ? 'Tente ajustar os filtros de busca'
                : 'Crie sua primeira cotação para começar'}
            </p>
            <Button asChild>
              <Link href="/cotacoes/novo">
                <Plus className="h-4 w-4 mr-2" />
                Nova Cotação
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Fornecedores</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotations.map((quotation) => {
                const statusConfig = QUOTATION_STATUS[quotation.status] || QUOTATION_STATUS.draft;
                const bestResponse = quotation.responses
                  .filter((r) => r.totalValue !== null)
                  .sort((a, b) => (a.totalValue || 0) - (b.totalValue || 0))[0];

                return (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-mono">
                      {quotation.code || '-'}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{quotation.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {quotation.items.length} item(ns)
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {quotation.project ? (
                        <div>
                          <p className="font-medium">{quotation.project.name}</p>
                          {quotation.project.code && (
                            <p className="text-xs text-muted-foreground">
                              {quotation.project.code}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{quotation._count.items}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{quotation._count.responses}</span>
                        {bestResponse && (
                          <span className="text-xs text-green-600 font-medium">
                            Melhor: {formatCurrency(bestResponse.totalValue!)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusConfig.color} text-white`}>
                        <span className="flex items-center gap-1">
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {quotation.deadline ? (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {new Date(quotation.deadline).toLocaleDateString('pt-BR')}
                        </div>
                      ) : (
                        '-'
                      )}
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
                            <Link href={`/cotacoes/${quotation.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </Link>
                          </DropdownMenuItem>
                          {quotation.status === 'draft' && (
                            <DropdownMenuItem asChild>
                              <Link href={`/cotacoes/${quotation.id}`}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {quotations.length} de {pagination.total} cotações
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            <span className="text-sm">
              Página {page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
