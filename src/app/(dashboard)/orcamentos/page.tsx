// =============================================================================
// ConstrutorPro - Orçamentos - Listagem
// =============================================================================

'use client';

import { useState, useMemo } from 'react';
import { useSession } from '@/hooks/use-session';
import { redirect } from 'next/navigation';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { BUDGET_STATUS } from '@/lib/constants';
import type { BudgetStatus } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/api';

// Types
interface Budget {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: BudgetStatus;
  totalValue: number;
  discount: number | null;
  validUntil: string | null;
  approvedAt: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
  } | null;
  approver: {
    id: string;
    name: string;
  } | null;
  _count?: {
    items: number;
  };
}

interface BudgetsResponse {
  data: Budget[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Fetch budgets
async function fetchBudgets(params: {
  search?: string;
  status?: string;
  projectId?: string;
}): Promise<BudgetsResponse> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);
  if (params.projectId) searchParams.set('projectId', params.projectId);

  const response = await fetch(`/api/orcamentos?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Erro ao carregar orçamentos');
  return response.json();
}

// Fetch projects for filter
async function fetchProjects(): Promise<{ id: string; name: string }[]> {
  const response = await fetch('/api/projetos?limit=100');
  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

// Status badge component
function StatusBadge({ status }: { status: BudgetStatus }) {
  const statusConfig = BUDGET_STATUS[status];
  return (
    <Badge variant="outline" className={`${statusConfig.color} text-white border-0`}>
      {statusConfig.label}
    </Badge>
  );
}

// Status icon
function StatusIcon({ status }: { status: BudgetStatus }) {
  switch (status) {
    case 'approved':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case 'revision':
      return <RefreshCw className="h-4 w-4 text-orange-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
}

// Card skeleton
function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-24 mb-2" />
        <Skeleton className="h-6 w-full" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <div className="flex justify-between">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Table skeleton
function TableSkeleton() {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            {[...Array(6)].map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              {[...Array(6)].map((_, j) => (
                <TableCell key={j}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

// Budget card component
function BudgetCard({ budget }: { budget: Budget }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            {budget.code && (
              <p className="text-xs text-muted-foreground font-mono">{budget.code}</p>
            )}
            <CardTitle className="text-lg line-clamp-1">{budget.name}</CardTitle>
          </div>
          <StatusBadge status={budget.status} />
        </div>
        <CardDescription className="line-clamp-2">
          {budget.description || 'Sem descrição'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Project */}
        {budget.project && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="truncate">{budget.project.name}</span>
          </div>
        )}

        {/* Value and Items */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span className="font-bold text-green-600">
              {formatCurrency(budget.totalValue)}
            </span>
          </div>
          {budget._count && (
            <span className="text-xs text-muted-foreground">
              {budget._count.items} {budget._count.items === 1 ? 'item' : 'itens'}
            </span>
          )}
        </div>

        {/* Valid Until */}
        {budget.validUntil && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Válido até {formatDate(budget.validUntil)}
            </span>
          </div>
        )}

        {/* Approved info */}
        {budget.status === 'approved' && budget.approver && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">
              Aprovado por {budget.approver.name}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/orcamentos/${budget.id}`}>
              <Eye className="h-4 w-4 mr-1" />
              Ver Detalhes
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Budget table row component
function BudgetTableRow({ budget }: { budget: Budget }) {
  return (
    <TableRow>
      <TableCell>
        <div className="space-y-1">
          <p className="font-medium">{budget.name}</p>
          {budget.code && (
            <p className="text-xs text-muted-foreground font-mono">{budget.code}</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        {budget.project ? (
          <span className="truncate max-w-[150px] block">{budget.project.name}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge status={budget.status} />
      </TableCell>
      <TableCell className="text-right font-medium text-green-600">
        {formatCurrency(budget.totalValue)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(budget.createdAt)}
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
              <Link href={`/orcamentos/${budget.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/orcamentos/${budget.id}/editar`}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function OrcamentosPage() {
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');

  // Redirect if not authenticated
  if (!sessionLoading && !isAuthenticated) {
    redirect('/login');
  }

  // Fetch budgets
  const { data: budgetsData, isLoading: budgetsLoading, error } = useQuery({
    queryKey: ['budgets', search, statusFilter, projectFilter],
    queryFn: () =>
      fetchBudgets({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        projectId: projectFilter !== 'all' ? projectFilter : undefined,
      }),
    enabled: isAuthenticated,
  });

  // Fetch projects for filter
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: fetchProjects,
    enabled: isAuthenticated,
  });

  const budgets = budgetsData?.data ?? [];

  // Stats
  const stats = useMemo(() => {
    if (!budgets.length) return { total: 0, draft: 0, pending: 0, approved: 0, rejected: 0 };
    return {
      total: budgets.length,
      draft: budgets.filter((b) => b.status === 'draft').length,
      pending: budgets.filter((b) => b.status === 'pending').length,
      approved: budgets.filter((b) => b.status === 'approved').length,
      rejected: budgets.filter((b) => b.status === 'rejected').length,
    };
  }, [budgets]);

  if (sessionLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orçamentos</h1>
          <p className="text-muted-foreground">
            Gerencie os orçamentos dos seus projetos
          </p>
        </div>
        <Button asChild>
          <Link href="/orcamentos/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo Orçamento
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-500/10">
                <FileText className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.draft}</p>
                <p className="text-xs text-muted-foreground">Rascunhos</p>
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
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
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
                <p className="text-2xl font-bold">{stats.approved}</p>
                <p className="text-xs text-muted-foreground">Aprovados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.rejected}</p>
                <p className="text-xs text-muted-foreground">Rejeitados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código ou descrição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {Object.entries(BUDGET_STATUS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Project Filter */}
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Projetos</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive">
            Erro ao carregar orçamentos. Tente novamente.
          </CardContent>
        </Card>
      )}

      {budgetsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum orçamento encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {search || statusFilter !== 'all' || projectFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece criando seu primeiro orçamento'}
            </p>
            <Button asChild>
              <Link href="/orcamentos/novo">
                <Plus className="h-4 w-4 mr-2" />
                Novo Orçamento
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgets.map((budget) => (
                <BudgetTableRow key={budget.id} budget={budget} />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
