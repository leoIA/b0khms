// =============================================================================
// ConstrutorPro - Excel Export Service Tests
// =============================================================================

import { describe, it, expect } from 'vitest'
import {
  generateExcelXML,
  generateExcelBuffer,
  generateMultiSheetExcelXML,
  inferColumnsFromData,
  calculateTotals,
  type ExcelExportOptions,
} from '../excel-export'
import type { ColumnConfig } from '@/validators/reports'

describe('ExcelExport', () => {
  describe('inferColumnsFromData', () => {
    it('should infer columns from data', () => {
      const data = [
        { name: 'Project A', value: 1000, date: '2024-01-15' },
      ]

      const columns = inferColumnsFromData(data)

      expect(columns).toHaveLength(3)
      expect(columns.find(c => c.field === 'name')?.format).toBe('text')
      expect(columns.find(c => c.field === 'value')?.format).toBe('number')
      expect(columns.find(c => c.field === 'date')?.format).toBe('date')
    })

    it('should return empty array for empty data', () => {
      const columns = inferColumnsFromData([])
      expect(columns).toHaveLength(0)
    })

    it('should detect date strings', () => {
      const data = [{ created: '2024-01-15T10:30:00Z' }]
      const columns = inferColumnsFromData(data)
      expect(columns.find(c => c.field === 'created')?.format).toBe('date')
    })

    it('should handle Date objects', () => {
      const data = [{ timestamp: new Date() }]
      const columns = inferColumnsFromData(data)
      expect(columns.find(c => c.field === 'timestamp')?.format).toBe('date')
    })
  })

  describe('calculateTotals', () => {
    it('should calculate totals for numeric columns', () => {
      const data = [
        { name: 'A', value: 100, price: 10.5 },
        { name: 'B', value: 200, price: 20.5 },
      ]

      const columns: ColumnConfig[] = [
        { field: 'name', visible: true },
        { field: 'value', visible: true, format: 'number' },
        { field: 'price', visible: true, format: 'currency' },
      ]

      const totals = calculateTotals(data, columns)

      expect(totals.value).toBe(300)
      expect(totals.price).toBe(31)
    })

    it('should ignore non-numeric values', () => {
      const data = [
        { name: 'A', value: 100 },
        { name: 'B', value: 'invalid' as unknown as number },
      ]

      const columns: ColumnConfig[] = [
        { field: 'name', visible: true },
        { field: 'value', visible: true, format: 'number' },
      ]

      const totals = calculateTotals(data, columns)

      expect(totals.value).toBe(100)
    })

    it('should calculate percentages', () => {
      const data = [
        { name: 'A', progress: 0.5 },
        { name: 'B', progress: 0.3 },
      ]

      const columns: ColumnConfig[] = [
        { field: 'name', visible: true },
        { field: 'progress', visible: true, format: 'percent' },
      ]

      const totals = calculateTotals(data, columns)

      expect(totals.progress).toBe(0.8)
    })
  })

  describe('generateExcelXML', () => {
    it('should generate valid XML structure', () => {
      const options: ExcelExportOptions = {
        title: 'Test Report',
        columns: [
          { field: 'name', label: 'Name', visible: true, format: 'text' },
          { field: 'value', label: 'Value', visible: true, format: 'number' },
        ],
        data: [
          { name: 'Item A', value: 100 },
          { name: 'Item B', value: 200 },
        ],
      }

      const xml = generateExcelXML(options)

      expect(xml).toContain('<?xml version="1.0"')
      expect(xml).toContain('<Workbook')
      expect(xml).toContain('<Worksheet')
      expect(xml).toContain('Test Report')
      expect(xml).toContain('Item A')
      expect(xml).toContain('Item B')
    })

    it('should include company name when provided', () => {
      const options: ExcelExportOptions = {
        title: 'Test Report',
        companyName: 'Test Company',
        columns: [{ field: 'name', visible: true }],
        data: [{ name: 'Item' }],
      }

      const xml = generateExcelXML(options)

      expect(xml).toContain('Test Company')
    })

    it('should include subtitle when provided', () => {
      const options: ExcelExportOptions = {
        title: 'Test Report',
        subtitle: 'Summary Report',
        columns: [{ field: 'name', visible: true }],
        data: [{ name: 'Item' }],
      }

      const xml = generateExcelXML(options)

      expect(xml).toContain('Summary Report')
    })

    it('should include filters when provided', () => {
      const options: ExcelExportOptions = {
        title: 'Test Report',
        columns: [{ field: 'name', visible: true }],
        data: [{ name: 'Item' }],
        includeFilters: true,
        filters: 'Date: 2024-01-01 to 2024-12-31',
      }

      const xml = generateExcelXML(options)

      expect(xml).toContain('Filtros:')
      expect(xml).toContain('Date: 2024-01-01 to 2024-12-31')
    })

    it('should include totals row when requested', () => {
      const options: ExcelExportOptions = {
        title: 'Test Report',
        columns: [
          { field: 'name', visible: true },
          { field: 'value', visible: true, format: 'number' },
        ],
        data: [
          { name: 'Item A', value: 100 },
          { name: 'Item B', value: 200 },
        ],
        includeTotals: true,
        totalsRow: { value: 300 },
      }

      const xml = generateExcelXML(options)

      expect(xml).toContain('TOTAL')
    })

    it('should escape special XML characters', () => {
      const options: ExcelExportOptions = {
        title: 'Test & Report',
        columns: [{ field: 'name', visible: true }],
        data: [{ name: 'Item <with> "quotes" & \'apostrophes\'' }],
      }

      const xml = generateExcelXML(options)

      expect(xml).toContain('&amp;')
      expect(xml).toContain('&lt;')
      expect(xml).toContain('&gt;')
    })

    it('should handle currency format', () => {
      const options: ExcelExportOptions = {
        title: 'Test Report',
        columns: [{ field: 'price', label: 'Price', visible: true, format: 'currency' }],
        data: [{ price: 100.5 }],
      }

      const xml = generateExcelXML(options)

      expect(xml).toContain('Currency')
      expect(xml).toContain('100.5')
    })

    it('should handle percent format', () => {
      const options: ExcelExportOptions = {
        title: 'Test Report',
        columns: [{ field: 'progress', label: 'Progress', visible: true, format: 'percent' }],
        data: [{ progress: 0.75 }],
      }

      const xml = generateExcelXML(options)

      expect(xml).toContain('Percent')
      expect(xml).toContain('75') // 0.75 * 100
    })

    it('should handle date format', () => {
      const testDate = new Date('2024-01-15')
      const options: ExcelExportOptions = {
        title: 'Test Report',
        columns: [{ field: 'date', label: 'Date', visible: true, format: 'date' }],
        data: [{ date: testDate }],
      }

      const xml = generateExcelXML(options)

      expect(xml).toContain('Date')
    })

    it('should handle empty data', () => {
      const options: ExcelExportOptions = {
        title: 'Test Report',
        columns: [{ field: 'name', visible: true }],
        data: [],
      }

      const xml = generateExcelXML(options)

      expect(xml).toContain('Test Report')
      expect(xml).toContain('<Worksheet')
    })

    it('should hide invisible columns', () => {
      const options: ExcelExportOptions = {
        title: 'Test Report',
        columns: [
          { field: 'name', label: 'Name', visible: true },
          { field: 'hidden', label: 'Hidden', visible: false },
        ],
        data: [{ name: 'Item', hidden: 'Secret' }],
      }

      const xml = generateExcelXML(options)

      expect(xml).toContain('Name')
      expect(xml).not.toContain('Hidden')
      expect(xml).not.toContain('Secret')
    })

    it('should truncate sheet name to 31 characters', () => {
      const longName = 'This is a very long sheet name that exceeds the limit'
      const options: ExcelExportOptions = {
        title: 'Test Report',
        sheetName: longName,
        columns: [{ field: 'name', visible: true }],
        data: [{ name: 'Item' }],
      }

      const xml = generateExcelXML(options)

      // Excel limits sheet names to 31 characters
      const sheetNameMatch = xml.match(/ss:Name="([^"]+)"/)
      expect(sheetNameMatch).toBeTruthy()
      expect(sheetNameMatch![1].length).toBeLessThanOrEqual(31)
    })
  })

  describe('generateExcelBuffer', () => {
    it('should generate a Buffer', () => {
      const options: ExcelExportOptions = {
        title: 'Test Report',
        columns: [{ field: 'name', visible: true }],
        data: [{ name: 'Item' }],
      }

      const buffer = generateExcelBuffer(options)

      expect(buffer).toBeInstanceOf(Buffer)
      expect(buffer.length).toBeGreaterThan(0)
    })

    it('should generate valid UTF-8 content', () => {
      const options: ExcelExportOptions = {
        title: 'Relatório Teste',
        columns: [{ field: 'nome', visible: true }],
        data: [{ nome: 'João Silva - Açúcar' }],
      }

      const buffer = generateExcelBuffer(options)
      const content = buffer.toString('utf-8')

      expect(content).toContain('Relatório Teste')
      expect(content).toContain('João Silva - Açúcar')
    })
  })

  describe('generateMultiSheetExcelXML', () => {
    it('should generate multiple worksheets', () => {
      const options = {
        filename: 'multi-sheet-report.xls',
        sheets: [
          {
            title: 'Sheet 1',
            sheetName: 'First',
            columns: [{ field: 'name', visible: true }],
            data: [{ name: 'Item A' }],
          },
          {
            title: 'Sheet 2',
            sheetName: 'Second',
            columns: [{ field: 'name', visible: true }],
            data: [{ name: 'Item B' }],
          },
        ],
      }

      const xml = generateMultiSheetExcelXML(options)

      expect(xml).toContain('First')
      expect(xml).toContain('Second')
      expect(xml).toContain('Item A')
      expect(xml).toContain('Item B')
    })

    it('should use default sheet names when not provided', () => {
      const options = {
        filename: 'multi-sheet-report.xls',
        sheets: [
          {
            title: 'Sheet A',
            columns: [{ field: 'name', visible: true }],
            data: [{ name: 'Item' }],
          },
          {
            title: 'Sheet B',
            columns: [{ field: 'name', visible: true }],
            data: [{ name: 'Item' }],
          },
        ],
      }

      const xml = generateMultiSheetExcelXML(options)

      expect(xml).toContain('Planilha1')
      expect(xml).toContain('Planilha2')
    })
  })
})
