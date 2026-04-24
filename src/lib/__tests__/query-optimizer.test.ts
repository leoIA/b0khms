// =============================================================================
// ConstrutorPro - Query Optimizer Tests
// Unit tests for pagination and query building utilities
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  normalizePagination,
  createPaginatedResult,
  QueryBuilder,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
} from '../query-optimizer';

describe('Query Optimizer', () => {
  describe('normalizePagination', () => {
    it('should return default values for empty params', () => {
      const result = normalizePagination({});
      
      expect(result.page).toBe(DEFAULT_PAGE);
      expect(result.limit).toBe(DEFAULT_LIMIT);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(DEFAULT_LIMIT);
    });

    it('should calculate correct skip for page 2', () => {
      const result = normalizePagination({ page: 2, limit: 10 });
      
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(10);
      expect(result.take).toBe(10);
    });

    it('should calculate correct skip for page 3 with limit 25', () => {
      const result = normalizePagination({ page: 3, limit: 25 });
      
      expect(result.page).toBe(3);
      expect(result.limit).toBe(25);
      expect(result.skip).toBe(50);
      expect(result.take).toBe(25);
    });

    it('should enforce minimum page of 1', () => {
      const result = normalizePagination({ page: 0 });
      expect(result.page).toBe(1);
    });

    it('should enforce minimum limit of 1', () => {
      const result = normalizePagination({ limit: 0 });
      expect(result.limit).toBe(1);
    });

    it('should enforce maximum limit', () => {
      const result = normalizePagination({ limit: 500 });
      expect(result.limit).toBe(MAX_LIMIT);
    });

    it('should handle negative values', () => {
      const result = normalizePagination({ page: -5, limit: -10 });
      
      expect(result.page).toBe(1);
      expect(result.limit).toBe(1);
    });
  });

  describe('createPaginatedResult', () => {
    it('should create correct paginated result', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const total = 100;
      
      const result = createPaginatedResult(data, total, 1, 20);
      
      expect(result.data).toEqual(data);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.totalPages).toBe(5);
      expect(result.pagination.hasMore).toBe(true);
    });

    it('should calculate hasMore correctly for last page', () => {
      const data = [{ id: 1 }];
      const total = 21;
      
      const result = createPaginatedResult(data, total, 2, 20);
      
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle empty data', () => {
      const result = createPaginatedResult([], 0, 1, 20);
      
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle exact page boundary', () => {
      const data = Array(20).fill({ id: 1 });
      const total = 40;
      
      const result = createPaginatedResult(data, total, 1, 20);
      
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasMore).toBe(true);
    });
  });

  describe('QueryBuilder', () => {
    describe('companyScope', () => {
      it('should create company scope filter', () => {
        const filter = QueryBuilder.companyScope('company-123');
        expect(filter).toEqual({ companyId: 'company-123' });
      });
    });

    describe('activeOnly', () => {
      it('should create active filter', () => {
        const filter = QueryBuilder.activeOnly();
        expect(filter).toEqual({ isActive: true });
      });
    });

    describe('dateRange', () => {
      it('should create date range filter with both dates', () => {
        const start = new Date('2024-01-01');
        const end = new Date('2024-12-31');
        
        const filter = QueryBuilder.dateRange('createdAt', start, end);
        
        expect(filter).toEqual({
          createdAt: {
            gte: start,
            lte: end,
          },
        });
      });

      it('should create filter with only start date', () => {
        const start = new Date('2024-01-01');
        
        const filter = QueryBuilder.dateRange('createdAt', start);
        
        expect(filter).toEqual({
          createdAt: {
            gte: start,
          },
        });
      });

      it('should create filter with only end date', () => {
        const end = new Date('2024-12-31');
        
        const filter = QueryBuilder.dateRange('createdAt', undefined, end);
        
        expect(filter).toEqual({
          createdAt: {
            lte: end,
          },
        });
      });

      it('should return empty object when no dates provided', () => {
        const filter = QueryBuilder.dateRange('createdAt');
        expect(filter).toEqual({});
      });
    });

    describe('searchFilter', () => {
      it('should create search filter for single field', () => {
        const filter = QueryBuilder.searchFilter(['name'], 'test');
        
        expect(filter).toEqual({
          name: {
            contains: 'test',
            mode: 'insensitive',
          },
        });
      });

      it('should create OR filter for multiple fields', () => {
        const filter = QueryBuilder.searchFilter(['name', 'email'], 'test');
        
        expect(filter).toEqual({
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { email: { contains: 'test', mode: 'insensitive' } },
          ],
        });
      });

      it('should trim whitespace from search term', () => {
        const filter = QueryBuilder.searchFilter(['name'], '  test  ');
        
        expect(filter).toEqual({
          name: {
            contains: 'test',
            mode: 'insensitive',
          },
        });
      });

      it('should return empty object for empty search', () => {
        const filter = QueryBuilder.searchFilter(['name'], '');
        expect(filter).toEqual({});
      });

      it('should return empty object for whitespace-only search', () => {
        const filter = QueryBuilder.searchFilter(['name'], '   ');
        expect(filter).toEqual({});
      });

      it('should return empty object for undefined search', () => {
        const filter = QueryBuilder.searchFilter(['name'], undefined);
        expect(filter).toEqual({});
      });
    });

    describe('statusFilter', () => {
      it('should create status filter for single status', () => {
        const filter = QueryBuilder.statusFilter('active');
        expect(filter).toEqual({ status: 'active' });
      });

      it('should create IN filter for multiple statuses', () => {
        const filter = QueryBuilder.statusFilter(['active', 'pending']);
        expect(filter).toEqual({ status: { in: ['active', 'pending'] } });
      });

      it('should return empty object for undefined status', () => {
        const filter = QueryBuilder.statusFilter(undefined);
        expect(filter).toEqual({});
      });
    });
  });
});
