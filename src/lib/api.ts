// =============================================================================
// ConstrutorPro - API Utilities
// Reusable helpers for API routes
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { PaginatedResponse, BaseFilters, ApiResponse } from '@/types';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '@/lib/constants';

// -----------------------------------------------------------------------------
// Request Parsing
// -----------------------------------------------------------------------------

/**
 * Safely parse JSON request body with Zod schema validation
 */
export async function parseRequestBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>
): Promise<{ success: true; data: T } | { success: false; error: string; details?: Record<string, string[]> }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const details: Record<string, string[]> = {};
      result.error.issues.forEach((err) => {
        const path = err.path.join('.');
        if (!details[path]) {
          details[path] = [];
        }
        details[path].push(err.message);
      });
      
      return {
        success: false,
        error: 'Dados inválidos. Por favor, verifique os campos.',
        details,
      };
    }
    
    return { success: true, data: result.data };
  } catch {
    return {
      success: false,
      error: 'Erro ao processar a requisição.',
    };
  }
}

/**
 * Parse query parameters with Zod schema validation
 */
export function parseQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const { searchParams } = new URL(request.url);
  const params: Record<string, string> = {};
  
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  const result = schema.safeParse(params);
  
  if (!result.success) {
    return {
      success: false,
      error: 'Parâmetros de consulta inválidos.',
    };
  }
  
  return { success: true, data: result.data };
}

// -----------------------------------------------------------------------------
// Pagination Helpers
// -----------------------------------------------------------------------------

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

/**
 * Calculate pagination values
 */
export function calculatePagination(page?: number, limit?: number): PaginationParams {
  const validPage = Math.max(1, page ?? 1);
  const validLimit = PAGE_SIZE_OPTIONS.includes(limit ?? DEFAULT_PAGE_SIZE)
    ? (limit ?? DEFAULT_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  
  return {
    page: validPage,
    limit: validLimit,
    skip: (validPage - 1) * validLimit,
  };
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// -----------------------------------------------------------------------------
// Filter Helpers
// -----------------------------------------------------------------------------

export interface SearchFilter {
  search?: string;
}

/**
 * Build search condition for Prisma queries
 */
export function buildSearchCondition(
  searchFields: string[],
  search?: string
): Record<string, unknown> | undefined {
  if (!search || search.trim() === '') {
    return undefined;
  }
  
  const searchTerm = search.trim().toLowerCase();
  
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
}

/**
 * Build date range condition for Prisma queries
 */
export function buildDateRangeCondition(
  field: string,
  startDate?: Date,
  endDate?: Date
): Record<string, unknown> | undefined {
  if (!startDate && !endDate) {
    return undefined;
  }
  
  const condition: Record<string, unknown> = {};
  
  if (startDate) {
    condition.gte = startDate;
  }
  
  if (endDate) {
    condition.lte = endDate;
  }
  
  return { [field]: condition };
}

/**
 * Build sort condition for Prisma queries
 */
export function buildSortCondition(
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Record<string, 'asc' | 'desc'> {
  if (!sortBy) {
    return { createdAt: sortOrder ?? 'desc' };
  }
  
  return { [sortBy]: sortOrder ?? 'desc' };
}

// -----------------------------------------------------------------------------
// Response Helpers
// -----------------------------------------------------------------------------

/**
 * Create API response
 */
export function apiResponse<T>(
  data: T,
  options?: {
    message?: string;
    status?: number;
  }
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message: options?.message,
    },
    { status: options?.status ?? 200 }
  );
}

/**
 * Create error response
 */
export function apiError(
  error: string,
  options?: {
    status?: number;
    details?: Record<string, string[]>;
  }
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      details: options?.details,
    },
    { status: options?.status ?? 400 }
  );
}

/**
 * Create not found response
 */
export function notFoundError(message = 'Recurso não encontrado.'): NextResponse<ApiResponse> {
  return apiError(message, { status: 404 });
}

/**
 * Create unauthorized response
 */
export function unauthorizedError(message = 'Não autorizado.'): NextResponse<ApiResponse> {
  return apiError(message, { status: 401 });
}

/**
 * Create forbidden response
 */
export function forbiddenError(message = 'Acesso negado.'): NextResponse<ApiResponse> {
  return apiError(message, { status: 403 });
}

/**
 * Create validation error response
 */
export function validationError(
  message = 'Dados inválidos.',
  details?: Record<string, string[]>
): NextResponse<ApiResponse> {
  return apiError(message, { status: 400, details });
}

/**
 * Create server error response
 */
export function serverError(message = 'Erro interno do servidor.'): NextResponse<ApiResponse> {
  return apiError(message, { status: 500 });
}

// -----------------------------------------------------------------------------
// ID Validation
// -----------------------------------------------------------------------------

/**
 * Validate and extract ID from params
 */
export function getValidId(params: Record<string, string | string[]>): string | null {
  const id = params.id;
  
  if (typeof id !== 'string' || !id || id.trim() === '') {
    return null;
  }
  
  return id;
}

// -----------------------------------------------------------------------------
// Request Context Helper
// -----------------------------------------------------------------------------

export interface RequestContext {
  userId: string;
  companyId: string;
  userRole: string;
}

/**
 * Get request context from headers (for middleware-injected context)
 */
export function getRequestContext(request: NextRequest): RequestContext | null {
  const userId = request.headers.get('x-user-id');
  const companyId = request.headers.get('x-company-id');
  const userRole = request.headers.get('x-user-role');
  
  if (!userId || !companyId || !userRole) {
    return null;
  }
  
  return { userId, companyId, userRole };
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Sleep utility for testing/loading states
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format currency value
 */
export function formatCurrency(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numValue);
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const dateValue = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR').format(dateValue);
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date | string): string {
  const dateValue = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(dateValue);
}
