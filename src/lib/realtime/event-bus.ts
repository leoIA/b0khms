// =============================================================================
// ConstrutorPro - Real-time Event Bus
// Sistema de eventos para comunicação em tempo real entre clientes
// =============================================================================

import { EventEmitter } from 'events';

// Tipos de eventos do sistema
export type RealtimeEventType =
  // Projetos
  | 'project:created'
  | 'project:updated'
  | 'project:deleted'
  | 'project:status_changed'
  // Orçamentos
  | 'budget:created'
  | 'budget:updated'
  | 'budget:deleted'
  | 'budget:approved'
  | 'budget:rejected'
  // Clientes
  | 'client:created'
  | 'client:updated'
  | 'client:deleted'
  // Fornecedores
  | 'supplier:created'
  | 'supplier:updated'
  | 'supplier:deleted'
  // Materiais
  | 'material:created'
  | 'material:updated'
  | 'material:deleted'
  | 'material:low_stock'
  // Cronograma
  | 'schedule:created'
  | 'schedule:updated'
  | 'schedule:deleted'
  | 'schedule:task_completed'
  | 'schedule:task_delayed'
  // Diário de Obra
  | 'dailylog:created'
  | 'dailylog:updated'
  // Financeiro
  | 'transaction:created'
  | 'transaction:updated'
  | 'transaction:paid'
  | 'transaction:overdue'
  // Notificações
  | 'notification:new'
  | 'notification:read'
  // Atividades
  | 'activity:new'
  // Sistema
  | 'system:maintenance'
  | 'system:alert';

// Interface do evento
export interface RealtimeEvent<T = unknown> {
  id: string;
  type: RealtimeEventType;
  companyId: string;
  userId?: string;
  data: T;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

// Interface para subscriber
export interface EventSubscriber {
  id: string;
  companyId: string;
  userId?: string;
  callback: (event: RealtimeEvent) => void;
  filters?: RealtimeEventType[];
}

// Singleton para o barramento de eventos
class RealtimeEventBus {
  private static instance: RealtimeEventBus;
  private emitter: EventEmitter;
  private subscribers: Map<string, EventSubscriber>;
  private eventHistory: RealtimeEvent[];
  private maxHistorySize: number;

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(1000); // Aumentar limite de listeners
    this.subscribers = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 100;
  }

  static getInstance(): RealtimeEventBus {
    if (!RealtimeEventBus.instance) {
      RealtimeEventBus.instance = new RealtimeEventBus();
    }
    return RealtimeEventBus.instance;
  }

  /**
   * Emite um evento para todos os subscribers interessados
   */
  emit<T = unknown>(
    type: RealtimeEventType,
    companyId: string,
    data: T,
    options?: {
      userId?: string;
      metadata?: Record<string, unknown>;
    }
  ): string {
    const event: RealtimeEvent<T> = {
      id: this.generateEventId(),
      type,
      companyId,
      userId: options?.userId,
      data,
      timestamp: new Date(),
      metadata: options?.metadata,
    };

    // Adicionar ao histórico
    this.addToHistory(event);

    // Emitir para subscribers da empresa
    this.emitter.emit(`company:${companyId}`, event);

    // Emitir para subscribers globais (admin)
    this.emitter.emit('global', event);

    // Emitir evento específico por tipo
    this.emitter.emit(`type:${type}`, event);

    return event.id;
  }

  /**
   * Subscreve para eventos de uma empresa específica
   */
  subscribe(
    companyId: string,
    callback: (event: RealtimeEvent) => void,
    options?: {
      userId?: string;
      filters?: RealtimeEventType[];
    }
  ): string {
    const subscriberId = this.generateSubscriberId();

    const subscriber: EventSubscriber = {
      id: subscriberId,
      companyId,
      userId: options?.userId,
      callback,
      filters: options?.filters,
    };

    this.subscribers.set(subscriberId, subscriber);

    // Handler para eventos da empresa
    const handler = (event: RealtimeEvent) => {
      // Verificar filtros
      if (subscriber.filters && !subscriber.filters.includes(event.type)) {
        return;
      }

      // Verificar usuário específico (para eventos privados)
      if (event.userId && subscriber.userId && event.userId !== subscriber.userId) {
        return;
      }

      callback(event);
    };

    this.emitter.on(`company:${companyId}`, handler);

    // Retornar função de unsubscribe
    return subscriberId;
  }

  /**
   * Remove uma subscrição
   */
  unsubscribe(subscriberId: string): boolean {
    const subscriber = this.subscribers.get(subscriberId);
    if (!subscriber) {
      return false;
    }

    this.emitter.removeAllListeners(`company:${subscriber.companyId}`);
    this.subscribers.delete(subscriberId);
    return true;
  }

  /**
   * Subscreve para todos os eventos (uso admin)
   */
  subscribeGlobal(
    callback: (event: RealtimeEvent) => void,
    filters?: RealtimeEventType[]
  ): string {
    const subscriberId = this.generateSubscriberId();

    const handler = (event: RealtimeEvent) => {
      if (filters && !filters.includes(event.type)) {
        return;
      }
      callback(event);
    };

    this.emitter.on('global', handler);

    return subscriberId;
  }

  /**
   * Subscreve para eventos de um tipo específico
   */
  subscribeToType(
    type: RealtimeEventType,
    callback: (event: RealtimeEvent) => void
  ): string {
    const subscriberId = this.generateSubscriberId();

    this.emitter.on(`type:${type}`, callback);

    return subscriberId;
  }

  /**
   * Obtém o histórico de eventos de uma empresa
   */
  getHistory(companyId: string, limit?: number): RealtimeEvent[] {
    const events = this.eventHistory.filter(e => e.companyId === companyId);
    return limit ? events.slice(-limit) : events;
  }

  /**
   * Obtém o histórico de eventos de um tipo específico
   */
  getHistoryByType(type: RealtimeEventType, limit?: number): RealtimeEvent[] {
    const events = this.eventHistory.filter(e => e.type === type);
    return limit ? events.slice(-limit) : events;
  }

  /**
   * Limpa o histórico de eventos
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Obtém estatísticas do barramento
   */
  getStats(): {
    subscriberCount: number;
    historySize: number;
    eventCounts: Record<string, number>;
  } {
    const eventCounts: Record<string, number> = {};

    for (const event of this.eventHistory) {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    }

    return {
      subscriberCount: this.subscribers.size,
      historySize: this.eventHistory.length,
      eventCounts,
    };
  }

  /**
   * Adiciona evento ao histórico
   */
  private addToHistory(event: RealtimeEvent): void {
    this.eventHistory.push(event);

    // Manter apenas os últimos N eventos
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Gera ID único para eventos
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Gera ID único para subscribers
   */
  private generateSubscriberId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// Exportar instância singleton
export const eventBus = RealtimeEventBus.getInstance();

// Helper functions para emitir eventos comuns
export const emitProjectEvent = {
  created: (companyId: string, project: unknown, userId?: string) =>
    eventBus.emit('project:created', companyId, project, { userId }),

  updated: (companyId: string, project: unknown, userId?: string) =>
    eventBus.emit('project:updated', companyId, project, { userId }),

  deleted: (companyId: string, projectId: string, userId?: string) =>
    eventBus.emit('project:deleted', companyId, { id: projectId }, { userId }),

  statusChanged: (companyId: string, project: unknown, userId?: string) =>
    eventBus.emit('project:status_changed', companyId, project, { userId }),
};

export const emitBudgetEvent = {
  created: (companyId: string, budget: unknown, userId?: string) =>
    eventBus.emit('budget:created', companyId, budget, { userId }),

  updated: (companyId: string, budget: unknown, userId?: string) =>
    eventBus.emit('budget:updated', companyId, budget, { userId }),

  deleted: (companyId: string, budgetId: string, userId?: string) =>
    eventBus.emit('budget:deleted', companyId, { id: budgetId }, { userId }),

  approved: (companyId: string, budget: unknown, userId?: string) =>
    eventBus.emit('budget:approved', companyId, budget, { userId }),

  rejected: (companyId: string, budget: unknown, userId?: string) =>
    eventBus.emit('budget:rejected', companyId, budget, { userId }),
};

export const emitNotificationEvent = {
  new: (companyId: string, notification: unknown, userId?: string) =>
    eventBus.emit('notification:new', companyId, notification, { userId }),

  read: (companyId: string, notificationId: string, userId?: string) =>
    eventBus.emit('notification:read', companyId, { id: notificationId }, { userId }),
};

export const emitTransactionEvent = {
  created: (companyId: string, transaction: unknown, userId?: string) =>
    eventBus.emit('transaction:created', companyId, transaction, { userId }),

  paid: (companyId: string, transaction: unknown, userId?: string) =>
    eventBus.emit('transaction:paid', companyId, transaction, { userId }),

  overdue: (companyId: string, transaction: unknown, userId?: string) =>
    eventBus.emit('transaction:overdue', companyId, transaction, { userId }),
};

export const emitMaterialEvent = {
  lowStock: (companyId: string, material: unknown, userId?: string) =>
    eventBus.emit('material:low_stock', companyId, material, { userId }),
};

export const emitScheduleEvent = {
  taskCompleted: (companyId: string, task: unknown, userId?: string) =>
    eventBus.emit('schedule:task_completed', companyId, task, { userId }),

  taskDelayed: (companyId: string, task: unknown, userId?: string) =>
    eventBus.emit('schedule:task_delayed', companyId, task, { userId }),
};
