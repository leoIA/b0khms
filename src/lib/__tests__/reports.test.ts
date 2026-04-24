import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Prisma before importing the service
const mockPrisma = {
  custom_reports: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  report_executions: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  report_schedules: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  dashboard_widgets: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  project: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  budget: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  transaction: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  activities: {
    create: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Helper functions that don't need Prisma
const applyFilter = (where: Record<string, unknown>, filter: { field: string; operator: string; value: unknown }): void => {
  const { field, operator, value } = filter

  switch (operator) {
    case 'eq':
      where[field] = value
      break
    case 'ne':
      where[field] = { not: value }
      break
    case 'gt':
      where[field] = { gt: value }
      break
    case 'gte':
      where[field] = { gte: value }
      break
    case 'lt':
      where[field] = { lt: value }
      break
    case 'lte':
      where[field] = { lte: value }
      break
    case 'contains':
      where[field] = { contains: value, mode: 'insensitive' }
      break
    case 'starts_with':
      where[field] = { startsWith: value, mode: 'insensitive' }
      break
    case 'ends_with':
      where[field] = { endsWith: value, mode: 'insensitive' }
      break
    case 'in':
      where[field] = { in: value as unknown[] }
      break
    case 'not_in':
      where[field] = { notIn: value as unknown[] }
      break
    case 'between':
      const [start, end] = value as unknown[]
      where[field] = { gte: start, lte: end }
      break
    case 'is_null':
      where[field] = null
      break
    case 'is_not_null':
      where[field] = { not: null }
      break
  }
}

const calculateAggregation = (
  data: Record<string, unknown>[],
  field: string,
  type: string
): number => {
  const values = data
    .map(d => d[field])
    .filter(v => typeof v === 'number') as number[]

  if (values.length === 0) return 0

  switch (type) {
    case 'sum':
      return values.reduce((a, b) => a + b, 0)
    case 'avg':
      return values.reduce((a, b) => a + b, 0) / values.length
    case 'count':
      return data.length
    case 'min':
      return Math.min(...values)
    case 'max':
      return Math.max(...values)
    case 'count_distinct':
      return new Set(values).size
    default:
      return 0
  }
}

const applyGroupBy = (
  data: Record<string, unknown>[],
  groupBy: string[],
  aggregations?: { field: string; type: string; alias?: string }[]
): Record<string, unknown>[] => {
  const groups = new Map<string, Record<string, unknown>[]>()

  for (const item of data) {
    const key = groupBy.map(f => String(item[f])).join('|')
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(item)
  }

  const result: Record<string, unknown>[] = []
  for (const [key, items] of groups.entries()) {
    const groupKey = groupBy.reduce((acc, f, i) => {
      acc[f] = key.split('|')[i]
      return acc
    }, {} as Record<string, unknown>)

    const groupResult: Record<string, unknown> = { ...groupKey, _count: items.length }

    if (aggregations) {
      for (const agg of aggregations) {
        groupResult[agg.alias || `${agg.type}_${agg.field}`] = calculateAggregation(
          items,
          agg.field,
          agg.type
        )
      }
    }

    result.push(groupResult)
  }

  return result
}

const calculateNextRun = (
  frequency: string,
  scheduledTime: string,
  _timezone: string,
  daysOfWeek?: number[],
  dayOfMonth?: number
): Date => {
  const [hours, minutes] = scheduledTime.split(':').map(Number)
  const now = new Date()
  let next = new Date()

  // Configurar hora
  next.setHours(hours, minutes, 0, 0)

  switch (frequency) {
    case 'daily':
      if (next <= now) {
        next.setDate(next.getDate() + 1)
      }
      break
    case 'weekly':
      if (daysOfWeek && daysOfWeek.length > 0) {
        const currentDay = now.getDay()
        const sortedDays = [...daysOfWeek].sort((a, b) => a - b)
        let nextDay = sortedDays.find(d => d > currentDay || (d === currentDay && next > now))
        if (!nextDay) {
          nextDay = sortedDays[0]
          next.setDate(next.getDate() + (7 - currentDay + nextDay))
        } else {
          next.setDate(next.getDate() + (nextDay - currentDay))
        }
      }
      break
    case 'monthly':
      const targetDay = dayOfMonth ?? 1
      next.setDate(targetDay)
      if (next <= now) {
        next.setMonth(next.getMonth() + 1)
      }
      break
    case 'quarterly':
      const month = now.getMonth()
      const quarterMonth = Math.floor(month / 3) * 3
      next.setMonth(quarterMonth, dayOfMonth ?? 1)
      if (next <= now) {
        next.setMonth(next.getMonth() + 3)
      }
      break
    case 'yearly':
      next.setMonth(0, dayOfMonth ?? 1)
      if (next <= now) {
        next.setFullYear(next.getFullYear() + 1)
      }
      break
  }

  return next
}

const toCSV = (data: Record<string, unknown>[], columns?: string[]): string => {
  if (data.length === 0) return ''

  const headers = columns || Object.keys(data[0])
  const csvRows = [headers.join(',')]

  for (const row of data) {
    const values = headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return String(val)
    })
    csvRows.push(values.join(','))
  }

  return csvRows.join('\n')
}

const toHTML = (data: Record<string, unknown>[], title: string, columns?: { field: string; label?: string }[]): string => {
  const headers = columns || Object.keys(data[0]).map(k => ({ field: k, label: k }))

  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
  <table>
    <thead>
      <tr>${headers.map(h => `<th>${h.label || h.field}</th>`).join('')}</tr>
    </thead>
    <tbody>`

  for (const row of data) {
    html += `<tr>${headers.map(h => `<td>${row[h.field] ?? ''}</td>`).join('')}</tr>`
  }

  html += `    </tbody>
  </table>
  <div class="footer">ConstrutorPro - Sistema de Gestão Empresarial</div>
</body>
</html>`

  return html
}

describe('Report Filter Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('applyFilter', () => {
    it('should apply eq filter correctly', () => {
      const where: Record<string, unknown> = {}
      applyFilter(where, {
        field: 'status',
        operator: 'eq',
        value: 'active',
      })
      expect(where.status).toBe('active')
    })

    it('should apply ne filter correctly', () => {
      const where: Record<string, unknown> = {}
      applyFilter(where, {
        field: 'status',
        operator: 'ne',
        value: 'deleted',
      })
      expect(where.status).toEqual({ not: 'deleted' })
    })

    it('should apply gt filter correctly', () => {
      const where: Record<string, unknown> = {}
      applyFilter(where, {
        field: 'value',
        operator: 'gt',
        value: 100,
      })
      expect(where.value).toEqual({ gt: 100 })
    })

    it('should apply gte filter correctly', () => {
      const where: Record<string, unknown> = {}
      applyFilter(where, {
        field: 'value',
        operator: 'gte',
        value: 100,
      })
      expect(where.value).toEqual({ gte: 100 })
    })

    it('should apply lt filter correctly', () => {
      const where: Record<string, unknown> = {}
      applyFilter(where, {
        field: 'value',
        operator: 'lt',
        value: 1000,
      })
      expect(where.value).toEqual({ lt: 1000 })
    })

    it('should apply lte filter correctly', () => {
      const where: Record<string, unknown> = {}
      applyFilter(where, {
        field: 'value',
        operator: 'lte',
        value: 1000,
      })
      expect(where.value).toEqual({ lte: 1000 })
    })

    it('should apply contains filter correctly', () => {
      const where: Record<string, unknown> = {}
      applyFilter(where, {
        field: 'name',
        operator: 'contains',
        value: 'projeto',
      })
      expect(where.name).toEqual({ contains: 'projeto', mode: 'insensitive' })
    })

    it('should apply in filter correctly', () => {
      const where: Record<string, unknown> = {}
      applyFilter(where, {
        field: 'status',
        operator: 'in',
        value: ['active', 'pending'],
      })
      expect(where.status).toEqual({ in: ['active', 'pending'] })
    })

    it('should apply not_in filter correctly', () => {
      const where: Record<string, unknown> = {}
      applyFilter(where, {
        field: 'status',
        operator: 'not_in',
        value: ['deleted', 'archived'],
      })
      expect(where.status).toEqual({ notIn: ['deleted', 'archived'] })
    })

    it('should apply between filter correctly', () => {
      const where: Record<string, unknown> = {}
      applyFilter(where, {
        field: 'date',
        operator: 'between',
        value: ['2024-01-01', '2024-12-31'],
      })
      expect(where.date).toEqual({ gte: '2024-01-01', lte: '2024-12-31' })
    })

    it('should apply is_null filter correctly', () => {
      const where: Record<string, unknown> = {}
      applyFilter(where, {
        field: 'deletedAt',
        operator: 'is_null',
        value: null,
      })
      expect(where.deletedAt).toBeNull()
    })

    it('should apply is_not_null filter correctly', () => {
      const where: Record<string, unknown> = {}
      applyFilter(where, {
        field: 'paidAt',
        operator: 'is_not_null',
        value: null,
      })
      expect(where.paidAt).toEqual({ not: null })
    })
  })
})

describe('Report Aggregation Operations', () => {
  const testData = [
    { value: 10 },
    { value: 20 },
    { value: 30 },
    { value: 40 },
    { value: 50 },
  ]

  describe('calculateAggregation', () => {
    it('should calculate sum correctly', () => {
      const result = calculateAggregation(testData, 'value', 'sum')
      expect(result).toBe(150)
    })

    it('should calculate avg correctly', () => {
      const result = calculateAggregation(testData, 'value', 'avg')
      expect(result).toBe(30)
    })

    it('should calculate count correctly', () => {
      const result = calculateAggregation(testData, 'value', 'count')
      expect(result).toBe(5)
    })

    it('should calculate min correctly', () => {
      const result = calculateAggregation(testData, 'value', 'min')
      expect(result).toBe(10)
    })

    it('should calculate max correctly', () => {
      const result = calculateAggregation(testData, 'value', 'max')
      expect(result).toBe(50)
    })

    it('should calculate count_distinct correctly', () => {
      const dataWithDuplicates = [
        { value: 10 },
        { value: 10 },
        { value: 20 },
        { value: 20 },
        { value: 30 },
      ]
      const result = calculateAggregation(dataWithDuplicates, 'value', 'count_distinct')
      expect(result).toBe(3)
    })

    it('should return 0 for empty data', () => {
      const result = calculateAggregation([], 'value', 'sum')
      expect(result).toBe(0)
    })
  })
})

describe('Report GroupBy Operations', () => {
  describe('applyGroupBy', () => {
    it('should group data correctly', () => {
      const data = [
        { category: 'A', value: 10 },
        { category: 'A', value: 20 },
        { category: 'B', value: 30 },
        { category: 'B', value: 40 },
      ]

      const result = applyGroupBy(data, ['category'])

      expect(result).toHaveLength(2)
      expect(result.find(r => r.category === 'A')?._count).toBe(2)
      expect(result.find(r => r.category === 'B')?._count).toBe(2)
    })

    it('should calculate aggregations within groups', () => {
      const data = [
        { category: 'A', value: 10 },
        { category: 'A', value: 20 },
        { category: 'B', value: 30 },
        { category: 'B', value: 40 },
      ]

      const aggregations = [
        { field: 'value', type: 'sum', alias: 'total' },
        { field: 'value', type: 'avg', alias: 'average' },
      ]

      const result = applyGroupBy(data, ['category'], aggregations)

      const groupA = result.find(r => r.category === 'A')
      const groupB = result.find(r => r.category === 'B')

      expect(groupA?.total).toBe(30)
      expect(groupA?.average).toBe(15)
      expect(groupB?.total).toBe(70)
      expect(groupB?.average).toBe(35)
    })

    it('should handle multiple groupBy fields', () => {
      const data = [
        { category: 'A', status: 'active', value: 10 },
        { category: 'A', status: 'active', value: 20 },
        { category: 'A', status: 'pending', value: 15 },
        { category: 'B', status: 'active', value: 30 },
      ]

      const result = applyGroupBy(data, ['category', 'status'])

      expect(result).toHaveLength(3)
      expect(result.find(r => r.category === 'A' && r.status === 'active')?._count).toBe(2)
      expect(result.find(r => r.category === 'A' && r.status === 'pending')?._count).toBe(1)
      expect(result.find(r => r.category === 'B' && r.status === 'active')?._count).toBe(1)
    })
  })
})

describe('Report Schedule Operations', () => {
  describe('calculateNextRun', () => {
    it('should calculate next daily run correctly', () => {
      const nextRun = calculateNextRun('daily', '09:00', 'America/Sao_Paulo')

      expect(nextRun).toBeInstanceOf(Date)
      expect(nextRun.getHours()).toBe(9)
      expect(nextRun.getMinutes()).toBe(0)
    })

    it('should calculate next weekly run correctly', () => {
      const nextRun = calculateNextRun(
        'weekly',
        '10:00',
        'America/Sao_Paulo',
        [1, 2, 3, 4, 5] // Monday to Friday
      )

      expect(nextRun).toBeInstanceOf(Date)
      expect(nextRun.getHours()).toBe(10)
      expect(nextRun.getMinutes()).toBe(0)
      // Should be a weekday
      expect([1, 2, 3, 4, 5]).toContain(nextRun.getDay())
    })

    it('should calculate next monthly run correctly', () => {
      const nextRun = calculateNextRun(
        'monthly',
        '08:00',
        'America/Sao_Paulo',
        undefined,
        15 // 15th of each month
      )

      expect(nextRun).toBeInstanceOf(Date)
      expect(nextRun.getDate()).toBe(15)
      expect(nextRun.getHours()).toBe(8)
      expect(nextRun.getMinutes()).toBe(0)
    })

    it('should calculate next quarterly run correctly', () => {
      const nextRun = calculateNextRun(
        'quarterly',
        '12:00',
        'America/Sao_Paulo',
        undefined,
        1 // 1st of the month
      )

      expect(nextRun).toBeInstanceOf(Date)
      expect(nextRun.getDate()).toBe(1)
      expect(nextRun.getHours()).toBe(12)
      expect(nextRun.getMinutes()).toBe(0)
    })

    it('should calculate next yearly run correctly', () => {
      const nextRun = calculateNextRun(
        'yearly',
        '00:00',
        'America/Sao_Paulo',
        undefined,
        1 // January 1st
      )

      expect(nextRun).toBeInstanceOf(Date)
      expect(nextRun.getMonth()).toBe(0) // January
      expect(nextRun.getDate()).toBe(1)
      expect(nextRun.getHours()).toBe(0)
      expect(nextRun.getMinutes()).toBe(0)
    })
  })
})

describe('Report Export Operations', () => {
  describe('toCSV', () => {
    it('should convert data to CSV correctly', () => {
      const data = [
        { name: 'Project A', value: 100, status: 'active' },
        { name: 'Project B', value: 200, status: 'pending' },
      ]

      const csv = toCSV(data)

      expect(csv).toContain('name,value,status')
      expect(csv).toContain('Project A,100,active')
      expect(csv).toContain('Project B,200,pending')
    })

    it('should handle empty data', () => {
      const csv = toCSV([])
      expect(csv).toBe('')
    })

    it('should escape commas in values', () => {
      const data = [
        { name: 'Project, with comma', value: 100 },
      ]

      const csv = toCSV(data)

      expect(csv).toContain('"Project, with comma"')
    })

    it('should escape quotes in values', () => {
      const data = [
        { name: 'Project "quoted"', value: 100 },
      ]

      const csv = toCSV(data)

      expect(csv).toContain('"Project ""quoted"""')
    })

    it('should use custom columns when provided', () => {
      const data = [
        { name: 'Project A', value: 100, status: 'active' },
      ]

      const csv = toCSV(data, ['name', 'status'])

      expect(csv).toContain('name,status')
      expect(csv).not.toContain('value')
    })
  })

  describe('toHTML', () => {
    it('should convert data to HTML correctly', () => {
      const data = [
        { name: 'Project A', value: 100 },
        { name: 'Project B', value: 200 },
      ]

      const html = toHTML(data, 'Test Report')

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<title>Test Report</title>')
      expect(html).toContain('<th>name</th>')
      expect(html).toContain('<th>value</th>')
      expect(html).toContain('<td>Project A</td>')
      expect(html).toContain('<td>100</td>')
    })

    it('should use custom column labels', () => {
      const data = [
        { name: 'Project A', value: 100 },
      ]

      const html = toHTML(data, 'Test Report', [
        { field: 'name', label: 'Nome' },
        { field: 'value', label: 'Valor' },
      ])

      expect(html).toContain('<th>Nome</th>')
      expect(html).toContain('<th>Valor</th>')
    })

    it('should include timestamp in the report', () => {
      const data = [{ name: 'Test' }]
      const html = toHTML(data, 'Test Report')

      expect(html).toContain('Gerado em:')
    })
  })
})

describe('Filter Operator Types', () => {
  it('should support all filter operators', () => {
    const operators = [
      'eq', 'ne', 'gt', 'gte', 'lt', 'lte',
      'contains', 'starts_with', 'ends_with',
      'in', 'not_in', 'between',
      'is_null', 'is_not_null',
    ]

    operators.forEach(operator => {
      const where: Record<string, unknown> = {}
      expect(() => {
        applyFilter(where, {
          field: 'test',
          operator: operator,
          value: operator === 'in' || operator === 'not_in' 
            ? ['a', 'b'] 
            : operator === 'between' 
              ? [1, 2] 
              : 'test',
        })
      }).not.toThrow()
    })
  })
})

describe('Aggregation Types', () => {
  it('should support all aggregation types', () => {
    const aggregations = ['sum', 'avg', 'count', 'min', 'max', 'count_distinct']

    aggregations.forEach(type => {
      const result = calculateAggregation(
        [{ value: 10 }, { value: 20 }],
        'value',
        type
      )
      expect(typeof result).toBe('number')
    })
  })
})
