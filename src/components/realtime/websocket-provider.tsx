// =============================================================================
// ConstrutorPro - WebSocket Provider
// Provider React para gerenciar conexão WebSocket globalmente
// =============================================================================

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import {
  useWebSocket,
  type WebSocketState,
  type ProgressPayload,
  type NotificationPayload,
} from '@/hooks/use-websocket';

// =============================================================================
// Tipos
// =============================================================================

interface SubscriptionOptions {
  channel?: string;
  eventTypes?: string[];
}

interface WebSocketContextValue {
  // Estado da conexão
  state: WebSocketState;
  isConnected: boolean;
  isAuthenticated: boolean;

  // Notificações
  notifications: NotificationPayload[];
  unreadCount: number;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;

  // Progresso
  activeProgress: ProgressPayload[];

  // Presença
  onlineUsers: OnlineUser[];
  setMyStatus: (status: 'online' | 'away' | 'busy') => void;

  // Métodos
  subscribe: (options?: SubscriptionOptions) => void;
  unsubscribe: (channel: string) => void;
  broadcast: (eventType: string, data: unknown, targetUserId?: string) => boolean;
  reconnect: () => void;
  disconnect: () => void;
}

interface OnlineUser {
  userId: string;
  userName: string;
  userEmail: string;
  status: 'online' | 'away' | 'busy';
  currentPage?: string;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

// =============================================================================
// Provider
// =============================================================================

interface WebSocketProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
}

export function WebSocketProvider({
  children,
  autoConnect = true,
}: WebSocketProviderProps) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Estado local
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeProgress, setActiveProgress] = useState<ProgressPayload[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  // Referências para evitar duplicatas
  const notificationIdsRef = useRef(new Set<string>());
  const progressIdsRef = useRef(new Set<string>());

  // Callbacks
  const handleNotification = useCallback((notification: NotificationPayload) => {
    // Evitar duplicatas
    if (notificationIdsRef.current.has(notification.id)) return;
    notificationIdsRef.current.add(notification.id);

    setNotifications(prev => [notification, ...prev].slice(0, 100));
    setUnreadCount(prev => prev + 1);

    // Tocar som de notificação se disponível
    if (typeof window !== 'undefined' && 'Audio' in window) {
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignorar erros de autoplay
        });
      } catch {
        // Ignorar erros de áudio
      }
    }
  }, []);

  const handleProgress = useCallback((progress: ProgressPayload) => {
    setActiveProgress(prev => {
      const updated = new Map(prev.map(p => [p.progressId, p]));
      updated.set(progress.progressId, progress);
      return Array.from(updated.values());
    });

    // Limpar progresso completo após delay
    if (progress.status === 'completed' || progress.status === 'error') {
      setTimeout(() => {
        setActiveProgress(prev => prev.filter(p => p.progressId !== progress.progressId));
      }, 5000);
    }
  }, []);

  const handlePresenceUpdate = useCallback((data: unknown) => {
    const presence = data as {
      userId?: string;
      userName?: string;
      status?: 'online' | 'away' | 'busy';
      currentPage?: string;
    };

    if (!presence.userId) return;

    const userId = presence.userId; // Capture userId to avoid undefined issue

    setOnlineUsers(prev => {
      const index = prev.findIndex(u => u.userId === userId);

      if (index >= 0) {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          ...(presence.status && { status: presence.status }),
          ...(presence.currentPage && { currentPage: presence.currentPage }),
        };
        return updated;
      }

      if (presence.status === 'online' || presence.status === 'away') {
        return [
          ...prev,
          {
            userId: userId,
            userName: presence.userName || '',
            userEmail: '',
            status: presence.status,
            currentPage: presence.currentPage,
          },
        ];
      }

      return prev;
    });
  }, []);

  const handlePresenceLeave = useCallback((data: unknown) => {
    const presence = data as { userId?: string };
    if (!presence.userId) return;

    setOnlineUsers(prev => prev.filter(u => u.userId !== presence.userId));
  }, []);

  // Hook WebSocket
  const {
    state,
    subscribe,
    unsubscribe,
    broadcast,
    updatePresence,
    disconnect,
    reconnect,
  } = useWebSocket({
    companyId: session?.user?.companyId || '',
    userId: session?.user?.id || '',
    userName: session?.user?.name || '',
    userEmail: session?.user?.email || '',
    userRole: (session?.user as { role?: string })?.role || '',
    enabled: autoConnect && status === 'authenticated' && !!session?.user?.companyId,
    onNotification: handleNotification,
    onProgress: handleProgress,
    onPresenceUpdate: (data) => {
      const presence = data as { userId?: string; status?: string };
      if (presence.status === 'offline') {
        handlePresenceLeave(data);
      } else {
        handlePresenceUpdate(data);
      }
    },
  });

  // Atualizar presença quando a página muda
  useEffect(() => {
    if (state.isAuthenticated && session?.user?.companyId) {
      updatePresence('online', pathname);
    }
  }, [pathname, state.isAuthenticated, session?.user?.companyId, updatePresence]);

  // Marcar como lida
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Marcar todas como lidas
  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Definir status
  const setMyStatus = useCallback(
    (status: 'online' | 'away' | 'busy') => {
      updatePresence(status, pathname);
    },
    [updatePresence, pathname]
  );

  // Valor do contexto
  const value: WebSocketContextValue = {
    state,
    isConnected: state.isConnected,
    isAuthenticated: state.isAuthenticated,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    activeProgress,
    onlineUsers,
    setMyStatus,
    subscribe,
    unsubscribe,
    broadcast,
    reconnect,
    disconnect,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// =============================================================================
// Hook para usar o contexto
// =============================================================================

export function useWebSocketContext(): WebSocketContextValue {
  const context = useContext(WebSocketContext);

  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }

  return context;
}

// =============================================================================
// Hook para verificar se está no provider
// =============================================================================

export function useWebSocketOptional(): WebSocketContextValue | null {
  return useContext(WebSocketContext);
}
