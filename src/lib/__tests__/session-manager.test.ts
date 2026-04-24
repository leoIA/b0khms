// =============================================================================
// ConstrutorPro - Session Manager Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sessionManager } from '../session-manager'

describe('Session Manager Service', () => {
  beforeEach(() => {
    // Clear all sessions before each test
    sessionManager.revokeAllSessions('test-user')
  })

  describe('createSession', () => {
    it('should create a new session', () => {
      const session = sessionManager.createSession({
        userId: 'test-user',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        ip: '192.168.1.1',
      })

      expect(session.id).toMatch(/^sess_/)
      expect(session.userId).toBe('test-user')
      expect(session.ip).toBe('192.168.1.1')
      expect(session.deviceType).toBe('desktop')
      expect(session.browser).toBe('Google Chrome')
      expect(session.os).toBe('Windows')
      expect(session.isCurrent).toBe(true)
    })

    it('should detect mobile device', () => {
      const session = sessionManager.createSession({
        userId: 'test-user-mobile',
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1',
        ip: '10.0.0.1',
      })

      expect(session.deviceType).toBe('mobile')
      expect(session.os).toBe('iOS')
    })

    it('should detect tablet device', () => {
      const session = sessionManager.createSession({
        userId: 'test-user-tablet',
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) Safari/604.1',
        ip: '10.0.0.2',
      })

      expect(session.deviceType).toBe('tablet')
    })

    it('should detect Firefox browser', () => {
      const session = sessionManager.createSession({
        userId: 'test-user-firefox',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Firefox/121.0',
        ip: '10.0.0.3',
      })

      expect(session.browser).toBe('Mozilla Firefox')
    })

    it('should detect macOS', () => {
      const session = sessionManager.createSession({
        userId: 'test-user-mac',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0',
        ip: '10.0.0.4',
      })

      expect(session.os).toBe('macOS')
    })
  })

  describe('getUserSessions', () => {
    it('should return all sessions for a user', () => {
      sessionManager.createSession({
        userId: 'multi-session-user',
        userAgent: 'Chrome/120.0.0.0',
        ip: '10.0.0.1',
      })
      sessionManager.createSession({
        userId: 'multi-session-user',
        userAgent: 'Firefox/121.0',
        ip: '10.0.0.2',
      })

      const sessions = sessionManager.getUserSessions('multi-session-user')
      expect(sessions.length).toBe(2)
    })

    it('should mark current session correctly', () => {
      const session1 = sessionManager.createSession({
        userId: 'current-session-user',
        userAgent: 'Chrome',
        ip: '10.0.0.1',
      })

      const sessions = sessionManager.getUserSessions(
        'current-session-user',
        session1.id
      )

      expect(sessions[0].isCurrent).toBe(true)
    })

    it('should return empty array for user with no sessions', () => {
      const sessions = sessionManager.getUserSessions('no-sessions-user')
      expect(sessions).toEqual([])
    })
  })

  describe('revokeSession', () => {
    it('should revoke a specific session', () => {
      const session = sessionManager.createSession({
        userId: 'revoke-user',
        userAgent: 'Chrome',
        ip: '10.0.0.1',
      })

      const result = sessionManager.revokeSession(session.id, 'revoke-user')
      expect(result).toBe(true)

      const sessions = sessionManager.getUserSessions('revoke-user')
      expect(sessions.length).toBe(0)
    })

    it('should not revoke session of another user', () => {
      const session = sessionManager.createSession({
        userId: 'user-a',
        userAgent: 'Chrome',
        ip: '10.0.0.1',
      })

      const result = sessionManager.revokeSession(session.id, 'user-b')
      expect(result).toBe(false)

      const sessions = sessionManager.getUserSessions('user-a')
      expect(sessions.length).toBe(1)
    })
  })

  describe('revokeOtherSessions', () => {
    it('should revoke all sessions except current', () => {
      const session1 = sessionManager.createSession({
        userId: 'revoke-others-user',
        userAgent: 'Chrome',
        ip: '10.0.0.1',
      })
      sessionManager.createSession({
        userId: 'revoke-others-user',
        userAgent: 'Firefox',
        ip: '10.0.0.2',
      })
      sessionManager.createSession({
        userId: 'revoke-others-user',
        userAgent: 'Safari',
        ip: '10.0.0.3',
      })

      const count = sessionManager.revokeOtherSessions(
        'revoke-others-user',
        session1.id
      )
      expect(count).toBe(2)

      const sessions = sessionManager.getUserSessions(
        'revoke-others-user',
        session1.id
      )
      expect(sessions.length).toBe(1)
      expect(sessions[0].id).toBe(session1.id)
    })
  })

  describe('revokeAllSessions', () => {
    it('should revoke all sessions for a user', () => {
      sessionManager.createSession({
        userId: 'revoke-all-user',
        userAgent: 'Chrome',
        ip: '10.0.0.1',
      })
      sessionManager.createSession({
        userId: 'revoke-all-user',
        userAgent: 'Firefox',
        ip: '10.0.0.2',
      })

      const count = sessionManager.revokeAllSessions('revoke-all-user')
      expect(count).toBe(2)

      const sessions = sessionManager.getUserSessions('revoke-all-user')
      expect(sessions.length).toBe(0)
    })
  })

  describe('isValidSession', () => {
    it('should return true for valid session', () => {
      const session = sessionManager.createSession({
        userId: 'valid-session-user',
        userAgent: 'Chrome',
        ip: '10.0.0.1',
      })

      expect(sessionManager.isValidSession(session.id)).toBe(true)
    })

    it('should return false for non-existent session', () => {
      expect(sessionManager.isValidSession('non-existent-id')).toBe(false)
    })
  })

  describe('updateActivity', () => {
    it('should update last activity time', async () => {
      const session = sessionManager.createSession({
        userId: 'activity-user',
        userAgent: 'Chrome',
        ip: '10.0.0.1',
      })

      const originalActivity = session.lastActivityAt

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10))

      sessionManager.updateActivity(session.id)

      const sessions = sessionManager.getUserSessions('activity-user')
      expect(sessions[0].lastActivityAt.getTime()).toBeGreaterThanOrEqual(
        originalActivity.getTime()
      )
    })
  })
})
