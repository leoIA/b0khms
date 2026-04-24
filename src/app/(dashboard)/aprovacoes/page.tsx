// =============================================================================
// ConstrutorPro - Página de Aprovações
// Gerenciamento de solicitações de aprovação
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  DollarSign,
  ShoppingCart,
  Building2,
  Search,
  Filter,
  ArrowUpRight,
  Calendar,
  User,
} from 'lucide-react';
import { formatCurrency } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =============================================================================
// Tipos
// =============================================================================

interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  description: string | null;
  value: number | null;
  urgency: string;
  status: string;
  currentStep: number;
  createdAt: string;
  dueDate: string | null;
  workflowId: string;
  requestedByUser: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  approval_workflows: {
    id: string;
    name: string;
    entityType: string;
  };
  approval_decisions: Array<{
    id: string;
    decision: string;
    comment: string | null;
    decidedAt: string;
    users: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface PaginatedResponse {
  data: ApprovalRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// =============================================================================
// Constantes
// =============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  in_progress: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800', icon: ArrowUpRight },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: XCircle },
  cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
  expired: { label: 'Expirado', color: 'bg-orange-100 text-orange-800', icon: Clock },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'bg-gray-100 text-gray-700' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
};

const ENTITY_TYPE_CONFIG: Record<string, { label: string; icon: typeof FileText }> = {
  budget: { label: 'Orçamento', icon: FileText },
  purchase_order: { label: 'Pedido de Compra', icon: ShoppingCart },
  transaction: { label: 'Transação', icon: DollarSign },
  medicao: { label: 'Medição', icon: FileText },
  project: { label: 'Projeto', icon: Building2 },
  quotation: { label: 'Cotação', icon: FileText },
};

// =============================================================================
// Componente Principal
// =============================================================================

export default function AprovacoesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('pending');
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [activeTab, statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab === 'pending') {
        params.set('pendingApprovalFor', 'me');
      } else if (activeTab === 'my-requests') {
        // Will show user's own requests
      } else if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (search) {
        params.set('search', search);
      }

      const response = await fetch(`/api/aprovacoes/solicitacoes?${params}`);
      if (response.ok) {
        const data: PaginatedResponse = await response.json();
        setRequests(data.data);
      }
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/aprovacoes/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRequests();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aprovações</h1>
          <p className="text-muted-foreground">
            Gerencie solicitações de aprovação e fluxos de trabalho
          </p>
        </div>
        <Button onClick={() => router.push('/aprovacoes/workflows')}>
          <FileText className="h-4 w-4 mr-2" />
          Configurar Workflows
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitadas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Solicitações</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pending">
              Pendentes para Mim
              {stats.pending > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="my-requests">Minhas Solicitações</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar solicitações..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Button type="submit" variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </form>

            {activeTab === 'all' && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Content */}
        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <RequestsSkeleton />
          ) : requests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhuma solicitação encontrada</p>
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'pending'
                    ? 'Você não tem solicitações pendentes no momento'
                    : 'Não há solicitações para exibir'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// Components
// =============================================================================

function RequestCard({ request }: { request: ApprovalRequest }) {
  const router = useRouter();
  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  const urgencyConfig = URGENCY_CONFIG[request.urgency] || URGENCY_CONFIG.normal;
  const entityConfig = ENTITY_TYPE_CONFIG[request.entityType] || ENTITY_TYPE_CONFIG.budget;
  const StatusIcon = statusConfig.icon;
  const EntityIcon = entityConfig.icon;

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/aprovacoes/${request.id}`)}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-muted">
              <EntityIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{request.title}</h3>
                <Badge className={statusConfig.color}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig.label}
                </Badge>
                <Badge className={urgencyConfig.color} variant="outline">
                  {urgencyConfig.label}
                </Badge>
              </div>
              {request.description && (
                <p className="text-sm text-muted-foreground mb-2">{request.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {request.requestedByUser.name}
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDistanceToNow(new Date(request.createdAt), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </div>
                <Badge variant="outline">{entityConfig.label}</Badge>
              </div>
            </div>
          </div>

          <div className="text-right">
            {request.value !== null && (
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(request.value)}
              </p>
            )}
            {request.dueDate && (
              <p className="text-xs text-muted-foreground">
                Prazo:{' '}
                {new Date(request.dueDate).toLocaleDateString('pt-BR')}
              </p>
            )}
            {request.approval_decisions.length > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {request.approval_decisions.length} decisão(ões)
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="text-right">
                <Skeleton className="h-6 w-24 ml-auto" />
                <Skeleton className="h-4 w-20 ml-auto mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
