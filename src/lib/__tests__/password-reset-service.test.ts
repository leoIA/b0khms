// =============================================================================
// ConstrutorPro - Password Reset Service Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { passwordResetService } from '../password-reset-service'

describe('Password Reset Service', () => {
  beforeEach(() => {
    // Clear any existing tokens
    passwordResetService.cleanup()
  })

  describe('createToken', () => {
    it('should create a reset token', () => {
      const result = passwordResetService.createToken('test@example.com')

      expect(result.success).toBe(true)
      expect(result.token).toBeDefined()
      expect(result.token?.length).toBe(64)
      expect(result.expiresAt).toBeDefined()
    })

    it('should normalize email to lowercase', () => {
      const result = passwordResetService.createToken('TEST@EXAMPLE.COM')

      expect(result.success).toBe(true)
    })

    it('should invalidate previous tokens for same email', () => {
      const result1 = passwordResetService.createToken('same@example.com')
      const result2 = passwordResetService.createToken('same@example.com')

      // First token should be invalidated
      const validate1 = passwordResetService.validateToken(result1.token!)
      expect(validate1.valid).toBe(false)

      // Second token should be valid
      const validate2 = passwordResetService.validateToken(result2.token!)
      expect(validate2.valid).toBe(true)
    })
  })

  describe('validateToken', () => {
    it('should validate a correct token', () => {
      const createResult = passwordResetService.createToken('valid@example.com')
      const validateResult = passwordResetService.validateToken(createResult.token!)

      expect(validateResult.valid).toBe(true)
      expect(validateResult.email).toBe('valid@example.com')
    })

    it('should reject invalid token format', () => {
      const result = passwordResetService.validateToken('short')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Token inválido')
    })

    it('should reject non-existent token', () => {
      const fakeToken = 'a'.repeat(64)
      const result = passwordResetService.validateToken(fakeToken)

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Token não encontrado')
    })

    it('should reject used token', () => {
      const createResult = passwordResetService.createToken('used@example.com')
      const token = createResult.token!

      // Consume the token
      passwordResetService.consumeToken(token)

      // Try to validate again
      const validateResult = passwordResetService.validateToken(token)
      expect(validateResult.valid).toBe(false)
      expect(validateResult.error).toBe('Token já utilizado')
    })
  })

  describe('consumeToken', () => {
    it('should mark token as used', () => {
      const createResult = passwordResetService.createToken('consume@example.com')
      const token = createResult.token!

      const consumeResult = passwordResetService.consumeToken(token)
      expect(consumeResult).toBe(true)

      const validateResult = passwordResetService.validateToken(token)
      expect(validateResult.valid).toBe(false)
      expect(validateResult.error).toBe('Token já utilizado')
    })

    it('should return false for non-existent token', () => {
      const result = passwordResetService.consumeToken('a'.repeat(64))
      expect(result).toBe(false)
    })
  })

  describe('generateResetUrl', () => {
    it('should generate correct reset URL', () => {
      const token = 'testtoken123'
      const url = passwordResetService.generateResetUrl(token, 'https://example.com')

      expect(url).toBe('https://example.com/resetar-senha?token=testtoken123')
    })

    it('should use default base URL when not provided', () => {
      const token = 'testtoken456'
      const url = passwordResetService.generateResetUrl(token)

      expect(url).toContain('/resetar-senha?token=testtoken456')
    })
  })
})
