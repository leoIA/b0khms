// =============================================================================
// ConstrutorPro - Server Authorization Utilities
// Centralized authorization functions for secure multi-tenant access
// =============================================================================

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import type { UserRole, UserSession } from '@/types';
import { USER_ROLES, ERROR_MESSAGES } from '@/lib/constants';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// -----------------------------------------------------------------------------
// Type Definitions
// -----------------------------------------------------------------------------

export interface AuthContext {
  user: UserSession;
  companyId: string;
  isMasterAdmin: boolean;
  isCompanyAdmin: boolean;
  canManageCompany: boolean;
}

export interface AuthResult {
  success: boolean;
  context?: AuthContext;
  error?: string;
  status?: number;
}

// -----------------------------------------------------------------------------
// Role Hierarchy Functions
// -----------------------------------------------------------------------------

/**
 * Check if a role has equal or higher level than required
 */
export function hasRoleLevel(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = USER_ROLES[userRole]?.level ?? 0;
  const requiredLevel = USER_ROLES[requiredRole]?.level ?? 0;
  return userLevel >= requiredLevel;
}

/**
 * Check if user has one of the specified roles
 */
export function hasAnyRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Check if user is master admin
 */
export function isMasterAdmin(role: UserRole): boolean {
  return role === 'master_admin';
}

/**
 * Check if user is company admin or higher
 */
export function isCompanyAdminOrHigher(role: UserRole): boolean {
  return hasRoleLevel(role, 'company_admin');
}

/**
 * Check if user is manager or higher
 */
export function isManagerOrHigher(role: UserRole): boolean {
  return hasRoleLevel(role, 'manager');
}

// -----------------------------------------------------------------------------
// Core Authorization Functions
// -----------------------------------------------------------------------------

/**
 * Get current authenticated session
 */
export async function getSession(): Promise<UserSession | null> {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AuthResult> {
  const user = await getSession();
  
  if (!user) {
    return {
      success: false,
      error: ERROR_MESSAGES.UNAUTHORIZED,
      status: 401,
    };
  }
  
  if (!user.companyId && user.role !== 'master_admin') {
    return {
      success: false,
      error: ERROR_MESSAGES.COMPANY_REQUIRED,
      status: 403,
    };
  }
  
  return {
    success: true,
    context: {
      user,
      companyId: user.companyId ?? '',
      isMasterAdmin: user.role === 'master_admin',
      isCompanyAdmin: hasRoleLevel(user.role, 'company_admin'),
      canManageCompany: hasRoleLevel(user.role, 'manager'),
    },
  };
}

/**
 * Require specific role
 */
export async function requireRole(requiredRole: UserRole): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.success) {
    return authResult;
  }
  
  const { user } = authResult.context!;
  
  if (!hasRoleLevel(user.role, requiredRole)) {
    return {
      success: false,
      error: ERROR_MESSAGES.FORBIDDEN,
      status: 403,
    };
  }
  
  return authResult;
}

/**
 * Require admin role (company_admin or higher)
 */
export async function requireAdmin(): Promise<AuthResult> {
  return requireRole('company_admin');
}

/**
 * Require master admin role
 */
export async function requireMasterAdmin(): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.success) {
    return authResult;
  }
  
  const { user } = authResult.context!;
  
  if (user.role !== 'master_admin') {
    return {
      success: false,
      error: ERROR_MESSAGES.FORBIDDEN,
      status: 403,
    };
  }
  
  return authResult;
}

/**
 * Require company access - validates user belongs to company
 */
export async function requireCompanyAccess(companyId: string): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.success) {
    return authResult;
  }
  
  const { user } = authResult.context!;
  
  // Master admin has access to all companies
  if (user.role === 'master_admin') {
    return authResult;
  }
  
  // Regular users can only access their own company
  if (user.companyId !== companyId) {
    return {
      success: false,
      error: ERROR_MESSAGES.FORBIDDEN,
      status: 403,
    };
  }
  
  return authResult;
}

// -----------------------------------------------------------------------------
// Ownership Validation Functions
// -----------------------------------------------------------------------------

/**
 * Validate company owns a resource
 */
export async function validateCompanyOwnership(
  companyId: string,
  entityType: string,
  entityId: string
): Promise<boolean> {
  const models: Record<string, string> = {
    client: 'clients',
    supplier: 'suppliers',
    project: 'projects',
    budget: 'budgets',
    composition: 'compositions',
    material: 'materials',
    schedule: 'schedules',
    dailyLog: 'daily_logs',
    transaction: 'transactions',
    conversation: 'ai_conversations',
    quotation: 'quotations',
    budgetTemplate: 'budget_templates',
    actualCost: 'actual_costs',
    purchaseOrder: 'purchase_orders',
    medicao: 'medicoes',
  };
  
  const modelName = models[entityType];
  if (!modelName) return false;
  
  try {
    const entity = await (db as unknown as Record<string, { findUnique: (args: { where: { id: string } }) => Promise<{ companyId: string } | null> }>)[modelName].findUnique({
      where: { id: entityId },
    });
    
    return entity?.companyId === companyId;
  } catch {
    return false;
  }
}

/**
 * Require ownership of a resource
 */
export async function requireOwnership(
  entityType: string,
  entityId: string
): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.success) {
    return authResult;
  }
  
  const { user, companyId, isMasterAdmin } = authResult.context!;
  
  // Master admin bypasses ownership check
  if (isMasterAdmin) {
    return authResult;
  }
  
  const hasOwnership = await validateCompanyOwnership(companyId, entityType, entityId);
  
  if (!hasOwnership) {
    return {
      success: false,
      error: ERROR_MESSAGES.NOT_FOUND,
      status: 404, // Return 404 to not leak existence
    };
  }
  
  return authResult;
}

/**
 * Require ownership with specific role requirement
 */
export async function requireOwnershipWithRole(
  entityType: string,
  entityId: string,
  requiredRole: UserRole
): Promise<AuthResult> {
  const authResult = await requireRole(requiredRole);
  
  if (!authResult.success) {
    return authResult;
  }
  
  return requireOwnership(entityType, entityId);
}

// -----------------------------------------------------------------------------
// Project-Specific Authorization
// -----------------------------------------------------------------------------

/**
 * Validate user has access to a project
 */
export async function requireProjectAccess(projectId: string): Promise<AuthResult> {
  const authResult = await requireAuth();
  
  if (!authResult.success) {
    return authResult;
  }
  
  const { user, companyId, isMasterAdmin } = authResult.context!;
  
  // Master admin has access to all projects
  if (isMasterAdmin) {
    return authResult;
  }
  
  const project = await db.projects.findUnique({
    where: { id: projectId },
    select: { companyId: true },
  });
  
  if (!project || project.companyId !== companyId) {
    return {
      success: false,
      error: ERROR_MESSAGES.NOT_FOUND,
      status: 404,
    };
  }
  
  return authResult;
}

// -----------------------------------------------------------------------------
// API Response Helpers
// -----------------------------------------------------------------------------

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message?: string): NextResponse {
  return NextResponse.json(
    { success: false, error: message ?? ERROR_MESSAGES.UNAUTHORIZED },
    { status: 401 }
  );
}

/**
 * Create forbidden response
 */
export function forbiddenResponse(message?: string): NextResponse {
  return NextResponse.json(
    { success: false, error: message ?? ERROR_MESSAGES.FORBIDDEN },
    { status: 403 }
  );
}

/**
 * Create not found response
 */
export function notFoundResponse(message?: string): NextResponse {
  return NextResponse.json(
    { success: false, error: message ?? ERROR_MESSAGES.NOT_FOUND },
    { status: 404 }
  );
}

/**
 * Create validation error response
 */
export function validationErrorResponse(message?: string, details?: Record<string, string[]>): NextResponse {
  return NextResponse.json(
    { 
      success: false, 
      error: message ?? ERROR_MESSAGES.VALIDATION_ERROR,
      details,
    },
    { status: 400 }
  );
}

/**
 * Create success response
 */
export function successResponse<T>(data: T, message?: string): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

/**
 * Create error response
 */
export function errorResponse(error: string, status = 400, details?: Record<string, string[]>): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error,
      details,
    },
    { status }
  );
}

/**
 * Parse request body with Zod schema
 */
export async function parseRequestBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ success: true; data: T } | { success: false; error: string; details?: Record<string, string[]> }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const details: Record<string, string[]> = {};
      if (result.error?.issues) {
        result.error.issues.forEach((err) => {
          const path = err.path.join('.');
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(err.message);
        });
      }
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
 * Calculate pagination values
 */
export function calculatePagination(page: number, limit: number) {
  return {
    page,
    limit,
    skip: (page - 1) * limit,
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
) {
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
// Company Context Helper
// -----------------------------------------------------------------------------

/**
 * Get company filter for queries
 * Returns the company ID to filter by, or null for master admin (all companies)
 */
export async function getCompanyFilter(): Promise<{ companyId: string } | Record<string, never>> {
  const user = await getSession();
  
  if (!user) {
    throw new Error('Not authenticated');
  }
  
  // Master admin can see all companies
  if (user.role === 'master_admin') {
    return {};
  }
  
  if (!user.companyId) {
    throw new Error('Company not found');
  }
  
  return { companyId: user.companyId };
}

/**
 * Get company ID for current user
 */
export async function getCurrentCompanyId(): Promise<string | null> {
  const user = await getSession();
  return user?.companyId ?? null;
}

// -----------------------------------------------------------------------------
// Permission Checks for UI
// -----------------------------------------------------------------------------

export const PERMISSIONS = {
  // Master Admin only
  MANAGE_COMPANIES: ['master_admin'],
  VIEW_ALL_COMPANIES: ['master_admin'],
  MANAGE_PLANS: ['master_admin'],
  
  // Company Admin and above
  MANAGE_USERS: ['master_admin', 'company_admin'],
  MANAGE_COMPANY_SETTINGS: ['master_admin', 'company_admin'],
  VIEW_REPORTS: ['master_admin', 'company_admin', 'manager', 'finance', 'engineer'],
  
  // Manager and above
  MANAGE_PROJECTS: ['master_admin', 'company_admin', 'manager'],
  MANAGE_BUDGETS: ['master_admin', 'company_admin', 'manager', 'engineer'],
  APPROVE_BUDGETS: ['master_admin', 'company_admin', 'manager'],
  
  // Finance
  MANAGE_FINANCES: ['master_admin', 'company_admin', 'manager', 'finance'],
  VIEW_FINANCIAL_REPORTS: ['master_admin', 'company_admin', 'manager', 'finance'],
  
  // Procurement
  MANAGE_SUPPLIERS: ['master_admin', 'company_admin', 'manager', 'procurement'],
  MANAGE_MATERIALS: ['master_admin', 'company_admin', 'manager', 'procurement', 'engineer'],
  MANAGE_COMPOSITIONS: ['master_admin', 'company_admin', 'manager', 'procurement', 'engineer'],
  
  // Operations
  MANAGE_SCHEDULES: ['master_admin', 'company_admin', 'manager', 'engineer', 'operations'],
  MANAGE_DAILY_LOGS: ['master_admin', 'company_admin', 'manager', 'engineer', 'operations'],
  
  // Clients
  MANAGE_CLIENTS: ['master_admin', 'company_admin', 'manager', 'procurement', 'finance'],
  
  // AI
  USE_AI: ['master_admin', 'company_admin', 'manager', 'engineer', 'finance', 'procurement'],
  
  // Viewer
  VIEW_DASHBOARD: ['master_admin', 'company_admin', 'manager', 'engineer', 'finance', 'procurement', 'operations', 'viewer'],
} as const;

/**
 * Check if user has permission for an action
 */
export function hasPermission(userRole: UserRole, permission: readonly UserRole[]): boolean {
  return permission.includes(userRole);
}
