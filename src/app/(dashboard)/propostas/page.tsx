// =============================================================================
// ConstrutorPro - Propostas Comerciais - Listagem
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  Send,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  FileSignature,
  Users,
  ArrowUpDown,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/api';

// Status configuration
const PROPOSAL_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-500' },
  review: { label: 'Em Revisão', color: 'bg-blue-500' },
  sent: { label: 'Enviada', color: 'bg-yellow-500' },
  viewed: { label: 'Visualizada', color: 'bg-indigo-500' },
  accepted: { label: 'Aceita', color: 'bg-green-500' },
  rejected: { label: 'Rejeitada', color: 'bg-red-500' },
  expired: { label: 'Expirada', color: 'bg-orange-500' },
  cancelled: { label: 'Cancelada', color: 'bg-gray-400' },
};

// Types
interface Proposal {
  id: string;
  number: string;
  title: string;
  status: string;
  totalValue: number;
  validUntil: string | null;
  createdAt: string;
  version: number;
  client: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  project: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  _count?: {
    proposal_items: number;
  };
}

interface ProposalsResponse {
  data: Proposal[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Fetch proposals
async function fetchProposals(params: {
  search?: string;
  status?: string;
}): Promise<ProposalsResponse> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.status) searchParams.set('status', params.status);

  const response = await fetch(`/api/propostas?${searchParams.toString()}`);
  if (!response.ok) throw new Error('Erro ao carregar propostas');
  return response.json();
}

// Fetch clients for filter
async function fetchClients(): Promise<{ id: string; name: string }[]> {
  const response = await fetch('/api/clientes?limit=100');
  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const config = PROPOSAL_STATUS[status] || PROPOSAL_STATUS.draft;
  return (
    <Badge variant="outline" className={`${config.color} text-white border-0`}>
      {config.label}
    </Badge>
  );
}

// Status icon
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'accepted':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'sent':
    case 'viewed':
      return <Send className="h-4 w-4 text-yellow-500" />;
    case 'expired':
      return <Clock className="h-4 w-4 text-orange-500" />;
    case 'review':
      return <RefreshCw className="h-4 w-4 text-blue-500" />;
    default:
      return <FileText className="h-4 w-4 text-gray-500" />;
  }
}

// Table skeleton
function TableSkeleton() {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            {[...Array(7)].map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(5)].map((_, i) => (
            <TableRow key={i}>
              {[...Array(7)].map((_, j) => (
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

// Proposal table row component
function ProposalTableRow({ proposal }: { proposal: Proposal }) {
  return (
    <TableRow>
      <TableCell>
        <div className="space-y-1">
          <p className="font-mono text-xs text-muted-foreground">{proposal.number}</p>
          <p className="font-medium line-clamp-1">{proposal.title}</p>
          {proposal.version > 1 && (
            <p className="text-xs text-muted-foreground">v{proposal.version}</p>
          )}
        </div>
      </TableCell>
      <TableCell>
        {proposal.client ? (
          <div className="space-y-1">
            <p className="truncate max-w-[150px]">{proposal.client.name}</p>
            {proposal.client.email && (
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">{proposal.client.email}</p>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {proposal.project ? (
          <span className="truncate max-w-[120px] block">{proposal.project.name}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <StatusBadge status={proposal.status} />
      </TableCell>
      <TableCell className="text-right font-medium text-green-600">
        {formatCurrency(proposal.totalValue)}
      </TableCell>
      <TableCell className="text-muted-foreground">
        <div className="space-y-1">
          <p>{formatDate(proposal.createdAt)}</p>
          {proposal.validUntil && (
            <p className="text-xs">Válida até {formatDate(proposal.validUntil)}</p>
          )}
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
              <Link href={`/propostas/${proposal.id}`}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </Link>
            </DropdownMenuItem>
            {proposal.status === 'draft' && (
              <DropdownMenuItem asChild>
                <Link href={`/propostas/${proposal.id}/editar`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {proposal.status === 'draft' && (
              <DropdownMenuItem>
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <FileSignature className="h-4 w-4 mr-2" />
              Gerar PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export default function PropostasPage() {
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Redirect if not authenticated
  if (!sessionLoading && !isAuthenticated) {
    redirect('/login');
  }

  // Fetch proposals
  const { data: proposalsData, isLoading: proposalsLoading, error } = useQuery({
    queryKey: ['proposals', search, statusFilter],
    queryFn: () =>
      fetchProposals({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      }),
    enabled: isAuthenticated,
  });

  // Fetch clients for display
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-list'],
    queryFn: fetchClients,
    enabled: isAuthenticated,
  });

  const proposals = proposalsData?.data ?? [];

  // Stats
  const stats = useMemo(() => {
    if (!proposals.length) return { total: 0, draft: 0, sent: 0, accepted: 0, rejected: 0 };
    return {
      total: proposals.length,
      draft: proposals.filter((p) => p.status === 'draft').length,
      sent: proposals.filter((p) => p.status === 'sent' || p.status === 'viewed').length,
      accepted: proposals.filter((p) => p.status === 'accepted').length,
      rejected: proposals.filter((p) => p.status === 'rejected').length,
    };
  }, [proposals]);

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
          <h1 className="text-3xl font-bold tracking-tight">Propostas Comerciais</h1>
          <p className="text-muted-foreground">
            Gerencie suas propostas comerciais e acompanhe o status de envio
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/propostas/modelos">
              <FileText className="h-4 w-4 mr-2" />
              Modelos
            </Link>
          </Button>
          <Button asChild>
            <Link href="/propostas/novo">
              <Plus className="h-4 w-4 mr-2" />
              Nova Proposta
            </Link>
          </Button>
        </div>
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
                <Send className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.sent}</p>
                <p className="text-xs text-muted-foreground">Enviadas</p>
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
                <p className="text-2xl font-bold">{stats.accepted}</p>
                <p className="text-xs text-muted-foreground">Aceitas</p>
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
                <p className="text-xs text-muted-foreground">Rejeitadas</p>
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
                placeholder="Buscar por título, número ou cliente..."
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
                {Object.entries(PROPOSAL_STATUS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
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
            Erro ao carregar propostas. Tente novamente.
          </CardContent>
        </Card>
      )}

      {proposalsLoading ? (
        <TableSkeleton />
      ) : proposals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma proposta encontrada</h3>
            <p className="text-muted-foreground mb-4">
              {search || statusFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece criando sua primeira proposta comercial'}
            </p>
            <Button asChild>
              <Link href="/propostas/novo">
                <Plus className="h-4 w-4 mr-2" />
                Nova Proposta
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proposta</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Projeto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead>Criada em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((proposal) => (
                <ProposalTableRow key={proposal.id} proposal={proposal} />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
