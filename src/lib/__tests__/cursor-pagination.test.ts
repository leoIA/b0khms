// =============================================================================
// ConstrutorPro - Cursor Pagination Tests
// =============================================================================

import { describe, it, expect } from 'vitest'
import {
  encodeCursor,
  decodeCursor,
  buildCursorCondition,
  createCursorPaginatedResponse,
  calculateCursorPagination,
  type CursorInfo,
} from '../api'

describe('Cursor Pagination', () => {
  describe('encodeCursor', () => {
    it('should encode cursor info to base64', () => {
      const info: CursorInfo = {
        id: 'item-123',
        createdAt: new Date('2024-01-15T10:30:00Z'),
      }

      const cursor = encodeCursor(info)

      expect(typeof cursor).toBe('string')
      expect(cursor.length).toBeGreaterThan(0)
    })

    it('should produce valid base64 string', () => {
      const info: CursorInfo = {
        id: 'test-id',
        createdAt: new Date('2024-06-20T14:00:00Z'),
      }

      const cursor = encodeCursor(info)
      const decoded = decodeCursor(cursor)

      expect(decoded).not.toBeNull()
      expect(decoded?.id).toBe('test-id')
    })

    it('should handle special characters in ID', () => {
      const info: CursorInfo = {
        id: 'item_with-special.chars-123',
        createdAt: new Date(),
      }

      const cursor = encodeCursor(info)
      const decoded = decodeCursor(cursor)

      expect(decoded?.id).toBe('item_with-special.chars-123')
    })
  })

  describe('decodeCursor', () => {
    it('should decode valid cursor', () => {
      const info: CursorInfo = {
        id: 'item-456',
        createdAt: new Date('2024-03-10T08:15:00Z'),
      }
      const cursor = encodeCursor(info)

      const decoded = decodeCursor(cursor)

      expect(decoded).not.toBeNull()
      expect(decoded?.id).toBe('item-456')
      expect(decoded?.createdAt.toISOString()).toBe(info.createdAt.toISOString())
    })

    it('should return null for invalid base64', () => {
      const decoded = decodeCursor('not-valid-base64!!!')
      expect(decoded).toBeNull()
    })

    it('should return null for invalid JSON in cursor', () => {
      const invalidCursor = Buffer.from('not json').toString('base64')
      const decoded = decodeCursor(invalidCursor)
      expect(decoded).toBeNull()
    })

    it('should return null for cursor missing id', () => {
      const invalidCursor = Buffer.from(JSON.stringify({ createdAt: new Date().toISOString() })).toString('base64')
      const decoded = decodeCursor(invalidCursor)
      expect(decoded).toBeNull()
    })

    it('should return null for cursor missing createdAt', () => {
      const invalidCursor = Buffer.from(JSON.stringify({ id: 'test' })).toString('base64')
      const decoded = decodeCursor(invalidCursor)
      expect(decoded).toBeNull()
    })
  })

  describe('buildCursorCondition', () => {
    it('should return undefined for null cursor', () => {
      const condition = buildCursorCondition(null)
      expect(condition).toBeUndefined()
    })

    it('should build forward direction condition', () => {
      const cursor: CursorInfo = {
        id: 'item-123',
        createdAt: new Date('2024-01-15T10:30:00Z'),
      }

      const condition = buildCursorCondition(cursor, 'forward')

      expect(condition).toBeDefined()
      expect(condition).toHaveProperty('OR')
      expect(Array.isArray(condition?.OR)).toBe(true)
    })

    it('should build backward direction condition', () => {
      const cursor: CursorInfo = {
        id: 'item-456',
        createdAt: new Date('2024-01-15T10:30:00Z'),
      }

      const condition = buildCursorCondition(cursor, 'backward')

      expect(condition).toBeDefined()
      expect(condition).toHaveProperty('OR')
      expect(Array.isArray(condition?.OR)).toBe(true)
    })

    it('should default to forward direction', () => {
      const cursor: CursorInfo = {
        id: 'item-789',
        createdAt: new Date(),
      }

      const conditionDefault = buildCursorCondition(cursor)
      const conditionForward = buildCursorCondition(cursor, 'forward')

      expect(conditionDefault).toEqual(conditionForward)
    })
  })

  describe('createCursorPaginatedResponse', () => {
    const createTestItem = (id: string, dateStr: string) => ({
      id,
      createdAt: new Date(dateStr),
      name: `Item ${id}`,
    })

    it('should create response with hasMore false when less items than limit', () => {
      const items = [
        createTestItem('1', '2024-01-01'),
        createTestItem('2', '2024-01-02'),
      ]

      const response = createCursorPaginatedResponse(items, 10)

      expect(response.data).toHaveLength(2)
      expect(response.pagination.hasMore).toBe(false)
      expect(response.pagination.limit).toBe(10)
    })

    it('should create response with hasMore true when items equal limit', () => {
      const items = [
        createTestItem('1', '2024-01-01'),
        createTestItem('2', '2024-01-02'),
        createTestItem('3', '2024-01-03'),
      ]

      const response = createCursorPaginatedResponse(items, 3)

      expect(response.data).toHaveLength(3)
      expect(response.pagination.hasMore).toBe(true)
    })

    it('should include nextCursor when hasMore', () => {
      const items = [
        createTestItem('1', '2024-01-01'),
        createTestItem('2', '2024-01-02'),
      ]

      const response = createCursorPaginatedResponse(items, 2)

      expect(response.pagination.nextCursor).not.toBeNull()
    })

    it('should not include nextCursor when no hasMore', () => {
      const items = [
        createTestItem('1', '2024-01-01'),
        createTestItem('2', '2024-01-02'),
      ]

      const response = createCursorPaginatedResponse(items, 10)

      expect(response.pagination.nextCursor).toBeNull()
    })

    it('should include previousCursor when items exist', () => {
      const items = [
        createTestItem('1', '2024-01-01'),
        createTestItem('2', '2024-01-02'),
      ]

      const response = createCursorPaginatedResponse(items, 10)

      expect(response.pagination.previousCursor).not.toBeNull()
    })

    it('should handle empty items', () => {
      const response = createCursorPaginatedResponse([], 10)

      expect(response.data).toHaveLength(0)
      expect(response.pagination.hasMore).toBe(false)
      expect(response.pagination.nextCursor).toBeNull()
      expect(response.pagination.previousCursor).toBeNull()
    })

    it('should reverse items for backward direction', () => {
      const items = [
        createTestItem('1', '2024-01-01'),
        createTestItem('2', '2024-01-02'),
        createTestItem('3', '2024-01-03'),
      ]

      const responseForward = createCursorPaginatedResponse(items, 10, 'forward')
      const responseBackward = createCursorPaginatedResponse(items, 10, 'backward')

      expect(responseForward.data[0].id).toBe('1')
      expect(responseBackward.data[0].id).toBe('3')
    })
  })

  describe('calculateCursorPagination', () => {
    it('should return default values when no params', () => {
      const params = calculateCursorPagination()

      expect(params.cursor).toBeUndefined()
      expect(params.limit).toBeGreaterThan(0)
      expect(params.direction).toBe('forward')
    })

    it('should accept custom limit', () => {
      const params = calculateCursorPagination(undefined, 50)

      expect(params.limit).toBe(50)
    })

    it('should enforce minimum limit of 1', () => {
      const params = calculateCursorPagination(undefined, 0)

      expect(params.limit).toBe(1)
    })

    it('should enforce maximum limit of 100', () => {
      const params = calculateCursorPagination(undefined, 200)

      expect(params.limit).toBe(100)
    })

    it('should accept cursor string', () => {
      const cursor = encodeCursor({ id: 'test', createdAt: new Date() })
      const params = calculateCursorPagination(cursor, 20)

      expect(params.cursor).toBe(cursor)
    })

    it('should accept direction', () => {
      const params = calculateCursorPagination(undefined, 10, 'backward')

      expect(params.direction).toBe('backward')
    })
  })

  describe('Round-trip encoding/decoding', () => {
    it('should preserve all data through encode/decode cycle', () => {
      const original: CursorInfo = {
        id: 'complex-id-with-underscores_and-dashes-123',
        createdAt: new Date('2024-06-15T14:30:45.123Z'),
      }

      const encoded = encodeCursor(original)
      const decoded = decodeCursor(encoded)

      expect(decoded).not.toBeNull()
      expect(decoded?.id).toBe(original.id)
      expect(decoded?.createdAt.getTime()).toBe(original.createdAt.getTime())
    })

    it('should work with pagination flow', () => {
      // Simulate first page
      const items = Array.from({ length: 25 }, (_, i) => ({
        id: `item-${i + 1}`,
        createdAt: new Date(2024, 0, i + 1),
        name: `Item ${i + 1}`,
      }))

      const page1 = createCursorPaginatedResponse(items.slice(0, 10), 10)
      expect(page1.pagination.hasMore).toBe(true)
      expect(page1.pagination.nextCursor).not.toBeNull()

      // Decode cursor for next page
      const cursorInfo = decodeCursor(page1.pagination.nextCursor!)
      expect(cursorInfo).not.toBeNull()
      expect(cursorInfo?.id).toBe('item-10')

      // Build condition for next page query
      const condition = buildCursorCondition(cursorInfo, 'forward')
      expect(condition).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very long ID', () => {
      const longId = 'a'.repeat(1000)
      const info: CursorInfo = {
        id: longId,
        createdAt: new Date(),
      }

      const encoded = encodeCursor(info)
      const decoded = decodeCursor(encoded)

      expect(decoded?.id).toBe(longId)
    })

    it('should handle unicode in ID', () => {
      const unicodeId = 'item-日本語-中文-عربي'
      const info: CursorInfo = {
        id: unicodeId,
        createdAt: new Date(),
      }

      const encoded = encodeCursor(info)
      const decoded = decodeCursor(encoded)

      expect(decoded?.id).toBe(unicodeId)
    })

    it('should handle oldest possible date', () => {
      const info: CursorInfo = {
        id: 'old-item',
        createdAt: new Date(0), // Jan 1, 1970
      }

      const encoded = encodeCursor(info)
      const decoded = decodeCursor(encoded)

      expect(decoded?.createdAt.getTime()).toBe(0)
    })

    it('should handle far future date', () => {
      const futureDate = new Date('2100-12-31T23:59:59.999Z')
      const info: CursorInfo = {
        id: 'future-item',
        createdAt: futureDate,
      }

      const encoded = encodeCursor(info)
      const decoded = decodeCursor(encoded)

      expect(decoded?.createdAt.toISOString()).toBe(futureDate.toISOString())
    })
  })
})
