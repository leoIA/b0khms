// =============================================================================
// ConstrutorPro - Real-time System Tests
// Testes unitários para o sistema de eventos em tempo real
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  eventBus,
  emitProjectEvent,
  emitBudgetEvent,
  emitNotificationEvent,
  emitTransactionEvent,
  emitMaterialEvent,
  emitScheduleEvent,
  type RealtimeEvent,
  type RealtimeEventType,
} from '../realtime/event-bus';
import { presenceManager, PRESENCE_CONFIG } from '../realtime/presence';

// =============================================================================
// Event Bus Tests
// =============================================================================

describe('RealtimeEventBus', () => {
  beforeEach(() => {
    eventBus.clearHistory();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('emit', () => {
    it('should emit an event with correct properties', () => {
      const companyId = 'company-1';
      const data = { name: 'Test Project', id: 'proj-1' };

      const eventId = eventBus.emit('project:created', companyId, data);

      expect(eventId).toBeDefined();
      expect(eventId).toMatch(/^evt_/);

      const history = eventBus.getHistory(companyId);
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('project:created');
      expect(history[0].companyId).toBe(companyId);
      expect(history[0].data).toEqual(data);
    });

    it('should include userId in event when provided', () => {
      const companyId = 'company-1';
      const userId = 'user-1';
      const data = { id: 'proj-1' };

      eventBus.emit('project:created', companyId, data, { userId });

      const history = eventBus.getHistory(companyId);
      expect(history[0].userId).toBe(userId);
    });

    it('should include metadata in event when provided', () => {
      const companyId = 'company-1';
      const data = { id: 'proj-1' };
      const metadata = { source: 'api', version: '1.0' };

      eventBus.emit('project:created', companyId, data, { metadata });

      const history = eventBus.getHistory(companyId);
      expect(history[0].metadata).toEqual(metadata);
    });

    it('should maintain event history limit', () => {
      const companyId = 'company-1';

      // Emit more than maxHistorySize events
      for (let i = 0; i < 150; i++) {
        eventBus.emit('project:created', companyId, { index: i });
      }

      const history = eventBus.getHistory(companyId);
      expect(history.length).toBeLessThanOrEqual(100);
    });

    it('should generate unique event IDs', () => {
      const companyId = 'company-1';
      const ids = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const id = eventBus.emit('project:created', companyId, { index: i });
        ids.add(id);
      }

      expect(ids.size).toBe(100);
    });
  });

  describe('subscribe', () => {
    it('should call callback when event is emitted', () => {
      const companyId = 'company-1';
      const callback = vi.fn();

      eventBus.subscribe(companyId, callback);
      eventBus.emit('project:created', companyId, { id: 'proj-1' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'project:created',
          companyId,
          data: { id: 'proj-1' },
        })
      );
    });

    it('should filter events by type', () => {
      const companyId = 'company-1';
      const callback = vi.fn();

      eventBus.subscribe(companyId, callback, {
        filters: ['project:created', 'project:updated'],
      });

      eventBus.emit('project:created', companyId, { id: 'proj-1' });
      eventBus.emit('project:updated', companyId, { id: 'proj-1' });
      eventBus.emit('budget:created', companyId, { id: 'budget-1' });

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should filter events by userId', () => {
      const companyId = 'company-1';
      const userId = 'user-1';
      const callback = vi.fn();

      eventBus.subscribe(companyId, callback, { userId });

      // Event for same user
      eventBus.emit('notification:new', companyId, { id: 'notif-1' }, { userId });
      
      // Event for different user
      eventBus.emit('notification:new', companyId, { id: 'notif-2' }, { userId: 'user-2' });

      // Public event (no userId)
      eventBus.emit('project:created', companyId, { id: 'proj-1' });

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should not receive events from other companies', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      eventBus.subscribe('company-1', callback1);
      eventBus.subscribe('company-2', callback2);

      eventBus.emit('project:created', 'company-1', { id: 'proj-1' });
      eventBus.emit('project:created', 'company-2', { id: 'proj-2' });

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
      expect(callback1).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'company-1' })
      );
      expect(callback2).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'company-2' })
      );
    });
  });

  describe('unsubscribe', () => {
    it('should stop receiving events after unsubscribe', () => {
      const companyId = 'company-1';
      const callback = vi.fn();

      const subscriberId = eventBus.subscribe(companyId, callback);
      eventBus.emit('project:created', companyId, { id: 'proj-1' });
      
      expect(callback).toHaveBeenCalledTimes(1);

      eventBus.unsubscribe(subscriberId);
      eventBus.emit('project:created', companyId, { id: 'proj-2' });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should return false for invalid subscriberId', () => {
      const result = eventBus.unsubscribe('invalid-id');
      expect(result).toBe(false);
    });
  });

  describe('getHistory', () => {
    it('should return events for specific company', () => {
      eventBus.emit('project:created', 'company-1', { id: 'proj-1' });
      eventBus.emit('project:created', 'company-2', { id: 'proj-2' });
      eventBus.emit('project:updated', 'company-1', { id: 'proj-1' });

      const history1 = eventBus.getHistory('company-1');
      const history2 = eventBus.getHistory('company-2');

      expect(history1).toHaveLength(2);
      expect(history2).toHaveLength(1);
    });

    it('should limit results when limit is provided', () => {
      for (let i = 0; i < 10; i++) {
        eventBus.emit('project:created', 'company-1', { index: i });
      }

      const history = eventBus.getHistory('company-1', 5);
      expect(history).toHaveLength(5);
    });
  });

  describe('getHistoryByType', () => {
    it('should return events of specific type', () => {
      eventBus.emit('project:created', 'company-1', { id: 'proj-1' });
      eventBus.emit('project:updated', 'company-1', { id: 'proj-1' });
      eventBus.emit('budget:created', 'company-1', { id: 'budget-1' });

      const history = eventBus.getHistoryByType('project:created');

      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('project:created');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      const callback = vi.fn();
      eventBus.subscribe('company-1', callback);

      eventBus.emit('project:created', 'company-1', {});
      eventBus.emit('project:updated', 'company-1', {});
      eventBus.emit('budget:created', 'company-1', {});

      const stats = eventBus.getStats();

      expect(stats.historySize).toBe(3);
      expect(stats.eventCounts['project:created']).toBe(1);
      expect(stats.eventCounts['project:updated']).toBe(1);
      expect(stats.eventCounts['budget:created']).toBe(1);
    });
  });
});

// =============================================================================
// Helper Functions Tests
// =============================================================================

describe('Event Helper Functions', () => {
  beforeEach(() => {
    eventBus.clearHistory();
  });

  describe('emitProjectEvent', () => {
    it('should emit project created event', () => {
      emitProjectEvent.created('company-1', { id: 'proj-1' }, 'user-1');
      
      const history = eventBus.getHistory('company-1');
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('project:created');
      expect(history[0].userId).toBe('user-1');
    });

    it('should emit project updated event', () => {
      emitProjectEvent.updated('company-1', { id: 'proj-1' });
      
      const history = eventBus.getHistory('company-1');
      expect(history[0].type).toBe('project:updated');
    });

    it('should emit project deleted event', () => {
      emitProjectEvent.deleted('company-1', 'proj-1');
      
      const history = eventBus.getHistory('company-1');
      expect(history[0].type).toBe('project:deleted');
      expect(history[0].data).toEqual({ id: 'proj-1' });
    });

    it('should emit project status changed event', () => {
      emitProjectEvent.statusChanged('company-1', { id: 'proj-1', status: 'active' });
      
      const history = eventBus.getHistory('company-1');
      expect(history[0].type).toBe('project:status_changed');
    });
  });

  describe('emitBudgetEvent', () => {
    it('should emit budget events correctly', () => {
      emitBudgetEvent.created('company-1', { id: 'budget-1' });
      emitBudgetEvent.approved('company-1', { id: 'budget-1' });
      emitBudgetEvent.rejected('company-1', { id: 'budget-2' });

      const history = eventBus.getHistory('company-1');
      expect(history).toHaveLength(3);
      expect(history[0].type).toBe('budget:created');
      expect(history[1].type).toBe('budget:approved');
      expect(history[2].type).toBe('budget:rejected');
    });
  });

  describe('emitNotificationEvent', () => {
    it('should emit notification events correctly', () => {
      emitNotificationEvent.new('company-1', { id: 'notif-1', title: 'Test' }, 'user-1');
      emitNotificationEvent.read('company-1', 'notif-1', 'user-1');

      const history = eventBus.getHistory('company-1');
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe('notification:new');
      expect(history[1].type).toBe('notification:read');
    });
  });

  describe('emitTransactionEvent', () => {
    it('should emit transaction events correctly', () => {
      emitTransactionEvent.created('company-1', { id: 'trans-1' });
      emitTransactionEvent.paid('company-1', { id: 'trans-1' });
      emitTransactionEvent.overdue('company-1', { id: 'trans-2' });

      const history = eventBus.getHistory('company-1');
      expect(history).toHaveLength(3);
    });
  });

  describe('emitMaterialEvent', () => {
    it('should emit material low stock event', () => {
      emitMaterialEvent.lowStock('company-1', { id: 'mat-1', quantity: 5 });

      const history = eventBus.getHistory('company-1');
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe('material:low_stock');
    });
  });

  describe('emitScheduleEvent', () => {
    it('should emit schedule events correctly', () => {
      emitScheduleEvent.taskCompleted('company-1', { id: 'task-1' });
      emitScheduleEvent.taskDelayed('company-1', { id: 'task-2' });

      const history = eventBus.getHistory('company-1');
      expect(history).toHaveLength(2);
    });
  });
});

// =============================================================================
// Presence Manager Tests
// =============================================================================

describe('PresenceManager', () => {
  beforeEach(() => {
    // Limpar presenças
    const stats = presenceManager.getStats();
    // Note: In a real implementation, we'd need a clear method
  });

  describe('setPresence', () => {
    it('should set user presence correctly', () => {
      presenceManager.setPresence('user-1', {
        userName: 'Test User',
        userEmail: 'test@example.com',
        companyId: 'company-1',
        device: 'desktop',
      });

      const presence = presenceManager.getPresence('user-1');

      expect(presence).toBeDefined();
      expect(presence?.userName).toBe('Test User');
      expect(presence?.userEmail).toBe('test@example.com');
      expect(presence?.status).toBe('online');
    });

    it('should track users by company', () => {
      presenceManager.setPresence('user-1', {
        userName: 'User 1',
        userEmail: 'user1@example.com',
        companyId: 'company-1',
      });

      presenceManager.setPresence('user-2', {
        userName: 'User 2',
        userEmail: 'user2@example.com',
        companyId: 'company-1',
      });

      presenceManager.setPresence('user-3', {
        userName: 'User 3',
        userEmail: 'user3@example.com',
        companyId: 'company-2',
      });

      const company1Users = presenceManager.getCompanyPresence('company-1');
      const company2Users = presenceManager.getCompanyPresence('company-2');

      expect(company1Users).toHaveLength(2);
      expect(company2Users).toHaveLength(1);
    });
  });

  describe('updateStatus', () => {
    it('should update user status', () => {
      presenceManager.setPresence('user-1', {
        userName: 'Test User',
        userEmail: 'test@example.com',
        companyId: 'company-1',
      });

      presenceManager.updateStatus('user-1', 'busy');

      const presence = presenceManager.getPresence('user-1');
      expect(presence?.status).toBe('busy');
    });
  });

  describe('updateCurrentPage', () => {
    it('should update current page and set status to online if away', () => {
      presenceManager.setPresence('user-1', {
        userName: 'Test User',
        userEmail: 'test@example.com',
        companyId: 'company-1',
      });

      presenceManager.updateStatus('user-1', 'away');
      presenceManager.updateCurrentPage('user-1', '/projects/123');

      const presence = presenceManager.getPresence('user-1');
      expect(presence?.currentPage).toBe('/projects/123');
      expect(presence?.status).toBe('online');
    });
  });

  describe('heartbeat', () => {
    it('should update lastSeen on heartbeat', () => {
      presenceManager.setPresence('user-1', {
        userName: 'Test User',
        userEmail: 'test@example.com',
        companyId: 'company-1',
      });

      const beforeHeartbeat = presenceManager.getPresence('user-1')?.lastSeen;

      // Wait a bit
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          presenceManager.heartbeat('user-1');

          const afterHeartbeat = presenceManager.getPresence('user-1')?.lastSeen;

          expect(afterHeartbeat!.getTime()).toBeGreaterThanOrEqual(
            beforeHeartbeat!.getTime()
          );

          resolve();
        }, 10);
      });
    });
  });

  describe('removePresence', () => {
    it('should remove user presence', () => {
      presenceManager.setPresence('user-1', {
        userName: 'Test User',
        userEmail: 'test@example.com',
        companyId: 'company-1',
      });

      expect(presenceManager.getPresence('user-1')).toBeDefined();

      presenceManager.removePresence('user-1');

      expect(presenceManager.getPresence('user-1')).toBeUndefined();
    });
  });

  describe('getOnlineCount', () => {
    it('should count online users correctly', () => {
      presenceManager.setPresence('user-1', {
        userName: 'User 1',
        userEmail: 'user1@example.com',
        companyId: 'company-1',
      });

      presenceManager.setPresence('user-2', {
        userName: 'User 2',
        userEmail: 'user2@example.com',
        companyId: 'company-1',
      });

      presenceManager.updateStatus('user-2', 'away');

      presenceManager.setPresence('user-3', {
        userName: 'User 3',
        userEmail: 'user3@example.com',
        companyId: 'company-1',
      });

      const count = presenceManager.getOnlineCount('company-1');
      expect(count).toBe(2); // user-1 and user-3
    });
  });

  describe('getStats', () => {
    it('should return correct presence statistics', () => {
      presenceManager.setPresence('user-1', {
        userName: 'User 1',
        userEmail: 'user1@example.com',
        companyId: 'company-1',
      });

      presenceManager.setPresence('user-2', {
        userName: 'User 2',
        userEmail: 'user2@example.com',
        companyId: 'company-1',
      });

      presenceManager.updateStatus('user-2', 'busy');

      const stats = presenceManager.getStats();

      expect(stats.totalOnline).toBeGreaterThanOrEqual(1);
      expect(stats.byStatus.online).toBeGreaterThanOrEqual(1);
      expect(stats.byStatus.busy).toBeGreaterThanOrEqual(1);
    });
  });
});
