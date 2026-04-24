// =============================================================================
// ConstrutorPro - Utils Tests
// =============================================================================

import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('Utils', () => {
  describe('cn (className merger)', () => {
    it('should merge class names', () => {
      const result = cn('foo', 'bar')
      expect(result).toBe('foo bar')
    })

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'included', false && 'excluded')
      expect(result).toContain('base')
      expect(result).toContain('included')
      expect(result).not.toContain('excluded')
    })

    it('should merge tailwind classes correctly', () => {
      const result = cn('p-4', 'p-2')
      // tailwind-merge should keep the last one
      expect(result).toBe('p-2')
    })

    it('should handle undefined values', () => {
      const result = cn('base', undefined, 'end')
      expect(result).toContain('base')
      expect(result).toContain('end')
    })

    it('should handle null values', () => {
      const result = cn('base', null, 'end')
      expect(result).toContain('base')
      expect(result).toContain('end')
    })

    it('should handle object syntax', () => {
      const result = cn({ active: true, disabled: false })
      expect(result).toContain('active')
      expect(result).not.toContain('disabled')
    })

    it('should handle arrays', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toContain('class1')
      expect(result).toContain('class2')
      expect(result).toContain('class3')
    })

    it('should handle empty input', () => {
      const result = cn()
      expect(result).toBe('')
    })
  })
})
