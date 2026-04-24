/**
 * API de Gerenciamento de Cache
 * 
 * Endpoints para:
 * - Visualizar estatísticas
 * - Invalidar caches
 * - Limpar cache
 * - Ver chaves
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCacheManager, invalidateCompanyCache, invalidateProjectCache, invalidateBudgetCache, invalidateUserCache, invalidateDashboardCache } from '@/lib/redis-cache';
import { getSessionService } from '@/lib/session-cache';

// Helper para verificar autenticação
async function checkAuth(request: NextRequest) {
  // Verificar session cookie ou header
  const sessionToken = request.cookies.get('next-auth.session-token')?.value ||
    request.cookies.get('__Secure-next-auth.session-token')?.value ||
    request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!sessionToken) {
    return null;
  }
  
  // Por ora, retornar um usuário mock para desenvolvimento
  // Em produção, verificar sessão real
  return {
    id: 'user-id',
    role: 'admin',
    companyId: 'company-id',
  };
}

// GET - Obter estatísticas do cache
export async function GET(request: NextRequest) {
  try {
    const user = await checkAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apenas admins podem ver estatísticas completas
    const isAdmin = user.role === 'admin';
    
    const cache = getCacheManager();
    const stats = await cache.getDetailedStats();

    if (isAdmin) {
      const sessionService = getSessionService();
      const sessionCount = await sessionService.countActiveSessions();

      return NextResponse.json({
        provider: stats.provider,
        redis: stats.redis,
        memory: stats.memory,
        isRedisActive: stats.isRedisActive,
        activeSessions: sessionCount,
      });
    }

    // Usuários não-admin veem apenas info básica
    return NextResponse.json({
      provider: stats.provider,
      isRedisActive: stats.isRedisActive,
    });
  } catch (error) {
    console.error('Cache stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get cache stats' },
      { status: 500 }
    );
  }
}

// POST - Operações de cache
export async function POST(request: NextRequest) {
  try {
    const user = await checkAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin required' }, { status: 401 });
    }

    const body = await request.json();
    const { action, target, targetId } = body;

    let result: { success: boolean; message: string; deleted?: number };

    switch (action) {
      case 'invalidate_company':
        if (!targetId) {
          return NextResponse.json(
            { error: 'companyId required' },
            { status: 400 }
          );
        }
        const deletedCompany = await invalidateCompanyCache(targetId);
        result = {
          success: true,
          message: `Invalidated ${deletedCompany} cache entries for company`,
          deleted: deletedCompany,
        };
        break;

      case 'invalidate_project':
        if (!targetId) {
          return NextResponse.json(
            { error: 'projectId required' },
            { status: 400 }
          );
        }
        const deletedProject = await invalidateProjectCache(targetId);
        result = {
          success: true,
          message: `Invalidated ${deletedProject} cache entries for project`,
          deleted: deletedProject,
        };
        break;

      case 'invalidate_budget':
        if (!targetId) {
          return NextResponse.json(
            { error: 'budgetId required' },
            { status: 400 }
          );
        }
        const deletedBudget = await invalidateBudgetCache(targetId);
        result = {
          success: true,
          message: `Invalidated ${deletedBudget} cache entries for budget`,
          deleted: deletedBudget,
        };
        break;

      case 'invalidate_user':
        if (!targetId) {
          return NextResponse.json(
            { error: 'userId required' },
            { status: 400 }
          );
        }
        const deletedUser = await invalidateUserCache(targetId);
        result = {
          success: true,
          message: `Invalidated ${deletedUser} cache entries for user`,
          deleted: deletedUser,
        };
        break;

      case 'invalidate_dashboard':
        if (!targetId) {
          return NextResponse.json(
            { error: 'companyId required' },
            { status: 400 }
          );
        }
        const deletedDashboard = await invalidateDashboardCache(targetId);
        result = {
          success: true,
          message: `Invalidated ${deletedDashboard} dashboard cache entries`,
          deleted: deletedDashboard,
        };
        break;

      case 'clear_all':
        const cache = getCacheManager();
        await cache.clear();
        result = {
          success: true,
          message: 'All cache cleared',
        };
        break;

      case 'clear_pattern':
        if (!target) {
          return NextResponse.json(
            { error: 'pattern required' },
            { status: 400 }
          );
        }
        const cacheManager = getCacheManager();
        const deletedPattern = await cacheManager.deletePattern(target);
        result = {
          success: true,
          message: `Invalidated ${deletedPattern} cache entries matching pattern`,
          deleted: deletedPattern,
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Cache action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform cache action' },
      { status: 500 }
    );
  }
}

// DELETE - Limpar cache específico
export async function DELETE(request: NextRequest) {
  try {
    const user = await checkAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get('pattern');

    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern required' },
        { status: 400 }
      );
    }

    const cache = getCacheManager();
    const deleted = await cache.deletePattern(pattern);

    return NextResponse.json({
      success: true,
      deleted,
      message: `Deleted ${deleted} cache entries`,
    });
  } catch (error) {
    console.error('Cache delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete cache' },
      { status: 500 }
    );
  }
}
