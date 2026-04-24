// =============================================================================
// ConstrutorPro - Project Management Tests
// =============================================================================

import { describe, it, expect } from 'vitest'

describe('Project Management', () => {
  describe('Project Status', () => {
    const validStatuses = ['planejamento', 'em_andamento', 'paralisado', 'concluido', 'cancelado']
    
    it('should have valid status values', () => {
      validStatuses.forEach(status => {
        expect(typeof status).toBe('string')
        expect(status.length).toBeGreaterThan(0)
      })
    })

    it('should identify active projects', () => {
      const status = 'em_andamento'
      const isActive = ['planejamento', 'em_andamento'].includes(status)
      
      expect(isActive).toBe(true)
    })

    it('should identify finished projects', () => {
      const status = 'concluido'
      const isFinished = status === 'concluido' || status === 'cancelado'
      
      expect(isFinished).toBe(true)
    })
  })

  describe('Progress Calculation', () => {
    it('should calculate project progress', () => {
      const completedTasks = 7
      const totalTasks = 10
      
      const progress = (completedTasks / totalTasks) * 100
      
      expect(progress).toBe(70)
    })

    it('should handle zero tasks', () => {
      const completedTasks = 0
      const totalTasks = 0
      
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
      
      expect(progress).toBe(0)
    })
  })

  describe('Date Validation', () => {
    it('should validate start date before end date', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')
      
      const isValid = startDate < endDate
      
      expect(isValid).toBe(true)
    })

    it('should reject invalid date range', () => {
      const startDate = new Date('2024-12-31')
      const endDate = new Date('2024-01-01')
      
      const isValid = startDate < endDate
      
      expect(isValid).toBe(false)
    })

    it('should calculate duration in days', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      expect(diffDays).toBe(30)
    })
  })

  describe('Budget vs Actual', () => {
    it('should calculate variance', () => {
      const budgeted = 100000
      const actual = 95000
      
      const variance = budgeted - actual
      const variancePercent = (variance / budgeted) * 100
      
      expect(variance).toBe(5000)
      expect(variancePercent).toBe(5)
    })

    it('should identify over budget', () => {
      const budgeted = 100000
      const actual = 110000
      
      const isOverBudget = actual > budgeted
      
      expect(isOverBudget).toBe(true)
    })
  })
})
