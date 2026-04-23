// =============================================================================
// ConstrutorPro - Query Optimizer Service
// Utilities for optimized database queries with caching and pagination
// =============================================================================

import { db } from './db';
import { cache, CacheTTL, CacheKeys } from './cache';

/**
 * Pagination parameters and response types
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Normalize pagination parameters
 */
export function normalizePagination(params: PaginationParams): {
  skip: number;
  take: number;
  page: number;
  limit: number;
} {
  const page = Math.max(1, params.page ?? DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, params.limit ?? DEFAULT_LIMIT));
  
  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  };
}

/**
 * Create a paginated result object
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Optimized query builder for common patterns
 */
export const QueryBuilder = {
  /**
   * Build a where clause for company-scoped queries
   */
  companyScope(companyId: string): { companyId: string } {
    return { companyId };
  },
  
  /**
   * Build a where clause for active entities
   */
  activeOnly(): { isActive: boolean } {
    return { isActive: true };
  },
  
  /**
   * Build a date range filter
   */
  dateRange(field: string, start?: Date, end?: Date): Record<string, unknown> {
    if (!start && !end) return {};
    
    const filter: Record<string, unknown> = {};
    
    if (start && end) {
      filter[field] = { gte: start, lte: end };
    } else if (start) {
      filter[field] = { gte: start };
    } else if (end) {
      filter[field] = { lte: end };
    }
    
    return filter;
  },
  
  /**
   * Build a search filter for text fields
   */
  searchFilter(searchFields: string[], query?: string): Record<string, unknown> {
    if (!query || query.trim() === '') return {};
    
    const searchTerm = query.trim();
    
    if (searchFields.length === 1) {
      return {
        [searchFields[0]]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      };
    }
    
    return {
      OR: searchFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    };
  },
  
  /**
   * Build a status filter
   */
  statusFilter(status?: string | string[]): Record<string, unknown> {
    if (!status) return {};
    
    if (Array.isArray(status)) {
      return { status: { in: status } };
    }
    
    return { status };
  },
};

/**
 * Optimized repository with caching for frequently accessed entities
 */
export const CachedQueries = {
  /**
   * Get projects with caching and pagination
   */
  async getProjects<T = unknown>(
    companyId: string,
    params: PaginationParams & { status?: string; search?: string }
  ): Promise<PaginatedResult<T>> {
    const { skip, take, page, limit } = normalizePagination(params);
    const cacheKey = CacheKeys.companyProjects(
      companyId,
      `${page}-${limit}-${params.status || 'all'}-${params.search || ''}`
    );
    
    return cache.getOrSet(
      cacheKey,
      async () => {
        const where = {
          ...QueryBuilder.companyScope(companyId),
          ...QueryBuilder.statusFilter(params.status),
          ...QueryBuilder.searchFilter(['name', 'code', 'description'], params.search),
        };
        
        const [data, total] = await Promise.all([
          db.projects.findMany({
            where,
            skip,
            take,
            include: {
              clients: {
                select: { id: true, name: true, email: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          }),
          db.projects.count({ where }),
        ]);
        
        return createPaginatedResult(data as T[], total, page, limit);
      },
      CacheTTL.PROJECTS_LIST
    );
  },
  
  /**
   * Get project by ID with caching
   */
  async getProjectById<T = unknown>(
    companyId: string,
    projectId: string
  ): Promise<T | null> {
    const cacheKey = CacheKeys.companyProject(companyId, projectId);
    
    return cache.getOrSet(
      cacheKey,
      async () => {
        return db.projects.findFirst({
          where: {
            id: projectId,
            companyId,
          },
          include: {
            clients: true,
            budgets: {
              where: { status: 'approved' },
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
            schedules: {
              take: 1,
              orderBy: { createdAt: 'desc' },
            },
          },
        }) as Promise<T | null>;
      },
      CacheTTL.PROJECT_DETAIL
    );
  },
  
  /**
   * Get clients with caching
   */
  async getClients<T = unknown>(
    companyId: string,
    params: PaginationParams & { search?: string }
  ): Promise<PaginatedResult<T>> {
    const { skip, take, page, limit } = normalizePagination(params);
    const cacheKey = CacheKeys.companyClients(companyId) + `:${page}-${limit}:${params.search || ''}`;
    
    return cache.getOrSet(
      cacheKey,
      async () => {
        const where = {
          ...QueryBuilder.companyScope(companyId),
          ...QueryBuilder.searchFilter(['name', 'email', 'cpfCnpj'], params.search),
        };
        
        const [data, total] = await Promise.all([
          db.clients.findMany({
            where,
            skip,
            take,
            orderBy: { name: 'asc' },
          }),
          db.clients.count({ where }),
        ]);
        
        return createPaginatedResult(data as T[], total, page, limit);
      },
      CacheTTL.CLIENTS
    );
  },
  
  /**
   * Get suppliers with caching
   */
  async getSuppliers<T = unknown>(
    companyId: string,
    params: PaginationParams & { search?: string; category?: string }
  ): Promise<PaginatedResult<T>> {
    const { skip, take, page, limit } = normalizePagination(params);
    const cacheKey = CacheKeys.companySuppliers(companyId) + 
      `:${page}-${limit}:${params.search || ''}:${params.category || ''}`;
    
    return cache.getOrSet(
      cacheKey,
      async () => {
        const where: any = {
          ...QueryBuilder.companyScope(companyId),
          ...QueryBuilder.searchFilter(['name', 'tradeName', 'cnpj'], params.search),
        };
        
        if (params.category) {
          where.category = params.category;
        }
        
        const [data, total] = await Promise.all([
          db.suppliers.findMany({
            where,
            skip,
            take,
            orderBy: { name: 'asc' },
          }),
          db.suppliers.count({ where }),
        ]);
        
        return createPaginatedResult(data as T[], total, page, limit);
      },
      CacheTTL.SUPPLIERS
    );
  },
  
  /**
   * Get materials with caching
   */
  async getMaterials<T = unknown>(
    companyId: string,
    params: PaginationParams & { search?: string; category?: string }
  ): Promise<PaginatedResult<T>> {
    const { skip, take, page, limit } = normalizePagination(params);
    const cacheKey = CacheKeys.companyMaterials(companyId) + 
      `:${page}-${limit}:${params.search || ''}:${params.category || ''}`;
    
    return cache.getOrSet(
      cacheKey,
      async () => {
        const where: any = {
          ...QueryBuilder.companyScope(companyId),
          ...QueryBuilder.searchFilter(['name', 'code', 'description'], params.search),
        };
        
        if (params.category) {
          where.category = params.category;
        }
        
        const [data, total] = await Promise.all([
          db.materials.findMany({
            where,
            skip,
            take,
            include: {
              suppliers: {
                select: { id: true, name: true },
              },
            },
            orderBy: { name: 'asc' },
          }),
          db.materials.count({ where }),
        ]);
        
        return createPaginatedResult(data as T[], total, page, limit);
      },
      CacheTTL.MATERIALS
    );
  },
  
  /**
   * Get compositions with caching
   */
  async getCompositions<T = unknown>(
    companyId: string,
    params: PaginationParams & { search?: string }
  ): Promise<PaginatedResult<T>> {
    const { skip, take, page, limit } = normalizePagination(params);
    const cacheKey = CacheKeys.companyCompositions(companyId) + 
      `:${page}-${limit}:${params.search || ''}`;
    
    return cache.getOrSet(
      cacheKey,
      async () => {
        const where: any = {
          ...QueryBuilder.companyScope(companyId),
          ...QueryBuilder.activeOnly(),
          ...QueryBuilder.searchFilter(['name', 'code', 'description'], params.search),
        };
        
        const [data, total] = await Promise.all([
          db.compositions.findMany({
            where,
            skip,
            take,
            include: {
              composition_items: {
                include: {
                  materials: {
                    select: { id: true, name: true, unit: true, unitCost: true },
                  },
                },
                orderBy: { order: 'asc' },
              },
            },
            orderBy: { name: 'asc' },
          }),
          db.compositions.count({ where }),
        ]);
        
        return createPaginatedResult(data as T[], total, page, limit);
      },
      CacheTTL.COMPOSITIONS
    );
  },
  
  /**
   * Get unread alerts count for a company
   */
  async getUnreadAlertsCount(companyId: string): Promise<number> {
    const cacheKey = CacheKeys.companyAlerts(companyId) + ':unread:count';
    
    return cache.getOrSet(
      cacheKey,
      async () => {
        return db.alerts.count({
          where: {
            companyId,
            isRead: false,
          },
        });
      },
      CacheTTL.ALERTS
    );
  },
  
  /**
   * Get dashboard statistics with short cache
   */
  async getDashboardStats(
    companyId: string,
    userId: string
  ): Promise<{
    projectsCount: number;
    activeProjectsCount: number;
    clientsCount: number;
    budgetsCount: number;
    pendingAlerts: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
  }> {
    const cacheKey = CacheKeys.userDashboard(userId, companyId);
    
    return cache.getOrSet(
      cacheKey,
      async () => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const [
          projectsCount,
          activeProjectsCount,
          clientsCount,
          budgetsCount,
          pendingAlerts,
          monthlyRevenue,
          monthlyExpenses,
        ] = await Promise.all([
          db.projects.count({ where: { companyId } }),
          db.projects.count({
            where: { companyId, status: 'in_progress' },
          }),
          db.clients.count({ where: { companyId } }),
          db.budgets.count({ where: { companyId } }),
          db.alerts.count({
            where: { companyId, isRead: false },
          }),
          db.transactions.aggregate({
            where: {
              companyId,
              type: 'income',
              date: { gte: startOfMonth },
            },
            _sum: { value: true },
          }),
          db.transactions.aggregate({
            where: {
              companyId,
              type: 'expense',
              date: { gte: startOfMonth },
            },
            _sum: { value: true },
          }),
        ]);
        
        return {
          projectsCount,
          activeProjectsCount,
          clientsCount,
          budgetsCount,
          pendingAlerts,
          monthlyRevenue: Number(monthlyRevenue._sum.value || 0),
          monthlyExpenses: Number(monthlyExpenses._sum.value || 0),
        };
      },
      CacheTTL.DASHBOARD_STATS
    );
  },
};

/**
 * Cache invalidation helpers for mutations
 */
export const CacheInvalidation = {
  async onProjectChange(companyId: string, projectId?: string): Promise<void> {
    await Promise.all([
      cache.deletePattern(`projects:${companyId}*`),
      cache.deletePattern(`dashboard:${companyId}*`),
      projectId && cache.deletePattern(`project:${companyId}:${projectId}`),
    ]);
  },
  
  async onClientChange(companyId: string): Promise<void> {
    await cache.deletePattern(`clients:${companyId}*`);
  },
  
  async onSupplierChange(companyId: string): Promise<void> {
    await Promise.all([
      cache.deletePattern(`suppliers:${companyId}*`),
      cache.deletePattern(`materials:${companyId}*`),
    ]);
  },
  
  async onMaterialChange(companyId: string): Promise<void> {
    await Promise.all([
      cache.deletePattern(`materials:${companyId}*`),
      cache.deletePattern(`compositions:${companyId}*`),
    ]);
  },
  
  async onCompositionChange(companyId: string): Promise<void> {
    await cache.deletePattern(`compositions:${companyId}*`);
  },
  
  async onBudgetChange(companyId: string): Promise<void> {
    await Promise.all([
      cache.deletePattern(`budgets:${companyId}*`),
      cache.deletePattern(`dashboard:${companyId}*`),
    ]);
  },
  
  async onAlertChange(companyId: string): Promise<void> {
    await Promise.all([
      cache.deletePattern(`alerts:${companyId}*`),
      cache.deletePattern(`dashboard:${companyId}*`),
    ]);
  },
  
  async onTransactionChange(companyId: string): Promise<void> {
    await Promise.all([
      cache.deletePattern(`transactions:${companyId}*`),
      cache.deletePattern(`dashboard:${companyId}*`),
    ]);
  },
  
  async onUserPermissionChange(userId: string): Promise<void> {
    await cache.deletePattern(`permissions:${userId}*`);
  },
};
