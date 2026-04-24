import { db } from '@/lib/db'
import type {
  DataSource,
  QueryConfig,
  FilterConfig,
  CreateCustomReportInput,
  UpdateCustomReportInput,
  CreateReportScheduleInput,
  UpdateReportScheduleInput,
  ReportFormat,
  ExecutionType,
} from '@/validators/reports'

// =============================================================================
// Tipos e Interfaces
// =============================================================================

interface ReportExecutionContext {
  companyId: string
  userId?: string
  executionType: ExecutionType
  filters?: FilterConfig[]
}

interface QueryResult {
  data: Record<string, unknown>[]
  total: number
  aggregations?: Record<string, number>
}

// =============================================================================
// Mapeamento de Data Sources para Modelos Prisma
// =============================================================================

const dataSourceToModel: Record<DataSource, string> = {
  projects: 'project',
  budgets: 'budget',
  budget_items: 'budgetItem',
  transactions: 'transaction',
  daily_logs: 'dailyLog',
  medicoes: 'medicao',
  purchase_orders: 'purchaseOrder',
  quotations: 'quotation',
  clients: 'client',
  suppliers: 'supplier',
  materials: 'material',
  compositions: 'composition',
  schedules: 'schedule',
  actual_costs: 'actualCost',
}

// =============================================================================
// Serviço de Relatórios Customizados
// =============================================================================

export const customReportsService = {
  // Criar novo relatório customizado
  async create(data: CreateCustomReportInput & { companyId: string; createdBy: string }) {
    const report = await db.custom_reports.create({
      data: {
        companyId: data.companyId,
        createdBy: data.createdBy,
        name: data.name,
        description: data.description,
        category: data.category,
        type: data.type,
        dataSource: data.dataSource,
        queryConfig: JSON.stringify(data.queryConfig),
        columnConfig: data.columnConfig ? JSON.stringify(data.columnConfig) : null,
        chartConfig: data.chartConfig ? JSON.stringify(data.chartConfig) : null,
        defaultFilters: data.defaultFilters ? JSON.stringify(data.defaultFilters) : null,
        isPublic: data.isPublic,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        cacheEnabled: data.cacheEnabled,
        cacheDuration: data.cacheDuration,
      },
      include: {
        users: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return {
      ...report,
      queryConfig: JSON.parse(report.queryConfig),
      columnConfig: report.columnConfig ? JSON.parse(report.columnConfig) : null,
      chartConfig: report.chartConfig ? JSON.parse(report.chartConfig) : null,
      defaultFilters: report.defaultFilters ? JSON.parse(report.defaultFilters) : null,
      tags: report.tags ? JSON.parse(report.tags) : null,
    }
  },

  // Listar relatórios da empresa
  async list(companyId: string, options?: {
    category?: string
    type?: string
    dataSource?: string
    search?: string
    page?: number
    limit?: number
  }) {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { companyId }

    if (options?.category) {
      where.category = options.category
    }
    if (options?.type) {
      where.type = options.type
    }
    if (options?.dataSource) {
      where.dataSource = options.dataSource
    }
    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ]
    }

    const [reports, total] = await Promise.all([
      db.custom_reports.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { report_schedules: true, report_executions: true },
          },
        },
      }),
      db.custom_reports.count({ where }),
    ])

    return {
      data: reports.map(r => ({
        ...r,
        queryConfig: JSON.parse(r.queryConfig),
        columnConfig: r.columnConfig ? JSON.parse(r.columnConfig) : null,
        chartConfig: r.chartConfig ? JSON.parse(r.chartConfig) : null,
        defaultFilters: r.defaultFilters ? JSON.parse(r.defaultFilters) : null,
        tags: r.tags ? JSON.parse(r.tags) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  },

  // Obter relatório por ID
  async getById(reportId: string, companyId: string) {
    const report = await db.custom_reports.findFirst({
      where: { id: reportId, companyId },
      include: {
        users: {
          select: { id: true, name: true, email: true },
        },
        report_schedules: {
          where: { isActive: true },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        report_executions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            users: {
              select: { id: true, name: true },
            },
          },
        },
      },
    })

    if (!report) {
      return null
    }

    return {
      ...report,
      queryConfig: JSON.parse(report.queryConfig),
      columnConfig: report.columnConfig ? JSON.parse(report.columnConfig) : null,
      chartConfig: report.chartConfig ? JSON.parse(report.chartConfig) : null,
      defaultFilters: report.defaultFilters ? JSON.parse(report.defaultFilters) : null,
      tags: report.tags ? JSON.parse(report.tags) : null,
      report_schedules: report.report_schedules.map(s => ({
        ...s,
        recipients: JSON.parse(s.recipients),
        daysOfWeek: s.daysOfWeek ? JSON.parse(s.daysOfWeek) : null,
        filters: s.filters ? JSON.parse(s.filters) : null,
      })),
      report_executions: report.report_executions.map(e => ({
        ...e,
        filters: e.filters ? JSON.parse(e.filters) : null,
      })),
    }
  },

  // Atualizar relatório
  async update(reportId: string, companyId: string, data: UpdateCustomReportInput) {
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.category !== undefined) updateData.category = data.category
    if (data.type !== undefined) updateData.type = data.type
    if (data.dataSource !== undefined) updateData.dataSource = data.dataSource
    if (data.queryConfig !== undefined) updateData.queryConfig = JSON.stringify(data.queryConfig)
    if (data.columnConfig !== undefined) updateData.columnConfig = data.columnConfig ? JSON.stringify(data.columnConfig) : null
    if (data.chartConfig !== undefined) updateData.chartConfig = data.chartConfig ? JSON.stringify(data.chartConfig) : null
    if (data.defaultFilters !== undefined) updateData.defaultFilters = data.defaultFilters ? JSON.stringify(data.defaultFilters) : null
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic
    if (data.isDefault !== undefined) updateData.isDefault = data.isDefault
    if (data.tags !== undefined) updateData.tags = data.tags ? JSON.stringify(data.tags) : null
    if (data.cacheEnabled !== undefined) updateData.cacheEnabled = data.cacheEnabled
    if (data.cacheDuration !== undefined) updateData.cacheDuration = data.cacheDuration

    const report = await db.custom_reports.update({
      where: { id: reportId },
      data: updateData,
    })

    return {
      ...report,
      queryConfig: JSON.parse(report.queryConfig),
      columnConfig: report.columnConfig ? JSON.parse(report.columnConfig) : null,
      chartConfig: report.chartConfig ? JSON.parse(report.chartConfig) : null,
      defaultFilters: report.defaultFilters ? JSON.parse(report.defaultFilters) : null,
      tags: report.tags ? JSON.parse(report.tags) : null,
    }
  },

  // Excluir relatório
  async delete(reportId: string, companyId: string) {
    return db.custom_reports.delete({
      where: { id: reportId, companyId },
    })
  },

  // Duplicar relatório
  async duplicate(reportId: string, companyId: string, userId: string) {
    const original = await db.custom_reports.findFirst({
      where: { id: reportId, companyId },
    })

    if (!original) {
      throw new Error('Relatório não encontrado')
    }

    const newReport = await db.custom_reports.create({
      data: {
        companyId: original.companyId,
        createdBy: userId,
        name: `${original.name} (cópia)`,
        description: original.description,
        category: original.category,
        type: original.type,
        dataSource: original.dataSource,
        queryConfig: original.queryConfig,
        columnConfig: original.columnConfig,
        chartConfig: original.chartConfig,
        defaultFilters: original.defaultFilters,
        isPublic: false,
        tags: original.tags,
        cacheEnabled: original.cacheEnabled,
        cacheDuration: original.cacheDuration,
      },
    })

    return {
      ...newReport,
      queryConfig: JSON.parse(newReport.queryConfig),
      columnConfig: newReport.columnConfig ? JSON.parse(newReport.columnConfig) : null,
      chartConfig: newReport.chartConfig ? JSON.parse(newReport.chartConfig) : null,
      defaultFilters: newReport.defaultFilters ? JSON.parse(newReport.defaultFilters) : null,
      tags: newReport.tags ? JSON.parse(newReport.tags) : null,
    }
  },
}

// =============================================================================
// Serviço de Execução de Relatórios
// =============================================================================

export const reportExecutionService = {
  // Executar relatório e retornar dados
  async execute(
    reportId: string,
    context: ReportExecutionContext,
    filters?: FilterConfig[]
  ): Promise<QueryResult> {
    const report = await db.custom_reports.findFirst({
      where: { id: reportId, companyId: context.companyId },
    })

    if (!report) {
      throw new Error('Relatório não encontrado')
    }

    const queryConfig: QueryConfig = JSON.parse(report.queryConfig)
    const mergedFilters = [...(queryConfig.filters || []), ...(filters || [])]

    // Executar a consulta baseada no data source
    const result = await this.executeQuery(
      report.dataSource as DataSource,
      { ...queryConfig, filters: mergedFilters },
      context.companyId
    )

    // Registrar execução
    await db.report_executions.create({
      data: {
        reportId,
        companyId: context.companyId,
        executedBy: context.userId,
        executionType: context.executionType,
        filters: filters ? JSON.stringify(filters) : null,
        status: 'completed',
        recordCount: result.data.length,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    })

    return result
  },

  // Executar consulta no banco de dados
  async executeQuery(
    dataSource: DataSource,
    queryConfig: QueryConfig,
    companyId: string
  ): Promise<QueryResult> {
    const { filters, sort, groupBy, aggregations, limit, offset, dateRange } = queryConfig

    // Construir cláusula where
    const where: Record<string, unknown> = { companyId }

    // Aplicar filtros
    if (filters && filters.length > 0) {
      for (const filter of filters) {
        this.applyFilter(where, filter)
      }
    }

    // Aplicar range de datas
    if (dateRange) {
      where[dateRange.field] = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      }
    }

    // Query baseada no data source
    const model = db[dataSourceToModel[dataSource] as keyof typeof db] as {
      findMany: (args: unknown) => Promise<Record<string, unknown>[]>
      count: (args: unknown) => Promise<number>
    }

    // Construir orderBy
    const orderBy = sort?.map(s => ({ [s.field]: s.direction })) || []

    // Executar consulta
    const [data, total] = await Promise.all([
      model.findMany({
        where,
        orderBy,
        take: limit ?? 1000,
        skip: offset,
      }),
      model.count({ where }),
    ])

    // Calcular agregações se especificadas
    let aggregationsResult: Record<string, number> | undefined
    if (aggregations && aggregations.length > 0) {
      aggregationsResult = {}
      for (const agg of aggregations) {
        const value = this.calculateAggregation(data, agg.field, agg.type)
        aggregationsResult[agg.alias || `${agg.type}_${agg.field}`] = value
      }
    }

    // Aplicar groupBy se especificado
    let groupedData = data
    if (groupBy && groupBy.length > 0) {
      groupedData = this.applyGroupBy(data, groupBy, aggregations)
    }

    return {
      data: groupedData,
      total,
      aggregations: aggregationsResult,
    }
  },

  // Aplicar filtro individual
  applyFilter(where: Record<string, unknown>, filter: FilterConfig): void {
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
  },

  // Calcular agregação
  calculateAggregation(
    data: Record<string, unknown>[],
    field: string,
    type: string
  ): number {
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
  },

  // Aplicar groupBy
  applyGroupBy(
    data: Record<string, unknown>[],
    groupBy: string[],
    aggregations?: { field: string; type: string; alias?: string }[]
  ): Record<string, unknown>[] {
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
          groupResult[agg.alias || `${agg.type}_${agg.field}`] = this.calculateAggregation(
            items,
            agg.field,
            agg.type
          )
        }
      }

      result.push(groupResult)
    }

    return result
  },

  // Listar execuções
  async listExecutions(companyId: string, options?: {
    reportId?: string
    status?: string
    page?: number
    limit?: number
  }) {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { companyId }
    if (options?.reportId) where.reportId = options.reportId
    if (options?.status) where.status = options.status

    const [executions, total] = await Promise.all([
      db.report_executions.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          custom_reports: {
            select: { id: true, name: true, type: true },
          },
          users: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      db.report_executions.count({ where }),
    ])

    return {
      data: executions.map(e => ({
        ...e,
        filters: e.filters ? JSON.parse(e.filters) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  },
}

// =============================================================================
// Serviço de Agendamentos de Relatórios
// =============================================================================

export const reportScheduleService = {
  // Criar agendamento
  async create(data: CreateReportScheduleInput & { companyId: string; createdBy: string }) {
    // Calcular próxima execução
    const nextRunAt = this.calculateNextRun(
      data.frequency,
      data.scheduledTime,
      data.timezone,
      data.daysOfWeek,
      data.dayOfMonth
    )

    const schedule = await db.report_schedules.create({
      data: {
        reportId: data.reportId,
        companyId: data.companyId,
        createdBy: data.createdBy,
        name: data.name,
        frequency: data.frequency,
        cronExpression: data.cronExpression,
        scheduledTime: data.scheduledTime,
        timezone: data.timezone,
        nextRunAt,
        daysOfWeek: data.daysOfWeek ? JSON.stringify(data.daysOfWeek) : null,
        dayOfMonth: data.dayOfMonth,
        recipients: JSON.stringify(data.recipients),
        format: data.format,
        includeChart: data.includeChart,
        includeSummary: data.includeSummary,
        filters: data.filters ? JSON.stringify(data.filters) : null,
        isActive: data.isActive,
      },
      include: {
        custom_reports: {
          select: { id: true, name: true, type: true },
        },
      },
    })

    return {
      ...schedule,
      recipients: JSON.parse(schedule.recipients),
      daysOfWeek: schedule.daysOfWeek ? JSON.parse(schedule.daysOfWeek) : null,
      filters: schedule.filters ? JSON.parse(schedule.filters) : null,
    }
  },

  // Calcular próxima execução baseado na frequência
  calculateNextRun(
    frequency: string,
    scheduledTime: string,
    timezone: string,
    daysOfWeek?: number[],
    dayOfMonth?: number
  ): Date {
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
  },

  // Listar agendamentos
  async list(companyId: string, options?: {
    reportId?: string
    isActive?: boolean
    page?: number
    limit?: number
  }) {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 20
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = { companyId }
    if (options?.reportId) where.reportId = options.reportId
    if (options?.isActive !== undefined) where.isActive = options.isActive

    const [schedules, total] = await Promise.all([
      db.report_schedules.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          custom_reports: {
            select: { id: true, name: true, type: true, category: true },
          },
          users: {
            select: { id: true, name: true },
          },
        },
      }),
      db.report_schedules.count({ where }),
    ])

    return {
      data: schedules.map(s => ({
        ...s,
        recipients: JSON.parse(s.recipients),
        daysOfWeek: s.daysOfWeek ? JSON.parse(s.daysOfWeek) : null,
        filters: s.filters ? JSON.parse(s.filters) : null,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  },

  // Atualizar agendamento
  async update(scheduleId: string, companyId: string, data: UpdateReportScheduleInput) {
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.frequency !== undefined) updateData.frequency = data.frequency
    if (data.cronExpression !== undefined) updateData.cronExpression = data.cronExpression
    if (data.scheduledTime !== undefined) updateData.scheduledTime = data.scheduledTime
    if (data.timezone !== undefined) updateData.timezone = data.timezone
    if (data.daysOfWeek !== undefined) updateData.daysOfWeek = data.daysOfWeek ? JSON.stringify(data.daysOfWeek) : null
    if (data.dayOfMonth !== undefined) updateData.dayOfMonth = data.dayOfMonth
    if (data.recipients !== undefined) updateData.recipients = JSON.stringify(data.recipients)
    if (data.format !== undefined) updateData.format = data.format
    if (data.includeChart !== undefined) updateData.includeChart = data.includeChart
    if (data.includeSummary !== undefined) updateData.includeSummary = data.includeSummary
    if (data.filters !== undefined) updateData.filters = data.filters ? JSON.stringify(data.filters) : null
    if (data.isActive !== undefined) updateData.isActive = data.isActive

    // Recalcular próxima execução se frequência ou hora mudaram
    if (data.frequency || data.scheduledTime || data.timezone || data.daysOfWeek || data.dayOfMonth) {
      const current = await db.report_schedules.findFirst({
        where: { id: scheduleId, companyId },
      })
      if (current) {
        updateData.nextRunAt = this.calculateNextRun(
          (data.frequency as string) ?? current.frequency,
          (data.scheduledTime as string) ?? current.scheduledTime,
          (data.timezone as string) ?? current.timezone,
          data.daysOfWeek ?? (current.daysOfWeek ? JSON.parse(current.daysOfWeek) : undefined),
          data.dayOfMonth ?? current.dayOfMonth ?? undefined
        )
      }
    }

    const schedule = await db.report_schedules.update({
      where: { id: scheduleId },
      data: updateData,
    })

    return {
      ...schedule,
      recipients: JSON.parse(schedule.recipients),
      daysOfWeek: schedule.daysOfWeek ? JSON.parse(schedule.daysOfWeek) : null,
      filters: schedule.filters ? JSON.parse(schedule.filters) : null,
    }
  },

  // Excluir agendamento
  async delete(scheduleId: string, companyId: string) {
    return db.report_schedules.delete({
      where: { id: scheduleId, companyId },
    })
  },

  // Buscar agendamentos pendentes de execução
  async getPendingSchedules() {
    const now = new Date()
    return db.report_schedules.findMany({
      where: {
        isActive: true,
        nextRunAt: { lte: now },
      },
      include: {
        custom_reports: true,
      },
    })
  },
}

// =============================================================================
// Serviço de Dashboard Widgets
// =============================================================================

export const dashboardWidgetService = {
  // Criar widget
  async create(data: {
    companyId: string
    userId?: string
    name: string
    type: string
    dataSource: string
    queryConfig: QueryConfig
    displayConfig?: Record<string, unknown>
    position: { x: number; y: number; w: number; h: number }
    order?: number
    refreshInterval?: number
  }) {
    const widget = await db.dashboard_widgets.create({
      data: {
        companyId: data.companyId,
        userId: data.userId,
        name: data.name,
        type: data.type,
        dataSource: data.dataSource,
        queryConfig: JSON.stringify(data.queryConfig),
        displayConfig: data.displayConfig ? JSON.stringify(data.displayConfig) : null,
        position: JSON.stringify(data.position),
        order: data.order ?? 0,
        refreshInterval: data.refreshInterval,
      },
    })

    return {
      ...widget,
      queryConfig: JSON.parse(widget.queryConfig),
      displayConfig: widget.displayConfig ? JSON.parse(widget.displayConfig) : null,
      position: JSON.parse(widget.position),
    }
  },

  // Listar widgets
  async list(companyId: string, userId?: string) {
    const where: Record<string, unknown> = { companyId }
    if (userId) {
      where.OR = [{ userId }, { userId: null }]
    }

    const widgets = await db.dashboard_widgets.findMany({
      where,
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })

    return widgets.map(w => ({
      ...w,
      queryConfig: JSON.parse(w.queryConfig),
      displayConfig: w.displayConfig ? JSON.parse(w.displayConfig) : null,
      position: JSON.parse(w.position),
    }))
  },

  // Atualizar widget
  async update(widgetId: string, companyId: string, data: {
    name?: string
    type?: string
    dataSource?: string
    queryConfig?: QueryConfig
    displayConfig?: Record<string, unknown>
    position?: { x: number; y: number; w: number; h: number }
    order?: number
    refreshInterval?: number
  }) {
    const updateData: Record<string, unknown> = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.type !== undefined) updateData.type = data.type
    if (data.dataSource !== undefined) updateData.dataSource = data.dataSource
    if (data.queryConfig !== undefined) updateData.queryConfig = JSON.stringify(data.queryConfig)
    if (data.displayConfig !== undefined) updateData.displayConfig = data.displayConfig ? JSON.stringify(data.displayConfig) : null
    if (data.position !== undefined) updateData.position = JSON.stringify(data.position)
    if (data.order !== undefined) updateData.order = data.order
    if (data.refreshInterval !== undefined) updateData.refreshInterval = data.refreshInterval

    const widget = await db.dashboard_widgets.update({
      where: { id: widgetId, companyId },
      data: updateData,
    })

    return {
      ...widget,
      queryConfig: JSON.parse(widget.queryConfig),
      displayConfig: widget.displayConfig ? JSON.parse(widget.displayConfig) : null,
      position: JSON.parse(widget.position),
    }
  },

  // Excluir widget
  async delete(widgetId: string, companyId: string) {
    return db.dashboard_widgets.delete({
      where: { id: widgetId, companyId },
    })
  },

  // Atualizar dados do widget
  async refresh(widgetId: string, companyId: string) {
    const widget = await db.dashboard_widgets.findFirst({
      where: { id: widgetId, companyId },
    })

    if (!widget) {
      throw new Error('Widget não encontrado')
    }

    const queryConfig: QueryConfig = JSON.parse(widget.queryConfig)
    const result = await reportExecutionService.executeQuery(
      widget.dataSource as DataSource,
      queryConfig,
      companyId
    )

    // Atualizar timestamp de refresh
    await db.dashboard_widgets.update({
      where: { id: widgetId },
      data: { lastRefreshedAt: new Date() },
    })

    return result
  },
}

// =============================================================================
// Exportação de Relatórios
// =============================================================================

export const reportExportService = {
  // Exportar para CSV
  toCSV(data: Record<string, unknown>[], columns?: string[]): string {
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
  },

  // Exportar para HTML
  toHTML(data: Record<string, unknown>[], title: string, columns?: { field: string; label?: string }[]): string {
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
  },
}
