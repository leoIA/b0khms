// =============================================================================
// ConstrutorPro - Real-time Module
// Exportações do sistema de eventos em tempo real
// =============================================================================

export {
  eventBus,
  emitProjectEvent,
  emitBudgetEvent,
  emitNotificationEvent,
  emitTransactionEvent,
  emitMaterialEvent,
  emitScheduleEvent,
  type RealtimeEventType,
  type RealtimeEvent,
  type EventSubscriber,
} from './event-bus';

export {
  sseManager,
  createSSEStream,
  SSE_CONFIG,
  type SSEConnection,
} from './sse';

export * from './presence';

// WebSocket exports
export {
  wsManager,
  startWebSocketServer,
  stopWebSocketServer,
  WEBSOCKET_CONFIG,
  type WebSocketMessage,
  type MessageType,
  type WebSocketClient,
  type ProgressPayload,
  type NotificationPayload,
} from './websocket';
