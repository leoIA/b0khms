// =============================================================================
// ConstrutorPro - Export Licitações Service
// Exportação de orçamentos para formatos de licitação pública
// =============================================================================

import { db } from '@/lib/db'

// =============================================================================
// Types
// =============================================================================

export interface ExportConfig {
  budgetId: string
  companyId: string
  format: 'xml-sinapi' | 'excel-caixa' | 'pdf-memoria'
  includeBDI: boolean
  includeEncargos: boolean
  clienteInfo?: {
    nome: string
    cnpj?: string
    endereco?: string
  }
  obraInfo?: {
    endereco: string
    prazoExecucao: number // dias
    dataInicio?: Date
  }
}

export interface SinapiItem {
  codigo: string
  descricao: string
  unidade: string
  quantidade: number
  precoUnitario: number
  precoTotal: number
  composicao?: {
    insumos: InsumoItem[]
    maoDeObra: MaoDeObraItem[]
    equipamentos: EquipamentoItem[]
  }
}

export interface InsumoItem {
  codigo: string
  descricao: string
  unidade: string
  consumo: number
  precoUnitario: number
}

export interface MaoDeObraItem {
  codigo: string
  descricao: string
  unidade: string
  horas: number
  precoUnitario: number
}

export interface EquipamentoItem {
  codigo: string
  descricao: string
  unidade: string
  horas: number
  precoUnitario: number
}

export interface ExportResult {
  success: boolean
  data?: Buffer | string
  filename: string
  mimeType: string
  errorMessage?: string
}

// =============================================================================
// XML SINAPI Export
// =============================================================================

export async function exportToXMLSinapi(config: ExportConfig): Promise<ExportResult> {
  try {
    // Buscar orçamento completo
    const budget = await db.budgets.findFirst({
      where: {
        id: config.budgetId,
        companyId: config.companyId,
      },
      include: {
        budget_items: {
          include: {
            compositions: {
              include: {
                composition_items: {
                  include: {
                    materials: true,
                  },
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        projects: true,
        companies: true,
      },
    })

    if (!budget) {
      return {
        success: false,
        filename: '',
        mimeType: '',
        errorMessage: 'Orçamento não encontrado',
      }
    }

    // Gerar XML no formato SINAPI
    const xmlContent = generateSinapiXML(budget, config)

    return {
      success: true,
      data: xmlContent,
      filename: `orcamento_sinapi_${budget.code || budget.id}.xml`,
      mimeType: 'application/xml',
    }
  } catch (error) {
    return {
      success: false,
      filename: '',
      mimeType: '',
      errorMessage: error instanceof Error ? error.message : 'Erro ao gerar XML SINAPI',
    }
  }
}

function generateSinapiXML(
  budget: any,
  config: ExportConfig
): string {
  const now = new Date()
  const dataHora = now.toISOString()

  // Calcular totais
  let totalCustoDireto = 0
  let totalBDI = 0
  let totalGeral = 0

  const items = budget.budget_items.map((item: any) => {
    const total = Number(item.quantity) * Number(item.unitPrice)
    totalCustoDireto += total
    return {
      codigo: item.compositionId || item.id.slice(0, 12),
      descricao: item.description,
      unidade: item.unit,
      quantidade: Number(item.quantity),
      precoUnitario: Number(item.unitPrice),
      precoTotal: total,
    }
  })

  // BDI padrão se não especificado
  const bdiPercent = 22.5 // %
  totalBDI = totalCustoDireto * (bdiPercent / 100)
  totalGeral = totalCustoDireto + totalBDI

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<orcamento xmlns="http://www.caixa.gov.br/sinapi/orcamento"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:schemaLocation="http://www.caixa.gov.br/sinapi/orcamento sinapi_orcamento.xsd">
  
  <!-- Cabeçalho -->
  <cabecalho>
    <numero>${budget.code || budget.id}</numero>
    <data>${dataHora.split('T')[0]}</data>
    <hora>${dataHora.split('T')[1].split('.')[0]}</hora>
    <sistema>SINAPI</sistema>
    <versao>1.0</versao>
  </cabecalho>
  
  <!-- Empreendimento -->
  <empreendimento>
    <codigo>${budget.projects?.code || 'SEM-CODIGO'}</codigo>
    <nome>${budget.projects?.name || budget.name}</nome>
    <descricao>${budget.description || ''}</descricao>
    <endereco>${config.obraInfo?.endereco || budget.projects?.address || ''}</endereco>
    <municipio>${budget.projects?.city || ''}</municipio>
    <uf>${budget.projects?.state || ''}</uf>
    <prazoExecucao>${config.obraInfo?.prazoExecucao || 0}</prazoExecucao>
    <dataInicio>${config.obraInfo?.dataInicio?.toISOString().split('T')[0] || ''}</dataInicio>
  </empreendimento>
  
  <!-- Contratante -->
  <contratante>
    <nome>${config.clienteInfo?.nome || budget.companies?.name || ''}</nome>
    <cnpj>${config.clienteInfo?.cnpj || budget.companies?.cnpj || ''}</cnpj>
    <endereco>${config.clienteInfo?.endereco || budget.companies?.address || ''}</endereco>
  </contratante>
  
  <!-- Custos -->
  <custos>
    <custoDireto>${totalCustoDireto.toFixed(2)}</custoDireto>
    ${config.includeBDI ? `<bdi>
      <percentual>${bdiPercent.toFixed(2)}</percentual>
      <valor>${totalBDI.toFixed(2)}</valor>
    </bdi>` : ''}
    ${config.includeEncargos ? `<encargosSociais>
      <percentual>37.80</percentual>
    </encargosSociais>` : ''}
    <totalGeral>${totalGeral.toFixed(2)}</totalGeral>
  </custos>
  
  <!-- Itens do Orçamento -->
  <itens>
    ${items.map((item: any) => `
    <item>
      <codigo>${item.codigo}</codigo>
      <descricao><![CDATA[${item.descricao}]]></descricao>
      <unidade>${item.unidade}</unidade>
      <quantidade>${item.quantidade.toFixed(4)}</quantidade>
      <precoUnitario>${item.precoUnitario.toFixed(2)}</precoUnitario>
      <precoTotal>${item.precoTotal.toFixed(2)}</precoTotal>
    </item>`).join('')}
  </itens>
  
</orcamento>`

  return xml
}

// =============================================================================
// Excel Caixa Export
// =============================================================================

export async function exportToExcelCaixa(config: ExportConfig): Promise<ExportResult> {
  try {
    // Buscar orçamento completo
    const budget = await db.budgets.findFirst({
      where: {
        id: config.budgetId,
        companyId: config.companyId,
      },
      include: {
        budget_items: {
          include: {
            compositions: true,
          },
          orderBy: { order: 'asc' },
        },
        projects: true,
        companies: true,
      },
    })

    if (!budget) {
      return {
        success: false,
        filename: '',
        mimeType: '',
        errorMessage: 'Orçamento não encontrado',
      }
    }

    // Gerar planilha Excel
    const excelBuffer = await generateExcelCaixa(budget, config)

    return {
      success: true,
      data: excelBuffer,
      filename: `planilha_caixa_${budget.code || budget.id}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
  } catch (error) {
    return {
      success: false,
      filename: '',
      mimeType: '',
      errorMessage: error instanceof Error ? error.message : 'Erro ao gerar Excel Caixa',
    }
  }
}

async function generateExcelCaixa(budget: any, config: ExportConfig): Promise<Buffer> {
  // Usar biblioteca xlsx para gerar Excel
  const XLSX = await import('xlsx')
  
  // Cabeçalho da planilha
  const headerRows = [
    ['PLANILHA DE ORÇAMENTO - PADRÃO CAIXA'],
    [''],
    ['Empreendimento:', budget.projects?.name || budget.name, '', '', '', '', 'Data:', new Date().toLocaleDateString('pt-BR')],
    ['Endereço:', budget.projects?.address || '', '', '', '', '', 'Prazo:', `${config.obraInfo?.prazoExecucao || 0} dias`],
    ['Município/UF:', `${budget.projects?.city || ''}/${budget.projects?.state || ''}`, '', '', '', '', '', ''],
    ['Contratante:', config.clienteInfo?.nome || budget.companies?.name || '', '', '', '', '', '', ''],
    ['CNPJ:', config.clienteInfo?.cnpj || budget.companies?.cnpj || '', '', '', '', '', '', ''],
    [''],
    [''],
    ['Item', 'Código', 'Descrição', 'Unidade', 'Quantidade', 'Preço Unit. (R$)', 'Preço Total (R$)'],
  ]

  // Itens do orçamento
  const itemRows: any[][] = []
  let totalCustoDireto = 0

  budget.budget_items.forEach((item: any, index: number) => {
    const total = Number(item.quantity) * Number(item.unitPrice)
    totalCustoDireto += total
    itemRows.push([
      index + 1,
      item.compositionId || item.id.slice(0, 12),
      item.description,
      item.unit,
      Number(item.quantity),
      Number(item.unitPrice),
      total,
    ])
  })

  // Totais
  const bdiPercent = 22.5
  const totalBDI = totalCustoDireto * (bdiPercent / 100)
  const totalGeral = totalCustoDireto + totalBDI

  const summaryRows = [
    [''],
    ['', '', '', '', '', 'Custo Direto:', totalCustoDireto.toFixed(2)],
    ['', '', '', '', '', 'BDI (' + bdiPercent + '%):', totalBDI.toFixed(2)],
    ['', '', '', '', '', 'TOTAL GERAL:', totalGeral.toFixed(2)],
  ]

  // Criar planilha
  const wsData = [...headerRows, ...itemRows, ...summaryRows]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Definir largura das colunas
  ws['!cols'] = [
    { wch: 6 },   // Item
    { wch: 15 },  // Código
    { wch: 50 },  // Descrição
    { wch: 8 },   // Unidade
    { wch: 12 },  // Quantidade
    { wch: 15 },  // Preço Unit.
    { wch: 15 },  // Preço Total
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Orçamento')

  // Gerar buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return Buffer.from(buffer)
}

// =============================================================================
// PDF Memória de Cálculo Export
// =============================================================================

export async function exportToPDFMemoria(config: ExportConfig): Promise<ExportResult> {
  try {
    // Buscar orçamento completo com BDI
    const budget = await db.budgets.findFirst({
      where: {
        id: config.budgetId,
        companyId: config.companyId,
      },
      include: {
        budget_items: {
          include: {
            compositions: {
              include: {
                composition_items: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
        projects: true,
        companies: true,
      },
    })

    if (!budget) {
      return {
        success: false,
        filename: '',
        mimeType: '',
        errorMessage: 'Orçamento não encontrado',
      }
    }

    // Gerar PDF
    const pdfBuffer = await generatePDFMemoria(budget, config)

    return {
      success: true,
      data: pdfBuffer,
      filename: `memoria_calculo_${budget.code || budget.id}.pdf`,
      mimeType: 'application/pdf',
    }
  } catch (error) {
    return {
      success: false,
      filename: '',
      mimeType: '',
      errorMessage: error instanceof Error ? error.message : 'Erro ao gerar PDF Memória',
    }
  }
}

async function generatePDFMemoria(budget: any, config: ExportConfig): Promise<Buffer> {
  // Usar PDFKit para gerar PDF
  const PDFDocument = (await import('pdfkit')).default
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  })

  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  // Cabeçalho
  doc.fontSize(16).font('Helvetica-Bold').text('MEMÓRIA DE CÁLCULO', { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(12).font('Helvetica').text('Orçamento para Licitação', { align: 'center' })
  doc.moveDown(1)

  // Informações do empreendimento
  doc.fontSize(10).font('Helvetica-Bold').text('EMPREENDIMENTO')
  doc.font('Helvetica')
  doc.text(`Nome: ${budget.projects?.name || budget.name}`)
  doc.text(`Endereço: ${config.obraInfo?.endereco || budget.projects?.address || '-'}`)
  doc.text(`Município/UF: ${budget.projects?.city || '-'}/${budget.projects?.state || '-'}`)
  doc.moveDown(0.5)

  // Contratante
  doc.font('Helvetica-Bold').text('CONTRATANTE')
  doc.font('Helvetica')
  doc.text(`Nome: ${config.clienteInfo?.nome || budget.companies?.name || '-'}`)
  doc.text(`CNPJ: ${config.clienteInfo?.cnpj || budget.companies?.cnpj || '-'}`)
  doc.moveDown(0.5)

  // Data
  doc.text(`Data de Referência: ${new Date().toLocaleDateString('pt-BR')}`)
  doc.moveDown(1)

  // Tabela de itens
  doc.font('Helvetica-Bold').text('COMPOSIÇÃO DOS CUSTOS')
  doc.moveDown(0.3)

  // Cabeçalho da tabela
  const tableTop = doc.y
  const colWidths = [30, 220, 60, 70, 90] // Item, Descrição, Un., Qtd, Preço Total
  const rowHeight = 20

  doc.font('Helvetica-Bold').fontSize(8)
  doc.text('Item', 50, tableTop, { width: colWidths[0] })
  doc.text('Descrição', 80, tableTop, { width: colWidths[1] })
  doc.text('Un.', 300, tableTop, { width: colWidths[2], align: 'center' })
  doc.text('Quantidade', 360, tableTop, { width: colWidths[3], align: 'right' })
  doc.text('Preço Total (R$)', 430, tableTop, { width: colWidths[4], align: 'right' })

  // Linha separadora
  doc.moveTo(50, tableTop + rowHeight - 5)
    .lineTo(550, tableTop + rowHeight - 5)
    .stroke()

  // Itens
  doc.font('Helvetica').fontSize(8)
  let y = tableTop + rowHeight
  let totalCustoDireto = 0

  budget.budget_items.forEach((item: any, index: number) => {
    const total = Number(item.quantity) * Number(item.unitPrice)
    totalCustoDireto += total

    doc.text(String(index + 1), 50, y, { width: colWidths[0] })
    doc.text(item.description.substring(0, 60), 80, y, { width: colWidths[1] })
    doc.text(item.unit, 300, y, { width: colWidths[2], align: 'center' })
    doc.text(Number(item.quantity).toFixed(2), 360, y, { width: colWidths[3], align: 'right' })
    doc.text(total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 430, y, { width: colWidths[4], align: 'right' })

    y += rowHeight

    // Nova página se necessário
    if (y > 750) {
      doc.addPage()
      y = 50
    }
  })

  // Totais
  y += 10
  doc.font('Helvetica-Bold').fontSize(9)
  doc.moveTo(300, y - 5).lineTo(550, y - 5).stroke()

  doc.text('CUSTO DIRETO', 300, y, { width: 120, align: 'right' })
  doc.text(totalCustoDireto.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 430, y, { width: colWidths[4], align: 'right' })

  y += rowHeight
  const bdiPercent = 22.5
  const totalBDI = totalCustoDireto * (bdiPercent / 100)
  doc.font('Helvetica')
  doc.text(`BDI (${bdiPercent}%)`, 300, y, { width: 120, align: 'right' })
  doc.text(totalBDI.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 430, y, { width: colWidths[4], align: 'right' })

  y += rowHeight
  const totalGeral = totalCustoDireto + totalBDI
  doc.font('Helvetica-Bold')
  doc.text('TOTAL GERAL', 300, y, { width: 120, align: 'right' })
  doc.text(totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 430, y, { width: colWidths[4], align: 'right' })

  // Rodapé
  doc.fontSize(8).font('Helvetica')
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 50, 800, { align: 'left' })
  doc.text('Página ' + doc.bufferedPageRange().count, 550, 800, { align: 'right' })

  return new Promise((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.end()
  })
}

// =============================================================================
// Unified Export Function
// =============================================================================

export async function exportOrcamento(config: ExportConfig): Promise<ExportResult> {
  switch (config.format) {
    case 'xml-sinapi':
      return exportToXMLSinapi(config)
    case 'excel-caixa':
      return exportToExcelCaixa(config)
    case 'pdf-memoria':
      return exportToPDFMemoria(config)
    default:
      return {
        success: false,
        filename: '',
        mimeType: '',
        errorMessage: 'Formato de exportação não suportado',
      }
  }
}
