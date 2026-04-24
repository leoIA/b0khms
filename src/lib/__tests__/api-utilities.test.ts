// =============================================================================
// ConstrutorPro - Unit Tests: API Utilities
// Testes para helpers de API, paginação, filtros e respostas
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import { 
  calculatePagination,
  createPaginatedResponse,
  buildSearchCondition,
  buildDateRangeCondition,
  buildSortCondition,
  getValidId,
  formatCurrency,
  formatDate,
  formatDateTime,
  sleep
} from '@/lib/api'

// =============================================================================
// Tests: Pagination Helpers
// =============================================================================

describe('Pagination Helpers', () => {
  describe('calculatePagination', () => {
    it('should return default values when no params provided', () => {
      const result = calculatePagination()
      
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
      expect(result.skip).toBe(0)
    })

    it('should calculate correct skip value', () => {
      const result = calculatePagination(3, 10)
      
      expect(result.page).toBe(3)
      expect(result.limit).toBe(10)
      expect(result.skip).toBe(20) // (3-1) * 10
    })

    it('should enforce minimum page of 1', () => {
      const result = calculatePagination(0, 10)
      expect(result.page).toBe(1)
    })

    it('should enforce minimum page for negative values', () => {
      const result = calculatePagination(-5, 10)
      expect(result.page).toBe(1)
    })

    it('should use default limit for invalid values', () => {
      const result = calculatePagination(1, 999)
      expect(result.limit).toBe(10) // Falls back to default
    })

    it('should accept valid limit values', () => {
      const validLimits = [10, 25, 50, 100]
      
      for (const limit of validLimits) {
        const result = calculatePagination(1, limit)
        expect(result.limit).toBe(limit)
      }
    })
  })

  describe('createPaginatedResponse', () => {
    it('should create paginated response with correct structure', () => {
      const data = [{ id: '1', name: 'Test' }]
      const result = createPaginatedResponse(data, 100, 1, 10)
      
      expect(result.data).toEqual(data)
      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(10)
      expect(result.pagination.total).toBe(100)
      expect(result.pagination.totalPages).toBe(10)
    })

    it('should calculate total pages correctly', () => {
      const result = createPaginatedResponse([], 25, 1, 10)
      expect(result.pagination.totalPages).toBe(3)
    })

    it('should handle empty data', () => {
      const result = createPaginatedResponse([], 0, 1, 10)
      
      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
    })

    it('should handle single item', () => {
      const result = createPaginatedResponse([{ id: '1' }], 1, 1, 10)
      expect(result.pagination.totalPages).toBe(1)
    })
  })
})

// =============================================================================
// Tests: Filter Helpers
// =============================================================================

describe('Filter Helpers', () => {
  describe('buildSearchCondition', () => {
    it('should return undefined for empty search', () => {
      const result = buildSearchCondition(['name'], '')
      expect(result).toBeUndefined()
    })

    it('should return undefined for whitespace search', () => {
      const result = buildSearchCondition(['name'], '   ')
      expect(result).toBeUndefined()
    })

    it('should return undefined for undefined search', () => {
      const result = buildSearchCondition(['name'], undefined)
      expect(result).toBeUndefined()
    })

    it('should build single field search condition', () => {
      const result = buildSearchCondition(['name'], 'test')
      
      expect(result).toEqual({
        name: {
          contains: 'test',
          mode: 'insensitive',
        },
      })
    })

    it('should build multi-field OR condition', () => {
      const result = buildSearchCondition(['name', 'email'], 'test')
      
      expect(result).toHaveProperty('OR')
      expect(result!.OR).toHaveLength(2)
      expect(result!.OR).toContainEqual({
        name: { contains: 'test', mode: 'insensitive' },
      })
      expect(result!.OR).toContainEqual({
        email: { contains: 'test', mode: 'insensitive' },
      })
    })

    it('should trim and lowercase search term', () => {
      const result = buildSearchCondition(['name'], '  TEST  ')
      
      expect(result).toEqual({
        name: {
          contains: 'test',
          mode: 'insensitive',
        },
      })
    })
  })

  describe('buildDateRangeCondition', () => {
    it('should return undefined when no dates provided', () => {
      const result = buildDateRangeCondition('createdAt')
      expect(result).toBeUndefined()
    })

    it('should build start date only condition', () => {
      const startDate = new Date('2024-01-01')
      const result = buildDateRangeCondition('createdAt', startDate)
      
      expect(result).toEqual({
        createdAt: {
          gte: startDate,
        },
      })
    })

    it('should build end date only condition', () => {
      const endDate = new Date('2024-12-31')
      const result = buildDateRangeCondition('createdAt', undefined, endDate)
      
      expect(result).toEqual({
        createdAt: {
          lte: endDate,
        },
      })
    })

    it('should build full date range condition', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')
      const result = buildDateRangeCondition('createdAt', startDate, endDate)
      
      expect(result).toEqual({
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      })
    })
  })

  describe('buildSortCondition', () => {
    it('should return default sort when no params provided', () => {
      const result = buildSortCondition()
      expect(result).toEqual({ createdAt: 'desc' })
    })

    it('should return default sort for undefined sortBy', () => {
      const result = buildSortCondition(undefined, 'asc')
      expect(result).toEqual({ createdAt: 'asc' })
    })

    it('should build sort condition for specified field', () => {
      const result = buildSortCondition('name', 'asc')
      expect(result).toEqual({ name: 'asc' })
    })

    it('should default to desc when sortOrder not provided', () => {
      const result = buildSortCondition('name')
      expect(result).toEqual({ name: 'desc' })
    })
  })
})

// =============================================================================
// Tests: ID Validation
// =============================================================================

describe('ID Validation', () => {
  describe('getValidId', () => {
    it('should return valid ID', () => {
      const result = getValidId({ id: 'valid-id-123' })
      expect(result).toBe('valid-id-123')
    })

    it('should return null for missing ID', () => {
      const result = getValidId({})
      expect(result).toBeNull()
    })

    it('should return null for empty string ID', () => {
      const result = getValidId({ id: '' })
      expect(result).toBeNull()
    })

    it('should return null for whitespace only ID', () => {
      const result = getValidId({ id: '   ' })
      expect(result).toBeNull()
    })

    it('should return null for array ID', () => {
      const result = getValidId({ id: ['id1', 'id2'] })
      expect(result).toBeNull()
    })
  })
})

// =============================================================================
// Tests: Utility Functions
// =============================================================================

describe('Utility Functions', () => {
  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      const start = Date.now()
      await sleep(50)
      const elapsed = Date.now() - start
      
      expect(elapsed).toBeGreaterThanOrEqual(40)
    })
  })

  describe('formatCurrency', () => {
    it('should format number as BRL currency', () => {
      const result = formatCurrency(1234.56)
      expect(result).toContain('R$')
      expect(result).toContain('1.234,56')
    })

    it('should format string value', () => {
      const result = formatCurrency('1000')
      expect(result).toContain('R$')
      expect(result).toContain('1.000')
    })

    it('should handle zero', () => {
      const result = formatCurrency(0)
      expect(result).toContain('R$')
      expect(result).toContain('0,00')
    })

    it('should handle negative values', () => {
      const result = formatCurrency(-100)
      expect(result).toContain('-')
      expect(result).toContain('100')
    })
  })

  describe('formatDate', () => {
    it('should format date in Brazilian format', () => {
      const date = new Date('2024-03-15')
      const result = formatDate(date)
      
      expect(result).toContain('15')
      expect(result).toContain('03')
      expect(result).toContain('2024')
    })

    it('should format string date', () => {
      const result = formatDate('2024-06-20')
      expect(result).toContain('20')
      expect(result).toContain('06')
      expect(result).toContain('2024')
    })
  })

  describe('formatDateTime', () => {
    it('should format date and time', () => {
      const date = new Date('2024-03-15T14:30:00')
      const result = formatDateTime(date)
      
      expect(result).toContain('15')
      expect(result).toContain('03')
      expect(result).toContain('2024')
    })
  })
})

// =============================================================================
// Tests: Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  describe('Pagination with large values', () => {
    it('should handle large page numbers', () => {
      const result = calculatePagination(1000, 10)
      expect(result.skip).toBe(9990)
    })
  })

  describe('Search with special characters', () => {
    it('should handle special characters in search', () => {
      const result = buildSearchCondition(['name'], 'test@example.com')
      
      expect(result).toEqual({
        name: {
          contains: 'test@example.com',
          mode: 'insensitive',
        },
      })
    })
  })

  describe('Currency formatting edge cases', () => {
    it('should handle very large numbers', () => {
      const result = formatCurrency(999999999.99)
      expect(result).toContain('R$')
    })

    it('should handle very small decimals', () => {
      const result = formatCurrency(0.01)
      expect(result).toContain('0,01')
    })
  })
})
