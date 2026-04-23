import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/server/auth'
import { db } from '@/lib/db'
import {
  generateExcelBuffer,
  inferColumnsFromData,
  calculateTotals,
  type ExcelExportOptions,
} from '@/lib/excel-export'
import { format } from 'date-fns'
import type { ColumnConfig } from '@/validators/reports'

// =============================================================================
// GET /api/relatorios/excel - Export report to Excel
// =============================================================================

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult
  const { searchParams } = new URL(request.url)

  try {
    const type = searchParams.get('type') || 'projects'
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const projectId = searchParams.get('projectId')

    let excelBuffer: Buffer
    let filename: string

    switch (type) {
      case 'projects':
        const projectsResult = await getProjectsData(context!.companyId, dateFrom, dateTo, projectId)
        excelBuffer = generateExcelBuffer(projectsResult.options)
        filename = `relatorio_projetos_${format(new Date(), 'yyyy-MM-dd')}.xls`
        break

      case 'financial':
        const financialResult = await getFinancialData(context!.companyId, dateFrom, dateTo, projectId)
        excelBuffer = generateExcelBuffer(financialResult.options)
        filename = `relatorio_financeiro_${format(new Date(), 'yyyy-MM-dd')}.xls`
        break

      case 'resources':
        const resourcesResult = await getResourcesData(context!.companyId)
        excelBuffer = generateExcelBuffer(resourcesResult.options)
        filename = `relatorio_recursos_${format(new Date(), 'yyyy-MM-dd')}.xls`
        break

      case 'activities':
        const activitiesResult = await getActivitiesData(context!.companyId, dateFrom, dateTo, projectId)
        excelBuffer = generateExcelBuffer(activitiesResult.options)
        filename = `relatorio_atividades_${format(new Date(), 'yyyy-MM-dd')}.xls`
        break

      default:
        return errorResponse('Tipo de relatório inválido', 400)
    }

    // Register activity
    await db.activities.create({
      data: {
        companyId: context!.companyId,
        userId: context!.user.id,
        userName: context!.user.name,
        action: 'export',
        entityType: 'report',
        entityId: type,
        entityName: `Relatório ${type} (Excel)`,
        details: `Exportação Excel: ${filename}`,
      },
    })

    return new NextResponse(new Uint8Array(excelBuffer), {
      headers: {
        'Content-Type': 'application/vnd.ms-excel',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('Erro ao exportar Excel:', error)
    return errorResponse('Erro ao gerar relatório Excel', 500)
  }
}

// =============================================================================
// Data fetching functions
// =============================================================================

async function getProjectsData(
  companyId: string,
  dateFrom?: string | null,
  dateTo?: string | null,
  projectId?: string | null
): Promise<{ options: ExcelExportOptions }> {
  const where: Record<string, unknown> = { companyId }
  
  if (projectId) {
    where.id = projectId
  }
  
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {}
    if (dateFrom) dateFilter.gte = new Date(dateFrom)
    if (dateTo) dateFilter.lte = new Date(dateTo)
    where.startDate = dateFilter
  }

  const projects = await db.projects.findMany({
    where,
    include: {
      clients: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  })

  const columns: ColumnConfig[] = [
    { field: 'code', label: 'Código', visible: true, format: 'text' },
    { field: 'name', label: 'Nome', visible: true, format: 'text' },
    { field: 'clientName', label: 'Cliente', visible: true, format: 'text' },
    { field: 'status', label: 'Status', visible: true, format: 'text' },
    { field: 'startDate', label: 'Data Início', visible: true, format: 'date' },
    { field: 'endDate', label: 'Data Fim', visible: true, format: 'date' },
    { field: 'estimatedValue', label: 'Valor Estimado', visible: true, format: 'currency' },
    { field: 'actualValue', label: 'Valor Real', visible: true, format: 'currency' },
    { field: 'physicalProgress', label: 'Progresso Físico (%)', visible: true, format: 'percent' },
    { field: 'financialProgress', label: 'Progresso Financeiro (%)', visible: true, format: 'percent' },
  ]

  const data = projects.map(p => ({
    code: p.code || '',
    name: p.name,
    clientName: p.clients?.name || '',
    status: getStatusLabel(p.status),
    startDate: p.startDate,
    endDate: p.endDate,
    estimatedValue: p.estimatedValue,
    actualValue: p.actualValue,
    physicalProgress: p.physicalProgress / 100,
    financialProgress: p.financialProgress / 100,
  }))

  const totals = calculateTotals(data, columns)

  return {
    options: {
      title: 'Relatório de Projetos',
      subtitle: `Total: ${projects.length} projeto(s)`,
      companyName: 'ConstrutorPro',
      sheetName: 'Projetos',
      columns,
      data,
      includeTotals: true,
      totalsRow: totals,
    },
  }
}

async function getFinancialData(
  companyId: string,
  dateFrom?: string | null,
  dateTo?: string | null,
  projectId?: string | null
): Promise<{ options: ExcelExportOptions }> {
  const where: Record<string, unknown> = { companyId }
  
  if (projectId) {
    where.projectId = projectId
  }
  
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {}
    if (dateFrom) dateFilter.gte = new Date(dateFrom)
    if (dateTo) dateFilter.lte = new Date(dateTo)
    where.date = dateFilter
  }

  const transactions = await db.transactions.findMany({
    where,
    include: {
      projects: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
    take: 1000,
  })

  const columns: ColumnConfig[] = [
    { field: 'date', label: 'Data', visible: true, format: 'date' },
    { field: 'type', label: 'Tipo', visible: true, format: 'text' },
    { field: 'category', label: 'Categoria', visible: true, format: 'text' },
    { field: 'description', label: 'Descrição', visible: true, format: 'text' },
    { field: 'value', label: 'Valor', visible: true, format: 'currency' },
    { field: 'dueDate', label: 'Data Vencimento', visible: true, format: 'date' },
    { field: 'status', label: 'Status', visible: true, format: 'text' },
    { field: 'projectName', label: 'Projeto', visible: true, format: 'text' },
  ]

  const data = transactions.map(t => ({
    date: t.date,
    type: t.type === 'income' ? 'Receita' : 'Despesa',
    category: getCategoryLabel(t.category),
    description: t.description,
    value: t.type === 'expense' ? -t.value : t.value,
    dueDate: t.dueDate,
    status: getStatusLabel(t.status),
    projectName: t.projects?.name || '',
  }))

  const totals = calculateTotals(data, columns)

  // Calculate summary
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.value), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.value), 0)

  return {
    options: {
      title: 'Relatório Financeiro',
      subtitle: `Receitas: ${formatCurrency(totalIncome)} | Despesas: ${formatCurrency(totalExpense)} | Saldo: ${formatCurrency(totalIncome - totalExpense)}`,
      companyName: 'ConstrutorPro',
      sheetName: 'Financeiro',
      columns,
      data,
      includeTotals: true,
      totalsRow: totals,
    },
  }
}

async function getResourcesData(
  companyId: string
): Promise<{ options: ExcelExportOptions }> {
  const materials = await db.materials.findMany({
    where: { companyId },
    include: {
      suppliers: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
    take: 1000,
  })

  const columns: ColumnConfig[] = [
    { field: 'code', label: 'Código', visible: true, format: 'text' },
    { field: 'name', label: 'Nome', visible: true, format: 'text' },
    { field: 'category', label: 'Categoria', visible: true, format: 'text' },
    { field: 'unit', label: 'Unidade', visible: true, format: 'text' },
    { field: 'unitCost', label: 'Custo Unitário', visible: true, format: 'currency' },
    { field: 'stockQuantity', label: 'Estoque Atual', visible: true, format: 'number' },
    { field: 'minStock', label: 'Estoque Mínimo', visible: true, format: 'number' },
    { field: 'stockStatus', label: 'Status Estoque', visible: true, format: 'text' },
    { field: 'supplierName', label: 'Fornecedor', visible: true, format: 'text' },
  ]

  const data = materials.map(m => {
    const isLowStock = m.stockQuantity !== null && m.minStock !== null && m.stockQuantity < m.minStock
    return {
      code: m.code,
      name: m.name,
      category: m.category || '',
      unit: m.unit,
      unitCost: m.unitCost,
      stockQuantity: m.stockQuantity,
      minStock: m.minStock,
      stockStatus: isLowStock ? 'Baixo' : 'Normal',
      supplierName: m.suppliers?.name || '',
    }
  })

  const totals = calculateTotals(data, columns)

  const lowStockCount = data.filter(d => d.stockStatus === 'Baixo').length

  return {
    options: {
      title: 'Relatório de Recursos',
      subtitle: `Total: ${materials.length} material(is) | Estoque Baixo: ${lowStockCount}`,
      companyName: 'ConstrutorPro',
      sheetName: 'Recursos',
      columns,
      data,
      includeTotals: true,
      totalsRow: totals,
    },
  }
}

async function getActivitiesData(
  companyId: string,
  dateFrom?: string | null,
  dateTo?: string | null,
  projectId?: string | null
): Promise<{ options: ExcelExportOptions }> {
  const where: Record<string, unknown> = { companyId }
  
  if (projectId) {
    where.projectId = projectId
  }
  
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {}
    if (dateFrom) dateFilter.gte = new Date(dateFrom)
    if (dateTo) dateFilter.lte = new Date(dateTo)
    where.date = dateFilter
  }

  const dailyLogs = await db.daily_logs.findMany({
    where,
    include: {
      projects: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
    take: 1000,
  })

  const columns: ColumnConfig[] = [
    { field: 'date', label: 'Data', visible: true, format: 'date' },
    { field: 'projectName', label: 'Projeto', visible: true, format: 'text' },
    { field: 'weather', label: 'Tempo', visible: true, format: 'text' },
    { field: 'workersCount', label: 'Trabalhadores', visible: true, format: 'number' },
    { field: 'summary', label: 'Resumo', visible: true, format: 'text' },
    { field: 'observations', label: 'Observações', visible: true, format: 'text' },
  ]

  const data = dailyLogs.map(log => ({
    date: log.date,
    projectName: log.projects.name,
    weather: getWeatherLabel(log.weather),
    workersCount: log.workersCount || 0,
    summary: log.summary,
    observations: log.observations || '',
  }))

  const totals = calculateTotals(data, columns)
  const totalWorkers = data.reduce((sum, d) => sum + d.workersCount, 0)

  return {
    options: {
      title: 'Relatório de Atividades',
      subtitle: `Total: ${dailyLogs.length} registro(s) | Trabalhadores: ${totalWorkers}`,
      companyName: 'ConstrutorPro',
      sheetName: 'Atividades',
      columns,
      data,
      includeTotals: true,
      totalsRow: totals,
    },
  }
}

// =============================================================================
// Helper functions
// =============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Em Andamento',
    planning: 'Planejamento',
    completed: 'Concluído',
    paused: 'Pausado',
    cancelled: 'Cancelado',
    pending: 'Pendente',
    partial: 'Parcial',
    paid: 'Pago',
    overdue: 'Vencido',
  }
  return labels[status] || status
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    material: 'Material',
    labor: 'Mão de Obra',
    equipment: 'Equipamento',
    service: 'Serviço',
    tax: 'Imposto',
    administrative: 'Administrativo',
    other: 'Outros',
  }
  return labels[category] || category
}

function getWeatherLabel(weather: string): string {
  const labels: Record<string, string> = {
    sunny: 'Ensolarado',
    cloudy: 'Nublado',
    rainy: 'Chuvoso',
    stormy: 'Tempestade',
  }
  return labels[weather] || weather
}
