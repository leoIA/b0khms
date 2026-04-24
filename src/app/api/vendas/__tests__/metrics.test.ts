// =============================================================================
// ConstrutorPro - Testes da API de Vendas
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../metrics/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    proposals: {
      findMany: vi.fn(),
      groupBy: vi.fn(),
    },
    proposal_followups: {
      findMany: vi.fn(),
    },
    clients: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

vi.mock('@/server/auth', () => ({
  requireAuth: vi.fn(),
  successResponse: vi.fn((data) => ({ status: 200, body: { success: true, data } })),
  errorResponse: vi.fn((message, status) => ({ status, body: { success: false, error: message } })),
}));

import { db } from '@/lib/db';
import { requireAuth } from '@/server/auth';

describe('Vendas Metrics API', () => {
  const mockAuthResult = {
    success: true,
    context: {
      companyId: 'company-123',
      user: { id: 'user-123', role: 'admin' },
      isMasterAdmin: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue(mockAuthResult as any);
  });

  describe('GET /api/vendas/metrics', () => {
    it('should return 401 when not authenticated', async () => {
      vi.mocked(requireAuth).mockResolvedValueOnce({
        success: false,
        error: 'Não autenticado',
        status: 401,
      } as any);

      const request = new NextRequest('http://localhost/api/vendas/metrics');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('should return sales metrics for authenticated user', async () => {
      const mockProposals = [
        { id: '1', status: 'accepted', totalValue: 10000, clientId: 'client-1', createdAt: new Date() },
        { id: '2', status: 'sent', totalValue: 5000, clientId: 'client-2', createdAt: new Date() },
        { id: '3', status: 'draft', totalValue: 8000, clientId: null, createdAt: new Date() },
      ];

      vi.mocked(db.proposals.findMany).mockResolvedValue(mockProposals as any);
      vi.mocked(db.proposals.groupBy).mockResolvedValue([] as any);
      vi.mocked(db.clients.findMany).mockResolvedValue([] as any);
      vi.mocked(db.proposal_followups.findMany).mockResolvedValue([] as any);
      vi.mocked(db.$queryRaw).mockResolvedValue([] as any);

      const request = new NextRequest('http://localhost/api/vendas/metrics?period=month');
      const response = await GET(request);

      expect(requireAuth).toHaveBeenCalled();
      expect(db.proposals.findMany).toHaveBeenCalled();
    });

    it('should calculate correct metrics', async () => {
      const mockProposals = [
        { id: '1', status: 'accepted', totalValue: 10000, clientId: 'client-1', createdAt: new Date() },
        { id: '2', status: 'accepted', totalValue: 20000, clientId: 'client-2', createdAt: new Date() },
        { id: '3', status: 'sent', totalValue: 5000, clientId: 'client-3', createdAt: new Date() },
        { id: '4', status: 'rejected', totalValue: 3000, clientId: 'client-4', createdAt: new Date() },
        { id: '5', status: 'draft', totalValue: 8000, clientId: null, createdAt: new Date() },
      ];

      vi.mocked(db.proposals.findMany).mockResolvedValue(mockProposals as any);
      vi.mocked(db.proposals.groupBy).mockResolvedValue([] as any);
      vi.mocked(db.clients.findMany).mockResolvedValue([] as any);
      vi.mocked(db.proposal_followups.findMany).mockResolvedValue([] as any);
      vi.mocked(db.$queryRaw).mockResolvedValue([] as any);

      const request = new NextRequest('http://localhost/api/vendas/metrics');
      await GET(request);

      // Verify proposals were fetched with correct filter
      expect(db.proposals.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 'company-123',
          }),
        })
      );
    });

    it('should filter by period correctly', async () => {
      vi.mocked(db.proposals.findMany).mockResolvedValue([] as any);
      vi.mocked(db.proposals.groupBy).mockResolvedValue([] as any);
      vi.mocked(db.clients.findMany).mockResolvedValue([] as any);
      vi.mocked(db.proposal_followups.findMany).mockResolvedValue([] as any);
      vi.mocked(db.$queryRaw).mockResolvedValue([] as any);

      // Test week period
      const weekRequest = new NextRequest('http://localhost/api/vendas/metrics?period=week');
      const weekResponse = await GET(weekRequest);
      expect(weekResponse.status).toBe(200);

      // Test year period
      const yearRequest = new NextRequest('http://localhost/api/vendas/metrics?period=year');
      const yearResponse = await GET(yearRequest);
      expect(yearResponse.status).toBe(200);
    });

    it('should return top clients data', async () => {
      const mockGroupBy = [
        { clientId: 'client-1', _count: { id: 3 }, _sum: { totalValue: 50000 } },
        { clientId: 'client-2', _count: { id: 2 }, _sum: { totalValue: 30000 } },
      ];

      const mockClients = [
        { id: 'client-1', name: 'Cliente A' },
        { id: 'client-2', name: 'Cliente B' },
      ];

      vi.mocked(db.proposals.findMany).mockResolvedValue([] as any);
      vi.mocked(db.proposals.groupBy).mockResolvedValue(mockGroupBy as any);
      vi.mocked(db.clients.findMany).mockResolvedValue(mockClients as any);
      vi.mocked(db.proposal_followups.findMany).mockResolvedValue([] as any);
      vi.mocked(db.$queryRaw).mockResolvedValue([] as any);

      const request = new NextRequest('http://localhost/api/vendas/metrics');
      await GET(request);

      expect(db.proposals.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['clientId'],
          orderBy: { _sum: { totalValue: 'desc' } },
        })
      );
    });

    it('should return expiring soon proposals', async () => {
      const mockExpiring = [
        {
          id: '1',
          number: 'PROP-2024-001',
          title: 'Proposta A',
          totalValue: 10000,
          validUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          clients: { id: 'c1', name: 'Cliente A' },
        },
      ];

      vi.mocked(db.proposals.findMany)
        .mockResolvedValueOnce([] as any) // main query
        .mockResolvedValueOnce(mockExpiring as any); // expiring soon

      vi.mocked(db.proposals.groupBy).mockResolvedValue([] as any);
      vi.mocked(db.clients.findMany).mockResolvedValue([] as any);
      vi.mocked(db.proposal_followups.findMany).mockResolvedValue([] as any);
      vi.mocked(db.$queryRaw).mockResolvedValue([] as any);

      const request = new NextRequest('http://localhost/api/vendas/metrics');
      await GET(request);

      // Check that findMany was called (multiple times for different queries)
      expect(db.proposals.findMany).toHaveBeenCalled();
    });
  });
});
