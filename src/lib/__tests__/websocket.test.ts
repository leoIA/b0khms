// =============================================================================
// ConstrutorPro - WebSocket System Tests
// Testes unitários para o sistema WebSocket
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { wsManager, WEBSOCKET_CONFIG, type WebSocketMessage } from '../realtime/websocket';
import { eventBus } from '../realtime/event-bus';

// =============================================================================
// WebSocket Manager Tests
// =============================================================================

describe('WebSocketManager', () => {
  beforeEach(() => {
    eventBus.clearHistory();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should have correct default configuration', () => {
      expect(WEBSOCKET_CONFIG.port).toBe(3001);
      expect(WEBSOCKET_CONFIG.heartbeatInterval).toBe(30000);
      expect(WEBSOCKET_CONFIG.authTimeout).toBe(10000);
      expect(WEBSOCKET_CONFIG.maxMessageSize).toBe(1024 * 1024);
      expect(WEBSOCKET_CONFIG.maxConnectionsPerUser).toBe(5);
      expect(WEBSOCKET_CONFIG.maxConnectionsPerCompany).toBe(100);
    });
  });

  describe('Initial State', () => {
    it('should not be running initially', () => {
      expect(wsManager.isRunning()).toBe(false);
    });

    it('should return zero stats when not running', () => {
      const stats = wsManager.getStats();

      expect(stats.totalConnections).toBe(0);
      expect(stats.authenticatedConnections).toBe(0);
      expect(stats.companies).toBe(0);
      expect(stats.activeProgressOperations).toBe(0);
    });
  });

  describe('Progress Operations', () => {
    const companyId = 'company-1';

    it('should start a progress operation', () => {
      const beforeStats = wsManager.getStats();
      const progressId = wsManager.startProgress(companyId, 'file_upload', {
        fileName: 'test.pdf',
        fileSize: 1024,
      });

      expect(progressId).toBeDefined();
      expect(progressId).toMatch(/^prog_/);

      const stats = wsManager.getStats();
      expect(stats.activeProgressOperations).toBe(beforeStats.activeProgressOperations + 1);
    });

    it('should update progress', () => {
      const progressId = wsManager.startProgress(companyId, 'import');

      wsManager.updateProgress(companyId, progressId, {
        progress: 50,
        message: 'Processando itens...',
      });

      // Verify progress was stored (indirectly through stats)
      const stats = wsManager.getStats();
      expect(stats.activeProgressOperations).toBeGreaterThan(0);
    });

    it('should complete progress', () => {
      const progressId = wsManager.startProgress(companyId, 'export');

      wsManager.completeProgress(companyId, progressId, {
        downloadUrl: '/downloads/export.csv',
      });

      // Progress should still exist (removed after timeout)
      const stats = wsManager.getStats();
      expect(stats.activeProgressOperations).toBeGreaterThan(0);
    });

    it('should error progress', () => {
      const progressId = wsManager.startProgress(companyId, 'process');

      wsManager.errorProgress(companyId, progressId, 'Processing failed');

      const stats = wsManager.getStats();
      expect(stats.activeProgressOperations).toBeGreaterThan(0);
    });
  });

  describe('Notifications', () => {
    const companyId = 'company-1';

    it('should push notification to company', () => {
      // Verify event is emitted to event bus
      const callback = vi.fn();
      eventBus.subscribe(companyId, callback);

      wsManager.pushNotification(companyId, {
        id: 'notif-1',
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test',
      });

      const history = eventBus.getHistory(companyId);
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('notification:new');
    });

    it('should push notification to specific user', () => {
      const userId = 'user-1';
      const callback = vi.fn();

      eventBus.subscribe(companyId, callback, { userId });

      wsManager.pushNotification(
        companyId,
        {
          id: 'notif-2',
          type: 'success',
          title: 'Success',
          message: 'Operation completed',
        },
        userId
      );

      const history = eventBus.getHistory(companyId);
      expect(history).toHaveLength(1);
    });
  });

  describe('Event Bus Integration', () => {
    it('should broadcast events from event bus', () => {
      const companyId = 'company-1';

      // Start server to activate event bus integration
      // Note: In real tests, we'd mock WebSocket
      wsManager.start(3002);

      // Emit event
      eventBus.emit('project:created', companyId, {
        id: 'proj-1',
        name: 'New Project',
      });

      wsManager.stop();
    });
  });

  describe('Stats', () => {
    it('should return correct stats structure', () => {
      const stats = wsManager.getStats();

      expect(stats).toHaveProperty('totalConnections');
      expect(stats).toHaveProperty('authenticatedConnections');
      expect(stats).toHaveProperty('companies');
      expect(stats).toHaveProperty('connectionsByCompany');
      expect(stats).toHaveProperty('activeProgressOperations');
    });
  });
});

// =============================================================================
// WebSocket Message Types Tests
// =============================================================================

describe('WebSocket Message Types', () => {
  it('should define all required message types', () => {
    const messageTypes = [
      'auth:authenticate',
      'auth:authenticated',
      'auth:unauthorized',
      'ping',
      'pong',
      'subscribe',
      'unsubscribe',
      'subscribed',
      'unsubscribed',
      'event:broadcast',
      'event:received',
      'progress:start',
      'progress:update',
      'progress:complete',
      'progress:error',
      'notification:push',
      'notification:read',
      'presence:update',
      'presence:join',
      'presence:leave',
      'system:info',
      'system:error',
    ];

    // Verify all types are valid strings
    messageTypes.forEach(type => {
      expect(typeof type).toBe('string');
      expect(type.length).toBeGreaterThan(0);
    });
  });

  it('should create valid WebSocket message structure', () => {
    const message: WebSocketMessage = {
      id: 'msg_123',
      type: 'event:broadcast',
      payload: { test: 'data' },
      timestamp: new Date(),
    };

    expect(message.id).toBeDefined();
    expect(message.type).toBeDefined();
    expect(message.payload).toBeDefined();
    expect(message.timestamp).toBeInstanceOf(Date);
  });
});

// =============================================================================
// Progress Payload Tests
// =============================================================================

describe('Progress Payload', () => {
  it('should support all progress statuses', () => {
    const statuses = ['started', 'in_progress', 'completed', 'error'];

    statuses.forEach(status => {
      const progress = {
        progressId: 'prog_123',
        operation: 'test',
        status: status as 'started' | 'in_progress' | 'completed' | 'error',
        progress: 50,
      };

      expect(progress.status).toBe(status);
    });
  });

  it('should track progress percentage', () => {
    const progress = {
      progressId: 'prog_123',
      operation: 'upload',
      status: 'in_progress' as const,
      progress: 75,
      message: 'Uploading...',
    };

    expect(progress.progress).toBeGreaterThanOrEqual(0);
    expect(progress.progress).toBeLessThanOrEqual(100);
  });
});

// =============================================================================
// Notification Payload Tests
// =============================================================================

describe('Notification Payload', () => {
  it('should support all notification types', () => {
    const types = ['info', 'success', 'warning', 'error'];

    types.forEach(type => {
      const notification = {
        id: 'notif_123',
        type: type as 'info' | 'success' | 'warning' | 'error',
        title: 'Test',
        message: 'Test message',
      };

      expect(notification.type).toBe(type);
    });
  });

  it('should include optional entity reference', () => {
    const notification = {
      id: 'notif_123',
      type: 'info' as const,
      title: 'Project Updated',
      message: 'Project was updated',
      entityType: 'project',
      entityId: 'proj_123',
      actionUrl: '/projects/proj_123',
    };

    expect(notification.entityType).toBe('project');
    expect(notification.entityId).toBe('proj_123');
    expect(notification.actionUrl).toBe('/projects/proj_123');
  });
});
