// =============================================================================
// ConstrutorPro - Alerts API Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT, POST } from '../route';
import { DELETE } from '../[id]/route';
import { POST as bulkDelete } from '../bulk-delete/route';
import * as authModule from '@/server/auth';
import * as dbModule from '@/lib/db';

// Mock dependencies
vi.mock('@/server/auth', () => ({
  requireAuth: vi.fn(),
  errorResponse: vi.fn((message, status) => Response.json({ error: message }, { status })),
  successResponse: vi.fn((data, message) => Response.json({ data, message })),
}));

vi.mock('@/lib/db', () => ({
  db: {
    alerts: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

describe('Alerts API', () => {
  const mockUser = {
    id: 'user-1',
    companyId: 'company-1',
    isMasterAdmin: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authModule.requireAuth).mockResolvedValue({
      success: true,
      context: mockUser,
    });
  });

  describe('GET /api/alerts', () => {
    it('should return alerts for the user company', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          type: 'info',
          title: 'Test Alert',
          message: 'Test message',
          entityType: 'project',
          entityId: 'project-1',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      vi.mocked(dbModule.db.alerts.findMany).mockResolvedValue(mockAlerts);
      vi.mocked(dbModule.db.alerts.count).mockResolvedValue(1);

      const request = new NextRequest('http://localhost/api/alerts');
      const response = await GET(request);
      const data = await response.json();

      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe('Test Alert');
      expect(dbModule.db.alerts.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 'company-1' }),
        })
      );
    });

    it('should filter alerts by isRead status', async () => {
      vi.mocked(dbModule.db.alerts.findMany).mockResolvedValue([]);
      vi.mocked(dbModule.db.alerts.count).mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/alerts?isRead=false');
      await GET(request);

      expect(dbModule.db.alerts.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: false }),
        })
      );
    });

    it('should filter alerts by type', async () => {
      vi.mocked(dbModule.db.alerts.findMany).mockResolvedValue([]);
      vi.mocked(dbModule.db.alerts.count).mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/alerts?type=warning');
      await GET(request);

      expect(dbModule.db.alerts.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'warning' }),
        })
      );
    });

    it('should search alerts by title or message', async () => {
      vi.mocked(dbModule.db.alerts.findMany).mockResolvedValue([]);
      vi.mocked(dbModule.db.alerts.count).mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/alerts?search=test');
      await GET(request);

      expect(dbModule.db.alerts.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'test', mode: 'insensitive' } },
              { message: { contains: 'test', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should allow master admin to see all alerts', async () => {
      vi.mocked(authModule.requireAuth).mockResolvedValue({
        success: true,
        context: { ...mockUser, isMasterAdmin: true },
      });
      vi.mocked(dbModule.db.alerts.findMany).mockResolvedValue([]);
      vi.mocked(dbModule.db.alerts.count).mockResolvedValue(0);

      const request = new NextRequest('http://localhost/api/alerts');
      await GET(request);

      expect(dbModule.db.alerts.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ companyId: expect.any(String) }),
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(authModule.requireAuth).mockResolvedValue({
        success: false,
        error: 'Não autorizado',
        status: 401,
      });

      const request = new NextRequest('http://localhost/api/alerts');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/alerts', () => {
    it('should mark a single alert as read', async () => {
      vi.mocked(dbModule.db.alerts.findUnique).mockResolvedValue({
        companyId: 'company-1',
      });
      vi.mocked(dbModule.db.alerts.update).mockResolvedValue({});

      const request = new NextRequest('http://localhost/api/alerts', {
        method: 'PUT',
        body: JSON.stringify({ id: 'alert-1' }),
      });
      await PUT(request);

      expect(dbModule.db.alerts.update).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: { isRead: true, updatedAt: expect.any(Date) },
      });
    });

    it('should mark all alerts as read for company', async () => {
      vi.mocked(dbModule.db.alerts.updateMany).mockResolvedValue({ count: 5 });

      const request = new NextRequest('http://localhost/api/alerts', {
        method: 'PUT',
        body: JSON.stringify({ markAllAsRead: true }),
      });
      await PUT(request);

      expect(dbModule.db.alerts.updateMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          isRead: false,
        },
        data: { isRead: true, updatedAt: expect.any(Date) },
      });
    });

    it('should return 404 when alert not found', async () => {
      vi.mocked(dbModule.db.alerts.findUnique).mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/alerts', {
        method: 'PUT',
        body: JSON.stringify({ id: 'non-existent' }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(404);
    });

    it('should not allow marking alerts from other companies', async () => {
      vi.mocked(dbModule.db.alerts.findUnique).mockResolvedValue({
        companyId: 'other-company',
      });

      const request = new NextRequest('http://localhost/api/alerts', {
        method: 'PUT',
        body: JSON.stringify({ id: 'alert-1' }),
      });
      const response = await PUT(request);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/alerts', () => {
    it('should create a new alert', async () => {
      const mockAlert = {
        id: 'alert-1',
        companyId: 'company-1',
        type: 'warning',
        title: 'Test Alert',
        message: 'Test message',
        isRead: false,
      };

      vi.mocked(dbModule.db.alerts.create).mockResolvedValue(mockAlert);

      const request = new NextRequest('http://localhost/api/alerts', {
        method: 'POST',
        body: JSON.stringify({
          type: 'warning',
          title: 'Test Alert',
          message: 'Test message',
        }),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(data.data.id).toBe('alert-1');
      expect(dbModule.db.alerts.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyId: 'company-1',
          type: 'warning',
          title: 'Test Alert',
          message: 'Test message',
          isRead: false,
        }),
      });
    });

    it('should return 400 when required fields are missing', async () => {
      const request = new NextRequest('http://localhost/api/alerts', {
        method: 'POST',
        body: JSON.stringify({ type: 'warning' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/alerts/[id]', () => {
    it('should delete an alert', async () => {
      vi.mocked(dbModule.db.alerts.findUnique).mockResolvedValue({
        companyId: 'company-1',
      });
      vi.mocked(dbModule.db.alerts.delete).mockResolvedValue({});

      const request = new NextRequest('http://localhost/api/alerts/alert-1');
      await DELETE(request, {
        params: Promise.resolve({ id: 'alert-1' }),
      });

      expect(dbModule.db.alerts.delete).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
      });
    });

    it('should not allow deleting alerts from other companies', async () => {
      vi.mocked(dbModule.db.alerts.findUnique).mockResolvedValue({
        companyId: 'other-company',
      });

      const request = new NextRequest('http://localhost/api/alerts/alert-1');
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'alert-1' }),
      });

      expect(response.status).toBe(404);
      expect(dbModule.db.alerts.delete).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/alerts/bulk-delete', () => {
    it('should delete multiple alerts', async () => {
      vi.mocked(dbModule.db.alerts.deleteMany).mockResolvedValue({ count: 3 });

      const request = new NextRequest('http://localhost/api/alerts/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: ['alert-1', 'alert-2', 'alert-3'] }),
      });
      const response = await bulkDelete(request);
      const data = await response.json();

      expect(data.data.deletedCount).toBe(3);
      expect(dbModule.db.alerts.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['alert-1', 'alert-2', 'alert-3'] },
          companyId: 'company-1',
        },
      });
    });

    it('should limit bulk delete to 100 items', async () => {
      const ids = Array.from({ length: 101 }, (_, i) => `alert-${i}`);
      const request = new NextRequest('http://localhost/api/alerts/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      });
      const response = await bulkDelete(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 when no ids provided', async () => {
      const request = new NextRequest('http://localhost/api/alerts/bulk-delete', {
        method: 'POST',
        body: JSON.stringify({ ids: [] }),
      });
      const response = await bulkDelete(request);

      expect(response.status).toBe(400);
    });
  });
});
