// =============================================================================
// ConstrutorPro - Soft Delete Service Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  softDeleteService,
  safeDelete,
  type EntityType,
} from '../soft-delete-service'

describe('Soft Delete Service', () => {
  beforeEach(() => {
    // Clear the store before each test
    ;(softDeleteService as any).store.clear()
  })

  describe('softDelete', () => {
    it('should register a soft deleted entity', () => {
      const entity = softDeleteService.softDelete(
        'project',
        'proj-1',
        'My Project',
        'company-1',
        'user-1',
        { name: 'My Project', status: 'active' }
      )

      expect(entity.id).toMatch(/^softdel_/)
      expect(entity.entityType).toBe('project')
      expect(entity.entityId).toBe('proj-1')
      expect(entity.entityName).toBe('My Project')
      expect(entity.canRestore).toBe(true)
    })

    it('should set expiration date based on retention', () => {
      const entity = softDeleteService.softDelete(
        'client',
        'client-1',
        'Client Name',
        'company-1',
        'user-1',
        {},
        7 // 7 days retention
      )

      const expectedExpiry = new Date(
        entity.deletedAt.getTime() + 7 * 24 * 60 * 60 * 1000
      )
      expect(entity.expiresAt.getTime()).toBe(expectedExpiry.getTime())
    })

    it('should use default retention if not specified', () => {
      const entity = softDeleteService.softDelete(
        'material',
        'mat-1',
        'Material',
        'company-1',
        'user-1',
        {}
      )

      const expectedExpiry = new Date(
        entity.deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000
      )
      expect(entity.expiresAt.getTime()).toBe(expectedExpiry.getTime())
    })
  })

  describe('isDeleted', () => {
    it('should return true for soft deleted entities', () => {
      softDeleteService.softDelete(
        'budget',
        'budget-1',
        'Budget 2024',
        'company-1',
        'user-1',
        {}
      )

      expect(softDeleteService.isDeleted('budget', 'budget-1')).toBe(true)
    })

    it('should return false for non-deleted entities', () => {
      expect(softDeleteService.isDeleted('budget', 'non-existent')).toBe(false)
    })
  })

  describe('restore', () => {
    it('should restore a soft deleted entity', () => {
      const snapshot = { name: 'Test', value: 100 }

      softDeleteService.softDelete(
        'supplier',
        'sup-1',
        'Supplier',
        'company-1',
        'user-1',
        snapshot
      )

      const restored = softDeleteService.restore('supplier', 'sup-1')

      expect(restored).toEqual(snapshot)
      expect(softDeleteService.isDeleted('supplier', 'sup-1')).toBe(false)
    })

    it('should return null for non-existent entity', () => {
      const restored = softDeleteService.restore('supplier', 'non-existent')
      expect(restored).toBeNull()
    })
  })

  describe('permanentDelete', () => {
    it('should permanently remove a soft deleted entity', () => {
      softDeleteService.softDelete(
        'transaction',
        'trans-1',
        'Transaction',
        'company-1',
        'user-1',
        {}
      )

      const result = softDeleteService.permanentDelete('transaction', 'trans-1')

      expect(result).toBe(true)
      expect(softDeleteService.isDeleted('transaction', 'trans-1')).toBe(false)
    })

    it('should return false for non-existent entity', () => {
      const result = softDeleteService.permanentDelete('transaction', 'non-existent')
      expect(result).toBe(false)
    })
  })

  describe('listDeleted', () => {
    it('should list all deleted entities for a company', () => {
      softDeleteService.softDelete(
        'project',
        'p1',
        'Project 1',
        'company-1',
        'user-1',
        {}
      )
      softDeleteService.softDelete(
        'project',
        'p2',
        'Project 2',
        'company-1',
        'user-1',
        {}
      )
      softDeleteService.softDelete(
        'project',
        'p3',
        'Project 3',
        'company-2',
        'user-1',
        {}
      )

      const list = softDeleteService.listDeleted('company-1')

      expect(list.length).toBe(2)
    })

    it('should filter by entity type', () => {
      softDeleteService.softDelete(
        'project',
        'proj-x',
        'Project X',
        'company-x',
        'user-1',
        {}
      )
      softDeleteService.softDelete(
        'client',
        'client-x',
        'Client X',
        'company-x',
        'user-1',
        {}
      )

      const projects = softDeleteService.listDeleted('company-x', 'project')
      const clients = softDeleteService.listDeleted('company-x', 'client')

      expect(projects.length).toBe(1)
      expect(clients.length).toBe(1)
    })
  })

  describe('getSnapshot', () => {
    it('should return the snapshot of a deleted entity', () => {
      const snapshot = {
        id: 'comp-1',
        name: 'Composition',
        totalCost: 1500.0,
        items: [{ desc: 'Item 1', qty: 10 }],
      }

      softDeleteService.softDelete(
        'composition',
        'comp-1',
        'Composition',
        'company-1',
        'user-1',
        snapshot
      )

      const retrieved = softDeleteService.getSnapshot('composition', 'comp-1')

      expect(retrieved).toEqual(snapshot)
    })
  })

  describe('countDeleted', () => {
    it('should count deleted entities', () => {
      softDeleteService.softDelete(
        'project',
        'count-1',
        'P1',
        'count-company',
        'user-1',
        {}
      )
      softDeleteService.softDelete(
        'project',
        'count-2',
        'P2',
        'count-company',
        'user-1',
        {}
      )
      softDeleteService.softDelete(
        'client',
        'count-3',
        'C1',
        'count-company',
        'user-1',
        {}
      )

      expect(softDeleteService.countDeleted('count-company')).toBe(3)
      expect(softDeleteService.countDeleted('count-company', 'project')).toBe(2)
    })
  })

  describe('getStats', () => {
    it('should return deletion statistics', () => {
      softDeleteService.softDelete(
        'project',
        'stat-1',
        'P1',
        'stats-company',
        'user-1',
        {}
      )
      softDeleteService.softDelete(
        'client',
        'stat-2',
        'C1',
        'stats-company',
        'user-1',
        {}
      )

      const stats = softDeleteService.getStats('stats-company')

      expect(stats.total).toBe(2)
      expect(stats.byType['project']).toBe(1)
      expect(stats.byType['client']).toBe(1)
    })
  })
})

describe('safeDelete helper', () => {
  beforeEach(() => {
    ;(softDeleteService as any).store.clear()
  })

  it('should perform soft delete by default', async () => {
    const result = await safeDelete('project', 'safe-1', {
      entityName: 'Safe Project',
      companyId: 'company-1',
      userId: 'user-1',
      snapshot: { name: 'Safe Project' },
    })

    expect(result.success).toBe(true)
    expect(result.permanent).toBe(false)
    expect(softDeleteService.isDeleted('project', 'safe-1')).toBe(true)
  })

  it('should call deleteFn for permanent delete', async () => {
    const deleteFn = vi.fn().mockResolvedValue(undefined)

    const result = await safeDelete('project', 'safe-2', {
      entityName: 'Safe Project 2',
      companyId: 'company-1',
      userId: 'user-1',
      snapshot: {},
      permanent: true,
      deleteFn,
    })

    expect(result.success).toBe(true)
    expect(result.permanent).toBe(true)
    expect(deleteFn).toHaveBeenCalled()
  })

  it('should handle errors', async () => {
    const deleteFn = vi.fn().mockRejectedValue(new Error('Delete failed'))

    const result = await safeDelete('project', 'safe-3', {
      entityName: 'Safe Project 3',
      companyId: 'company-1',
      userId: 'user-1',
      snapshot: {},
      permanent: true,
      deleteFn,
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Delete failed')
  })
})
