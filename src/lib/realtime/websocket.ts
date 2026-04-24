// =============================================================================
// ConstrutorPro - WebSocket Server
// Servidor WebSocket para comunicação bidirecional em tempo real
// =============================================================================

import { WebSocketServer, WebSocket, RawData } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import { createHash, randomBytes } from 'crypto';
import { eventBus, RealtimeEvent, RealtimeEventType } from './event-bus';
import { presenceManager } from './presence';

// =============================================================================
// Tipos e Interfaces
// =============================================================================

export interface WebSocketMessage {
  id: string;
  type: MessageType;
  payload: unknown;
  timestamp: Date;
}

export type MessageType =
  // Autenticação
  | 'auth:authenticate'
  | 'auth:authenticated'
  | 'auth:unauthorized'
  // Ping/Pong
  | 'ping'
  | 'pong'
  // Subscriptions
  | 'subscribe'
  | 'unsubscribe'
  | 'subscribed'
  | 'unsubscribed'
  // Events
  | 'event:broadcast'
  | 'event:received'
  // Progress
  | 'progress:start'
  | 'progress:update'
  | 'progress:complete'
  | 'progress:error'
  // Notifications
  | 'notification:push'
  | 'notification:read'
  // Presence
  | 'presence:update'
  | 'presence:join'
  | 'presence:leave'
  // System
  | 'system:info'
  | 'system:error';

export interface WebSocketClient {
  id: string;
  ws: WebSocket;
  companyId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  subscriptions: Set<string>;
  connectedAt: Date;
  lastActivity: Date;
  isAuthenticated: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface ProgressPayload {
  progressId: string;
  operation: string;
  status: 'started' | 'in_progress' | 'completed' | 'error';
  progress: number; // 0-100
  message?: string;
  data?: unknown;
  error?: string;
}

export interface NotificationPayload {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
}

// =============================================================================
// Configurações
// =============================================================================

export const WEBSOCKET_CONFIG = {
  // Porta do servidor WebSocket (porta separada do HTTP)
  port: parseInt(process.env.WEBSOCKET_PORT || '3001'),
  // Intervalo de heartbeat (ms)
  heartbeatInterval: 30000,
  // Timeout para autenticação (ms)
  authTimeout: 10000,
  // Tamanho máximo de mensagem (bytes)
  maxMessageSize: 1024 * 1024, // 1MB
  // Limite de conexões por usuário
  maxConnectionsPerUser: 5,
  // Limite de conexões por empresa
  maxConnectionsPerCompany: 100,
  // Intervalo de ping (ms)
  pingInterval: 25000,
  // Timeout de pong (ms)
  pongTimeout: 10000,
} as const;

// =============================================================================
// WebSocket Manager
// =============================================================================

class WebSocketManager {
  private static instance: WebSocketManager;
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WebSocketClient> = new Map();
  private companyRooms: Map<string, Set<string>> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private heartbeatTimers: Map<string, NodeJS.Timeout> = new Map();
  private pingTimers: Map<string, NodeJS.Timeout> = new Map();
  private pendingAuth: Map<string, NodeJS.Timeout> = new Map();
  private progressOperations: Map<string, ProgressPayload> = new Map();

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  /**
   * Inicia o servidor WebSocket
   */
  start(port?: number): WebSocketServer {
    if (this.wss) {
      return this.wss;
    }

    this.wss = new WebSocketServer({
      port: port || WEBSOCKET_CONFIG.port,
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3,
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024,
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024,
      },
    });

    this.setupEventHandlers();
    this.setupEventBusIntegration();

    console.log(`[WebSocket] Server started on port ${port || WEBSOCKET_CONFIG.port}`);

    return this.wss;
  }

  /**
   * Para o servidor WebSocket
   */
  stop(): void {
    if (this.wss) {
      // Fechar todas as conexões
      for (const [clientId, client] of this.clients) {
        this.disconnectClient(clientId, 'Server shutdown');
      }

      this.wss.close(() => {
        console.log('[WebSocket] Server stopped');
      });

      this.wss = null;
    }
  }

  /**
   * Configura handlers de eventos do WebSocket Server
   */
  private setupEventHandlers(): void {
    if (!this.wss) return;

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      this.handleConnection(ws, request);
    });

    this.wss.on('error', (error) => {
      console.error('[WebSocket] Server error:', error);
    });
  }

  /**
   * Configura integração com o Event Bus
   */
  private setupEventBusIntegration(): void {
    // Subscrever para todos os eventos do Event Bus e retransmitir via WebSocket
    eventBus.subscribeGlobal((event: RealtimeEvent) => {
      this.broadcastToCompany(event.companyId, {
        id: this.generateMessageId(),
        type: 'event:broadcast',
        payload: event,
        timestamp: new Date(),
      }, event.userId ? [event.userId] : undefined);
    });
  }

  /**
   * Handler para nova conexão
   */
  private handleConnection(ws: WebSocket, request: IncomingMessage): void {
    const clientId = this.generateClientId();
    const ipAddress = this.extractIpAddress(request);
    const userAgent = request.headers['user-agent'];

    // Cliente temporário (não autenticado)
    const tempClient: WebSocketClient = {
      id: clientId,
      ws,
      companyId: '',
      userId: '',
      userName: '',
      userEmail: '',
      userRole: '',
      subscriptions: new Set(),
      connectedAt: new Date(),
      lastActivity: new Date(),
      isAuthenticated: false,
      ipAddress,
      userAgent,
    };

    this.clients.set(clientId, tempClient);

    // Timeout para autenticação
    const authTimer = setTimeout(() => {
      if (!tempClient.isAuthenticated) {
        this.sendMessage(ws, {
          id: this.generateMessageId(),
          type: 'auth:unauthorized',
          payload: { reason: 'Authentication timeout' },
          timestamp: new Date(),
        });
        this.disconnectClient(clientId, 'Authentication timeout');
      }
    }, WEBSOCKET_CONFIG.authTimeout);

    this.pendingAuth.set(clientId, authTimer);

    // Configurar handlers
    ws.on('message', (data: RawData, isBinary: boolean) => {
      this.handleMessage(clientId, data, isBinary);
    });

    ws.on('close', () => {
      this.handleDisconnect(clientId);
    });

    ws.on('error', (error) => {
      console.error(`[WebSocket] Client ${clientId} error:`, error);
      this.handleDisconnect(clientId);
    });

    ws.on('pong', () => {
      this.handlePong(clientId);
    });

    // Enviar info do sistema
    this.sendMessage(ws, {
      id: this.generateMessageId(),
      type: 'system:info',
      payload: {
        clientId,
        serverVersion: '1.0.0',
        heartbeatInterval: WEBSOCKET_CONFIG.heartbeatInterval,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Handler para mensagens recebidas
   */
  private handleMessage(clientId: string, data: RawData, isBinary: boolean): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    if (isBinary) {
      console.warn(`[WebSocket] Binary message from ${clientId}, ignoring`);
      return;
    }

    try {
      const messageStr = Array.isArray(data) 
        ? Buffer.concat(data as Buffer[]).toString('utf-8')
        : data.toString('utf-8');

      // Verificar tamanho da mensagem
      if (messageStr.length > WEBSOCKET_CONFIG.maxMessageSize) {
        this.sendError(client.ws, 'Message too large');
        return;
      }

      const message: WebSocketMessage = JSON.parse(messageStr);
      this.processMessage(clientId, message);
    } catch (error) {
      console.error(`[WebSocket] Parse error from ${clientId}:`, error);
      this.sendError(client.ws, 'Invalid message format');
    }
  }

  /**
   * Processa mensagem recebida
   */
  private processMessage(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'auth:authenticate':
        this.handleAuthentication(clientId, message);
        break;

      case 'ping':
        this.sendMessage(client.ws, {
          id: this.generateMessageId(),
          type: 'pong',
          payload: { timestamp: new Date() },
          timestamp: new Date(),
        });
        break;

      case 'subscribe':
        this.handleSubscribe(clientId, message);
        break;

      case 'unsubscribe':
        this.handleUnsubscribe(clientId, message);
        break;

      case 'event:broadcast':
        this.handleEventBroadcast(clientId, message);
        break;

      case 'progress:update':
        this.handleProgressUpdate(clientId, message);
        break;

      case 'notification:read':
        this.handleNotificationRead(clientId, message);
        break;

      case 'presence:update':
        this.handlePresenceUpdate(clientId, message);
        break;

      default:
        this.sendError(client.ws, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handler para autenticação
   */
  private handleAuthentication(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const payload = message.payload as {
      companyId?: string;
      userId?: string;
      userName?: string;
      userEmail?: string;
      userRole?: string;
      token?: string;
    };

    // Validar dados de autenticação
    if (!payload.companyId || !payload.userId || !payload.userRole) {
      this.sendMessage(client.ws, {
        id: this.generateMessageId(),
        type: 'auth:unauthorized',
        payload: { reason: 'Missing authentication data' },
        timestamp: new Date(),
      });
      this.disconnectClient(clientId, 'Invalid authentication');
      return;
    }

    // Verificar limite de conexões por usuário
    const userConns = this.userConnections.get(payload.userId);
    if (userConns && userConns.size >= WEBSOCKET_CONFIG.maxConnectionsPerUser) {
      this.sendMessage(client.ws, {
        id: this.generateMessageId(),
        type: 'auth:unauthorized',
        payload: { reason: 'Maximum connections reached for user' },
        timestamp: new Date(),
      });
      this.disconnectClient(clientId, 'Max connections');
      return;
    }

    // Verificar limite de conexões por empresa
    const companyRoom = this.companyRooms.get(payload.companyId);
    if (companyRoom && companyRoom.size >= WEBSOCKET_CONFIG.maxConnectionsPerCompany) {
      this.sendMessage(client.ws, {
        id: this.generateMessageId(),
        type: 'auth:unauthorized',
        payload: { reason: 'Maximum connections reached for company' },
        timestamp: new Date(),
      });
      this.disconnectClient(clientId, 'Max company connections');
      return;
    }

    // Cancelar timeout de autenticação
    const authTimer = this.pendingAuth.get(clientId);
    if (authTimer) {
      clearTimeout(authTimer);
      this.pendingAuth.delete(clientId);
    }

    // Atualizar cliente com dados autenticados
    client.companyId = payload.companyId;
    client.userId = payload.userId;
    client.userName = payload.userName || '';
    client.userEmail = payload.userEmail || '';
    client.userRole = payload.userRole;
    client.isAuthenticated = true;

    // Adicionar à sala da empresa
    if (!this.companyRooms.has(payload.companyId)) {
      this.companyRooms.set(payload.companyId, new Set());
    }
    this.companyRooms.get(payload.companyId)!.add(clientId);

    // Adicionar às conexões do usuário
    if (!this.userConnections.has(payload.userId)) {
      this.userConnections.set(payload.userId, new Set());
    }
    this.userConnections.get(payload.userId)!.add(clientId);

    // Iniciar heartbeat
    this.startHeartbeat(clientId);

    // Confirmar autenticação
    this.sendMessage(client.ws, {
      id: this.generateMessageId(),
      type: 'auth:authenticated',
      payload: {
        clientId,
        companyId: payload.companyId,
        userId: payload.userId,
        connectedAt: client.connectedAt,
      },
      timestamp: new Date(),
    });

    // Notificar presença
    this.broadcastToCompany(payload.companyId, {
      id: this.generateMessageId(),
      type: 'presence:join',
      payload: {
        userId: payload.userId,
        userName: payload.userName,
        userEmail: payload.userEmail,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    }, [payload.userId]); // Exceto o próprio usuário

    console.log(`[WebSocket] Client ${clientId} authenticated: ${payload.userEmail}`);
  }

  /**
   * Handler para subscrição
   */
  private handleSubscribe(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) {
      this.sendError(client?.ws, 'Not authenticated');
      return;
    }

    const payload = message.payload as { channel?: string; eventTypes?: string[] };
    const channel = payload.channel || `company:${client.companyId}`;

    client.subscriptions.add(channel);

    this.sendMessage(client.ws, {
      id: this.generateMessageId(),
      type: 'subscribed',
      payload: { channel, eventTypes: payload.eventTypes },
      timestamp: new Date(),
    });
  }

  /**
   * Handler para desinscrição
   */
  private handleUnsubscribe(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const payload = message.payload as { channel?: string };
    const channel = payload.channel;

    if (channel && client.subscriptions.has(channel)) {
      client.subscriptions.delete(channel);
    }

    this.sendMessage(client.ws, {
      id: this.generateMessageId(),
      type: 'unsubscribed',
      payload: { channel },
      timestamp: new Date(),
    });
  }

  /**
   * Handler para broadcast de evento
   */
  private handleEventBroadcast(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) {
      this.sendError(client?.ws, 'Not authenticated');
      return;
    }

    const payload = message.payload as {
      type?: RealtimeEventType;
      data?: unknown;
      targetUserId?: string;
    };

    if (!payload.type) {
      this.sendError(client.ws, 'Event type required');
      return;
    }

    // Emitir via Event Bus (que vai retransmitir para todos os clientes)
    const eventId = eventBus.emit(
      payload.type,
      client.companyId,
      payload.data,
      { userId: client.userId }
    );

    // Confirmar recebimento
    this.sendMessage(client.ws, {
      id: this.generateMessageId(),
      type: 'event:received',
      payload: { eventId },
      timestamp: new Date(),
    });
  }

  /**
   * Handler para atualização de progresso
   */
  private handleProgressUpdate(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) return;

    const progress = message.payload as ProgressPayload;

    // Armazenar estado do progresso
    this.progressOperations.set(progress.progressId, progress);

    // Broadcast para a empresa (para outros usuários acompanharem)
    this.broadcastToCompany(client.companyId, {
      id: this.generateMessageId(),
      type: 'progress:update',
      payload: progress,
      timestamp: new Date(),
    });

    // Se completou ou deu erro, remover do mapa após um tempo
    if (progress.status === 'completed' || progress.status === 'error') {
      setTimeout(() => {
        this.progressOperations.delete(progress.progressId);
      }, 60000); // Manter por 1 minuto para consultas
    }
  }

  /**
   * Handler para notificação lida
   */
  private handleNotificationRead(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) return;

    const payload = message.payload as { notificationId?: string };

    if (payload.notificationId) {
      eventBus.emit('notification:read', client.companyId, { id: payload.notificationId }, { userId: client.userId });
    }
  }

  /**
   * Handler para atualização de presença
   */
  private handlePresenceUpdate(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) return;

    const payload = message.payload as {
      status?: 'online' | 'away' | 'busy';
      currentPage?: string;
    };

    if (payload.status) {
      presenceManager.updateStatus(client.userId, payload.status);
    }

    if (payload.currentPage) {
      presenceManager.updateCurrentPage(client.userId, payload.currentPage);
    }

    // Notificar outros usuários
    this.broadcastToCompany(client.companyId, {
      id: this.generateMessageId(),
      type: 'presence:update',
      payload: {
        userId: client.userId,
        userName: client.userName,
        status: payload.status,
        currentPage: payload.currentPage,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    }, [client.userId]);
  }

  /**
   * Handler para pong
   */
  private handlePong(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastActivity = new Date();
    }
  }

  /**
   * Handler para desconexão
   */
  private handleDisconnect(clientId: string): void {
    this.disconnectClient(clientId, 'Client disconnected');
  }

  /**
   * Desconecta um cliente
   */
  private disconnectClient(clientId: string, reason: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remover timeout de autenticação pendente
    const authTimer = this.pendingAuth.get(clientId);
    if (authTimer) {
      clearTimeout(authTimer);
      this.pendingAuth.delete(clientId);
    }

    // Parar heartbeat
    const heartbeatTimer = this.heartbeatTimers.get(clientId);
    if (heartbeatTimer) {
      clearTimeout(heartbeatTimer);
      this.heartbeatTimers.delete(clientId);
    }

    // Parar ping
    const pingTimer = this.pingTimers.get(clientId);
    if (pingTimer) {
      clearTimeout(pingTimer);
      this.pingTimers.delete(clientId);
    }

    // Notificar presença offline se autenticado
    if (client.isAuthenticated && client.companyId) {
      presenceManager.removePresence(client.userId);

      this.broadcastToCompany(client.companyId, {
        id: this.generateMessageId(),
        type: 'presence:leave',
        payload: {
          userId: client.userId,
          userName: client.userName,
          timestamp: new Date(),
        },
        timestamp: new Date(),
      });

      // Remover da sala da empresa
      const companyRoom = this.companyRooms.get(client.companyId);
      if (companyRoom) {
        companyRoom.delete(clientId);
        if (companyRoom.size === 0) {
          this.companyRooms.delete(client.companyId);
        }
      }

      // Remover das conexões do usuário
      const userConns = this.userConnections.get(client.userId);
      if (userConns) {
        userConns.delete(clientId);
        if (userConns.size === 0) {
          this.userConnections.delete(client.userId);
        }
      }
    }

    // Fechar conexão
    try {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close(1000, reason);
      }
    } catch {
      // Ignorar erros ao fechar
    }

    // Remover cliente
    this.clients.delete(clientId);

    console.log(`[WebSocket] Client ${clientId} disconnected: ${reason}`);
  }

  /**
   * Inicia heartbeat para um cliente
   */
  private startHeartbeat(clientId: string): void {
    // Heartbeat para verificar atividade
    const heartbeatTimer = setInterval(() => {
      const client = this.clients.get(clientId);
      if (!client) {
        clearInterval(heartbeatTimer);
        this.heartbeatTimers.delete(clientId);
        return;
      }

      const timeSinceLastActivity = Date.now() - client.lastActivity.getTime();
      if (timeSinceLastActivity > WEBSOCKET_CONFIG.heartbeatInterval * 3) {
        this.disconnectClient(clientId, 'Inactivity timeout');
      }
    }, WEBSOCKET_CONFIG.heartbeatInterval);

    this.heartbeatTimers.set(clientId, heartbeatTimer);

    // Ping para verificar conexão
    const pingTimer = setInterval(() => {
      const client = this.clients.get(clientId);
      if (!client || client.ws.readyState !== WebSocket.OPEN) {
        clearInterval(pingTimer);
        this.pingTimers.delete(clientId);
        return;
      }

      client.ws.ping();
    }, WEBSOCKET_CONFIG.pingInterval);

    this.pingTimers.set(clientId, pingTimer);
  }

  /**
   * Envia mensagem para um WebSocket
   */
  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Envia mensagem de erro
   */
  private sendError(ws: WebSocket | undefined, error: string): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      this.sendMessage(ws, {
        id: this.generateMessageId(),
        type: 'system:error',
        payload: { error },
        timestamp: new Date(),
      });
    }
  }

  // ==========================================================================
  // Métodos Públicos
  // ==========================================================================

  /**
   * Envia mensagem para todos os clientes de uma empresa
   */
  broadcastToCompany(
    companyId: string,
    message: WebSocketMessage,
    excludeUserIds?: string[]
  ): number {
    const room = this.companyRooms.get(companyId);
    if (!room) return 0;

    let sentCount = 0;

    for (const clientId of room) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        // Verificar se deve excluir
        if (excludeUserIds && excludeUserIds.includes(client.userId)) {
          continue;
        }

        // Verificar subscrições
        if (client.subscriptions.size > 0 && !client.subscriptions.has(`company:${companyId}`)) {
          continue;
        }

        this.sendMessage(client.ws, message);
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * Envia mensagem para um usuário específico
   */
  sendToUser(userId: string, message: WebSocketMessage): number {
    const userConns = this.userConnections.get(userId);
    if (!userConns) return 0;

    let sentCount = 0;

    for (const clientId of userConns) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, message);
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * Envia notificação push
   */
  pushNotification(
    companyId: string,
    notification: NotificationPayload,
    targetUserId?: string
  ): void {
    const message: WebSocketMessage = {
      id: this.generateMessageId(),
      type: 'notification:push',
      payload: notification,
      timestamp: new Date(),
    };

    if (targetUserId) {
      this.sendToUser(targetUserId, message);
    } else {
      this.broadcastToCompany(companyId, message);
    }

    // Também emitir via Event Bus para persistência
    eventBus.emit('notification:new', companyId, notification, { userId: targetUserId });
  }

  /**
   * Inicia operação de progresso
   */
  startProgress(
    companyId: string,
    operation: string,
    data?: unknown
  ): string {
    const progressId = this.generateProgressId();

    const progress: ProgressPayload = {
      progressId,
      operation,
      status: 'started',
      progress: 0,
      message: 'Iniciando operação...',
      data,
    };

    this.progressOperations.set(progressId, progress);

    this.broadcastToCompany(companyId, {
      id: this.generateMessageId(),
      type: 'progress:start',
      payload: progress,
      timestamp: new Date(),
    });

    return progressId;
  }

  /**
   * Atualiza progresso de operação
   */
  updateProgress(
    companyId: string,
    progressId: string,
    update: Partial<ProgressPayload>
  ): void {
    const existing = this.progressOperations.get(progressId);
    if (!existing) return;

    const progress: ProgressPayload = {
      ...existing,
      ...update,
      status: update.status || 'in_progress',
    };

    this.progressOperations.set(progressId, progress);

    this.broadcastToCompany(companyId, {
      id: this.generateMessageId(),
      type: 'progress:update',
      payload: progress,
      timestamp: new Date(),
    });
  }

  /**
   * Completa operação de progresso
   */
  completeProgress(
    companyId: string,
    progressId: string,
    data?: unknown
  ): void {
    const existing = this.progressOperations.get(progressId);
    if (!existing) return;

    const progress: ProgressPayload = {
      ...existing,
      status: 'completed',
      progress: 100,
      message: 'Operação concluída com sucesso',
      data,
    };

    this.progressOperations.set(progressId, progress);

    this.broadcastToCompany(companyId, {
      id: this.generateMessageId(),
      type: 'progress:complete',
      payload: progress,
      timestamp: new Date(),
    });

    // Remover após um tempo
    setTimeout(() => {
      this.progressOperations.delete(progressId);
    }, 60000);
  }

  /**
   * Erro em operação de progresso
   */
  errorProgress(
    companyId: string,
    progressId: string,
    error: string
  ): void {
    const existing = this.progressOperations.get(progressId);
    if (!existing) return;

    const progress: ProgressPayload = {
      ...existing,
      status: 'error',
      error,
    };

    this.progressOperations.set(progressId, progress);

    this.broadcastToCompany(companyId, {
      id: this.generateMessageId(),
      type: 'progress:error',
      payload: progress,
      timestamp: new Date(),
    });
  }

  /**
   * Obtém estatísticas do servidor
   */
  getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    companies: number;
    connectionsByCompany: Record<string, number>;
    activeProgressOperations: number;
  } {
    const connectionsByCompany: Record<string, number> = {};
    let authenticatedConnections = 0;

    for (const [companyId, clients] of this.companyRooms) {
      connectionsByCompany[companyId] = clients.size;
    }

    for (const client of this.clients.values()) {
      if (client.isAuthenticated) {
        authenticatedConnections++;
      }
    }

    return {
      totalConnections: this.clients.size,
      authenticatedConnections,
      companies: this.companyRooms.size,
      connectionsByCompany,
      activeProgressOperations: this.progressOperations.size,
    };
  }

  /**
   * Verifica se está rodando
   */
  isRunning(): boolean {
    return this.wss !== null;
  }

  // ==========================================================================
  // Métodos Privados Auxiliares
  // ==========================================================================

  private generateClientId(): string {
    return `ws_${Date.now()}_${randomBytes(8).toString('hex')}`;
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${randomBytes(4).toString('hex')}`;
  }

  private generateProgressId(): string {
    return `prog_${Date.now()}_${randomBytes(6).toString('hex')}`;
  }

  private extractIpAddress(request: IncomingMessage): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded)) {
      return forwarded[0].trim();
    }
    return request.socket.remoteAddress || 'unknown';
  }
}

// Exportar instância singleton
export const wsManager = WebSocketManager.getInstance();

// =============================================================================
// Função para iniciar servidor WebSocket standalone
// =============================================================================

export function startWebSocketServer(port?: number): WebSocketServer {
  return wsManager.start(port);
}

export function stopWebSocketServer(): void {
  wsManager.stop();
}
