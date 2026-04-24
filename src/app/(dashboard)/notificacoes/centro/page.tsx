// =============================================================================
// ConstrutorPro - Centro de Notificações
// Página centralizada para gerenciar todas as notificações e preferências
// =============================================================================

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Bell,
  Settings,
  History,
  Mail,
  Smartphone,
  CheckCheck,
  Trash2,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { NotificationPreferencesPanel } from '@/components/notifications/notification-preferences-panel';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface NotificationStats {
  total: number;
  unread: number;
  byType: {
    info: number;
    success: number;
    warning: number;
    error: number;
  };
  byCategory: {
    project: number;
    financial: number;
    schedule: number;
    stock: number;
    system: number;
    daily_log: number;
  };
  recentTrend: number; // percentage change from last week
}

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

// =============================================================================
// API Functions
// =============================================================================

async function fetchStats(): Promise<NotificationStats> {
  const response = await fetch('/api/notificacoes/stats');
  if (!response.ok) throw new Error('Erro ao carregar estatísticas');
  return response.json().then((r) => r.data);
}

async function fetchRecentNotifications(): Promise<Notification[]> {
  const response = await fetch('/api/alerts?limit=10');
  if (!response.ok) throw new Error('Erro ao carregar notificações');
  return response.json().then((r) => r.data || []);
}

async function markAllAsRead(): Promise<void> {
  const response = await fetch('/api/alerts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markAllAsRead: true }),
  });
  if (!response.ok) throw new Error('Erro ao marcar como lidas');
}

async function clearAllRead(): Promise<void> {
  const response = await fetch('/api/alerts/clear-read', {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Erro ao limpar notificações');
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

const typeConfig = {
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-100' },
  success: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
  warning: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  error: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' },
};

// =============================================================================
// Components
// =============================================================================

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function CentroNotificacoesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['notification-stats'],
    queryFn: fetchStats,
  });

  // Fetch recent notifications
  const { data: notifications, isLoading: notificationsLoading, refetch: refetchNotifications } = useQuery({
    queryKey: ['recent-notifications'],
    queryFn: fetchRecentNotifications,
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'Sucesso',
        description: 'Todas as notificações foram marcadas como lidas',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível marcar as notificações',
        variant: 'destructive',
      });
    },
  });

  // Clear all read mutation
  const clearReadMutation = useMutation({
    mutationFn: clearAllRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'Sucesso',
        description: 'Notificações lidas foram removidas',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível limpar as notificações',
        variant: 'destructive',
      });
    },
  });

  // Refresh all
  const handleRefresh = () => {
    refetchStats();
    refetchNotifications();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Centro de Notificações</h1>
          <p className="text-muted-foreground">
            Gerencie todas as suas notificações e preferências em um só lugar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          {stats && stats.unread > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="overview" className="gap-2">
            <Bell className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2">
            <Settings className="h-4 w-4" />
            Preferências
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Stats Cards */}
          {statsLoading ? (
            <StatsSkeleton />
          ) : stats && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                      <Bell className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                      <Mail className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Não Lidas</p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-orange-600">{stats.unread}</p>
                        {stats.recentTrend !== 0 && (
                          <Badge
                            variant={stats.recentTrend > 0 ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {stats.recentTrend > 0 ? '+' : ''}{stats.recentTrend}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Alertas</p>
                      <p className="text-2xl font-bold">
                        {stats.byType.warning + stats.byType.error}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Taxa de Leitura</p>
                      <p className="text-2xl font-bold text-green-600">
                        {stats.total > 0
                          ? Math.round(((stats.total - stats.unread) / stats.total) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Stats by Type */}
          {stats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notificações por Tipo</CardTitle>
                <CardDescription>Distribuição dos tipos de notificação</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  {Object.entries(stats.byType).map(([type, count]) => {
                    const config = typeConfig[type as keyof typeof typeConfig];
                    const Icon = config.icon;
                    return (
                      <div
                        key={type}
                        className="flex items-center gap-3 p-3 border rounded-lg"
                      >
                        <div className={cn('p-2 rounded-full', config.bg)}>
                          <Icon className={cn('h-4 w-4', config.color)} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground capitalize">{type}</p>
                          <p className="text-xl font-bold">{count}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Notifications */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Notificações Recentes</CardTitle>
                  <CardDescription>Últimas 10 notificações</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => clearReadMutation.mutate()}
                  disabled={clearReadMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Lidas
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {notificationsLoading ? (
                <NotificationSkeleton />
              ) : notifications && notifications.length > 0 ? (
                <div className="space-y-3">
                  {notifications.map((notification) => {
                    const config = typeConfig[notification.type];
                    const Icon = config.icon;
                    return (
                      <div
                        key={notification.id}
                        className={cn(
                          'flex items-start gap-3 p-3 border rounded-lg transition-colors hover:bg-muted/50',
                          !notification.isRead && 'bg-muted/30 border-l-4 border-l-primary'
                        )}
                      >
                        <div className={cn('p-2 rounded-full', config.bg)}>
                          <Icon className={cn('h-4 w-4', config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{notification.title}</p>
                            {!notification.isRead && (
                              <Badge variant="secondary" className="text-xs shrink-0">
                                Nova
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Nenhuma notificação</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setActiveTab('preferences')}
                >
                  <Settings className="h-5 w-5" />
                  <span>Configurar Preferências</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setActiveTab('history')}
                >
                  <History className="h-5 w-5" />
                  <span>Ver Histórico Completo</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => window.open('/webhooks', '_self')}
                >
                  <Smartphone className="h-5 w-5" />
                  <span>Configurar Webhooks</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center py-12 text-center">
                <div>
                  <History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Acesse a página de{' '}
                    <a href="/notificacoes" className="text-primary hover:underline">
                      Notificações
                    </a>{' '}
                    para ver o histórico completo com filtros e ações em massa.
                  </p>
                  <Button className="mt-4" onClick={() => window.open('/notificacoes', '_self')}>
                    Ver Histórico Completo
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="mt-6">
          <NotificationPreferencesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
