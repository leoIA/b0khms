// =============================================================================
// ConstrutorPro - Notification Bell Component
// Componente de sino de notificações com dropdown e indicador de não lidas
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useRealtimeNotifications } from '@/hooks/use-realtime';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

// Interface para notificação
interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  entityId?: string | null;
  entityType?: string | null;
  read: boolean;
  createdAt: Date;
}

// Mapeamento de ícones por tipo
const typeIcons = {
  info: '📌',
  success: '✅',
  warning: '⚠️',
  error: '❌',
};

// Formata tempo relativo
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `${minutes}m atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days < 7) return `${days}d atrás`;
  return new Date(date).toLocaleDateString('pt-BR');
}

// Rota por tipo de entidade
const entityRoutes: Record<string, string> = {
  project: '/projetos',
  budget: '/orcamentos',
  client: '/clientes',
  supplier: '/fornecedores',
  material: '/materiais',
  task: '/cronograma',
  transaction: '/financeiro',
};

export function NotificationBell() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Buscar notificações iniciais
  useEffect(() => {
    if (!session?.user?.companyId) return;

    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/alerts?isRead=false');
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.data || []);
          setUnreadCount((data.data || []).length);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [session?.user?.companyId]);

  // Subscrição para notificações em tempo real
  useRealtimeNotifications({
    companyId: session?.user?.companyId || '',
    userId: session?.user?.id,
    onNewNotification: (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    },
  });

  // Marcar como lida
  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Marcar todas como lidas
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, []);

  // Navegar para entidade
  const handleNavigate = useCallback(
    (notification: Notification) => {
      if (notification.entityType && notification.entityId) {
        const baseRoute = entityRoutes[notification.entityType] || '';
        if (baseRoute) {
          router.push(`${baseRoute}/${notification.entityId}`);
        }
      }
      handleMarkAsRead(notification.id);
      setIsOpen(false);
    },
    [router, handleMarkAsRead]
  );

  // Remover notificação da lista (após animação)
  const handleDismiss = useCallback((notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleMarkAsRead(notificationId);
  }, [handleMarkAsRead]);

  if (!session?.user?.companyId) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label="Notificações"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={cn(
                'absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs',
                unreadCount > 9 && 'w-6'
              )}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'relative p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                    !notification.read && 'bg-muted/30'
                  )}
                  onClick={() => handleNavigate(notification)}
                >
                  {/* Indicador de não lida */}
                  {!notification.read && (
                    <div className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                  )}

                  <div className={cn('pl-4', notification.read && 'pl-0')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{typeIcons[notification.type]}</span>
                        <span className="text-sm font-medium">{notification.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => handleDismiss(notification.id, e)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                router.push('/notificacoes');
                setIsOpen(false);
              }}
            >
              Ver todas as notificações
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
