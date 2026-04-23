// =============================================================================
// ConstrutorPro - Presence System
// Sistema de presença de usuários online
// =============================================================================

// Interface para presença de usuário
export interface UserPresence {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  companyId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  currentPage?: string;
  device?: 'desktop' | 'mobile' | 'tablet';
}

// Configurações de presença
export const PRESENCE_CONFIG = {
  // Tempo para considerar usuário como 'away' (em ms)
  awayTimeout: 5 * 60 * 1000, // 5 minutos
  // Tempo para considerar usuário como 'offline' (em ms)
  offlineTimeout: 15 * 60 * 1000, // 15 minutos
  // Intervalo de heartbeat (em ms)
  heartbeatInterval: 60 * 1000, // 1 minuto
} as const;

// Gerenciador de presença
class PresenceManager {
  private static instance: PresenceManager;
  private presences: Map<string, UserPresence>;
  private companyPresences: Map<string, Set<string>>;
  private heartbeatTimers: Map<string, NodeJS.Timeout>;

  private constructor() {
    this.presences = new Map();
    this.companyPresences = new Map();
    this.heartbeatTimers = new Map();
  }

  static getInstance(): PresenceManager {
    if (!PresenceManager.instance) {
      PresenceManager.instance = new PresenceManager();
    }
    return PresenceManager.instance;
  }

  /**
   * Registra presença de usuário
   */
  setPresence(
    userId: string,
    data: {
      userName: string;
      userEmail: string;
      userAvatar?: string;
      companyId: string;
      currentPage?: string;
      device?: 'desktop' | 'mobile' | 'tablet';
    }
  ): void {
    const presence: UserPresence = {
      userId,
      userName: data.userName,
      userEmail: data.userEmail,
      userAvatar: data.userAvatar,
      companyId: data.companyId,
      status: 'online',
      lastSeen: new Date(),
      currentPage: data.currentPage,
      device: data.device,
    };

    this.presences.set(userId, presence);

    // Adicionar à lista da empresa
    if (!this.companyPresences.has(data.companyId)) {
      this.companyPresences.set(data.companyId, new Set());
    }
    this.companyPresences.get(data.companyId)!.add(userId);

    // Iniciar heartbeat
    this.startHeartbeat(userId);
  }

  /**
   * Atualiza status de presença
   */
  updateStatus(
    userId: string,
    status: 'online' | 'away' | 'busy' | 'offline'
  ): void {
    const presence = this.presences.get(userId);
    if (presence) {
      presence.status = status;
      presence.lastSeen = new Date();
    }
  }

  /**
   * Atualiza página atual do usuário
   */
  updateCurrentPage(userId: string, currentPage: string): void {
    const presence = this.presences.get(userId);
    if (presence) {
      presence.currentPage = currentPage;
      presence.lastSeen = new Date();
      
      // Se estava away, voltar para online
      if (presence.status === 'away') {
        presence.status = 'online';
      }
    }
  }

  /**
   * Registra atividade do usuário (para heartbeat)
   */
  heartbeat(userId: string): void {
    const presence = this.presences.get(userId);
    if (presence) {
      presence.lastSeen = new Date();
      
      // Se estava away, voltar para online
      if (presence.status === 'away') {
        presence.status = 'online';
      }
    }
  }

  /**
   * Remove presença do usuário
   */
  removePresence(userId: string): void {
    const presence = this.presences.get(userId);
    if (presence) {
      // Remover da lista da empresa
      const companySet = this.companyPresences.get(presence.companyId);
      if (companySet) {
        companySet.delete(userId);
      }
      
      this.presences.delete(userId);
    }

    // Parar heartbeat
    const timer = this.heartbeatTimers.get(userId);
    if (timer) {
      clearInterval(timer);
      this.heartbeatTimers.delete(userId);
    }
  }

  /**
   * Obtém presença de um usuário
   */
  getPresence(userId: string): UserPresence | undefined {
    return this.presences.get(userId);
  }

  /**
   * Obtém todos os usuários online de uma empresa
   */
  getCompanyPresence(companyId: string): UserPresence[] {
    const userIds = this.companyPresences.get(companyId);
    if (!userIds) return [];

    const presences: UserPresence[] = [];
    for (const userId of userIds) {
      const presence = this.presences.get(userId);
      if (presence && presence.status !== 'offline') {
        presences.push(presence);
      }
    }

    return presences.sort((a, b) => a.userName.localeCompare(b.userName));
  }

  /**
   * Obtém contagem de usuários online por empresa
   */
  getOnlineCount(companyId: string): number {
    const userIds = this.companyPresences.get(companyId);
    if (!userIds) return 0;

    let count = 0;
    for (const userId of userIds) {
      const presence = this.presences.get(userId);
      if (presence && presence.status === 'online') {
        count++;
      }
    }

    return count;
  }

  /**
   * Verifica e atualiza usuários inativos
   */
  checkInactiveUsers(): void {
    const now = Date.now();

    for (const presence of this.presences.values()) {
      const timeSinceLastSeen = now - presence.lastSeen.getTime();

      if (timeSinceLastSeen > PRESENCE_CONFIG.offlineTimeout) {
        presence.status = 'offline';
      } else if (
        timeSinceLastSeen > PRESENCE_CONFIG.awayTimeout &&
        presence.status === 'online'
      ) {
        presence.status = 'away';
      }
    }
  }

  /**
   * Obtém estatísticas de presença
   */
  getStats(): {
    totalOnline: number;
    byCompany: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const byCompany: Record<string, number> = {};
    const byStatus: Record<string, number> = { online: 0, away: 0, busy: 0, offline: 0 };
    let totalOnline = 0;

    for (const presence of this.presences.values()) {
      byStatus[presence.status]++;

      if (presence.status === 'online') {
        totalOnline++;
        byCompany[presence.companyId] = (byCompany[presence.companyId] || 0) + 1;
      }
    }

    return { totalOnline, byCompany, byStatus };
  }

  // Métodos privados

  private startHeartbeat(userId: string): void {
    // Limpar timer existente
    const existingTimer = this.heartbeatTimers.get(userId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    const timer = setInterval(() => {
      const presence = this.presences.get(userId);
      if (presence) {
        const timeSinceLastSeen = Date.now() - presence.lastSeen.getTime();

        if (timeSinceLastSeen > PRESENCE_CONFIG.offlineTimeout) {
          this.removePresence(userId);
        } else if (
          timeSinceLastSeen > PRESENCE_CONFIG.awayTimeout &&
          presence.status === 'online'
        ) {
          presence.status = 'away';
        }
      } else {
        clearInterval(timer);
        this.heartbeatTimers.delete(userId);
      }
    }, PRESENCE_CONFIG.heartbeatInterval);

    this.heartbeatTimers.set(userId, timer);
  }
}

// Exportar instância singleton
export const presenceManager = PresenceManager.getInstance();
