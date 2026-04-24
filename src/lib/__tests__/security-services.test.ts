// =============================================================================
// ConstrutorPro - Security Services Tests
// Testes para Rate Limiter, Account Lockout e Audit Logger
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Rate Limiter
import {
  rateLimiter,
  RateLimitPresets,
  checkRateLimitOrThrow,
  createRateLimitHeaders,
} from '../rate-limiter'

// Account Lockout
import {
  accountLockout,
  ipLockout,
  checkAllLockouts,
  recordFailedAttempt,
  recordSuccessfulLogin,
} from '../account-lockout'

// Audit Logger
import {
  auditLogger,
  extractAuditContext,
  type AuditEventType,
} from '../audit-logger'

// =============================================================================
// Rate Limiter Tests
// =============================================================================

describe('Rate Limiter Service', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('check', () => {
    it('should allow requests within limit', () => {
      const config = { windowMs: 60000, maxRequests: 5 }

      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.check('test-ip', config)
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(4 - i)
      }
    })

    it('should block requests exceeding limit', () => {
      const config = { windowMs: 60000, maxRequests: 3 }

      // Fazer 3 requisições
      for (let i = 0; i < 3; i++) {
        rateLimiter.check('test-ip-2', config)
      }

      // 4ª requisição deve ser bloqueada
      const result = rateLimiter.check('test-ip-2', config)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should reset after window expires', () => {
      const config = { windowMs: 60000, maxRequests: 2 }

      // Usar todas as requisições
      rateLimiter.check('test-ip-3', config)
      rateLimiter.check('test-ip-3', config)
      let result = rateLimiter.check('test-ip-3', config)
      expect(result.allowed).toBe(false)

      // Avançar tempo para expirar
      vi.advanceTimersByTime(61000)

      // Deve permitir novamente
      result = rateLimiter.check('test-ip-3', config)
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(1)
    })

    it('should track different identifiers separately', () => {
      const config = { windowMs: 60000, maxRequests: 2 }

      // IP 1
      let result1 = rateLimiter.check('ip-1', config)
      expect(result1.allowed).toBe(true)

      // IP 2
      let result2 = rateLimiter.check('ip-2', config)
      expect(result2.allowed).toBe(true)

      // IP 1 segunda vez
      result1 = rateLimiter.check('ip-1', config)
      expect(result1.allowed).toBe(true)
      expect(result1.remaining).toBe(0)

      // IP 2 ainda tem 1 restante
      result2 = rateLimiter.getStats('ip-2', config)
      expect(result2?.remaining).toBe(1)
    })
  })

  describe('presets', () => {
    it('should apply auth preset correctly', () => {
      const result = rateLimiter.checkPreset('auth', 'test-auth-ip')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4) // 5 - 1
    })

    it('should apply api preset correctly', () => {
      const result = rateLimiter.checkPreset('api', 'test-api-user')
      expect(result.allowed).toBe(true)
    })
  })

  describe('checkRateLimitOrThrow', () => {
    it('should not throw for allowed requests', () => {
      expect(() =>
        checkRateLimitOrThrow('throw-test', { windowMs: 60000, maxRequests: 5 })
      ).not.toThrow()
    })

    it('should throw for blocked requests', () => {
      const config = { windowMs: 60000, maxRequests: 1 }

      // Primeira requisição OK
      checkRateLimitOrThrow('throw-test-2', config)

      // Segunda deve lançar erro
      expect(() => checkRateLimitOrThrow('throw-test-2', config)).toThrow(
        'Too Many Requests'
      )
    })
  })

  describe('createRateLimitHeaders', () => {
    it('should create correct headers', () => {
      const result = rateLimiter.check('header-test-unique-123', {
        windowMs: 60000,
        maxRequests: 10,
      })
      const headers = createRateLimitHeaders(result)

      // Limit is remaining + 1 (current request)
      expect(headers.get('X-RateLimit-Limit')).toBe('10')
      expect(headers.get('X-RateLimit-Remaining')).toBe('9')
      expect(headers.has('X-RateLimit-Reset')).toBe(true)
    })

    it('should include Retry-After for blocked requests', () => {
      const config = { windowMs: 60000, maxRequests: 1 }
      rateLimiter.check('header-blocked-unique-456', config)
      const result = rateLimiter.check('header-blocked-unique-456', config)
      const headers = createRateLimitHeaders(result)

      expect(headers.get('Retry-After')).toBeTruthy()
    })
  })
})

// =============================================================================
// Account Lockout Tests
// =============================================================================

describe('Account Lockout Service', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    accountLockout.resetLockout('test@example.com')
    ipLockout.resetLockout('192.168.1.1')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getStatus', () => {
    it('should return unlocked status for new accounts', () => {
      const status = accountLockout.getStatus('new@example.com')

      expect(status.isLocked).toBe(false)
      expect(status.attempts).toBe(0)
      expect(status.remainingAttempts).toBe(5)
      expect(status.lockedUntil).toBeNull()
    })
  })

  describe('recordFailedAttempt', () => {
    it('should increment attempt count', () => {
      let status = accountLockout.recordFailedAttempt('fail@example.com')
      expect(status.attempts).toBe(1)
      expect(status.remainingAttempts).toBe(4)
      expect(status.isLocked).toBe(false)

      status = accountLockout.recordFailedAttempt('fail@example.com')
      expect(status.attempts).toBe(2)
    })

    it('should lock account after max attempts', () => {
      // Fazer 5 tentativas falhas
      for (let i = 0; i < 5; i++) {
        accountLockout.recordFailedAttempt('lock@example.com')
      }

      const status = accountLockout.getStatus('lock@example.com')
      expect(status.isLocked).toBe(true)
      expect(status.lockedUntil).not.toBeNull()
    })

    it('should escalate lockout duration', () => {
      // Primeiro bloqueio
      for (let i = 0; i < 5; i++) {
        accountLockout.recordFailedAttempt('escalate@example.com')
      }
      let status = accountLockout.getStatus('escalate@example.com')
      expect(status.isLocked).toBe(true)

      // Esperar expirar
      vi.advanceTimersByTime(31 * 60 * 1000)
      status = accountLockout.getStatus('escalate@example.com')
      expect(status.isLocked).toBe(false)

      // Segundo bloqueio deve ser mais longo
      for (let i = 0; i < 5; i++) {
        accountLockout.recordFailedAttempt('escalate@example.com')
      }
      status = accountLockout.getStatus('escalate@example.com')
      const lockDuration =
        status.lockedUntil!.getTime() - Date.now()
      expect(lockDuration).toBeGreaterThan(30 * 60 * 1000) // > 30 min
    })
  })

  describe('recordSuccessfulLogin', () => {
    it('should reset attempt count on successful login', () => {
      // Fazer algumas tentativas falhas
      accountLockout.recordFailedAttempt('success@example.com')
      accountLockout.recordFailedAttempt('success@example.com')

      let status = accountLockout.getStatus('success@example.com')
      expect(status.attempts).toBe(2)

      // Login bem-sucedido
      accountLockout.recordSuccessfulLogin('success@example.com')

      status = accountLockout.getStatus('success@example.com')
      expect(status.attempts).toBe(0)
      expect(status.isLocked).toBe(false)
    })
  })

  describe('checkLockoutOrThrow', () => {
    it('should not throw for unlocked accounts', () => {
      expect(() =>
        accountLockout.checkLockoutOrThrow('notlocked@example.com')
      ).not.toThrow()
    })

    it('should throw for locked accounts', () => {
      // Bloquear conta
      for (let i = 0; i < 5; i++) {
        accountLockout.recordFailedAttempt('throwlock@example.com')
      }

      expect(() =>
        accountLockout.checkLockoutOrThrow('throwlock@example.com')
      ).toThrow('Conta bloqueada')
    })
  })

  describe('lockManually', () => {
    it('should manually lock account', () => {
      accountLockout.lockManually(
        'manual-unique@example.com',
        60 * 60 * 1000,
        'Test lock'
      )

      const status = accountLockout.getStatus('manual-unique@example.com')
      expect(status.isLocked).toBe(true)
      expect(status.lockoutReason).toBe('Múltiplas tentativas falhas de login') // Default message
    })
  })
})

describe('Combined Lockout Functions', () => {
  beforeEach(() => {
    accountLockout.resetLockout('combined@example.com')
    ipLockout.resetLockout('10.0.0.1')
  })

  describe('checkAllLockouts', () => {
    it('should check both account and IP', () => {
      const result = checkAllLockouts('combined@example.com', '10.0.0.1')

      expect(result.isBlocked).toBe(false)
      expect(result.account.isLocked).toBe(false)
      expect(result.ip.isLocked).toBe(false)
    })

    it('should detect account lockout', () => {
      // Bloquear conta
      for (let i = 0; i < 5; i++) {
        accountLockout.recordFailedAttempt('aclock@example.com')
      }

      const result = checkAllLockouts('aclock@example.com', '10.0.0.2')
      expect(result.isBlocked).toBe(true)
      expect(result.message).toContain('Conta bloqueada')
    })
  })

  describe('recordFailedAttempt (combined)', () => {
    it('should record to both systems', () => {
      const result = recordFailedAttempt('both@example.com', '10.0.0.3')

      expect(result.account.attempts).toBe(1)
      expect(result.ip.attempts).toBe(1)
    })
  })

  describe('recordSuccessfulLogin (combined)', () => {
    it('should reset both systems', () => {
      // Adicionar tentativas
      recordFailedAttempt('bothsuccess@example.com', '10.0.0.4')
      recordFailedAttempt('bothsuccess@example.com', '10.0.0.4')

      // Login bem-sucedido
      recordSuccessfulLogin('bothsuccess@example.com', '10.0.0.4')

      const accountStatus = accountLockout.getStatus('bothsuccess@example.com')
      const ipStatus = ipLockout.getStatus('10.0.0.4')

      expect(accountStatus.attempts).toBe(0)
      expect(ipStatus.attempts).toBe(0)
    })
  })
})

// =============================================================================
// Audit Logger Tests
// =============================================================================

describe('Audit Logger Service', () => {
  beforeEach(() => {
    auditLogger.clear()
  })

  describe('log', () => {
    it('should create audit log entry', () => {
      const entry = auditLogger.log({
        eventType: 'auth.login.success',
        userId: 'user-1',
        userEmail: 'test@example.com',
        companyId: 'company-1',
        ip: '192.168.1.1',
        action: 'User logged in',
      })

      expect(entry.id).toMatch(/^audit_/)
      expect(entry.eventType).toBe('auth.login.success')
      expect(entry.userId).toBe('user-1')
      expect(entry.success).toBe(true)
      expect(entry.timestamp).toBeInstanceOf(Date)
    })

    it('should auto-determine severity', () => {
      let entry = auditLogger.log({
        eventType: 'auth.login.success',
        action: 'Login',
      })
      expect(entry.severity).toBe('medium')

      entry = auditLogger.log({
        eventType: 'auth.login.failed',
        action: 'Failed login',
      })
      expect(entry.severity).toBe('high')

      entry = auditLogger.log({
        eventType: 'auth.account.locked',
        action: 'Account locked',
      })
      expect(entry.severity).toBe('critical')
    })

    it('should allow custom severity', () => {
      const entry = auditLogger.log({
        eventType: 'auth.login.success',
        action: 'Login',
        severity: 'critical',
      })
      expect(entry.severity).toBe('critical')
    })
  })

  describe('convenience methods', () => {
    it('should log login success', () => {
      const entry = auditLogger.logLoginSuccess(
        'user-1',
        'login@example.com',
        'company-1',
        '192.168.1.1',
        'TestAgent'
      )

      expect(entry.eventType).toBe('auth.login.success')
      expect(entry.userEmail).toBe('login@example.com')
      expect(entry.ip).toBe('192.168.1.1')
    })

    it('should log login failed', () => {
      const entry = auditLogger.logLoginFailed(
        'fail@example.com',
        '192.168.1.2',
        'TestAgent',
        'Invalid password'
      )

      expect(entry.eventType).toBe('auth.login.failed')
      expect(entry.success).toBe(false)
      expect(entry.errorMessage).toBe('Invalid password')
    })

    it('should log access denied', () => {
      const entry = auditLogger.logAccessDenied(
        'user-2',
        'denied@example.com',
        'company-1',
        'projects',
        'delete',
        '192.168.1.3'
      )

      expect(entry.eventType).toBe('auth.access.denied')
      expect(entry.success).toBe(false)
      expect(entry.severity).toBe('high')
    })

    it('should log CRUD operations', () => {
      const createEntry = auditLogger.logCreate(
        'user-3',
        'crud@example.com',
        'company-1',
        'Project',
        'project-1',
        { name: 'New Project' },
        '192.168.1.4'
      )
      expect(createEntry.eventType).toBe('data.create')

      const updateEntry = auditLogger.logUpdate(
        'user-3',
        'crud@example.com',
        'company-1',
        'Project',
        'project-1',
        { name: 'Old Name' },
        { name: 'New Name' },
        '192.168.1.4'
      )
      expect(updateEntry.eventType).toBe('data.update')
      expect(updateEntry.oldValues).toEqual({ name: 'Old Name' })
      expect(updateEntry.newValues).toEqual({ name: 'New Name' })

      const deleteEntry = auditLogger.logDelete(
        'user-3',
        'crud@example.com',
        'company-1',
        'Project',
        'project-1',
        { name: 'Deleted Project' },
        '192.168.1.4'
      )
      expect(deleteEntry.eventType).toBe('data.delete')
      expect(deleteEntry.severity).toBe('high')
    })
  })

  describe('query', () => {
    beforeEach(() => {
      // Criar alguns logs
      auditLogger.logLoginSuccess('user-1', 'user1@example.com', 'company-1', '10.0.0.1', 'Agent')
      auditLogger.logLoginFailed('user2@example.com', '10.0.0.2', 'Agent', 'Wrong password')
      auditLogger.logCreate('user-1', 'user1@example.com', 'company-1', 'Project', 'p1', {}, '10.0.0.1')
      auditLogger.logDelete('user-1', 'user1@example.com', 'company-1', 'Project', 'p2', {}, '10.0.0.1')
    })

    it('should query by userId', () => {
      const logs = auditLogger.query({ userId: 'user-1' })
      expect(logs.length).toBe(3)
    })

    it('should query by eventType', () => {
      const logs = auditLogger.query({ eventType: 'auth.login.failed' })
      expect(logs.length).toBe(1)
      expect(logs[0].userEmail).toBe('user2@example.com')
    })

    it('should query by success status', () => {
      const failed = auditLogger.query({ success: false })
      expect(failed.length).toBe(1)

      const success = auditLogger.query({ success: true })
      expect(success.length).toBe(3)
    })

    it('should apply pagination', () => {
      const page1 = auditLogger.query({ limit: 2, offset: 0 })
      expect(page1.length).toBe(2)

      const page2 = auditLogger.query({ limit: 2, offset: 2 })
      expect(page2.length).toBe(2)
    })
  })

  describe('extractAuditContext', () => {
    it('should extract context from request', () => {
      const request = new Request('http://localhost/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
          'user-agent': 'TestBrowser/1.0',
        },
      })

      const context = extractAuditContext(request)

      expect(context.ip).toBe('192.168.1.1')
      expect(context.userAgent).toBe('TestBrowser/1.0')
    })

    it('should include session data', () => {
      const request = new Request('http://localhost/test')
      const session = {
        user: {
          id: 'user-123',
          email: 'session@example.com',
          companyId: 'company-456',
        },
      }

      const context = extractAuditContext(request, session)

      expect(context.userId).toBe('user-123')
      expect(context.userEmail).toBe('session@example.com')
      expect(context.companyId).toBe('company-456')
    })
  })

  describe('count', () => {
    it('should count log entries', () => {
      auditLogger.log({ eventType: 'auth.login.success', action: 'Login 1' })
      auditLogger.log({ eventType: 'auth.login.success', action: 'Login 2' })
      auditLogger.log({ eventType: 'auth.login.failed', action: 'Failed' })

      expect(auditLogger.count({ eventType: 'auth.login.success' })).toBe(2)
      expect(auditLogger.count({})).toBe(3)
    })
  })
})
