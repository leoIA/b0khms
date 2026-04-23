// =============================================================================
// ConstrutorPro - MS Project XML Parser
// Importação de cronogramas do Microsoft Project (.xml)
// =============================================================================

import { parseString } from 'xml2js';

// =============================================================================
// Tipos e Interfaces
// =============================================================================

export interface MSProjectTask {
  id: string;
  name: string;
  wbs: string;
  outlineLevel: number;
  start: Date;
  finish: Date;
  duration: number; // em dias
  work: number; // em horas
  percentComplete: number;
  priority: number;
  active: boolean;
  milestone: boolean;
  summary: boolean;
  critical: boolean;
  notes: string | null;
  predecessorLinks: MSPredecessorLink[];
  resourceAssignments: MSResourceAssignment[];
  // Campos calculados
  earlyStart?: Date;
  earlyFinish?: Date;
  lateStart?: Date;
  lateFinish?: Date;
  totalSlack?: number;
  freeSlack?: number;
}

export interface MSPredecessorLink {
  predecessorId: string;
  type: MSPredecessorType;
  lag: number; // em dias
}

export type MSPredecessorType = 'FS' | 'FF' | 'SS' | 'SF';

export interface MSResourceAssignment {
  resourceId: string;
  resourceName: string;
  units: number; // percentual de alocação
  work: number; // em horas
}

export interface MSProjectResource {
  id: string;
  name: string;
  type: 'Work' | 'Material' | 'Cost';
  maxUnits: number;
  standardRate: number;
  overtimeRate: number;
  costPerUse: number;
  email: string | null;
}

export interface MSProjectCalendar {
  id: string;
  name: string;
  isBaseCalendar: boolean;
  workingDays: number[]; // 1=Dom, 2=Seg, ..., 7=Sáb
  exceptions: MSCalendarException[];
}

export interface MSCalendarException {
  name: string;
  fromDate: Date;
  toDate: Date;
  isWorking: boolean;
}

export interface MSProjectImportResult {
  success: boolean;
  project: {
    name: string;
    startDate: Date;
    finishDate: Date;
    calendar: string;
    currency: string;
    company: string | null;
    manager: string | null;
  };
  tasks: MSProjectTask[];
  resources: MSProjectResource[];
  calendars: MSProjectCalendar[];
  statistics: {
    totalTasks: number;
    summaryTasks: number;
    milestones: number;
    criticalTasks: number;
    totalDuration: number;
    totalWork: number;
    totalResources: number;
  };
  warnings: string[];
  errors: string[];
}

export interface MSProjectMappingConfig {
  taskNameField: 'name' | 'wbs';
  dateFormat: 'iso' | 'ms-project';
  createMissingResources: boolean;
  importCalendars: boolean;
  importResourceAssignments: boolean;
}

// =============================================================================
// Configurações Padrão
// =============================================================================

export const DEFAULT_MAPPING_CONFIG: MSProjectMappingConfig = {
  taskNameField: 'name',
  dateFormat: 'ms-project',
  createMissingResources: true,
  importCalendars: true,
  importResourceAssignments: true,
};

// Mapeamento de tipos de dependência do MS Project
const DEPENDENCY_TYPE_MAP: Record<number, MSPredecessorType> = {
  0: 'FS', // Finish-to-Start
  1: 'FF', // Finish-to-Finish
  2: 'SS', // Start-to-Start
  3: 'SF', // Start-to-Finish
};

// =============================================================================
// Funções Principais
// =============================================================================

/**
 * Parseia um arquivo XML do MS Project
 */
export async function parseMSProjectXML(
  xmlContent: string,
  config: MSProjectMappingConfig = DEFAULT_MAPPING_CONFIG
): Promise<MSProjectImportResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  try {
    const parsed = await new Promise<Record<string, unknown>>((resolve, reject) => {
      parseString(xmlContent, {
        explicitArray: false,
        mergeAttrs: true,
        trim: true,
      }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    // Verificar se é um projeto válido
    if (!parsed.Project) {
      return {
        success: false,
        project: createEmptyProject(),
        tasks: [],
        resources: [],
        calendars: [],
        statistics: createEmptyStatistics(),
        warnings: [],
        errors: ['Arquivo XML inválido: elemento Project não encontrado'],
      };
    }

    const project = parsed.Project as Record<string, unknown>;

    // Extrair informações do projeto
    const projectInfo = extractProjectInfo(project);

    // Extrair calendários
    const calendars = config.importCalendars
      ? extractCalendars((project.Calendars as Record<string, unknown>)?.Calendar || [])
      : [];

    // Extrair recursos
    const resources = extractResources((project.Resources as Record<string, unknown>)?.Resource || []);

    // Extrair tarefas
    const tasksResult = extractTasks((project.Tasks as Record<string, unknown>)?.Task || [], resources, warnings);

    // Calcular estatísticas
    const statistics = calculateStatistics(tasksResult.tasks, resources);

    return {
      success: true,
      project: projectInfo,
      tasks: tasksResult.tasks,
      resources,
      calendars,
      statistics,
      warnings: [...warnings, ...tasksResult.warnings],
      errors,
    };
  } catch (error) {
    return {
      success: false,
      project: createEmptyProject(),
      tasks: [],
      resources: [],
      calendars: [],
      statistics: createEmptyStatistics(),
      warnings: [],
      errors: [`Erro ao processar XML: ${error instanceof Error ? error.message : 'Erro desconhecido'}`],
    };
  }
}

/**
 * Extrai informações do projeto
 */
function extractProjectInfo(project: Record<string, unknown>): MSProjectImportResult['project'] {
  return {
    name: getStringValue(project, 'Name', 'Projeto Importado'),
    startDate: parseMSDate(getStringValue(project, 'StartDate', new Date().toISOString())),
    finishDate: parseMSDate(getStringValue(project, 'FinishDate', new Date().toISOString())),
    calendar: getStringValue(project, 'CalendarUID', 'Standard'),
    currency: getStringValue(project, 'CurrencySymbol', 'R$'),
    company: getStringValue(project, 'Company', null),
    manager: getStringValue(project, 'Manager', null),
  };
}

/**
 * Extrai calendários do projeto
 */
function extractCalendars(calendars: unknown): MSProjectCalendar[] {
  const result: MSProjectCalendar[] = [];
  const calendarArray = Array.isArray(calendars) ? calendars : [calendars];

  for (const cal of calendarArray) {
    if (!cal || typeof cal !== 'object') continue;

    const workingDays = extractWorkingDays(cal);
    const exceptions = extractCalendarExceptions((cal.Exceptions as Record<string, unknown>)?.Exception || []);

    result.push({
      id: getStringValue(cal, 'UID', '0'),
      name: getStringValue(cal, 'Name', 'Standard'),
      isBaseCalendar: getBoolValue(cal, 'IsBaseCalendar', false),
      workingDays,
      exceptions,
    });
  }

  return result;
}

/**
 * Extrai dias de trabalho do calendário
 */
function extractWorkingDays(calendar: Record<string, unknown>): number[] {
  const weekDays = [1, 2, 3, 4, 5, 6, 7]; // Seg-Sex por padrão
  const weekDayEntries = (calendar.WeekDays as Record<string, unknown>)?.WeekDay;

  if (!weekDayEntries) return weekDays;

  const entries = Array.isArray(weekDayEntries) ? weekDayEntries : [weekDayEntries];
  const workingDays: number[] = [];

  for (const entry of entries) {
    if (getBoolValue(entry, 'DayWorking', false)) {
      const dayType = getNumberValue(entry, 'DayType', 0);
      if (dayType > 0) {
        workingDays.push(dayType);
      }
    }
  }

  return workingDays.length > 0 ? workingDays : weekDays;
}

/**
 * Extrai exceções do calendário
 */
function extractCalendarExceptions(exceptions: unknown): MSCalendarException[] {
  const result: MSCalendarException[] = [];
  const excArray = Array.isArray(exceptions) ? exceptions : [exceptions];

  for (const exc of excArray) {
    if (!exc || typeof exc !== 'object') continue;

    const timePeriod = (exc as Record<string, unknown>).TimePeriod as Record<string, unknown> | undefined;

    result.push({
      name: getStringValue(exc, 'Name', 'Exceção'),
      fromDate: parseMSDate(timePeriod?.FromDate as string || new Date().toISOString()),
      toDate: parseMSDate(timePeriod?.ToDate as string || new Date().toISOString()),
      isWorking: getBoolValue(exc, 'DayWorking', false),
    });
  }

  return result;
}

/**
 * Extrai recursos do projeto
 */
function extractResources(resources: unknown): MSProjectResource[] {
  const result: MSProjectResource[] = [];
  const resourceArray = Array.isArray(resources) ? resources : [resources];

  for (const res of resourceArray) {
    if (!res || typeof res !== 'object') continue;

    const type = getNumberValue(res, 'Type', 0);

    result.push({
      id: getStringValue(res, 'UID', '0'),
      name: getStringValue(res, 'Name', 'Recurso sem nome'),
      type: type === 1 ? 'Material' : type === 2 ? 'Cost' : 'Work',
      maxUnits: getNumberValue(res, 'MaxUnits', 1),
      standardRate: getNumberValue(res, 'StandardRate', 0),
      overtimeRate: getNumberValue(res, 'OvertimeRate', 0),
      costPerUse: getNumberValue(res, 'CostPerUse', 0),
      email: getStringValue(res, 'EmailAddress', null),
    });
  }

  return result;
}

/**
 * Extrai tarefas do projeto
 */
function extractTasks(
  tasks: unknown,
  resources: MSProjectResource[],
  warnings: string[]
): { tasks: MSProjectTask[]; warnings: string[] } {
  const result: MSProjectTask[] = [];
  const taskArray = Array.isArray(tasks) ? tasks : [tasks];
  const newWarnings: string[] = [...warnings];

  // Mapear recursos por ID para referência rápida
  const resourceMap = new Map<string, MSProjectResource>();
  resources.forEach((r) => resourceMap.set(r.id, r));

  for (const task of taskArray) {
    if (!task || typeof task !== 'object') continue;

    // Ignorar tarefas vazias
    if (!getStringValue(task, 'Name', null) && !getStringValue(task, 'UID', null)) {
      continue;
    }

    const taskId = getStringValue(task, 'UID', Math.random().toString());
    const taskName = getStringValue(task, 'Name', `Tarefa ${taskId}`);

    // Extrair precedências
    const predecessorLinks = extractPredecessorLinks((task as Record<string, unknown>).PredecessorLink || []);

    // Extrair atribuições de recursos
    const resourceAssignments = extractResourceAssignments(
      (task as Record<string, unknown>).Assignments
        ? ((task as Record<string, unknown>).Assignments as Record<string, unknown>)?.Assignment || []
        : [],
      resourceMap,
      newWarnings
    );

    const extractedTask: MSProjectTask = {
      id: taskId,
      name: taskName,
      wbs: getStringValue(task, 'WBS', ''),
      outlineLevel: getNumberValue(task, 'OutlineLevel', 1),
      start: parseMSDate(getStringValue(task, 'Start', new Date().toISOString())),
      finish: parseMSDate(getStringValue(task, 'Finish', new Date().toISOString())),
      duration: parseDuration(getStringValue(task, 'Duration', '1D')),
      work: parseDuration(getStringValue(task, 'Work', '0H')) * 8, // converter para horas
      percentComplete: getNumberValue(task, 'PercentComplete', 0),
      priority: getNumberValue(task, 'Priority', 500),
      active: getBoolValue(task, 'Active', true),
      milestone: getBoolValue(task, 'Milestone', false),
      summary: getBoolValue(task, 'Summary', false),
      critical: getBoolValue(task, 'Critical', false),
      notes: getStringValue(task, 'Notes', null),
      predecessorLinks,
      resourceAssignments,
      // Campos CPM do MS Project (se disponíveis)
      earlyStart: parseMSDateOptional(getStringValue(task, 'EarlyStart', null)),
      earlyFinish: parseMSDateOptional(getStringValue(task, 'EarlyFinish', null)),
      lateStart: parseMSDateOptional(getStringValue(task, 'LateStart', null)),
      lateFinish: parseMSDateOptional(getStringValue(task, 'LateFinish', null)),
      totalSlack: parseDuration(getStringValue(task, 'TotalSlack', '0D')),
      freeSlack: parseDuration(getStringValue(task, 'FreeSlack', '0D')),
    };

    result.push(extractedTask);
  }

  return { tasks: result, warnings: newWarnings };
}

/**
 * Extrai links de precedência
 */
function extractPredecessorLinks(links: unknown): MSPredecessorLink[] {
  const result: MSPredecessorLink[] = [];
  const linkArray = Array.isArray(links) ? links : [links];

  for (const link of linkArray) {
    if (!link || typeof link !== 'object') continue;

    const typeNum = getNumberValue(link, 'Type', 0);
    const type = DEPENDENCY_TYPE_MAP[typeNum] || 'FS';

    result.push({
      predecessorId: getStringValue(link, 'PredecessorUID', '0'),
      type,
      lag: parseDuration(getStringValue(link, 'LinkLag', '0')) / 4800, // MS Project usa 4800 unidades por dia
    });
  }

  return result;
}

/**
 * Extrai atribuições de recursos
 */
function extractResourceAssignments(
  assignments: unknown,
  resourceMap: Map<string, MSProjectResource>,
  warnings: string[]
): MSResourceAssignment[] {
  const result: MSResourceAssignment[] = [];
  const assignArray = Array.isArray(assignments) ? assignments : [assignments];

  for (const assign of assignArray) {
    if (!assign || typeof assign !== 'object') continue;

    const resourceId = getStringValue(assign, 'ResourceUID', '0');
    const resource = resourceMap.get(resourceId);

    if (!resource) {
      warnings.push(`Recurso ${resourceId} não encontrado para atribuição`);
    }

    result.push({
      resourceId,
      resourceName: resource?.name || 'Recurso desconhecido',
      units: getNumberValue(assign, 'Units', 1),
      work: parseDuration(getStringValue(assign, 'Work', '0H')) * 8,
    });
  }

  return result;
}

/**
 * Calcula estatísticas do projeto
 */
function calculateStatistics(
  tasks: MSProjectTask[],
  resources: MSProjectResource[]
): MSProjectImportResult['statistics'] {
  return {
    totalTasks: tasks.length,
    summaryTasks: tasks.filter((t) => t.summary).length,
    milestones: tasks.filter((t) => t.milestone).length,
    criticalTasks: tasks.filter((t) => t.critical).length,
    totalDuration: tasks.reduce((max, t) => Math.max(max, t.duration), 0),
    totalWork: tasks.reduce((sum, t) => sum + t.work, 0),
    totalResources: resources.length,
  };
}

// =============================================================================
// Funções Auxiliares
// =============================================================================

/**
 * Obtém valor string de um objeto
 */
function getStringValue(obj: unknown, key: string, defaultValue: string | null): string {
  if (!obj || typeof obj !== 'object') return defaultValue || '';
  const value = (obj as Record<string, unknown>)[key];
  return value !== undefined && value !== null ? String(value) : (defaultValue || '');
}

/**
 * Obtém valor numérico de um objeto
 */
function getNumberValue(obj: unknown, key: string, defaultValue: number): number {
  if (!obj || typeof obj !== 'object') return defaultValue;
  const value = (obj as Record<string, unknown>)[key];
  if (value === undefined || value === null) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Obtém valor booleano de um objeto
 */
function getBoolValue(obj: unknown, key: string, defaultValue: boolean): boolean {
  if (!obj || typeof obj !== 'object') return defaultValue;
  const value = (obj as Record<string, unknown>)[key];
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value === '1';
  return defaultValue;
}

/**
 * Parseia data no formato do MS Project
 * MS Project usa formato: 2024-01-15T08:00:00
 */
function parseMSDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();

  try {
    // Tentar formato ISO primeiro
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    // Formato do MS Project: YYYY-MM-DDTHH:MM:SS
    const msMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (msMatch) {
      return new Date(
        parseInt(msMatch[1]),
        parseInt(msMatch[2]) - 1,
        parseInt(msMatch[3]),
        parseInt(msMatch[4]),
        parseInt(msMatch[5]),
        parseInt(msMatch[6])
      );
    }

    return new Date();
  } catch {
    return new Date();
  }
}

/**
 * Parseia data opcional
 */
function parseMSDateOptional(dateStr: string | null | undefined): Date | undefined {
  if (!dateStr) return undefined;
  const date = parseMSDate(dateStr);
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Parseia duração no formato do MS Project
 * Formatos: PT8H (8 horas), 1D (1 dia), 1W (1 semana)
 */
function parseDuration(durationStr: string): number {
  if (!durationStr) return 0;

  // Formato PT8H, PT40H, etc. (ISO 8601)
  const isoMatch = durationStr.match(/PT(\d+)H/);
  if (isoMatch) {
    return parseInt(isoMatch[1]) / 8; // converter horas para dias
  }

  // Formato 1D, 5D, etc.
  const dayMatch = durationStr.match(/(\d+)D/);
  if (dayMatch) {
    return parseInt(dayMatch[1]);
  }

  // Formato 1W, 2W, etc.
  const weekMatch = durationStr.match(/(\d+)W/);
  if (weekMatch) {
    return parseInt(weekMatch[1]) * 5; // 5 dias úteis por semana
  }

  // Formato 1M, etc. (mês)
  const monthMatch = durationStr.match(/(\d+)M/);
  if (monthMatch) {
    return parseInt(monthMatch[1]) * 20; // ~20 dias úteis por mês
  }

  // Tentar parsear como número direto
  const num = parseFloat(durationStr);
  return isNaN(num) ? 0 : num;
}

/**
 * Cria projeto vazio
 */
function createEmptyProject(): MSProjectImportResult['project'] {
  return {
    name: 'Projeto Vazio',
    startDate: new Date(),
    finishDate: new Date(),
    calendar: 'Standard',
    currency: 'R$',
    company: null,
    manager: null,
  };
}

/**
 * Cria estatísticas vazias
 */
function createEmptyStatistics(): MSProjectImportResult['statistics'] {
  return {
    totalTasks: 0,
    summaryTasks: 0,
    milestones: 0,
    criticalTasks: 0,
    totalDuration: 0,
    totalWork: 0,
    totalResources: 0,
  };
}

// =============================================================================
// Funções de Conversão para o Sistema
// =============================================================================

/**
 * Converte tarefas do MS Project para o formato do sistema
 */
export function convertToScheduleTasks(
  msTasks: MSProjectTask[]
): Array<{
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  startDate: Date;
  endDate: Date;
  duration: number;
  progress: number;
  status: string;
  responsible: string | null;
  order: number;
  isCritical: boolean;
  dependencies: Array<{ dependsOnId: string; type: string; lag: number }>;
}> {
  // Mapear tarefas por ID para encontrar pais
  const taskMap = new Map<string, MSProjectTask>();
  msTasks.forEach((t) => taskMap.set(t.id, t));

  // Construir árvore de tarefas
  const taskOrder: string[] = [];
  const taskLevels = new Map<string, number>();

  msTasks.forEach((task) => {
    taskLevels.set(task.id, task.outlineLevel);
    taskOrder.push(task.id);
  });

  return msTasks.map((task, index) => {
    // Encontrar pai baseado no outline level
    let parentId: string | null = null;
    const currentLevel = task.outlineLevel;

    // Buscar tarefa anterior com nível menor
    for (let i = index - 1; i >= 0; i--) {
      const prevTask = msTasks[i];
      if (prevTask.outlineLevel < currentLevel) {
        parentId = prevTask.id;
        break;
      }
    }

    // Converter precedências
    const dependencies = task.predecessorLinks.map((link) => ({
      dependsOnId: link.predecessorId,
      type: link.type,
      lag: link.lag,
    }));

    // Determinar status
    let status = 'pending';
    if (task.percentComplete === 100) {
      status = 'completed';
    } else if (task.percentComplete > 0) {
      status = 'in_progress';
    } else if (new Date(task.start) < new Date()) {
      status = 'pending';
    }

    // Responsável (primeiro recurso atribuído)
    const responsible = task.resourceAssignments[0]?.resourceName || null;

    return {
      id: task.id,
      parentId,
      name: task.name,
      description: task.notes,
      startDate: task.start,
      endDate: task.finish,
      duration: task.duration,
      progress: task.percentComplete,
      status,
      responsible,
      order: index,
      isCritical: task.critical,
      dependencies,
    };
  });
}

/**
 * Gera resumo da importação
 */
export function generateImportSummary(result: MSProjectImportResult): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    '              IMPORTAÇÃO MS PROJECT',
    '              ConstrutorPro - Sistema de Gestão',
    '═══════════════════════════════════════════════════════════════',
    '',
    `Projeto: ${result.project.name}`,
    `Início: ${result.project.startDate.toLocaleDateString('pt-BR')}`,
    `Término: ${result.project.finishDate.toLocaleDateString('pt-BR')}`,
    '',
    '───────────────────────────────────────────────────────────────',
    '                    ESTATÍSTICAS',
    '───────────────────────────────────────────────────────────────',
    '',
    `Total de Tarefas: ${result.statistics.totalTasks}`,
    `Tarefas Resumo: ${result.statistics.summaryTasks}`,
    `Marcos: ${result.statistics.milestones}`,
    `Tarefas Críticas: ${result.statistics.criticalTasks}`,
    `Duração Total: ${result.statistics.totalDuration} dias`,
    `Total de Recursos: ${result.statistics.totalResources}`,
    '',
  ];

  if (result.warnings.length > 0) {
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('                    AVISOS');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('');
    result.warnings.forEach((w) => lines.push(`⚠ ${w}`));
    lines.push('');
  }

  if (result.errors.length > 0) {
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('                    ERROS');
    lines.push('───────────────────────────────────────────────────────────────');
    lines.push('');
    result.errors.forEach((e) => lines.push(`✗ ${e}`));
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
