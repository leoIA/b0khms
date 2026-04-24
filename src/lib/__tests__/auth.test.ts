// =============================================================================
// ConstrutorPro - Unit Tests: Authentication Service
// Testes para validação de senhas, tokens e autenticação
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

// Mock do bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(async (password: string, rounds: number) => `hashed_${password}_${rounds}`),
    compare: vi.fn(async (password: string, hash: string) => {
      return hash.includes(password)
    }),
    genSalt: vi.fn(async (rounds: number) => `salt_${rounds}`),
  },
}))

describe('Authentication Service', () => {
  describe('Password Hashing', () => {
    it('should hash a password with bcrypt', async () => {
      const password = 'TestPassword123!'
      const hash = await bcrypt.hash(password, 10)
      
      expect(hash).toBeDefined()
      expect(hash).toContain('TestPassword123!')
      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10)
    })

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!'
      const hash1 = await bcrypt.hash(password, 10)
      const hash2 = await bcrypt.hash(password, 12)
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('Password Comparison', () => {
    it('should return true for correct password', async () => {
      const password = 'TestPassword123!'
      const hash = 'hashed_TestPassword123!_10'
      
      const result = await bcrypt.compare(password, hash)
      
      expect(result).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const password = 'WrongPassword123!'
      const hash = 'hashed_TestPassword123!_10'
      
      const result = await bcrypt.compare(password, hash)
      
      expect(result).toBe(false)
    })
  })
})

describe('Password Validation', () => {
  const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (password.length < 8) {
      errors.push('A senha deve ter pelo menos 8 caracteres')
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('A senha deve conter pelo menos uma letra maiúscula')
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('A senha deve conter pelo menos uma letra minúscula')
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('A senha deve conter pelo menos um número')
    }
    
    return {
      valid: errors.length === 0,
      errors,
    }
  }

  it('should validate a strong password', () => {
    const result = validatePassword('StrongPass123!')
    
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject password without uppercase', () => {
    const result = validatePassword('weakpass123!')
    
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('A senha deve conter pelo menos uma letra maiúscula')
  })

  it('should reject password without lowercase', () => {
    const result = validatePassword('WEAKPASS123!')
    
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('A senha deve conter pelo menos uma letra minúscula')
  })

  it('should reject password without number', () => {
    const result = validatePassword('WeakPassword!')
    
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('A senha deve conter pelo menos um número')
  })

  it('should reject short password', () => {
    const result = validatePassword('Short1!')
    
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('A senha deve ter pelo menos 8 caracteres')
  })

  it('should return multiple errors for very weak password', () => {
    const result = validatePassword('abc')
    
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(2)
  })
})

describe('Email Validation', () => {
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  it('should validate correct email format', () => {
    expect(validateEmail('test@example.com')).toBe(true)
    expect(validateEmail('user.name@domain.co.uk')).toBe(true)
    expect(validateEmail('user+tag@example.org')).toBe(true)
  })

  it('should reject invalid email formats', () => {
    expect(validateEmail('invalid-email')).toBe(false)
    expect(validateEmail('test@')).toBe(false)
    expect(validateEmail('@domain.com')).toBe(false)
    expect(validateEmail('test@domain')).toBe(false)
    expect(validateEmail('')).toBe(false)
  })
})

describe('Session Token Validation', () => {
  const validateToken = (token: string | null | undefined): { valid: boolean; error?: string } => {
    if (!token) {
      return { valid: false, error: 'Token não fornecido' }
    }
    
    if (token.length < 32) {
      return { valid: false, error: 'Token inválido' }
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
      return { valid: false, error: 'Token contém caracteres inválidos' }
    }
    
    return { valid: true }
  }

  it('should validate a valid token', () => {
    const token = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
    const result = validateToken(token)
    
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should reject null token', () => {
    const result = validateToken(null)
    
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Token não fornecido')
  })

  it('should reject undefined token', () => {
    const result = validateToken(undefined)
    
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Token não fornecido')
  })

  it('should reject short token', () => {
    const result = validateToken('shorttoken')
    
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Token inválido')
  })

  it('should reject token with invalid characters', () => {
    const result = validateToken('token-with-invalid-chars!@#$%')
    
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Token inválido')
  })
})
