// =============================================================================
// ConstrutorPro - Página de Notificações
// Listagem completa com filtros, ações em massa e detalhes
// =============================================================================

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/alert-dialog';
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  Filter,
  Search,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface NotificationListResponse {
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// Constants
// =============================================================================

const NOTIFICATION_TYPES = {
  info: { label: 'Informação', icon: Info, color: 'bg-blue-500', textColor: 'text-blue-600' },
  success: { label: 'Sucesso', icon: CheckCircle, color: 'bg-green-500', textColor: 'text-green-600' },
  warning: { label: 'Aviso', icon: AlertTriangle, color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  error: { label: 'Erro', icon: XCircle, color: 'bg-red-500', textColor: 'text-red-600' },
} as const;

const ENTITY_ROUTES: Record<string, string> = {
  project: '/projetos',
  budget: '/orcamentos',
  client: '/clientes',
  supplier: '/fornecedores',
  material: '/materiais',
  composition: '/composicoes',
  task: '/cronograma',
  transaction: '/financeiro',
  daily_log: '/diario-obra',
  schedule: '/cronograma',
  quotation: '/cotacoes',
  purchase: '/compras',
  measurement: '/medicoes',
};

const ITEMS_PER_PAGE = 20;

// =============================================================================
// API Functions
// =============================================================================

async function fetchNotifications(params: {
  page: number;
  type?: string;
  isRead?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<NotificationListResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('page', params.page.toString());
  searchParams.set('limit', ITEMS_PER_PAGE.toString());

  if (params.type && params.type !== 'all') {
    searchParams.set('type', params.type);
  }
  if (params.isRead && params.isRead !== 'all') {
    searchParams.set('isRead', params.isRead);
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }
  if (params.dateFrom) {
    searchParams.set('dateFrom', params.dateFrom);
  }
  if (params.dateTo) {
    searchParams.set('dateTo', params.dateTo);
  }

  const response = await fetch(`/api/alerts?${searchParams.toString()}`);
  if (!response.ok) {
    throw new Error('Erro ao carregar notificações');
  }
  const result = await response.json();
  // Handle API response structure
  return {
    data: result.data || [],
    pagination: result.pagination || {
      page: 1,
      limit: ITEMS_PER_PAGE,
      total: (result.data || []).length,
      totalPages: 1,
    },
  };
}

async function markAsRead(id: string): Promise<void> {
  const response = await fetch('/api/alerts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) throw new Error('Erro ao marcar como lida');
}

async function markAllAsRead(): Promise<void> {
  const response = await fetch('/api/alerts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markAllAsRead: true }),
  });
  if (!response.ok) throw new Error('Erro ao marcar todas como lidas');
}

async function deleteNotification(id: string): Promise<void> {
  const response = await fetch(`/api/alerts/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Erro ao excluir notificação');
}

async function deleteSelectedNotifications(ids: string[]): Promise<void> {
  const response = await fetch('/api/alerts/bulk-delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
  if (!response.ok) throw new Error('Erro ao excluir notificações');
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatRelativeTime(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Data inválida';
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  } catch {
    return 'Data inválida';
  }
}

function formatFullDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return 'Data inválida';
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Data inválida';
  }
}

// =============================================================================
// Components
// =============================================================================

function NotificationSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {hasFilters ? (
        <>
          <Filter className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Nenhuma notificação encontrada</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Tente ajustar os filtros para encontrar o que procura
          </p>
        </>
      ) : (
        <>
          <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Nenhuma notificação</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Você está em dia! Novas notificações aparecerão aqui.
          </p>
        </>
      )}
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function NotificationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch notifications
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['notifications', page, typeFilter, readFilter, searchQuery, dateFrom, dateTo],
    queryFn: () => fetchNotifications({
      page,
      type: typeFilter,
      isRead: readFilter,
      search: searchQuery,
      dateFrom,
      dateTo,
    }),
    staleTime: 30000, // 30 seconds
  });

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      toast({
        title: 'Sucesso',
        description: 'Todas as notificações foram marcadas como lidas',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar as notificações como lidas',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      toast({
        title: 'Sucesso',
        description: 'Notificação excluída com sucesso',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a notificação',
        variant: 'destructive',
      });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: deleteSelectedNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unread-count'] });
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      toast({
        title: 'Sucesso',
        description: 'Notificações excluídas com sucesso',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir as notificações',
        variant: 'destructive',
      });
    },
  });

  // Handlers
  function handleSelectAll() {
    const notifications = data?.data;
    if (notifications) {
      if (selectedIds.size === notifications.length) {
        setSelectedIds(new Set());
      } else {
        setSelectedIds(new Set(notifications.map(n => n.id)));
      }
    }
  }

  function handleSelectOne(id: string) {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function handleNavigate(notification: Notification) {
    // Mark as read first
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate if there's an entity
    if (notification.entityType && notification.entityId) {
      const baseRoute = ENTITY_ROUTES[notification.entityType];
      if (baseRoute) {
        router.push(`${baseRoute}/${notification.entityId}`);
      }
    }
  }

  async function handleMarkSelectedAsRead() {
    const notifications = data?.data || [];
    const unreadIds = Array.from(selectedIds).filter(id => {
      const notification = notifications.find(n => n.id === id);
      return notification && !notification.isRead;
    });

    if (unreadIds.length === 0) {
      toast({
        title: 'Aviso',
        description: 'Todas as notificações selecionadas já estão lidas',
      });
      return;
    }

    // Mark each as read
    for (const id of unreadIds) {
      await markAsRead(id);
    }

    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['unread-count'] });
    setSelectedIds(new Set());

    toast({
      title: 'Sucesso',
      description: `${unreadIds.length} notificação(ões) marcada(s) como lida(s)`,
    });
  }

  function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    bulkDeleteMutation.mutate(ids);
  }

  function clearFilters() {
    setTypeFilter('all');
    setReadFilter('all');
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  // Calculate stats
  const notifications = data?.data || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const hasActiveFilters = typeFilter !== 'all' || readFilter !== 'all' || !!searchQuery || !!dateFrom || !!dateTo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificações</h1>
          <p className="text-muted-foreground">
            Gerencie todas as suas notificações em um só lugar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isFetching && 'animate-spin')} />
            Atualizar
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{data?.pagination?.total || notifications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <CheckCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lidas</p>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.isRead).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                <BellOff className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Não Lidas</p>
                <p className="text-2xl font-bold text-orange-600">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alertas</p>
                <p className="text-2xl font-bold">
                  {notifications.filter(n => n.type === 'warning' || n.type === 'error').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="info">Informação</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={readFilter} onValueChange={(v) => { setReadFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="false">Não lidas</SelectItem>
                  <SelectItem value="true">Lidas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button
                variant="outline"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="border-primary">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedIds.size} notificação(ões) selecionada(s)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkSelectedAsRead}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Marcar como lidas
                </Button>
                <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir selecionadas
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir {selectedIds.size} notificação(ões)?
                        Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteSelected}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Lista de Notificações</CardTitle>
            {notifications.length > 0 && (
              <Checkbox
                checked={selectedIds.size === notifications.length}
                onCheckedChange={handleSelectAll}
                aria-label="Selecionar todas"
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <NotificationSkeleton />
          ) : notifications.length > 0 ? (
            <div className="space-y-2">
              {notifications.map((notification) => {
                const typeConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.info;
                const Icon = typeConfig.icon;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'flex items-start gap-4 p-4 border rounded-lg transition-colors cursor-pointer hover:bg-muted/50',
                      !notification.isRead && 'bg-muted/30 border-l-4 border-l-primary'
                    )}
                  >
                    <Checkbox
                      checked={selectedIds.has(notification.id)}
                      onCheckedChange={() => handleSelectOne(notification.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label="Selecionar notificação"
                    />

                    <div className={cn('p-2 rounded-full', typeConfig.color)}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>

                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => handleNavigate(notification)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{notification.title}</h4>
                        {!notification.isRead && (
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            Nova
                          </Badge>
                        )}
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {typeConfig.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span title={formatFullDate(notification.createdAt)}>
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                        {notification.entityType && (
                          <span className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            {notification.entityType}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!notification.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(notification.id);
                          }}
                          title="Marcar como lida"
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMutation.mutate(notification.id);
                        }}
                        title="Excluir"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState hasFilters={hasActiveFilters} />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {((page - 1) * ITEMS_PER_PAGE) + 1} a{' '}
            {Math.min(page * ITEMS_PER_PAGE, data.pagination.total)} de{' '}
            {data.pagination.total} notificações
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                let pageNum: number;
                if (data.pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= data.pagination.totalPages - 2) {
                  pageNum = data.pagination.totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className="w-9"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
