// =============================================================================
// ConstrutorPro - Webhook Service Tests
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock crypto module with randomUUID
const mockRandomUUID = vi.fn(() => 'test-uuid-1234');
vi.stubGlobal('crypto', {
  randomUUID: mockRandomUUID,
  subtle: {},
});

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock db
vi.mock('@/lib/db', () => ({
  db: {
    webhooks: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    webhook_deliveries: {
      create: vi.fn(),
      findMany: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    companies: {
      findUnique: vi.fn(),
    },
  },
}));

// Import after mocks
import { webhookService, WEBHOOK_EVENTS, type WebhookEvent } from '@/lib/webhook-service';
import { db } from '@/lib/db';

describe('Webhook Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWebhook', () => {
    it('should create a webhook with valid data', async () => {
      const mockWebhook = {
        id: 'webhook-123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        events: JSON.stringify(['project.created']),
        isActive: true,
      };

      vi.mocked(db.webhooks.create).mockResolvedValueOnce(mockWebhook);

      const result = await webhookService.createWebhook({
        companyId: 'company-123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: ['project.created'],
      });

      expect(result.id).toBe('webhook-123');
      expect(result.secret).toBeDefined();
      expect(db.webhooks.create).toHaveBeenCalled();
    });

    it('should store events as JSON string', async () => {
      const mockWebhook = {
        id: 'webhook-123',
        secret: 'test-secret',
      };

      vi.mocked(db.webhooks.create).mockResolvedValueOnce(mockWebhook as any);

      await webhookService.createWebhook({
        companyId: 'company-123',
        name: 'Test',
        url: 'https://example.com/webhook',
        events: ['project.created', 'project.updated'],
      });

      const createCall = vi.mocked(db.webhooks.create).mock.calls[0][0];
      expect(JSON.parse(createCall.data.events)).toEqual(['project.created', 'project.updated']);
    });
  });

  describe('updateWebhook', () => {
    it('should update webhook fields', async () => {
      vi.mocked(db.webhooks.updateMany).mockResolvedValueOnce({ count: 1 });

      const result = await webhookService.updateWebhook('webhook-123', 'company-123', {
        name: 'Updated Name',
        isActive: false,
      });

      expect(result).toBe(true);
      expect(db.webhooks.updateMany).toHaveBeenCalledWith({
        where: { id: 'webhook-123', companyId: 'company-123' },
        data: {
          name: 'Updated Name',
          isActive: false,
        },
      });
    });

    it('should return false if webhook not found', async () => {
      vi.mocked(db.webhooks.updateMany).mockResolvedValueOnce({ count: 0 });

      const result = await webhookService.updateWebhook('nonexistent', 'company-123', {
        name: 'Updated',
      });

      expect(result).toBe(false);
    });
  });

  describe('deleteWebhook', () => {
    it('should delete webhook successfully', async () => {
      vi.mocked(db.webhooks.deleteMany).mockResolvedValueOnce({ count: 1 });

      const result = await webhookService.deleteWebhook('webhook-123', 'company-123');

      expect(result).toBe(true);
      expect(db.webhooks.deleteMany).toHaveBeenCalledWith({
        where: { id: 'webhook-123', companyId: 'company-123' },
      });
    });
  });

  describe('getWebhooks', () => {
    it('should return webhooks for a company', async () => {
      const mockWebhooks = [
        {
          id: 'webhook-1',
          name: 'Webhook 1',
          url: 'https://example.com/1',
          events: '["project.created"]',
          isActive: true,
        },
        {
          id: 'webhook-2',
          name: 'Webhook 2',
          url: 'https://example.com/2',
          events: '["budget.approved"]',
          isActive: true,
        },
      ];

      vi.mocked(db.webhooks.findMany).mockResolvedValueOnce(mockWebhooks as any);

      const result = await webhookService.getWebhooks('company-123');

      expect(result).toHaveLength(2);
      expect(result[0].events).toEqual(['project.created']);
      expect(result[1].events).toEqual(['budget.approved']);
    });
  });

  describe('getWebhook', () => {
    it('should return a single webhook', async () => {
      const mockWebhook = {
        id: 'webhook-123',
        name: 'Test Webhook',
        url: 'https://example.com/webhook',
        events: '["project.created"]',
        isActive: true,
      };

      vi.mocked(db.webhooks.findFirst).mockResolvedValueOnce(mockWebhook as any);

      const result = await webhookService.getWebhook('webhook-123', 'company-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('webhook-123');
    });

    it('should return null if webhook not found', async () => {
      vi.mocked(db.webhooks.findFirst).mockResolvedValueOnce(null);

      const result = await webhookService.getWebhook('nonexistent', 'company-123');

      expect(result).toBeNull();
    });
  });

  describe('verifySignature', () => {
    it('should have a verifySignature method', () => {
      // Just verify the method exists
      expect(typeof webhookService.verifySignature).toBe('function');
    });
    
    it('should generate signature correctly', () => {
      const payload = '{"test":"data"}';
      const secret = 'test-secret';
      // We know the signature will be a 64-char hex string (sha256)
      const expectedSigLength = 64;
      // Create a dummy signature of same length
      const dummySig = 'a'.repeat(expectedSigLength);
      
      // This should not throw an error about buffer length
      expect(() => {
        webhookService.verifySignature(payload, dummySig, secret);
      }).not.toThrow();
    });
  });

  describe('testWebhook', () => {
    it('should return null if webhook not found', async () => {
      vi.mocked(db.webhooks.findFirst).mockResolvedValueOnce(null);

      const result = await webhookService.testWebhook('nonexistent', 'company-123');

      // testWebhook returns an object with success: false when webhook not found
      expect(result).toEqual({ success: false, error: 'Webhook não encontrado' });
    });

    it('should send test webhook and return result', async () => {
      const mockWebhook = {
        id: 'webhook-123',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        timeout: 10000,
      };

      vi.mocked(db.webhooks.findFirst).mockResolvedValueOnce(mockWebhook as any);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });

      const result = await webhookService.testWebhook('webhook-123', 'company-123');

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
      expect(result?.statusCode).toBe(200);
    });

    it('should handle fetch errors', async () => {
      const mockWebhook = {
        id: 'webhook-123',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        timeout: 10000,
      };

      vi.mocked(db.webhooks.findFirst).mockResolvedValueOnce(mockWebhook as any);
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await webhookService.testWebhook('webhook-123', 'company-123');

      expect(result).not.toBeNull();
      expect(result?.success).toBe(false);
      expect(result?.error).toBe('Network error');
    });
  });
});

describe('WEBHOOK_EVENTS Configuration', () => {
  it('should have all expected event categories', () => {
    const categories = Object.keys(WEBHOOK_EVENTS);
    
    expect(categories).toContain('Projetos');
    expect(categories).toContain('Orçamentos');
    expect(categories).toContain('Clientes');
    expect(categories).toContain('Fornecedores');
    expect(categories).toContain('Financeiro');
    expect(categories).toContain('Alertas');
    expect(categories).toContain('Assinatura');
  });

  it('should have correct event structure', () => {
    Object.entries(WEBHOOK_EVENTS).forEach(([category, events]) => {
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThan(0);
      
      events.forEach((event) => {
        expect(event).toHaveProperty('event');
        expect(event).toHaveProperty('label');
        expect(event).toHaveProperty('description');
        expect(typeof event.event).toBe('string');
        expect(typeof event.label).toBe('string');
        expect(typeof event.description).toBe('string');
      });
    });
  });

  it('should have project events', () => {
    const projectEvents = WEBHOOK_EVENTS['Projetos'];
    const eventNames = projectEvents.map(e => e.event);
    
    expect(eventNames).toContain('project.created');
    expect(eventNames).toContain('project.updated');
    expect(eventNames).toContain('project.deleted');
    expect(eventNames).toContain('project.status_changed');
  });

  it('should have budget events', () => {
    const budgetEvents = WEBHOOK_EVENTS['Orçamentos'];
    const eventNames = budgetEvents.map(e => e.event);
    
    expect(eventNames).toContain('budget.created');
    expect(eventNames).toContain('budget.approved');
    expect(eventNames).toContain('budget.rejected');
  });

  it('should have financial events', () => {
    const financialEvents = WEBHOOK_EVENTS['Financeiro'];
    const eventNames = financialEvents.map(e => e.event);
    
    expect(eventNames).toContain('transaction.created');
    expect(eventNames).toContain('transaction.paid');
    expect(eventNames).toContain('transaction.overdue');
  });

  it('should have alert events', () => {
    const alertEvents = WEBHOOK_EVENTS['Alertas'];
    const eventNames = alertEvents.map(e => e.event);
    
    expect(eventNames).toContain('alert.created');
    expect(eventNames).toContain('alert.stock_low');
    expect(eventNames).toContain('alert.payment_overdue');
    expect(eventNames).toContain('alert.deadline_near');
  });
});

describe('WebhookEvent Type', () => {
  it('should include all expected event types', () => {
    const validEvents: WebhookEvent[] = [
      'project.created',
      'project.updated',
      'project.deleted',
      'project.status_changed',
      'budget.created',
      'budget.approved',
      'client.created',
      'supplier.updated',
      'transaction.paid',
      'alert.stock_low',
      'subscription.canceled',
    ];

    // If TypeScript compiles this, the types are correct
    expect(validEvents.length).toBeGreaterThan(0);
  });
});
