// =============================================================================
// ConstrutorPro - Real-time Hooks
// Hooks React para conexão e uso de eventos em tempo real
// =============================================================================

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { RealtimeEventType, RealtimeEvent } from '@/lib/realtime';

// =============================================================================
// Tipos
// =============================================================================

interface UseRealtimeOptions {
  companyId: string;
  userId?: string;
  filters?: RealtimeEventType[];
  enabled?: boolean;
  onEvent?: (event: RealtimeEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface RealtimeState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  lastEvent: RealtimeEvent | null;
  connectionId: string | null;
}

// =============================================================================
// Hook Principal: useRealtime
// =============================================================================

export function useRealtime(options: UseRealtimeOptions): RealtimeState {
  const {
    companyId,
    userId,
    filters,
    enabled = true,
    onEvent,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    lastEvent: null,
    connectionId: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!enabled || !companyId || eventSourceRef.current) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    // Construir URL com parâmetros
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (filters) params.append('filters', filters.join(','));
    
    const url = `/api/realtime/events?companyId=${companyId}&${params.toString()}`;

    try {
      const eventSource = new EventSource(url, {
        withCredentials: true,
      });

      eventSource.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
        }));
        onConnect?.();
      };

      eventSource.onerror = (error) => {
        const err = new Error('SSE connection error');
        
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          error: err,
        }));

        onError?.(err);

        // Tentar reconectar
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(
            1000 * Math.pow(2, reconnectAttemptsRef.current),
            30000
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            eventSource.close();
            eventSourceRef.current = null;
            connect();
          }, delay);
        } else {
          onDisconnect?.();
        }
      };

      // Listener para todos os tipos de eventos
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const realtimeEvent: RealtimeEvent = {
            id: event.lastEventId || Date.now().toString(),
            type: event.type as RealtimeEventType || 'system:alert',
            companyId: data._meta?.companyId || companyId,
            userId: data._meta?.userId,
            data: data,
            timestamp: new Date(data._meta?.timestamp || new Date()),
          };

          setState(prev => ({
            ...prev,
            lastEvent: realtimeEvent,
          }));

          onEvent?.(realtimeEvent);
        } catch (e) {
          console.error('Error parsing realtime event:', e);
        }
      };

      eventSourceRef.current = eventSource;
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      }));
    }
  }, [companyId, userId, filters, enabled, onEvent, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      connectionId: null,
    }));

    onDisconnect?.();
  }, [onDisconnect]);

  // Conectar quando habilitado
  useEffect(() => {
    if (enabled && companyId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, companyId, connect, disconnect]);

  // Heartbeat para manter conexão viva
  useEffect(() => {
    if (!state.isConnected) return;

    const heartbeatInterval = setInterval(() => {
      // Enviar heartbeat via POST
      fetch('/api/realtime/heartbeat', {
        method: 'POST',
        credentials: 'include',
      }).catch(console.error);
    }, 30000);

    return () => clearInterval(heartbeatInterval);
  }, [state.isConnected]);

  return state;
}

// =============================================================================
// Hook: useRealtimeSubscription
// =============================================================================

interface UseRealtimeSubscriptionOptions<T> {
  companyId: string;
  eventType: RealtimeEventType | RealtimeEventType[];
  onEvent: (data: T, event: RealtimeEvent) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription<T = unknown>(
  options: UseRealtimeSubscriptionOptions<T>
): RealtimeState {
  const { companyId, eventType, onEvent, enabled = true } = options;

  const filters = Array.isArray(eventType) ? eventType : [eventType];

  return useRealtime({
    companyId,
    filters,
    enabled,
    onEvent: (event) => {
      if (filters.includes(event.type)) {
        onEvent(event.data as T, event);
      }
    },
  });
}

// =============================================================================
// Hook: useRealtimeValue
// =============================================================================

interface UseRealtimeValueOptions<T> {
  companyId: string;
  eventType: RealtimeEventType;
  initialValue: T;
  enabled?: boolean;
}

export function useRealtimeValue<T>(
  options: UseRealtimeValueOptions<T>
): [T, RealtimeState] {
  const { companyId, eventType, initialValue, enabled = true } = options;

  const [value, setValue] = useState<T>(initialValue);

  const state = useRealtime({
    companyId,
    filters: [eventType],
    enabled,
    onEvent: (event) => {
      setValue(event.data as T);
    },
  });

  return [value, state];
}

// =============================================================================
// Hook: useRealtimePresence
// =============================================================================

interface UsePresenceOptions {
  companyId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  enabled?: boolean;
}

interface PresenceUser {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  currentPage?: string;
  lastSeen: Date;
}

export function usePresence(options: UsePresenceOptions) {
  const {
    companyId,
    userId,
    userName,
    userEmail,
    userAvatar,
    enabled = true,
  } = options;

  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [myStatus, setMyStatus] = useState<'online' | 'away' | 'busy'>('online');

  // Registrar presença
  useEffect(() => {
    if (!enabled || !companyId || !userId) return;

    // Registrar presença inicial
    fetch('/api/realtime/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId,
        userId,
        userName,
        userEmail,
        userAvatar,
        status: 'online',
        device: typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop',
      }),
    }).catch(console.error);

    // Heartbeat periódico
    const heartbeatInterval = setInterval(() => {
      fetch('/api/realtime/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, userId, status: myStatus }),
      }).catch(console.error);
    }, 60000);

    // Listener para visibility change
    const handleVisibilityChange = () => {
      const status = document.hidden ? 'away' : 'online';
      setMyStatus(status);
      
      fetch('/api/realtime/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, userId, status }),
      }).catch(console.error);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Buscar usuários online
    const fetchOnlineUsers = () => {
      fetch(`/api/realtime/presence?companyId=${companyId}`)
        .then(res => res.json())
        .then(data => {
          if (data.users) {
            setOnlineUsers(data.users);
          }
        })
        .catch(console.error);
    };

    fetchOnlineUsers();
    const usersInterval = setInterval(fetchOnlineUsers, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(usersInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Marcar como offline
      fetch('/api/realtime/presence', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, userId }),
      }).catch(console.error);
    };
  }, [enabled, companyId, userId, userName, userEmail, userAvatar, myStatus]);

  // Subscrever para atualizações de presença
  useRealtime({
    companyId,
    filters: ['activity:new'],
    enabled,
    onEvent: (event) => {
      type PresenceData = {
        type?: string;
        userId?: string;
        status?: 'online' | 'away' | 'busy' | 'offline';
        userName?: string;
        userEmail?: string;
        userAvatar?: string;
        currentPage?: string;
        lastSeen?: string;
      };
      const data = event.data as PresenceData | undefined;
      if (data?.type === 'presence') {
        setOnlineUsers(prev => {
          const updated = [...prev];
          const index = updated.findIndex(u => u.userId === data?.userId);
          
          if (index >= 0 && data) {
            updated[index] = { 
              ...updated[index], 
              ...(data.status ? { status: data.status } : {}),
              ...(data.currentPage ? { currentPage: data.currentPage } : {}),
            };
          } else if (data?.status === 'online') {
            updated.push({
              userId: data.userId || '',
              userName: data.userName || '',
              userEmail: data.userEmail || '',
              status: 'online',
              lastSeen: new Date(),
            });
          }
          
          return updated;
        });
      }
    },
  });

  const setCustomStatus = useCallback((status: 'online' | 'away' | 'busy') => {
    setMyStatus(status);
    
    fetch('/api/realtime/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, userId, status }),
    }).catch(console.error);
  }, [companyId, userId]);

  return {
    onlineUsers,
    myStatus,
    setCustomStatus,
    onlineCount: onlineUsers.filter(u => u.status === 'online').length,
  };
}

// =============================================================================
// Hook: useRealtimeNotifications
// =============================================================================

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  entityId?: string;
  entityType?: string;
}

export function useRealtimeNotifications(options: {
  companyId: string;
  userId?: string;
  onNewNotification?: (notification: Notification) => void;
}) {
  const { companyId, userId, onNewNotification } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useRealtime({
    companyId,
    userId,
    filters: ['notification:new', 'notification:read'],
    onEvent: (event) => {
      if (event.type === 'notification:new') {
        const notification = event.data as Notification;
        
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        onNewNotification?.(notification);
      } else if (event.type === 'notification:read') {
        const { id } = event.data as { id: string };
        
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    },
  });

  const markAsRead = useCallback((notificationId: string) => {
    fetch(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
    }).catch(console.error);
  }, []);

  const markAllAsRead = useCallback(() => {
    fetch('/api/notifications/read-all', {
      method: 'POST',
    }).catch(console.error);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
