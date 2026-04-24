// =============================================================================
// ConstrutorPro - Bank Reconciliation Service Tests
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parseOFX,
  parseCSV,
  parseOFXDate,
  type BankTransaction,
  type CSVImportConfig,
  type OFXImport,
} from '../bank-reconciliation-service'

// Mock do db
vi.mock('@/lib/db', () => ({
  db: {
    bank_accounts: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    bank_transactions: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    financial_transactions: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))

describe('Bank Reconciliation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Default config for CSV tests
  const defaultConfig: CSVImportConfig = {
    dateFormat: 'DD/MM/YYYY',
    delimiter: ';',
    hasHeader: true,
    dateColumn: 0,
    amountColumn: 1,
    descriptionColumn: 2,
  }

  // ===========================================================================
  // OFX Parser Tests
  // ===========================================================================

  describe('parseOFX', () => {
    it('should parse OFX structure', () => {
      const ofxContent = `
<OFX>
<BANKMSGSRSV1>
<STMTTRNRS>
<STMTRS>
<CURDEF>BRL
<BANKACCTFROM>
<BANKID>001
<ACCTID>12345-6
<ACCTTYPE>CHECKING
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>20240101
<DTEND>20240115
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>850.50
<DTASOF>20240115
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`

      const result = parseOFX(ofxContent)

      expect(result).not.toBeNull()
      expect(result?.currency).toBe('BRL')
      expect(result?.balance).toBe(850.50)
    })

    it('should return empty transactions for minimal OFX', () => {
      const result = parseOFX('')
      expect(result?.transactions).toHaveLength(0)
    })
  })

  describe('parseOFXDate', () => {
    it('should parse date without time', () => {
      const date = parseOFXDate('20240115')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0) // January is 0
      expect(date.getDate()).toBe(15)
    })

    it('should parse date with time', () => {
      const date = parseOFXDate('20240115143000')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0)
      expect(date.getDate()).toBe(15)
      expect(date.getHours()).toBe(14)
      expect(date.getMinutes()).toBe(30)
      expect(date.getSeconds()).toBe(0)
    })

    it('should handle date with timezone info', () => {
      const date = parseOFXDate('20240115120000[-3:BRT]')
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0)
      expect(date.getDate()).toBe(15)
    })
  })

  // ===========================================================================
  // CSV Parser Tests
  // ===========================================================================

  describe('parseCSV', () => {

    it('should parse CSV with header', () => {
      const csvContent = `Data;Valor;Descrição
05/01/2024;1000,00;SALARIO
10/01/2024;-150,50;PAGTO LUZ
15/01/2024;500,00;TRANSFERENCIA`

      const result = parseCSV(csvContent, defaultConfig)

      expect(result).toHaveLength(3)
      expect(result[0].description).toBe('SALARIO')
      expect(result[1].description).toBe('PAGTO LUZ')
    })

    it('should parse CSV without header', () => {
      const csvContent = `05/01/2024;1000.00;SALARIO
10/01/2024;150.50;PAGTO LUZ`

      const config: CSVImportConfig = {
        ...defaultConfig,
        hasHeader: false,
        delimiter: ';',
      }

      const result = parseCSV(csvContent, config)

      expect(result).toHaveLength(2)
    })

    it('should handle different date formats', () => {
      const csvContent1 = `Data;Valor;Descrição
01/15/2024;100.00;TEST`

      const config1: CSVImportConfig = {
        ...defaultConfig,
        dateFormat: 'MM/DD/YYYY',
      }

      const result1 = parseCSV(csvContent1, config1)
      expect(result1[0].date.getMonth()).toBe(0) // January
      expect(result1[0].date.getDate()).toBe(15)

      const csvContent2 = `Data;Valor;Descrição
2024-01-15;100.00;TEST`

      const config2: CSVImportConfig = {
        ...defaultConfig,
        dateFormat: 'YYYY-MM-DD',
      }

      const result2 = parseCSV(csvContent2, config2)
      expect(result2[0].date.getFullYear()).toBe(2024)
    })

    it('should handle credit/debit indicator column', () => {
      const csvContent = `Data;Valor;Descrição;Tipo
05/01/2024;1000.00;SALARIO;C
10/01/2024;150.50;PAGTO;D`

      const config: CSVImportConfig = {
        ...defaultConfig,
        creditDebitColumn: 3,
        creditValue: 'C',
      }

      const result = parseCSV(csvContent, config)

      expect(result[0].type).toBe('credit')
      expect(result[1].type).toBe('debit')
    })

    it('should handle different delimiters', () => {
      const csvContent = `Data,Valor,Descrição
05/01/2024,1000.00,SALARIO`

      const config: CSVImportConfig = {
        ...defaultConfig,
        delimiter: ',',
      }

      const result = parseCSV(csvContent, config)
      expect(result).toHaveLength(1)
      expect(result[0].description).toBe('SALARIO')
    })

    it('should skip invalid rows', () => {
      const csvContent = `Data;Valor;Descrição
05/01/2024;1000.00;VALID
INVALID;DATA;HERE
10/01/2024;200.00;ALSO VALID`

      const result = parseCSV(csvContent, defaultConfig)

      expect(result).toHaveLength(2)
    })
  })

  // ===========================================================================
  // Date Parsing via CSV (indirect parseDate tests)
  // ===========================================================================

  describe('Date Parsing via CSV', () => {
    it('should parse DD/MM/YYYY format correctly', () => {
      const csvContent = `Data;Valor;Descrição
15/01/2024;100.00;TEST`
      
      const result = parseCSV(csvContent, defaultConfig)
      expect(result[0].date.getDate()).toBe(15)
      expect(result[0].date.getMonth()).toBe(0)
      expect(result[0].date.getFullYear()).toBe(2024)
    })

    it('should parse YYYY-MM-DD format correctly', () => {
      const csvContent = `Data;Valor;Descrição
2024-01-15;100.00;TEST`
      
      const config: CSVImportConfig = {
        ...defaultConfig,
        dateFormat: 'YYYY-MM-DD',
      }
      
      const result = parseCSV(csvContent, config)
      expect(result[0].date.getFullYear()).toBe(2024)
      expect(result[0].date.getMonth()).toBe(0)
      expect(result[0].date.getDate()).toBe(15)
    })

    it('should handle 2-digit years', () => {
      const csvContent = `Data;Valor;Descrição
15/01/24;100.00;TEST`
      
      const result = parseCSV(csvContent, defaultConfig)
      expect(result[0].date.getFullYear()).toBe(2024)
    })
  })

  // ===========================================================================
  // Bank Transaction Types
  // ===========================================================================

  describe('BankTransaction Type', () => {
    it('should define correct transaction structure', () => {
      const txn: BankTransaction = {
        date: new Date('2024-01-15'),
        amount: 1000,
        type: 'credit',
        description: 'Test transaction',
        reference: 'REF001',
        documentNumber: 'DOC001',
        fitId: 'FIT001',
      }

      expect(txn.date).toBeInstanceOf(Date)
      expect(txn.amount).toBe(1000)
      expect(txn.type).toBe('credit')
    })

    it('should support both credit and debit types', () => {
      const creditTxn: BankTransaction = {
        date: new Date(),
        amount: 100,
        type: 'credit',
        description: 'Credit',
      }

      const debitTxn: BankTransaction = {
        date: new Date(),
        amount: 50,
        type: 'debit',
        description: 'Debit',
      }

      expect(creditTxn.type).toBe('credit')
      expect(debitTxn.type).toBe('debit')
    })
  })

  // ===========================================================================
  // CSV Import Config
  // ===========================================================================

  describe('CSVImportConfig Type', () => {
    it('should have correct configuration structure', () => {
      const config: CSVImportConfig = {
        dateFormat: 'DD/MM/YYYY',
        delimiter: ';',
        hasHeader: true,
        dateColumn: 0,
        amountColumn: 1,
        descriptionColumn: 2,
        documentColumn: 3,
        creditDebitColumn: 4,
        creditValue: 'C',
      }

      expect(config.dateFormat).toBe('DD/MM/YYYY')
      expect(config.delimiter).toBe(';')
      expect(config.hasHeader).toBe(true)
      expect(config.dateColumn).toBe(0)
      expect(config.amountColumn).toBe(1)
    })
  })

  // ===========================================================================
  // OFX Import Type
  // ===========================================================================

  describe('OFXImport Type', () => {
    it('should define correct OFX import structure', () => {
      const ofxImport: OFXImport = {
        bankId: '001',
        accountId: '12345-6',
        accountType: 'checking',
        currency: 'BRL',
        transactions: [],
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        balance: 1000,
        balanceDate: new Date('2024-01-31'),
      }

      expect(ofxImport.bankId).toBe('001')
      expect(ofxImport.accountType).toBe('checking')
      expect(ofxImport.currency).toBe('BRL')
    })
  })
})
