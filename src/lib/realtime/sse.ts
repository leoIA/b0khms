// =============================================================================
// ConstrutorPro - Server-Sent Events (SSE) Handler
// Implementação de streaming de eventos em tempo real
// =============================================================================

import { eventBus, RealtimeEvent, RealtimeEventType } from './event-bus';

// Configurações do SSE
export const SSE_CONFIG = {
  // Intervalo de heartbeat para manter conexão viva (em ms)
  heartbeatInterval: 30000,
  // Timeout para reconexão do cliente (em ms)
  retryInterval: 3000,
  // Tamanho máximo do buffer de eventos
  maxBufferSize: 100,
  // Encoding
  encoding: 'utf-8',
} as const;

// Interface para conexão SSE
export interface SSEConnection {
  id: string;
  companyId: string;
  userId?: string;
  controller: ReadableStreamDefaultController;
  filters?: RealtimeEventType[];
  lastEventId?: string;
  connectedAt: Date;
  eventsSent: number;
}

// Gerenciador de conexões SSE
class SSEConnectionManager {
  private static instance: SSEConnectionManager;
  private connections: Map<string, SSEConnection>;
  private heartbeatTimers: Map<string, NodeJS.Timeout>;

  private constructor() {
    this.connections = new Map();
    this.heartbeatTimers = new Map();
  }

  static getInstance(): SSEConnectionManager {
    if (!SSEConnectionManager.instance) {
      SSEConnectionManager.instance = new SSEConnectionManager();
    }
    return SSEConnectionManager.instance;
  }

  /**
   * Cria uma nova conexão SSE
   */
  createConnection(
    companyId: string,
    options?: {
      userId?: string;
      filters?: RealtimeEventType[];
      lastEventId?: string;
    }
  ): { connectionId: string; stream: ReadableStream<Uint8Array> } {
    const connectionId = this.generateConnectionId();

    let controller: ReadableStreamDefaultController;

    const stream = new ReadableStream<Uint8Array>({
      start: (ctrl) => {
        controller = ctrl;
        
        // Registrar conexão
        const connection: SSEConnection = {
          id: connectionId,
          companyId,
          userId: options?.userId,
          controller,
          filters: options?.filters,
          lastEventId: options?.lastEventId,
          connectedAt: new Date(),
          eventsSent: 0,
        };

        this.connections.set(connectionId, connection);

        // Enviar evento inicial
        this.sendEvent(connection, {
          type: 'system:alert' as RealtimeEventType,
          data: { message: 'Conexão estabelecida', connectionId },
        });

        // Enviar eventos perdidos (se lastEventId foi fornecido)
        if (options?.lastEventId) {
          this.replayMissedEvents(connection, options.lastEventId);
        }

        // Iniciar heartbeat
        this.startHeartbeat(connectionId);

        // Subscrever para eventos da empresa
        eventBus.subscribe(companyId, (event) => {
          this.handleEvent(connectionId, event);
        }, { userId: options?.userId, filters: options?.filters });
      },
      cancel: () => {
        this.closeConnection(connectionId);
      },
    });

    return { connectionId, stream };
  }

  /**
   * Envia evento para uma conexão específica
   */
  sendEvent(connection: SSEConnection, event: Partial<RealtimeEvent>): void {
    try {
      const eventData: RealtimeEvent = {
        id: event.id || this.generateEventId(),
        type: event.type || ('system:alert' as RealtimeEventType),
        companyId: connection.companyId,
        data: event.data || {},
        timestamp: new Date(),
      };

      const message = this.formatSSEMessage(eventData);
      const encoder = new TextEncoder();
      
      connection.controller.enqueue(encoder.encode(message));
      connection.eventsSent++;

      // Atualizar lastEventId
      connection.lastEventId = eventData.id;
    } catch (error) {
      console.error(`Error sending event to connection ${connection.id}:`, error);
    }
  }

  /**
   * Envia evento para todas as conexões de uma empresa
   */
  broadcastToCompany(companyId: string, event: RealtimeEvent): number {
    let sentCount = 0;

    for (const connection of this.connections.values()) {
      if (connection.companyId === companyId) {
        // Verificar filtros
        if (connection.filters && !connection.filters.includes(event.type)) {
          continue;
        }

        // Verificar userId (para eventos privados)
        if (event.userId && connection.userId && event.userId !== connection.userId) {
          continue;
        }

        this.sendEvent(connection, event);
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * Envia evento para um usuário específico
   */
  sendToUser(companyId: string, userId: string, event: RealtimeEvent): number {
    let sentCount = 0;

    for (const connection of this.connections.values()) {
      if (connection.companyId === companyId && connection.userId === userId) {
        this.sendEvent(connection, event);
        sentCount++;
      }
    }

    return sentCount;
  }

  /**
   * Fecha uma conexão
   */
  closeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      try {
        connection.controller.close();
      } catch {
        // Conexão já fechada
      }
      this.connections.delete(connectionId);
    }

    // Parar heartbeat
    const timer = this.heartbeatTimers.get(connectionId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(connectionId);
    }
  }

  /**
   * Obtém estatísticas das conexões
   */
  getStats(): {
    totalConnections: number;
    connectionsByCompany: Record<string, number>;
    oldestConnection?: Date;
    totalEventsSent: number;
  } {
    const connectionsByCompany: Record<string, number> = {};
    let oldestConnection: Date | undefined;
    let totalEventsSent = 0;

    for (const connection of this.connections.values()) {
      connectionsByCompany[connection.companyId] = 
        (connectionsByCompany[connection.companyId] || 0) + 1;
      
      totalEventsSent += connection.eventsSent;

      if (!oldestConnection || connection.connectedAt < oldestConnection) {
        oldestConnection = connection.connectedAt;
      }
    }

    return {
      totalConnections: this.connections.size,
      connectionsByCompany,
      oldestConnection,
      totalEventsSent,
    };
  }

  /**
   * Obtém conexões ativas
   */
  getActiveConnections(): SSEConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Fecha todas as conexões de uma empresa
   */
  closeCompanyConnections(companyId: string): number {
    let closedCount = 0;

    for (const [id, connection] of this.connections) {
      if (connection.companyId === companyId) {
        this.closeConnection(id);
        closedCount++;
      }
    }

    return closedCount;
  }

  // Métodos privados

  private handleEvent(connectionId: string, event: RealtimeEvent): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      this.sendEvent(connection, event);
    }
  }

  private startHeartbeat(connectionId: string): void {
    const timer = setInterval(() => {
      const connection = this.connections.get(connectionId);
      if (connection) {
        try {
          const encoder = new TextEncoder();
          connection.controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          this.closeConnection(connectionId);
        }
      } else {
        clearInterval(timer);
        this.heartbeatTimers.delete(connectionId);
      }
    }, SSE_CONFIG.heartbeatInterval);

    this.heartbeatTimers.set(connectionId, timer);
  }

  private formatSSEMessage(event: RealtimeEvent): string {
    const lines: string[] = [];

    // ID do evento
    lines.push(`id: ${event.id}`);

    // Tipo do evento
    lines.push(`event: ${event.type}`);

    // Dados (JSON)
    const eventData = event.data && typeof event.data === 'object' ? event.data : {};
    const data = JSON.stringify({
      ...eventData,
      _meta: {
        timestamp: event.timestamp.toISOString(),
        companyId: event.companyId,
        userId: event.userId,
      },
    });
    lines.push(`data: ${data}`);

    // Retry sugerido
    lines.push(`retry: ${SSE_CONFIG.retryInterval}`);

    // Linha em branco para finalizar
    lines.push('');
    lines.push('');

    return lines.join('\n');
  }

  private replayMissedEvents(connection: SSEConnection, lastEventId: string): void {
    const history = eventBus.getHistory(connection.companyId);
    const lastEventIndex = history.findIndex(e => e.id === lastEventId);

    if (lastEventIndex !== -1 && lastEventIndex < history.length - 1) {
      const missedEvents = history.slice(lastEventIndex + 1);
      
      for (const event of missedEvents) {
        // Verificar filtros
        if (connection.filters && !connection.filters.includes(event.type)) {
          continue;
        }

        this.sendEvent(connection, event);
      }
    }
  }

  private generateConnectionId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Exportar instância singleton
export const sseManager = SSEConnectionManager.getInstance();

// Helper para criar stream SSE
export function createSSEStream(
  companyId: string,
  options?: {
    userId?: string;
    filters?: RealtimeEventType[];
    lastEventId?: string;
  }
): { connectionId: string; stream: ReadableStream<Uint8Array> } {
  return sseManager.createConnection(companyId, options);
}
