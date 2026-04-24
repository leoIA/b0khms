// =============================================================================
// ConstrutorPro - Export Licitações Service Tests
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  exportToXMLSinapi,
  exportToExcelCaixa,
  exportToPDFMemoria,
  exportOrcamento,
  type ExportConfig,
} from '../export-licitacoes-service'

// Mock do Prisma
vi.mock('@/lib/db', () => ({
  db: {
    budgets: {
      findFirst: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'

describe('Export Licitações Service', () => {
  const mockBudget = {
    id: 'budget-123',
    name: 'Orçamento Teste',
    code: 'ORC-001',
    description: 'Orçamento para teste',
    budget_items: [
      {
        id: 'item-1',
        description: 'Escavação manual',
        unit: 'm³',
        quantity: 100,
        unitPrice: 45.50,
        order: 1,
        compositionId: 'SINAPI-12345',
        compositions: null,
      },
      {
        id: 'item-2',
        description: 'Concreto estrutural',
        unit: 'm³',
        quantity: 50,
        unitPrice: 450.00,
        order: 2,
        compositionId: 'SINAPI-67890',
        compositions: null,
      },
    ],
    projects: {
      id: 'project-1',
      name: 'Projeto Teste',
      code: 'PRJ-001',
      address: 'Rua Teste, 123',
      city: 'São Paulo',
      state: 'SP',
    },
    companies: {
      id: 'company-1',
      name: 'Construtora Teste',
      cnpj: '12.345.678/0001-90',
      address: 'Av. Principal, 1000',
    },
  }

  const defaultConfig: ExportConfig = {
    budgetId: 'budget-123',
    companyId: 'company-1',
    format: 'xml-sinapi',
    includeBDI: true,
    includeEncargos: true,
    clienteInfo: {
      nome: 'Cliente Teste',
      cnpj: '98.765.432/0001-10',
      endereco: 'Rua Cliente, 456',
    },
    obraInfo: {
      endereco: 'Rua Obra, 789',
      prazoExecucao: 180,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exportToXMLSinapi', () => {
    it('should return error when budget not found', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(null as any)

      const result = await exportToXMLSinapi(defaultConfig)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('não encontrado')
    })

    it('should generate valid XML SINAPI', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(mockBudget as any)

      const result = await exportToXMLSinapi(defaultConfig)

      expect(result.success).toBe(true)
      expect(result.filename).toContain('.xml')
      expect(result.mimeType).toBe('application/xml')
      expect(result.data).toBeDefined()
    })

    it('should include BDI in XML when configured', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(mockBudget as any)

      const config = { ...defaultConfig, includeBDI: true }
      const result = await exportToXMLSinapi(config)

      expect(result.success).toBe(true)
      const xmlContent = result.data as string
      expect(xmlContent).toContain('<bdi>')
      expect(xmlContent).toContain('<percentual>')
    })

    it('should include encargos sociais when configured', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(mockBudget as any)

      const config = { ...defaultConfig, includeEncargos: true }
      const result = await exportToXMLSinapi(config)

      expect(result.success).toBe(true)
      const xmlContent = result.data as string
      expect(xmlContent).toContain('<encargosSociais>')
    })

    it('should generate valid XML structure', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(mockBudget as any)

      const result = await exportToXMLSinapi(defaultConfig)

      expect(result.success).toBe(true)
      const xmlContent = result.data as string
      expect(xmlContent).toContain('<?xml version="1.0"')
      expect(xmlContent).toContain('<orcamento')
      expect(xmlContent).toContain('<cabecalho>')
      expect(xmlContent).toContain('<empreendimento>')
      expect(xmlContent).toContain('<contratante>')
      expect(xmlContent).toContain('<custos>')
      expect(xmlContent).toContain('<itens>')
    })

    it('should include all budget items in XML', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(mockBudget as any)

      const result = await exportToXMLSinapi(defaultConfig)

      expect(result.success).toBe(true)
      const xmlContent = result.data as string
      expect(xmlContent).toContain('Escavação manual')
      expect(xmlContent).toContain('Concreto estrutural')
    })
  })

  describe('exportToExcelCaixa', () => {
    it('should return error when budget not found', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(null as any)

      const result = await exportToExcelCaixa(defaultConfig)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('não encontrado')
    })

    it('should generate valid Excel file', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(mockBudget as any)

      const config = { ...defaultConfig, format: 'excel-caixa' as const }
      const result = await exportToExcelCaixa(config)

      expect(result.success).toBe(true)
      expect(result.filename).toContain('.xlsx')
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      expect(result.data).toBeInstanceOf(Buffer)
    })

    it('should include header with project info', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(mockBudget as any)

      const config = { ...defaultConfig, format: 'excel-caixa' as const }
      const result = await exportToExcelCaixa(config)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
    })
  })

  describe('exportToPDFMemoria', () => {
    it('should return error when budget not found', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(null as any)

      const result = await exportToPDFMemoria(defaultConfig)

      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('não encontrado')
    })

    it('should generate valid PDF file', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(mockBudget as any)

      const config = { ...defaultConfig, format: 'pdf-memoria' as const }
      const result = await exportToPDFMemoria(config)

      expect(result.success).toBe(true)
      expect(result.filename).toContain('.pdf')
      expect(result.mimeType).toBe('application/pdf')
      expect(result.data).toBeInstanceOf(Buffer)
    })
  })

  describe('exportOrcamento (unified)', () => {
    it('should route to XML export when format is xml-sinapi', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(mockBudget as any)

      const result = await exportOrcamento({ ...defaultConfig, format: 'xml-sinapi' })

      expect(result.success).toBe(true)
      expect(result.mimeType).toBe('application/xml')
    })

    it('should route to Excel export when format is excel-caixa', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(mockBudget as any)

      const result = await exportOrcamento({ ...defaultConfig, format: 'excel-caixa' })

      expect(result.success).toBe(true)
      expect(result.mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    })

    it('should route to PDF export when format is pdf-memoria', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(mockBudget as any)

      const result = await exportOrcamento({ ...defaultConfig, format: 'pdf-memoria' })

      expect(result.success).toBe(true)
      expect(result.mimeType).toBe('application/pdf')
    })

    it('should return error for unsupported format', async () => {
      const result = await exportOrcamento({
        ...defaultConfig,
        format: 'invalid-format' as any,
      })

      expect(result.success).toBe(false)
      expect(result.errorMessage).toContain('não suportado')
    })
  })

  describe('Calculation accuracy', () => {
    it('should calculate correct totals in XML', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(mockBudget as any)

      const result = await exportToXMLSinapi(defaultConfig)

      expect(result.success).toBe(true)
      const xmlContent = result.data as string
      
      // Expected: 100 * 45.50 + 50 * 450 = 4550 + 22500 = 27050
      expect(xmlContent).toContain('<custoDireto>27050.00</custoDireto>')
    })

    it('should calculate BDI correctly', async () => {
      vi.mocked(db.budgets.findFirst).mockResolvedValueOnce(mockBudget as any)

      const result = await exportToXMLSinapi(defaultConfig)

      expect(result.success).toBe(true)
      const xmlContent = result.data as string
      
      // BDI: 27050 * 22.5% = 6086.25
      expect(xmlContent).toContain('<percentual>22.50</percentual>')
    })
  })
})
