// =============================================================================
// ConstrutorPro - Excel Export Service
// Serviço para exportação de relatórios em formato Excel (XLSX)
// =============================================================================

import type { ColumnConfig } from '@/validators/reports'

// =============================================================================
// Types
// =============================================================================

export interface ExcelExportOptions {
  title: string
  subtitle?: string
  companyName?: string
  sheetName?: string
  columns: ColumnConfig[]
  data: Record<string, unknown>[]
  includeFilters?: boolean
  filters?: string
  includeTotals?: boolean
  totalsRow?: Record<string, number>
}

export interface MultiSheetOptions {
  filename: string
  sheets: ExcelExportOptions[]
}

// =============================================================================
// Utility Functions
// =============================================================================

function formatCellValue(value: unknown, format?: string): string | number {
  if (value === null || value === undefined) return ''

  switch (format) {
    case 'currency':
      return typeof value === 'number' ? value : 0
    case 'percent':
      return typeof value === 'number' ? value * 100 : 0
    case 'number':
      return typeof value === 'number' ? value : 0
    case 'date':
      if (value instanceof Date) {
        return value.toLocaleDateString('pt-BR')
      }
      if (typeof value === 'string') {
        try {
          return new Date(value).toLocaleDateString('pt-BR')
        } catch {
          return value
        }
      }
      return String(value)
    case 'datetime':
      if (value instanceof Date) {
        return value.toLocaleString('pt-BR')
      }
      if (typeof value === 'string') {
        try {
          return new Date(value).toLocaleString('pt-BR')
        } catch {
          return value
        }
      }
      return String(value)
    default:
      return String(value)
  }
}

function getColumnWidth(data: Record<string, unknown>[], field: string, label?: string): number {
  const headerWidth = (label || field).length
  let maxWidth = headerWidth

  for (const row of data.slice(0, 100)) {
    const cellValue = String(row[field] ?? '')
    const cellWidth = cellValue.length
    if (cellWidth > maxWidth) {
      maxWidth = Math.min(cellWidth, 50) // Max 50 characters width
    }
  }

  return Math.max(maxWidth + 2, 10) // Min 10 characters
}

// =============================================================================
// XML Generation for Excel (SpreadsheetML)
// =============================================================================

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateWorkbookXML(options: ExcelExportOptions): string {
  const {
    title,
    subtitle,
    companyName,
    sheetName = 'Relatório',
    columns,
    data,
    includeFilters,
    filters,
    includeTotals,
    totalsRow,
  } = options

  const visibleColumns = columns.filter(c => c.visible !== false)
  const rows: string[] = []

  // Styles
  const styles = `
    <Styles>
      <Style ss:ID="Header">
        <Font ss:Bold="1" ss:Size="14" ss:Color="#1F4E79"/>
        <Alignment ss:Horizontal="Left"/>
      </Style>
      <Style ss:ID="SubHeader">
        <Font ss:Size="11" ss:Color="#5B9BD5"/>
        <Alignment ss:Horizontal="Left"/>
      </Style>
      <Style ss:ID="TableHeader">
        <Font ss:Bold="1" ss:Size="10" ss:Color="#FFFFFF"/>
        <Interior ss:Color="#1F4E79" ss:Pattern="Solid"/>
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
        </Borders>
      </Style>
      <Style ss:ID="TableCell">
        <Font ss:Size="10"/>
        <Alignment ss:Vertical="Center"/>
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="0.5"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="0.5"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="0.5"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="0.5"/>
        </Borders>
      </Style>
      <Style ss:ID="Currency">
        <Font ss:Size="10"/>
        <NumberFormat ss:Format="&quot;R$&quot; #,##0.00"/>
        <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="0.5"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="0.5"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="0.5"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="0.5"/>
        </Borders>
      </Style>
      <Style ss:ID="Percent">
        <Font ss:Size="10"/>
        <NumberFormat ss:Format="0.00%"/>
        <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="0.5"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="0.5"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="0.5"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="0.5"/>
        </Borders>
      </Style>
      <Style ss:ID="Number">
        <Font ss:Size="10"/>
        <NumberFormat ss:Format="#,##0.00"/>
        <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="0.5"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="0.5"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="0.5"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="0.5"/>
        </Borders>
      </Style>
      <Style ss:ID="Date">
        <Font ss:Size="10"/>
        <NumberFormat ss:Format="dd/mm/yyyy"/>
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="0.5"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="0.5"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="0.5"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="0.5"/>
        </Borders>
      </Style>
      <Style ss:ID="TotalsRow">
        <Font ss:Bold="1" ss:Size="10"/>
        <Interior ss:Color="#E7E6E6" ss:Pattern="Solid"/>
        <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
        </Borders>
      </Style>
      <Style ss:ID="TotalsCurrency">
        <Font ss:Bold="1" ss:Size="10"/>
        <Interior ss:Color="#E7E6E6" ss:Pattern="Solid"/>
        <NumberFormat ss:Format="&quot;R$&quot; #,##0.00"/>
        <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
        <Borders>
          <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
          <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
        </Borders>
      </Style>
    </Styles>
  `

  // Title rows
  rows.push(`<Row><Cell ss:StyleID="Header" ss:MergeAcross="${visibleColumns.length - 1}"><Data ss:Type="String">${escapeXML(title)}</Data></Cell></Row>`)
  
  if (companyName) {
    rows.push(`<Row><Cell ss:StyleID="SubHeader" ss:MergeAcross="${visibleColumns.length - 1}"><Data ss:Type="String">${escapeXML(companyName)}</Data></Cell></Row>`)
  }
  
  if (subtitle) {
    rows.push(`<Row><Cell ss:StyleID="SubHeader" ss:MergeAcross="${visibleColumns.length - 1}"><Data ss:Type="String">${escapeXML(subtitle)}</Data></Cell></Row>`)
  }

  // Filters row
  if (includeFilters && filters) {
    rows.push(`<Row><Cell ss:MergeAcross="${visibleColumns.length - 1}"><Data ss:Type="String">Filtros: ${escapeXML(filters)}</Data></Cell></Row>`)
  }

  // Empty row
  rows.push('<Row/>')

  // Table header
  let headerRow = '<Row>'
  for (const col of visibleColumns) {
    headerRow += `<Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXML(col.label || col.field)}</Data></Cell>`
  }
  headerRow += '</Row>'
  rows.push(headerRow)

  // Data rows
  for (const rowData of data) {
    let dataRow = '<Row>'
    for (const col of visibleColumns) {
      const value = rowData[col.field]
      const format = col.format
      const cellValue = formatCellValue(value, format)
      
      let styleId = 'TableCell'
      let dataType = 'String'
      
      if (format === 'currency') {
        styleId = 'Currency'
        dataType = 'Number'
      } else if (format === 'percent') {
        styleId = 'Percent'
        dataType = 'Number'
      } else if (format === 'number') {
        styleId = 'Number'
        dataType = 'Number'
      } else if (format === 'date' || format === 'datetime') {
        styleId = 'Date'
      }
      
      if (dataType === 'Number' && typeof cellValue === 'number') {
        dataRow += `<Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${cellValue}</Data></Cell>`
      } else {
        dataRow += `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXML(String(cellValue))}</Data></Cell>`
      }
    }
    dataRow += '</Row>'
    rows.push(dataRow)
  }

  // Totals row
  if (includeTotals && totalsRow) {
    let totalRow = '<Row>'
    for (let i = 0; i < visibleColumns.length; i++) {
      const col = visibleColumns[i]
      const totalValue = totalsRow[col.field]
      
      if (i === 0) {
        totalRow += `<Cell ss:StyleID="TotalsRow"><Data ss:Type="String">TOTAL</Data></Cell>`
      } else if (totalValue !== undefined && typeof totalValue === 'number') {
        if (col.format === 'currency') {
          totalRow += `<Cell ss:StyleID="TotalsCurrency"><Data ss:Type="Number">${totalValue}</Data></Cell>`
        } else {
          totalRow += `<Cell ss:StyleID="TotalsRow"><Data ss:Type="Number">${totalValue}</Data></Cell>`
        }
      } else {
        totalRow += `<Cell ss:StyleID="TotalsRow"><Data ss:Type="String"></Data></Cell>`
      }
    }
    totalRow += '</Row>'
    rows.push(totalRow)
  }

  // Empty row
  rows.push('<Row/>')

  // Footer
  rows.push(`<Row><Cell ss:MergeAcross="${visibleColumns.length - 1}"><Data ss:Type="String">Gerado em: ${new Date().toLocaleString('pt-BR')}</Data></Cell></Row>`)
  rows.push(`<Row><Cell ss:MergeAcross="${visibleColumns.length - 1}"><Data ss:Type="String">ConstrutorPro - Sistema de Gestão Empresarial</Data></Cell></Row>`)

  // Column widths
  const columnWidths = visibleColumns.map(col => 
    `<Column ss:Width="${getColumnWidth(data, col.field, col.label) * 7}"/>`
  ).join('')

  // Build worksheet
  const worksheet = `
    <Worksheet ss:Name="${escapeXML(sheetName.substring(0, 31))}">
      ${columnWidths}
      <Table>
        ${rows.join('\n')}
      </Table>
      <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
        <FreezePanes/>
        <FrozenNoSplit/>
        <SplitHorizontal>6</SplitHorizontal>
        <TopRowBottomPane>6</TopRowBottomPane>
        <ActivePane>2</ActivePane>
        <Panes>
          <Pane>
            <Number>3</Number>
          </Pane>
          <Pane>
            <Number>2</Number>
          </Pane>
        </Panes>
      </WorksheetOptions>
    </Worksheet>
  `

  // Build workbook
  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${styles}
  ${worksheet}
</Workbook>`

  return workbook
}

function generateMultiSheetWorkbookXML(options: MultiSheetOptions): string {
  const worksheets = options.sheets.map((sheet, index) => {
    const sheetOpts = {
      ...sheet,
      sheetName: sheet.sheetName || `Planilha${index + 1}`,
    }
    
    const visibleColumns = sheetOpts.columns.filter(c => c.visible !== false)
    const rows: string[] = []

    // Title
    rows.push(`<Row><Cell ss:StyleID="Header" ss:MergeAcross="${visibleColumns.length - 1}"><Data ss:Type="String">${escapeXML(sheetOpts.title)}</Data></Cell></Row>`)
    
    if (sheetOpts.companyName) {
      rows.push(`<Row><Cell ss:StyleID="SubHeader" ss:MergeAcross="${visibleColumns.length - 1}"><Data ss:Type="String">${escapeXML(sheetOpts.companyName)}</Data></Cell></Row>`)
    }
    
    rows.push('<Row/>')

    // Table header
    let headerRow = '<Row>'
    for (const col of visibleColumns) {
      headerRow += `<Cell ss:StyleID="TableHeader"><Data ss:Type="String">${escapeXML(col.label || col.field)}</Data></Cell>`
    }
    headerRow += '</Row>'
    rows.push(headerRow)

    // Data rows
    for (const rowData of sheetOpts.data) {
      let dataRow = '<Row>'
      for (const col of visibleColumns) {
        const value = rowData[col.field]
        const cellValue = formatCellValue(value, col.format)
        
        let styleId = 'TableCell'
        if (col.format === 'currency') styleId = 'Currency'
        else if (col.format === 'percent') styleId = 'Percent'
        else if (col.format === 'number') styleId = 'Number'
        else if (col.format === 'date' || col.format === 'datetime') styleId = 'Date'
        
        if (col.format === 'number' || col.format === 'currency' || col.format === 'percent') {
          dataRow += `<Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${typeof cellValue === 'number' ? cellValue : 0}</Data></Cell>`
        } else {
          dataRow += `<Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXML(String(cellValue))}</Data></Cell>`
        }
      }
      dataRow += '</Row>'
      rows.push(dataRow)
    }

    // Column widths
    const columnWidths = visibleColumns.map(col => 
      `<Column ss:Width="${getColumnWidth(sheetOpts.data, col.field, col.label) * 7}"/>`
    ).join('')

    return `
    <Worksheet ss:Name="${escapeXML(sheetOpts.sheetName.substring(0, 31))}">
      ${columnWidths}
      <Table>
        ${rows.join('\n')}
      </Table>
    </Worksheet>`
  })

  // Styles (simplified for multi-sheet)
  const styles = `
    <Styles>
      <Style ss:ID="Header">
        <Font ss:Bold="1" ss:Size="14" ss:Color="#1F4E79"/>
        <Alignment ss:Horizontal="Left"/>
      </Style>
      <Style ss:ID="SubHeader">
        <Font ss:Size="11" ss:Color="#5B9BD5"/>
        <Alignment ss:Horizontal="Left"/>
      </Style>
      <Style ss:ID="TableHeader">
        <Font ss:Bold="1" ss:Size="10" ss:Color="#FFFFFF"/>
        <Interior ss:Color="#1F4E79" ss:Pattern="Solid"/>
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      </Style>
      <Style ss:ID="TableCell">
        <Font ss:Size="10"/>
        <Alignment ss:Vertical="Center"/>
      </Style>
      <Style ss:ID="Currency">
        <Font ss:Size="10"/>
        <NumberFormat ss:Format="&quot;R$&quot; #,##0.00"/>
        <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      </Style>
      <Style ss:ID="Percent">
        <Font ss:Size="10"/>
        <NumberFormat ss:Format="0.00%"/>
        <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      </Style>
      <Style ss:ID="Number">
        <Font ss:Size="10"/>
        <NumberFormat ss:Format="#,##0.00"/>
        <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      </Style>
      <Style ss:ID="Date">
        <Font ss:Size="10"/>
        <NumberFormat ss:Format="dd/mm/yyyy"/>
        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
      </Style>
    </Styles>
  `

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  ${styles}
  ${worksheets.join('\n')}
</Workbook>`
}

// =============================================================================
// Public API
// =============================================================================

export function generateExcelXML(options: ExcelExportOptions): string {
  return generateWorkbookXML(options)
}

export function generateMultiSheetExcelXML(options: MultiSheetOptions): string {
  return generateMultiSheetWorkbookXML(options)
}

export function generateExcelBuffer(options: ExcelExportOptions): Buffer {
  const xml = generateWorkbookXML(options)
  return Buffer.from(xml, 'utf-8')
}

export function generateMultiSheetExcelBuffer(options: MultiSheetOptions): Buffer {
  const xml = generateMultiSheetWorkbookXML(options)
  return Buffer.from(xml, 'utf-8')
}

// Helper to create column config from data
export function inferColumnsFromData(data: Record<string, unknown>[]): ColumnConfig[] {
  if (data.length === 0) return []
  
  const firstRow = data[0]
  return Object.keys(firstRow).map(field => {
    const value = firstRow[field]
    let format: ColumnConfig['format'] = 'text'
    
    if (typeof value === 'number') {
      format = 'number'
    } else if (value instanceof Date) {
      format = 'date'
    } else if (typeof value === 'string') {
      // Try to detect date strings
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        format = 'date'
      }
      // Try to detect currency values
      if (/^R\$\s*[\d.,]+$/.test(value)) {
        format = 'currency'
      }
    }
    
    return {
      field,
      label: field.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
      visible: true,
      format,
    }
  })
}

// Auto-generate totals from numeric columns
export function calculateTotals(data: Record<string, unknown>[], columns: ColumnConfig[]): Record<string, number> {
  const totals: Record<string, number> = {}
  
  for (const col of columns) {
    if (col.format === 'currency' || col.format === 'number' || col.format === 'percent') {
      const values = data
        .map(row => row[col.field])
        .filter(v => typeof v === 'number') as number[]
      
      if (values.length > 0) {
        totals[col.field] = values.reduce((sum, val) => sum + val, 0)
      }
    }
  }
  
  return totals
}
