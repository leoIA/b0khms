// =============================================================================
// ConstrutorPro - Header Component
// =============================================================================

'use client';

import { Bell, Search, Moon, Sun, LogOut, User, Settings, AlertTriangle, Info, CheckCircle, XCircle, Check, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from 'next-themes';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtimeNotifications } from '@/hooks/use-realtime';

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface AlertsResponse {
  success: boolean;
  data: Alert[];
}

async function fetchAlerts(isRead: string): Promise<AlertsResponse> {
  const response = await fetch(`/api/alerts?isRead=${isRead}`);
  return response.json();
}

async function markAlertAsRead(id: string): Promise<void> {
  const response = await fetch('/api/alerts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Erro ao marcar alerta como lido');
  }
}

async function markAllAlertsAsRead(): Promise<void> {
  const response = await fetch('/api/alerts', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ markAllAsRead: true }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Erro ao marcar alertas como lidos');
  }
}

// Helper function to format relative time in Portuguese
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) {
    return 'agora mesmo';
  } else if (diffMinutes < 60) {
    return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  } else if (diffDays < 7) {
    return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  } else {
    return date.toLocaleDateString('pt-BR');
  }
}

// Get navigation path based on entity type
function getEntityPath(entityType?: string | null, entityId?: string | null): string | null {
  if (!entityType || !entityId) return null;
  
  const routes: Record<string, string> = {
    project: `/projetos/${entityId}`,
    budget: `/orcamentos/${entityId}`,
    client: `/clientes/${entityId}`,
    supplier: `/fornecedores/${entityId}`,
    schedule: `/cronograma/${entityId}`,
    dailyLog: `/diario-obra/${entityId}`,
    transaction: `/financeiro`,
    material: `/materiais`,
    composition: `/composicoes`,
  };
  
  return routes[entityType] || null;
}

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [realtimeNotifications, setRealtimeNotifications] = useState<Alert[]>([]);

  const user = session?.user;

  // Fetch unread alerts
  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['alerts', 'unread'],
    queryFn: () => fetchAlerts('false'),
    refetchInterval: 60000, // Refresh every minute
  });

  // Subscrição para notificações em tempo real
  useRealtimeNotifications({
    companyId: user?.companyId || '',
    userId: user?.id,
    onNewNotification: (notification) => {
      // Adicionar notificação em tempo real à lista
      setRealtimeNotifications((prev) => [
        {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          entityType: notification.entityType || null,
          entityId: notification.entityId || null,
          isRead: notification.read,
          createdAt: notification.createdAt.toISOString(),
        },
        ...prev,
      ]);
      // Invalidar query para atualizar contagem
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // Combinar notificações do servidor com as recebidas em tempo real
  const baseAlerts = alertsData?.data || [];
  const alerts = [...realtimeNotifications, ...baseAlerts.filter((a) => 
    !realtimeNotifications.some((r) => r.id === a.id)
  )];
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  // Mutation to mark single alert as read
  const markAsReadMutation = useMutation({
    mutationFn: markAlertAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // Mutation to mark all alerts as read
  const markAllAsReadMutation = useMutation({
    mutationFn: markAllAlertsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'info':
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleAlertClick = (alert: Alert) => {
    // Mark as read
    markAsReadMutation.mutate(alert.id);
    
    // Remove from realtime list
    setRealtimeNotifications((prev) => prev.filter((a) => a.id !== alert.id));
    
    // Navigate to entity if available
    const path = getEntityPath(alert.entityType, alert.entityId);
    if (path) {
      router.push(path);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
    setRealtimeNotifications([]);
  };

  return (
    <header className="h-16 border-b border-border bg-card px-4 flex items-center justify-between">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar projetos, clientes, materiais..."
            className="pl-10 bg-muted/50"
            onFocus={() => setSearchOpen(true)}
            onBlur={() => setSearchOpen(false)}
            aria-label="Pesquisar"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Alternar tema"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notificações</span>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto py-1 px-2 text-xs text-primary"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                >
                  <CheckCheck className="h-3 w-3 mr-1" />
                  Marcar todas como lidas
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {isLoading ? (
              // Loading skeletons
              <>
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="px-2 py-3">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </>
            ) : alerts.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <>
                {alerts.map((alert) => (
                  <DropdownMenuItem
                    key={alert.id}
                    className="flex items-start gap-3 py-3 cursor-pointer"
                    onClick={() => handleAlertClick(alert)}
                  >
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{alert.title}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsReadMutation.mutate(alert.id);
                          }}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {alert.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatTimeAgo(alert.createdAt)}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-center justify-center text-primary cursor-pointer"
                  onClick={() => router.push('/')}
                >
                  Ver todas as notificações
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarImage src={user?.avatar} alt={user?.name ?? ''} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.name ? getInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/perfil')}>
              <User className="mr-2 h-4 w-4" />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/configuracoes')}>
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
