/**
 * Serviço de Cache de Sessão para ConstrutorPro
 * 
 * Gerencia sessões de usuário com cache Redis/Memória para:
 * - Reduzir queries ao banco de dados
 * - Armazenar dados de sessão
 * - Gerenciar tokens de autenticação
 * - Cache de permissões
 */

import { getCacheManager, CACHE_TTL, CACHE_KEYS } from './redis-cache';
import { db } from './db';

// Tipos de sessão
interface SessionData {
  userId: string;
  email: string;
  name: string;
  role: string;
  companyId: string | null;
  companyName: string | null;
  avatar: string | null;
  permissions: string[];
  twoFactorEnabled: boolean;
  lastActivity: number;
  createdAt: number;
}

interface PermissionCache {
  role: string;
  permissions: string[];
  companyId: string | null;
}

// Mapeamento de permissões por role
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: [
    'users:read', 'users:write', 'users:delete',
    'projects:read', 'projects:write', 'projects:delete',
    'budgets:read', 'budgets:write', 'budgets:delete',
    'suppliers:read', 'suppliers:write', 'suppliers:delete',
    'clients:read', 'clients:write', 'clients:delete',
    'materials:read', 'materials:write', 'materials:delete',
    'finance:read', 'finance:write', 'finance:delete',
    'reports:read', 'reports:write', 'reports:delete',
    'settings:read', 'settings:write', 'settings:delete',
    'webhooks:read', 'webhooks:write', 'webhooks:delete',
    'patrimonio:read', 'patrimonio:write', 'patrimonio:delete',
    'viagens:read', 'viagens:write', 'viagens:delete', 'viagens:approve',
    'faturas:read', 'faturas:write', 'faturas:delete',
    'escalas:read', 'escalas:write', 'escalas:delete',
    'ai:read', 'ai:write',
    'nfe:read', 'nfe:write', 'nfe:sign',
  ],
  manager: [
    'users:read',
    'projects:read', 'projects:write',
    'budgets:read', 'budgets:write',
    'suppliers:read', 'suppliers:write',
    'clients:read', 'clients:write',
    'materials:read', 'materials:write',
    'finance:read', 'finance:write',
    'reports:read', 'reports:write',
    'settings:read',
    'patrimonio:read', 'patrimonio:write',
    'viagens:read', 'viagens:write', 'viagens:approve',
    'faturas:read', 'faturas:write',
    'escalas:read', 'escalas:write',
    'ai:read', 'ai:write',
    'nfe:read', 'nfe:write',
  ],
  employee: [
    'projects:read',
    'budgets:read',
    'materials:read',
    'reports:read',
    'patrimonio:read',
    'viagens:read', 'viagens:write',
    'escalas:read',
    'ai:read',
  ],
  viewer: [
    'projects:read',
    'budgets:read',
    'reports:read',
    'patrimonio:read',
  ],
};

/**
 * Serviço de Sessão com Cache
 */
export class SessionCacheService {
  private cache = getCacheManager();

  /**
   * Cria uma nova sessão no cache
   */
  async createSession(
    userId: string,
    sessionToken: string,
    additionalData?: Partial<SessionData>
  ): Promise<SessionData> {
    // Buscar dados do usuário
    const user = await db.users.findUnique({
      where: { id: userId },
      include: {
        companies: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Criar dados da sessão
    const sessionData: SessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: user.companies?.name || null,
      avatar: user.avatar,
      permissions: this.getPermissionsForRole(user.role),
      twoFactorEnabled: user.twoFactorEnabled,
      lastActivity: Date.now(),
      createdAt: Date.now(),
      ...additionalData,
    };

    // Salvar sessão no cache
    await this.cache.set(
      CACHE_KEYS.USER_SESSION(userId),
      sessionData,
      CACHE_TTL.SESSION
    );

    // Mapear token para userId
    await this.cache.set(
      `session:token:${sessionToken}`,
      { userId, createdAt: Date.now() },
      CACHE_TTL.SESSION
    );

    return sessionData;
  }

  /**
   * Obtém sessão do cache
   */
  async getSession(userId: string): Promise<SessionData | null> {
    return this.cache.get<SessionData>(CACHE_KEYS.USER_SESSION(userId));
  }

  /**
   * Obtém sessão por token
   */
  async getSessionByToken(token: string): Promise<SessionData | null> {
    const tokenData = await this.cache.get<{ userId: string }>(
      `session:token:${token}`
    );

    if (!tokenData) return null;

    return this.getSession(tokenData.userId);
  }

  /**
   * Atualiza última atividade da sessão
   */
  async updateActivity(userId: string): Promise<void> {
    const session = await this.getSession(userId);
    if (session) {
      session.lastActivity = Date.now();
      await this.cache.set(
        CACHE_KEYS.USER_SESSION(userId),
        session,
        CACHE_TTL.SESSION
      );
    }
  }

  /**
   * Estende a sessão
   */
  async extendSession(userId: string): Promise<boolean> {
    const session = await this.getSession(userId);
    if (!session) return false;

    await this.cache.set(
      CACHE_KEYS.USER_SESSION(userId),
      session,
      CACHE_TTL.SESSION
    );

    return true;
  }

  /**
   * Invalida sessão
   */
  async invalidateSession(userId: string, token?: string): Promise<void> {
    await this.cache.delete(CACHE_KEYS.USER_SESSION(userId));
    
    if (token) {
      await this.cache.delete(`session:token:${token}`);
    }
  }

  /**
   * Invalida todas as sessões de um usuário
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    // Invalidar cache de sessão principal
    await this.cache.delete(CACHE_KEYS.USER_SESSION(userId));
    
    // Invalidar cache de permissões
    await this.cache.delete(CACHE_KEYS.USER_PERMISSIONS(userId));
    
    // Invalidar cache de perfil
    await this.cache.delete(CACHE_KEYS.USER_PROFILE(userId));
  }

  /**
   * Obtém permissões do usuário com cache
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    // Verificar cache de permissões
    const cached = await this.cache.get<PermissionCache>(
      CACHE_KEYS.USER_PERMISSIONS(userId)
    );

    if (cached) {
      return cached.permissions;
    }

    // Buscar do banco
    const user = await db.users.findUnique({
      where: { id: userId },
      select: { role: true, companyId: true },
    });

    if (!user) return [];

    const permissions = this.getPermissionsForRole(user.role);

    // Salvar no cache
    await this.cache.set(
      CACHE_KEYS.USER_PERMISSIONS(userId),
      { role: user.role, permissions, companyId: user.companyId },
      CACHE_TTL.HOUR
    );

    return permissions;
  }

  /**
   * Verifica se usuário tem permissão
   */
  async hasPermission(
    userId: string,
    permission: string
  ): Promise<boolean> {
    const permissions = await this.getUserPermissions(userId);
    return permissions.includes(permission);
  }

  /**
   * Verifica múltiplas permissões
   */
  async hasPermissions(
    userId: string,
    permissions: string[]
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.every(p => userPermissions.includes(p));
  }

  /**
   * Verifica se usuário tem pelo menos uma das permissões
   */
  async hasAnyPermission(
    userId: string,
    permissions: string[]
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissions.some(p => userPermissions.includes(p));
  }

  /**
   * Atualiza permissões quando role muda
   */
  async updatePermissions(userId: string, newRole: string): Promise<void> {
    const permissions = this.getPermissionsForRole(newRole);
    
    // Atualizar cache de permissões
    await this.cache.set(
      CACHE_KEYS.USER_PERMISSIONS(userId),
      { role: newRole, permissions, companyId: null },
      CACHE_TTL.HOUR
    );

    // Atualizar sessão se existir
    const session = await this.getSession(userId);
    if (session) {
      session.role = newRole;
      session.permissions = permissions;
      await this.cache.set(
        CACHE_KEYS.USER_SESSION(userId),
        session,
        CACHE_TTL.SESSION
      );
    }
  }

  /**
   * Obtém permissões para um role
   */
  private getPermissionsForRole(role: string): string[] {
    return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer;
  }

  /**
   * Lista sessões ativas de uma empresa
   */
  async getActiveSessionsForCompany(
    companyId: string
  ): Promise<{ userId: string; email: string; lastActivity: number }[]> {
    // Esta funcionalidade seria implementada com um índice separado
    // Por ora, retorna vazio (pode ser implementado com Redis SCAN)
    return [];
  }

  /**
   * Conta sessões ativas
   */
  async countActiveSessions(): Promise<number> {
    const stats = await this.cache.getStats();
    return stats.memory.totalKeys;
  }

  /**
   * Limpa sessões expiradas
   */
  async cleanExpiredSessions(): Promise<void> {
    // O cache já tem TTL, então sessões expiram automaticamente
    // Este método pode ser usado para limpeza adicional se necessário
  }
}

// Instância global
let sessionService: SessionCacheService | null = null;

/**
 * Obtém instância do serviço de sessão
 */
export function getSessionService(): SessionCacheService {
  if (!sessionService) {
    sessionService = new SessionCacheService();
  }
  return sessionService;
}

export default getSessionService;
