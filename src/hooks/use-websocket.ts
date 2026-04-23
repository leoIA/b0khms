// =============================================================================
// ConstrutorPro - WebSocket Hook
// Hook React para conexão WebSocket em tempo real
// =============================================================================

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import type { WebSocketMessage, MessageType, ProgressPayload, NotificationPayload } from '@/lib/realtime/websocket';

// Re-exportar tipos para uso externo
export type { WebSocketMessage, MessageType, ProgressPayload, NotificationPayload } from '@/lib/realtime/websocket';

// =============================================================================
// Tipos
// =============================================================================

// Tipos exportados
export interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  lastMessage: WebSocketMessage | null;
  connectionId: string | null;
  reconnectAttempts: number;
}

interface UseWebSocketOptions {
  url?: string;
  companyId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  enabled?: boolean;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onProgress?: (progress: ProgressPayload) => void;
  onNotification?: (notification: NotificationPayload) => void;
  onPresenceUpdate?: (presence: unknown) => void;
  onEvent?: (event: unknown) => void;
}

interface SubscriptionOptions {
  channel?: string;
  eventTypes?: string[];
}

// =============================================================================
// Hook Principal: useWebSocket
// =============================================================================

export function useWebSocket(options: UseWebSocketOptions): {
  state: WebSocketState;
  subscribe: (options?: SubscriptionOptions) => void;
  unsubscribe: (channel: string) => void;
  send: (type: MessageType, payload: unknown) => boolean;
  broadcast: (eventType: string, data: unknown, targetUserId?: string) => boolean;
  updateProgress: (progress: Partial<ProgressPayload> & { progressId: string }) => boolean;
  updatePresence: (status: 'online' | 'away' | 'busy', currentPage?: string) => boolean;
  disconnect: () => void;
  reconnect: () => void;
} {
  const {
    url,
    companyId,
    userId,
    userName,
    userEmail,
    userRole,
    enabled = true,
    autoReconnect = true,
    maxReconnectAttempts = 5,
    reconnectInterval = 3000,
    onConnect,
    onDisconnect,
    onError,
    onMessage,
    onProgress,
    onNotification,
    onPresenceUpdate,
    onEvent,
  } = options;

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    isAuthenticated: false,
    error: null,
    lastMessage: null,
    connectionId: null,
    reconnectAttempts: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());

  // Gera ID de mensagem
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }, []);

  // Envia mensagem
  const send = useCallback((type: MessageType, payload: unknown): boolean => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const message: WebSocketMessage = {
        id: generateMessageId(),
        type,
        payload,
        timestamp: new Date(),
      };

      wsRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('[WebSocket] Send error:', error);
      return false;
    }
  }, [generateMessageId]);

  // Autentica conexão
  const authenticate = useCallback(() => {
    send('auth:authenticate', {
      companyId,
      userId,
      userName,
      userEmail,
      userRole,
    });
  }, [send, companyId, userId, userName, userEmail, userRole]);

  // Conecta ao servidor
  const connect = useCallback(async () => {
    if (!enabled || !companyId || !userId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Obter URL do WebSocket se não fornecida
      let wsUrl = url;
      if (!wsUrl) {
        const response = await fetch('/api/websocket/info');
        const data = await response.json();
        if (data.success) {
          wsUrl = data.data.url;
        } else {
          throw new Error('Failed to get WebSocket URL');
        }
      }

      if (!wsUrl) {
        throw new Error('WebSocket URL not available');
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          error: null,
          reconnectAttempts: 0,
        }));

        // Autenticar automaticamente
        authenticate();

        // Iniciar heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          send('ping', { timestamp: new Date() });
        }, 30000);

        onConnect?.();
      };

      ws.onclose = (event) => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          isConnecting: false,
          isAuthenticated: false,
          connectionId: null,
        }));

        // Limpar heartbeat
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        onDisconnect?.();

        // Auto reconectar
        if (autoReconnect && state.reconnectAttempts < maxReconnectAttempts) {
          const delay = reconnectInterval * Math.pow(2, state.reconnectAttempts);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setState(prev => ({
              ...prev,
              reconnectAttempts: prev.reconnectAttempts + 1,
            }));
            connect();
          }, delay);
        }
      };

      ws.onerror = (event) => {
        const error = new Error('WebSocket error');
        setState(prev => ({
          ...prev,
          isConnecting: false,
          error,
        }));
        onError?.(error);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          setState(prev => ({
            ...prev,
            lastMessage: message,
          }));

          // Processar mensagem
          switch (message.type) {
            case 'auth:authenticated':
              setState(prev => ({
                ...prev,
                isAuthenticated: true,
                connectionId: (message.payload as { clientId?: string })?.clientId || null,
              }));

              // Resubscribe aos canais
              subscriptionsRef.current.forEach(channel => {
                send('subscribe', { channel });
              });
              break;

            case 'auth:unauthorized':
              setState(prev => ({
                ...prev,
                isAuthenticated: false,
                error: new Error((message.payload as { reason?: string })?.reason || 'Unauthorized'),
              }));
              break;

            case 'progress:update':
            case 'progress:start':
            case 'progress:complete':
            case 'progress:error':
              onProgress?.(message.payload as ProgressPayload);
              break;

            case 'notification:push':
              onNotification?.(message.payload as NotificationPayload);
              break;

            case 'presence:update':
            case 'presence:join':
            case 'presence:leave':
              onPresenceUpdate?.(message.payload);
              break;

            case 'event:broadcast':
              onEvent?.(message.payload);
              break;

            case 'system:error':
              setState(prev => ({
                ...prev,
                error: new Error((message.payload as { error?: string })?.error || 'System error'),
              }));
              break;
          }

          onMessage?.(message);
        } catch (error) {
          console.error('[WebSocket] Message parse error:', error);
        }
      };

    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error : new Error('Connection failed'),
      }));
      onError?.(error instanceof Error ? error : new Error('Connection failed'));
    }
  }, [enabled, companyId, userId, url, authenticate, send, autoReconnect, maxReconnectAttempts, reconnectInterval, state.reconnectAttempts, onConnect, onDisconnect, onError, onMessage, onProgress, onNotification, onPresenceUpdate, onEvent]);

  // Desconecta
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      isAuthenticated: false,
      connectionId: null,
    }));
  }, []);

  // Reconecta
  const reconnect = useCallback(() => {
    disconnect();
    setState(prev => ({
      ...prev,
      reconnectAttempts: 0,
    }));
    connect();
  }, [disconnect, connect]);

  // Subscreve a um canal
  const subscribe = useCallback((options?: SubscriptionOptions) => {
    const channel = options?.channel || `company:${companyId}`;
    subscriptionsRef.current.add(channel);
    
    if (state.isAuthenticated) {
      send('subscribe', { channel, eventTypes: options?.eventTypes });
    }
  }, [companyId, state.isAuthenticated, send]);

  // Desinscreve de um canal
  const unsubscribe = useCallback((channel: string) => {
    subscriptionsRef.current.delete(channel);
    
    if (state.isAuthenticated) {
      send('unsubscribe', { channel });
    }
  }, [state.isAuthenticated, send]);

  // Broadcast de evento
  const broadcast = useCallback((eventType: string, data: unknown, targetUserId?: string): boolean => {
    return send('event:broadcast', {
      type: eventType,
      data,
      targetUserId,
    });
  }, [send]);

  // Atualiza progresso
  const updateProgress = useCallback((progress: Partial<ProgressPayload> & { progressId: string }): boolean => {
    return send('progress:update', progress);
  }, [send]);

  // Atualiza presença
  const updatePresence = useCallback((status: 'online' | 'away' | 'busy', currentPage?: string): boolean => {
    return send('presence:update', { status, currentPage });
  }, [send]);

  // Conectar ao montar
  useEffect(() => {
    if (enabled && companyId && userId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, companyId, userId, connect, disconnect]);

  // Atualizar presença quando a página fica visível
  useEffect(() => {
    if (!state.isAuthenticated) return;

    const handleVisibilityChange = () => {
      updatePresence(document.hidden ? 'away' : 'online');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.isAuthenticated, updatePresence]);

  // Atualizar presença quando a página muda
  useEffect(() => {
    if (!state.isAuthenticated) return;

    updatePresence('online', window.location.pathname);
  }, [state.isAuthenticated, updatePresence]);

  return {
    state,
    subscribe,
    unsubscribe,
    send,
    broadcast,
    updateProgress,
    updatePresence,
    disconnect,
    reconnect,
  };
}

// =============================================================================
// Hook: useWebSocketProgress
// =============================================================================

interface UseProgressOptions {
  companyId: string;
  onProgress?: (progress: ProgressPayload) => void;
  onComplete?: (progress: ProgressPayload) => void;
  onError?: (progress: ProgressPayload) => void;
}

export function useWebSocketProgress(options: UseProgressOptions) {
  const { companyId, onProgress, onComplete, onError } = options;

  const [activeProgress, setActiveProgress] = useState<Map<string, ProgressPayload>>(new Map());

  const handleProgress = useCallback((progress: ProgressPayload) => {
    setActiveProgress(prev => {
      const updated = new Map(prev);
      updated.set(progress.progressId, progress);
      return updated;
    });

    onProgress?.(progress);

    if (progress.status === 'completed') {
      onComplete?.(progress);
      setTimeout(() => {
        setActiveProgress(prev => {
          const updated = new Map(prev);
          updated.delete(progress.progressId);
          return updated;
        });
      }, 3000);
    }

    if (progress.status === 'error') {
      onError?.(progress);
    }
  }, [onProgress, onComplete, onError]);

  const { state } = useWebSocket({
    companyId,
    userId: '', // Será preenchido pelo contexto de autenticação
    userName: '',
    userEmail: '',
    userRole: '',
    onProgress: handleProgress,
  });

  return {
    isConnected: state.isConnected && state.isAuthenticated,
    activeProgress: Array.from(activeProgress.values()),
    progressCount: activeProgress.size,
  };
}

// =============================================================================
// Hook: useWebSocketNotifications
// =============================================================================

interface UseNotificationsOptions {
  companyId: string;
  userId?: string;
  onNotification?: (notification: NotificationPayload) => void;
}

export function useWebSocketNotifications(options: UseNotificationsOptions) {
  const { companyId, userId, onNotification } = options;

  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const handleNotification = useCallback((notification: NotificationPayload) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    onNotification?.(notification);
  }, [onNotification]);

  const { state, send } = useWebSocket({
    companyId,
    userId: userId || '',
    userName: '',
    userEmail: '',
    userRole: '',
    onNotification: handleNotification,
  });

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
    send('notification:read', { notificationId });
  }, [send]);

  const markAllAsRead = useCallback(() => {
    setUnreadCount(0);
    notifications.forEach(n => {
      send('notification:read', { notificationId: n.id });
    });
  }, [send, notifications]);

  return {
    isConnected: state.isConnected && state.isAuthenticated,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}
