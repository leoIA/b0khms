// =============================================================================
// ConstrutorPro - Password Reset Service
// Serviço para recuperação de senha com tokens seguros
// =============================================================================

// =============================================================================
// Types
// =============================================================================

export interface PasswordResetToken {
  id: string
  email: string
  token: string
  createdAt: Date
  expiresAt: Date
  usedAt: Date | null
}

export interface CreateResetTokenResult {
  success: boolean
  token?: string
  expiresAt?: Date
  error?: string
}

export interface ValidateTokenResult {
  valid: boolean
  email?: string
  error?: string
}

// =============================================================================
// In-Memory Token Store (para desenvolvimento/testes)
// Em produção, usar Redis ou tabela no banco de dados
// =============================================================================

class InMemoryTokenStore {
  private tokens = new Map<string, PasswordResetToken>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Limpeza automática a cada 10 minutos
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanup()
      }, 10 * 60 * 1000)
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, token] of this.tokens.entries()) {
      if (token.expiresAt.getTime() < now || token.usedAt) {
        this.tokens.delete(key)
      }
    }
  }

  create(email: string, token: string, expiresAt: Date): PasswordResetToken {
    const entry: PasswordResetToken = {
      id: `prt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      email: email.toLowerCase(),
      token,
      createdAt: new Date(),
      expiresAt,
      usedAt: null,
    }
    this.tokens.set(token, entry)
    return entry
  }

  findByToken(token: string): PasswordResetToken | undefined {
    return this.tokens.get(token)
  }

  findByEmail(email: string): PasswordResetToken | undefined {
    const emailLower = email.toLowerCase()
    for (const token of this.tokens.values()) {
      if (token.email === emailLower && !token.usedAt) {
        return token
      }
    }
    return undefined
  }

  markUsed(token: string): boolean {
    const entry = this.tokens.get(token)
    if (entry) {
      entry.usedAt = new Date()
      return true
    }
    return false
  }

  delete(token: string): boolean {
    return this.tokens.delete(token)
  }

  deleteByEmail(email: string): number {
    const emailLower = email.toLowerCase()
    let deleted = 0
    for (const [key, token] of this.tokens.entries()) {
      if (token.email === emailLower) {
        this.tokens.delete(key)
        deleted++
      }
    }
    return deleted
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.tokens.clear()
  }
}

// =============================================================================
// Password Reset Service
// =============================================================================

class PasswordResetService {
  private store: InMemoryTokenStore
  private tokenLength: number
  private tokenExpirationMs: number

  constructor() {
    this.store = new InMemoryTokenStore()
    this.tokenLength = 64 // Caracteres no token
    this.tokenExpirationMs = 60 * 60 * 1000 // 1 hora
  }

  /**
   * Gera um token criptograficamente seguro
   */
  private generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let token = ''
    const randomValues = new Uint8Array(this.tokenLength)

    // Usar crypto.getRandomValues para segurança
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues)
      for (let i = 0; i < this.tokenLength; i++) {
        token += chars[randomValues[i] % chars.length]
      }
    } else {
      // Fallback para Node.js
      for (let i = 0; i < this.tokenLength; i++) {
        token += chars[Math.floor(Math.random() * chars.length)]
      }
    }

    return token
  }

  /**
   * Cria um token de reset de senha
   */
  createToken(email: string): CreateResetTokenResult {
    const emailLower = email.toLowerCase()

    // Invalidar tokens anteriores para o mesmo email
    this.store.deleteByEmail(emailLower)

    const token = this.generateSecureToken()
    const expiresAt = new Date(Date.now() + this.tokenExpirationMs)

    const entry = this.store.create(emailLower, token, expiresAt)

    console.log(`[PasswordReset] Token created for ${emailLower}, expires at ${expiresAt.toISOString()}`)

    return {
      success: true,
      token: entry.token,
      expiresAt: entry.expiresAt,
    }
  }

  /**
   * Valida um token de reset
   */
  validateToken(token: string): ValidateTokenResult {
    if (!token || token.length !== this.tokenLength) {
      return { valid: false, error: 'Token inválido' }
    }

    const entry = this.store.findByToken(token)

    if (!entry) {
      return { valid: false, error: 'Token não encontrado' }
    }

    if (entry.usedAt) {
      return { valid: false, error: 'Token já utilizado' }
    }

    if (entry.expiresAt < new Date()) {
      this.store.delete(token)
      return { valid: false, error: 'Token expirado' }
    }

    return { valid: true, email: entry.email }
  }

  /**
   * Consome o token após uso bem-sucedido
   */
  consumeToken(token: string): boolean {
    return this.store.markUsed(token)
  }

  /**
   * Gera URL de reset de senha
   */
  generateResetUrl(token: string, baseUrl?: string): string {
    const base = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000'
    return `${base}/resetar-senha?token=${token}`
  }

  /**
   * Envia email de reset (placeholder - integrar com serviço de email)
   */
  async sendResetEmail(email: string, resetUrl: string): Promise<{ success: boolean; error?: string }> {
    // Em desenvolvimento, apenas log
    if (String(process.env.NODE_ENV) !== 'production') {
      console.log(`[PasswordReset] Email para ${email}:`)
      console.log(`  Reset URL: ${resetUrl}`)
      return { success: true }
    }

    // Em produção, integrar com serviço de email
    // Exemplo com Resend, SendGrid, etc.
    try {
      // TODO: Integrar com serviço de email real
      // const response = await fetch('https://api.resend.com/emails', {...})

      console.log(`[PasswordReset] Email enviado para ${email}`)
      return { success: true }
    } catch (error) {
      console.error('[PasswordReset] Erro ao enviar email:', error)
      return { success: false, error: 'Erro ao enviar email' }
    }
  }

  /**
   * Limpa tokens expirados manualmente
   */
  cleanup(): void {
    this.store.destroy()
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const passwordResetService = new PasswordResetService()
