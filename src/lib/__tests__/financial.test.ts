// =============================================================================
// ConstrutorPro - Financial Calculations Tests
// =============================================================================

import { describe, it, expect } from 'vitest'

describe('Financial Calculations', () => {
  describe('Cash Flow', () => {
    it('should calculate balance', () => {
      const incomes = 50000
      const expenses = 35000
      
      const balance = incomes - expenses
      
      expect(balance).toBe(15000)
    })

    it('should calculate cash flow projection', () => {
      const monthlyFlows = [
        { month: 'Jan', income: 10000, expense: 8000 },
        { month: 'Feb', income: 12000, expense: 9000 },
        { month: 'Mar', income: 15000, expense: 10000 }
      ]
      
      const totalIncome = monthlyFlows.reduce((sum, m) => sum + m.income, 0)
      const totalExpense = monthlyFlows.reduce((sum, m) => sum + m.expense, 0)
      const netFlow = totalIncome - totalExpense
      
      expect(totalIncome).toBe(37000)
      expect(totalExpense).toBe(27000)
      expect(netFlow).toBe(10000)
    })
  })

  describe('Profit Margin', () => {
    it('should calculate gross profit margin', () => {
      const revenue = 100000
      const costs = 60000
      
      const grossProfit = revenue - costs
      const grossMargin = (grossProfit / revenue) * 100
      
      expect(grossProfit).toBe(40000)
      expect(grossMargin).toBe(40)
    })

    it('should calculate net profit margin', () => {
      const revenue = 100000
      const costs = 60000
      const expenses = 20000
      
      const netProfit = revenue - costs - expenses
      const netMargin = (netProfit / revenue) * 100
      
      expect(netProfit).toBe(20000)
      expect(netMargin).toBe(20)
    })
  })

  describe('ROI Calculation', () => {
    it('should calculate return on investment', () => {
      const gain = 150000
      const cost = 100000
      
      const roi = ((gain - cost) / cost) * 100
      
      expect(roi).toBe(50)
    })
  })

  describe('Tax Calculations', () => {
    it('should calculate ISS', () => {
      const serviceValue = 10000
      const issRate = 5 // 5%
      
      const iss = serviceValue * (issRate / 100)
      
      expect(iss).toBe(500)
    })

    it('should calculate PIS/COFINS', () => {
      const revenue = 100000
      const pisRate = 0.65
      const cofinsRate = 3.0
      
      const pis = revenue * (pisRate / 100)
      const cofins = revenue * (cofinsRate / 100)
      const total = pis + cofins
      
      expect(pis).toBeCloseTo(650, 0)
      expect(cofins).toBeCloseTo(3000, 0)
      expect(total).toBeCloseTo(3650, 0)
    })
  })

  describe('Payment Terms', () => {
    it('should calculate due date', () => {
      const issueDate = new Date('2024-01-15')
      const termDays = 30
      
      const dueDate = new Date(issueDate)
      dueDate.setDate(dueDate.getDate() + termDays)
      
      expect(dueDate.getDate()).toBe(14) // Feb 14
    })

    it('should identify overdue payments', () => {
      const dueDate = new Date('2024-01-01')
      const today = new Date('2024-01-15')
      
      const isOverdue = today > dueDate
      
      expect(isOverdue).toBe(true)
    })

    it('should calculate late fees', () => {
      const principal = 10000
      const dailyRate = 0.033 // % per day (1% per month)
      const daysLate = 15
      
      const lateFee = principal * (dailyRate / 100) * daysLate
      
      expect(lateFee).toBeCloseTo(49.5, 1)
    })
  })

  describe('Budget Variance', () => {
    it('should calculate positive variance', () => {
      const budgeted = 100000
      const actual = 95000
      
      const variance = ((budgeted - actual) / budgeted) * 100
      
      expect(variance).toBe(5) // 5% under budget
    })

    it('should calculate negative variance', () => {
      const budgeted = 100000
      const actual = 110000
      
      const variance = ((budgeted - actual) / budgeted) * 100
      
      expect(variance).toBe(-10) // 10% over budget
    })
  })
})
