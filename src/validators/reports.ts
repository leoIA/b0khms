import { z } from 'zod'

// =============================================================================
// Schemas para Relatórios Customizados
// =============================================================================

export const reportCategorySchema = z.enum([
  'general',
  'financial',
  'project',
  'operational',
  'custom',
])

export const reportTypeSchema = z.enum([
  'table',
  'chart',
  'pivot',
  'dashboard',
])

export const dataSourceSchema = z.enum([
  'projects',
  'budgets',
  'budget_items',
  'transactions',
  'daily_logs',
  'medicoes',
  'purchase_orders',
  'quotations',
  'clients',
  'suppliers',
  'materials',
  'compositions',
  'schedules',
  'actual_costs',
])

export const chartTypeSchema = z.enum([
  'bar',
  'line',
  'pie',
  'donut',
  'area',
  'scatter',
  'radar',
  'gauge',
])

export const aggregationSchema = z.enum([
  'sum',
  'avg',
  'count',
  'min',
  'max',
  'count_distinct',
])

export const filterOperatorSchema = z.enum([
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'contains',
  'starts_with',
  'ends_with',
  'in',
  'not_in',
  'between',
  'is_null',
  'is_not_null',
])

export const filterConfigSchema = z.object({
  field: z.string(),
  operator: filterOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]),
})

export const sortConfigSchema = z.object({
  field: z.string(),
  direction: z.enum(['asc', 'desc']),
})

export const columnConfigSchema = z.object({
  field: z.string(),
  label: z.string().optional(),
  visible: z.boolean().default(true),
  format: z.enum(['text', 'number', 'currency', 'date', 'datetime', 'percent', 'boolean']).optional(),
  width: z.number().optional(),
  alignment: z.enum(['left', 'center', 'right']).optional(),
  aggregation: aggregationSchema.optional(),
})

export const chartConfigSchema = z.object({
  type: chartTypeSchema,
  xAxis: z.string().optional(),
  yAxis: z.array(z.string()).optional(),
  series: z.array(z.object({
    field: z.string(),
    label: z.string().optional(),
    color: z.string().optional(),
    type: chartTypeSchema.optional(),
  })).optional(),
  colors: z.array(z.string()).optional(),
  showLegend: z.boolean().default(true),
  showGrid: z.boolean().default(true),
  stacked: z.boolean().default(false),
  showValues: z.boolean().default(false),
  title: z.string().optional(),
})

export const queryConfigSchema = z.object({
  filters: z.array(filterConfigSchema).optional(),
  sort: z.array(sortConfigSchema).optional(),
  groupBy: z.array(z.string()).optional(),
  aggregations: z.array(z.object({
    field: z.string(),
    type: aggregationSchema,
    alias: z.string().optional(),
  })).optional(),
  limit: z.number().min(1).max(10000).optional(),
  offset: z.number().min(0).optional(),
  dateRange: z.object({
    field: z.string(),
    start: z.string().or(z.date()),
    end: z.string().or(z.date()),
  }).optional(),
  join: z.array(z.object({
    table: z.string(),
    type: z.enum(['inner', 'left', 'right']),
    on: z.string(),
  })).optional(),
})

// Schema para criar relatório customizado
export const createCustomReportSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(100),
  description: z.string().max(500).optional(),
  category: reportCategorySchema.default('general'),
  type: reportTypeSchema.default('table'),
  dataSource: dataSourceSchema,
  queryConfig: queryConfigSchema,
  columnConfig: z.array(columnConfigSchema).optional(),
  chartConfig: chartConfigSchema.optional(),
  defaultFilters: z.array(filterConfigSchema).optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  cacheEnabled: z.boolean().default(true),
  cacheDuration: z.number().min(60).max(86400).default(300),
})

// Schema para atualizar relatório customizado
export const updateCustomReportSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().max(500).optional(),
  category: reportCategorySchema.optional(),
  type: reportTypeSchema.optional(),
  dataSource: dataSourceSchema.optional(),
  queryConfig: queryConfigSchema.optional(),
  columnConfig: z.array(columnConfigSchema).optional(),
  chartConfig: chartConfigSchema.optional(),
  defaultFilters: z.array(filterConfigSchema).optional(),
  isPublic: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  cacheEnabled: z.boolean().optional(),
  cacheDuration: z.number().min(60).max(86400).optional(),
})

// =============================================================================
// Schemas para Agendamentos de Relatórios
// =============================================================================

export const scheduleFrequencySchema = z.enum([
  'daily',
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom',
])

export const reportFormatSchema = z.enum([
  'pdf',
  'excel',
  'csv',
  'html',
])

export const createReportScheduleSchema = z.object({
  reportId: z.string(),
  name: z.string().min(3).max(100),
  frequency: scheduleFrequencySchema,
  cronExpression: z.string().optional(),
  scheduledTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato de hora inválido (HH:mm)'),
  timezone: z.string().default('America/Sao_Paulo'),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  recipients: z.array(z.string().email()),
  format: reportFormatSchema.default('pdf'),
  includeChart: z.boolean().default(true),
  includeSummary: z.boolean().default(true),
  filters: z.array(filterConfigSchema).optional(),
  isActive: z.boolean().default(true),
})

export const updateReportScheduleSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  frequency: scheduleFrequencySchema.optional(),
  cronExpression: z.string().optional(),
  scheduledTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  timezone: z.string().optional(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  recipients: z.array(z.string().email()).optional(),
  format: reportFormatSchema.optional(),
  includeChart: z.boolean().optional(),
  includeSummary: z.boolean().optional(),
  filters: z.array(filterConfigSchema).optional(),
  isActive: z.boolean().optional(),
})

// =============================================================================
// Schemas para Execução de Relatórios
// =============================================================================

export const executeReportSchema = z.object({
  reportId: z.string(),
  filters: z.array(filterConfigSchema).optional(),
  format: reportFormatSchema.optional(),
  emailTo: z.array(z.string().email()).optional(),
})

export const executionTypeSchema = z.enum([
  'manual',
  'scheduled',
  'api',
])

// =============================================================================
// Schemas para Dashboard Widgets
// =============================================================================

export const widgetTypeSchema = z.enum([
  'kpi',
  'chart',
  'table',
  'gauge',
  'progress',
  'radar',
  'scatter',
  'custom',
])

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
})

export const displayConfigSchema = z.object({
  colors: z.array(z.string()).optional(),
  thresholds: z.array(z.object({
    value: z.number(),
    color: z.string(),
    label: z.string().optional(),
  })).optional(),
  format: z.enum(['text', 'number', 'currency', 'date', 'datetime', 'percent']).optional(),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  decimals: z.number().optional(),
  showTrend: z.boolean().optional(),
  comparisonPeriod: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
})

export const createDashboardWidgetSchema = z.object({
  name: z.string().min(3).max(100),
  type: widgetTypeSchema,
  dataSource: dataSourceSchema,
  queryConfig: queryConfigSchema,
  displayConfig: displayConfigSchema.optional(),
  position: positionSchema,
  order: z.number().default(0),
  refreshInterval: z.number().min(5).max(3600).optional(),
})

export const updateDashboardWidgetSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  type: widgetTypeSchema.optional(),
  dataSource: dataSourceSchema.optional(),
  queryConfig: queryConfigSchema.optional(),
  displayConfig: displayConfigSchema.optional(),
  position: positionSchema.optional(),
  order: z.number().optional(),
  refreshInterval: z.number().min(5).max(3600).optional(),
})

// =============================================================================
// Tipos exportados
// =============================================================================

export type ReportCategory = z.infer<typeof reportCategorySchema>
export type ReportType = z.infer<typeof reportTypeSchema>
export type DataSource = z.infer<typeof dataSourceSchema>
export type ChartType = z.infer<typeof chartTypeSchema>
export type Aggregation = z.infer<typeof aggregationSchema>
export type FilterOperator = z.infer<typeof filterOperatorSchema>
export type FilterConfig = z.infer<typeof filterConfigSchema>
export type SortConfig = z.infer<typeof sortConfigSchema>
export type ColumnConfig = z.infer<typeof columnConfigSchema>
export type ChartConfig = z.infer<typeof chartConfigSchema>
export type QueryConfig = z.infer<typeof queryConfigSchema>
export type CreateCustomReportInput = z.infer<typeof createCustomReportSchema>
export type UpdateCustomReportInput = z.infer<typeof updateCustomReportSchema>
export type ScheduleFrequency = z.infer<typeof scheduleFrequencySchema>
export type ReportFormat = z.infer<typeof reportFormatSchema>
export type CreateReportScheduleInput = z.infer<typeof createReportScheduleSchema>
export type UpdateReportScheduleInput = z.infer<typeof updateReportScheduleSchema>
export type ExecuteReportInput = z.infer<typeof executeReportSchema>
export type ExecutionType = z.infer<typeof executionTypeSchema>
export type WidgetType = z.infer<typeof widgetTypeSchema>
export type Position = z.infer<typeof positionSchema>
export type DisplayConfig = z.infer<typeof displayConfigSchema>
export type CreateDashboardWidgetInput = z.infer<typeof createDashboardWidgetSchema>
export type UpdateDashboardWidgetInput = z.infer<typeof updateDashboardWidgetSchema>
