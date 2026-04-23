// =============================================================================
// ConstrutorPro - Session Manager Service
// Gerenciamento de sessões ativas para usuários
// =============================================================================

// =============================================================================
// Types
// =============================================================================

export interface UserSession {
  id: string
  userId: string
  deviceName: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  browser: string
  os: string
  ip: string
  location?: string
  createdAt: Date
  lastActivityAt: Date
  expiresAt: Date
  isCurrent: boolean
}

export interface SessionCreateOptions {
  userId: string
  userAgent: string
  ip: string
}

// =============================================================================
// User Agent Parser
// =============================================================================

function parseUserAgent(userAgent: string): {
  browser: string
  os: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  deviceName: string
} {
  const ua = userAgent.toLowerCase()

  // Detect OS - iOS detection must come before macOS (both have "Mac" in UA)
  let os = 'Unknown'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) os = 'iOS'
  else if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS'
  else if (ua.includes('linux')) os = 'Linux'

  // Detect Browser
  let browser = 'Unknown'
  if (ua.includes('edg/')) browser = 'Microsoft Edge'
  else if (ua.includes('chrome/')) browser = 'Google Chrome'
  else if (ua.includes('firefox/')) browser = 'Mozilla Firefox'
  else if (ua.includes('safari/') && !ua.includes('chrome')) browser = 'Apple Safari'
  else if (ua.includes('opera') || ua.includes('opr/')) browser = 'Opera'

  // Detect Device Type
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop'
  if (ua.includes('mobile') || ua.includes('iphone')) deviceType = 'mobile'
  else if (ua.includes('tablet') || ua.includes('ipad')) deviceType = 'tablet'

  // Device Name
  const deviceName = `${browser} on ${os}`

  return { browser, os, deviceType, deviceName }
}

// =============================================================================
// In-Memory Session Store
// =============================================================================

class InMemorySessionStore {
  private sessions = new Map<string, UserSession>()

  create(session: UserSession): void {
    this.sessions.set(session.id, session)
  }

  get(sessionId: string): UserSession | undefined {
    return this.sessions.get(sessionId)
  }

  getByUserId(userId: string): UserSession[] {
    return Array.from(this.sessions.values())
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
  }

  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastActivityAt = new Date()
    }
  }

  delete(sessionId: string): boolean {
    return this.sessions.delete(sessionId)
  }

  deleteByUserId(userId: string): number {
    let deleted = 0
    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId) {
        this.sessions.delete(id)
        deleted++
      }
    }
    return deleted
  }

  deleteExpired(): number {
    const now = new Date()
    let deleted = 0
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(id)
        deleted++
      }
    }
    return deleted
  }

  count(): number {
    return this.sessions.size
  }
}

// =============================================================================
// Session Manager Service
// =============================================================================

class SessionManagerService {
  private store: InMemorySessionStore
  private sessionDuration: number // milliseconds

  constructor() {
    this.store = new InMemorySessionStore()
    this.sessionDuration = 7 * 24 * 60 * 60 * 1000 // 7 days

    // Cleanup expired sessions every hour
    if (typeof setInterval !== 'undefined') {
      setInterval(() => {
        this.store.deleteExpired()
      }, 60 * 60 * 1000)
    }
  }

  /**
   * Cria uma nova sessão
   */
  createSession(options: SessionCreateOptions): UserSession {
    const { userId, userAgent, ip } = options
    const parsed = parseUserAgent(userAgent)

    const session: UserSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      userId,
      deviceName: parsed.deviceName,
      deviceType: parsed.deviceType,
      browser: parsed.browser,
      os: parsed.os,
      ip,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: new Date(Date.now() + this.sessionDuration),
      isCurrent: true,
    }

    this.store.create(session)
    return session
  }

  /**
   * Obtém todas as sessões de um usuário
   */
  getUserSessions(userId: string, currentSessionId?: string): UserSession[] {
    const sessions = this.store.getByUserId(userId)
    return sessions.map((s) => ({
      ...s,
      isCurrent: s.id === currentSessionId,
    }))
  }

  /**
   * Atualiza atividade de uma sessão
   */
  updateActivity(sessionId: string): void {
    this.store.updateActivity(sessionId)
  }

  /**
   * Revoga uma sessão específica
   */
  revokeSession(sessionId: string, userId: string): boolean {
    const session = this.store.get(sessionId)
    if (!session || session.userId !== userId) {
      return false
    }
    return this.store.delete(sessionId)
  }

  /**
   * Revoga todas as outras sessões (exceto a atual)
   */
  revokeOtherSessions(userId: string, currentSessionId: string): number {
    const sessions = this.store.getByUserId(userId)
    let revoked = 0
    for (const session of sessions) {
      if (session.id !== currentSessionId) {
        this.store.delete(session.id)
        revoked++
      }
    }
    return revoked
  }

  /**
   * Revoga todas as sessões de um usuário
   */
  revokeAllSessions(userId: string): number {
    return this.store.deleteByUserId(userId)
  }

  /**
   * Verifica se uma sessão é válida
   */
  isValidSession(sessionId: string): boolean {
    const session = this.store.get(sessionId)
    if (!session) return false
    return session.expiresAt > new Date()
  }

  /**
   * Obtém estatísticas
   */
  getStats(): { totalSessions: number } {
    return {
      totalSessions: this.store.count(),
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const sessionManager = new SessionManagerService()
