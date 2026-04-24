// =============================================================================
// ConstrutorPro - Unit Tests: Plan Limits Service
// Testes para verificação de limites de planos e funcionalidades
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest'
import { 
  PLAN_LIMITS, 
  PLAN_PRICES,
  getPlanLimits, 
  hasFeature, 
  isInTrial,
  isSubscriptionActive,
  getRemainingTrialDays,
  getPlanDisplayName,
  getPlanFeatures,
  checkPlanLimit,
  type PlanLimits,
  type CompanyPlan 
} from '@/lib/plans'

// =============================================================================
// Tests: Plan Limits Configuration
// =============================================================================

describe('Plan Limits Configuration', () => {
  describe('PLAN_LIMITS', () => {
    it('should have all plan types defined', () => {
      expect(PLAN_LIMITS.trial).toBeDefined()
      expect(PLAN_LIMITS.starter).toBeDefined()
      expect(PLAN_LIMITS.professional).toBeDefined()
      expect(PLAN_LIMITS.enterprise).toBeDefined()
    })

    it('should have correct trial limits', () => {
      const trial = PLAN_LIMITS.trial
      
      expect(trial.maxUsers).toBe(5)
      expect(trial.maxProjects).toBe(5)
      expect(trial.maxBudgets).toBe(10)
      expect(trial.trialDays).toBe(14)
      expect(trial.hasAPI).toBe(false)
    })

    it('should have unlimited resources for enterprise', () => {
      const enterprise = PLAN_LIMITS.enterprise
      
      expect(enterprise.maxUsers).toBeNull()
      expect(enterprise.maxProjects).toBeNull()
      expect(enterprise.maxBudgets).toBeNull()
      expect(enterprise.hasAPI).toBe(true)
    })

    it('should have starter plan with limited features', () => {
      const starter = PLAN_LIMITS.starter
      
      expect(starter.hasAI).toBe(false)
      expect(starter.hasFinance).toBe(false)
      expect(starter.hasSchedule).toBe(false)
      expect(starter.hasAPI).toBe(false)
    })

    it('should have professional plan with most features', () => {
      const professional = PLAN_LIMITS.professional
      
      expect(professional.hasAI).toBe(true)
      expect(professional.hasFinance).toBe(true)
      expect(professional.hasSchedule).toBe(true)
      expect(professional.hasAPI).toBe(false) // Only enterprise
    })
  })
})

// =============================================================================
// Tests: Plan Prices
// =============================================================================

describe('Plan Prices', () => {
  describe('PLAN_PRICES', () => {
    it('should have all plans with monthly and annual prices', () => {
      const plans: (CompanyPlan | 'trial')[] = ['trial', 'starter', 'professional', 'enterprise']
      
      for (const plan of plans) {
        expect(PLAN_PRICES[plan]).toBeDefined()
        expect(PLAN_PRICES[plan].monthly).toBeGreaterThanOrEqual(0)
        expect(PLAN_PRICES[plan].annual).toBeGreaterThanOrEqual(0)
      }
    })

    it('should have trial as free', () => {
      expect(PLAN_PRICES.trial.monthly).toBe(0)
      expect(PLAN_PRICES.trial.annual).toBe(0)
    })

    it('should have annual prices lower than monthly', () => {
      const plans: CompanyPlan[] = ['starter', 'professional', 'enterprise']
      
      for (const plan of plans) {
        const monthlyAnnual = PLAN_PRICES[plan].monthly * 12
        expect(PLAN_PRICES[plan].annual * 12).toBeLessThan(monthlyAnnual)
      }
    })

    it('should have increasing prices by plan tier', () => {
      expect(PLAN_PRICES.starter.monthly).toBeLessThan(PLAN_PRICES.professional.monthly)
      expect(PLAN_PRICES.professional.monthly).toBeLessThan(PLAN_PRICES.enterprise.monthly)
    })
  })
})

// =============================================================================
// Tests: Helper Functions
// =============================================================================

describe('Helper Functions', () => {
  describe('getPlanLimits', () => {
    it('should return correct limits for each plan', () => {
      expect(getPlanLimits('trial').trialDays).toBe(14)
      expect(getPlanLimits('starter').maxUsers).toBe(5)
      expect(getPlanLimits('professional').maxUsers).toBe(20)
      expect(getPlanLimits('enterprise').maxUsers).toBeNull()
    })

    it('should return starter limits for invalid plan', () => {
      const limits = getPlanLimits('invalid' as CompanyPlan)
      expect(limits).toEqual(PLAN_LIMITS.starter)
    })
  })

  describe('hasFeature', () => {
    it('should return true for available features', () => {
      expect(hasFeature('enterprise', 'hasAPI')).toBe(true)
      expect(hasFeature('professional', 'hasAI')).toBe(true)
      expect(hasFeature('starter', 'hasDailyLog')).toBe(true)
    })

    it('should return false for unavailable features', () => {
      expect(hasFeature('starter', 'hasAI')).toBe(false)
      expect(hasFeature('starter', 'hasFinance')).toBe(false)
      expect(hasFeature('professional', 'hasAPI')).toBe(false)
    })
  })

  describe('isInTrial', () => {
    it('should return false for null trial end date', () => {
      expect(isInTrial(null)).toBe(false)
    })

    it('should return true for future trial end date', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      expect(isInTrial(futureDate)).toBe(true)
    })

    it('should return false for past trial end date', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 7)
      expect(isInTrial(pastDate)).toBe(false)
    })
  })

  describe('isSubscriptionActive', () => {
    it('should return true for trial plan', () => {
      expect(isSubscriptionActive('trial', null, null)).toBe(true)
    })

    it('should return true for active subscription', () => {
      expect(isSubscriptionActive('starter', null, 'active')).toBe(true)
    })

    it('should return true for past_due subscription (grace period)', () => {
      expect(isSubscriptionActive('starter', null, 'past_due')).toBe(true)
    })

    it('should return true for non-expired plan', () => {
      const futureDate = new Date()
      futureDate.setMonth(futureDate.getMonth() + 1)
      expect(isSubscriptionActive('starter', futureDate, null)).toBe(true)
    })

    it('should return false for expired plan', () => {
      const pastDate = new Date()
      pastDate.setMonth(pastDate.getMonth() - 1)
      expect(isSubscriptionActive('starter', pastDate, null)).toBe(false)
    })
  })

  describe('getRemainingTrialDays', () => {
    it('should return 0 for null trial end date', () => {
      expect(getRemainingTrialDays(null)).toBe(0)
    })

    it('should return correct remaining days', () => {
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 5)
      
      const remaining = getRemainingTrialDays(futureDate)
      expect(remaining).toBeGreaterThanOrEqual(4)
      expect(remaining).toBeLessThanOrEqual(6)
    })

    it('should return 0 for past trial end date', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 5)
      expect(getRemainingTrialDays(pastDate)).toBe(0)
    })
  })

  describe('getPlanDisplayName', () => {
    it('should return correct display names', () => {
      expect(getPlanDisplayName('trial')).toBe('Teste Gratuito')
      expect(getPlanDisplayName('starter')).toBe('Starter')
      expect(getPlanDisplayName('professional')).toBe('Professional')
      expect(getPlanDisplayName('enterprise')).toBe('Enterprise')
    })
  })

  describe('getPlanFeatures', () => {
    it('should return features list for each plan', () => {
      const trialFeatures = getPlanFeatures('trial')
      expect(trialFeatures.length).toBeGreaterThan(0)
      expect(trialFeatures.some(f => f.includes('usuários'))).toBe(true)
    })

    it('should include AI feature for professional plan', () => {
      const features = getPlanFeatures('professional')
      expect(features.some(f => f.includes('IA'))).toBe(true)
    })

    it('should include API feature only for enterprise', () => {
      const enterpriseFeatures = getPlanFeatures('enterprise')
      const professionalFeatures = getPlanFeatures('professional')
      
      expect(enterpriseFeatures.some(f => f.includes('API'))).toBe(true)
      expect(professionalFeatures.some(f => f.includes('API'))).toBe(false)
    })
  })

  describe('checkPlanLimit', () => {
    it('should allow when under limit', async () => {
      const result = await checkPlanLimit('company-1', 'maxUsers', 3, 'starter')
      
      expect(result.allowed).toBe(true)
      expect(result.limit).toBe(5)
      expect(result.remaining).toBe(2)
    })

    it('should deny when at limit', async () => {
      const result = await checkPlanLimit('company-1', 'maxUsers', 5, 'starter')
      
      expect(result.allowed).toBe(false)
      expect(result.limit).toBe(5)
      expect(result.remaining).toBe(0)
    })

    it('should allow when limit is null (unlimited)', async () => {
      const result = await checkPlanLimit('company-1', 'maxUsers', 100, 'enterprise')
      
      expect(result.allowed).toBe(true)
      expect(result.limit).toBeNull()
      expect(result.remaining).toBeNull()
    })

    it('should handle zero current count', async () => {
      const result = await checkPlanLimit('company-1', 'maxProjects', 0, 'trial')
      
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5)
    })
  })
})

// =============================================================================
// Tests: Plan Hierarchy
// =============================================================================

describe('Plan Hierarchy', () => {
  it('should have increasing user limits by plan tier', () => {
    expect(PLAN_LIMITS.starter.maxUsers).toBeLessThan(PLAN_LIMITS.professional.maxUsers!)
    // Enterprise has unlimited users (null), so it's effectively "infinite"
    expect(PLAN_LIMITS.enterprise.maxUsers).toBeNull() // Unlimited
  })

  it('should have increasing feature availability by plan tier', () => {
    // Starter has basic features
    expect(PLAN_LIMITS.starter.hasDailyLog).toBe(true)
    expect(PLAN_LIMITS.starter.hasFinance).toBe(false)
    
    // Professional has more features
    expect(PLAN_LIMITS.professional.hasFinance).toBe(true)
    expect(PLAN_LIMITS.professional.hasAPI).toBe(false)
    
    // Enterprise has all features
    expect(PLAN_LIMITS.enterprise.hasAPI).toBe(true)
  })
})
