// =============================================================================
// ConstrutorPro - PDF Report Generator Service
// Serviço profissional para geração de relatórios em PDF
// =============================================================================

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Type definitions for pdfmake (avoiding import issues with @types/pdfmake)
interface TDocumentDefinitions {
  pageSize?: string;
  pageMargins?: number[];
  content: unknown[];
  styles?: Record<string, unknown>;
  footer?: (currentPage: number, pageCount: number) => unknown;
  defaultStyle?: Record<string, unknown>;
}

interface ContentCell {
  text?: string;
  style?: string;
  fontSize?: number;
  alignment?: string;
  color?: string;
  bold?: boolean;
  italics?: boolean;
  fillColor?: string;
  [key: string]: unknown;
}

type Content = ContentCell | ContentCell[] | { [key: string]: unknown };

// =============================================================================
// Types
// =============================================================================

export interface ReportMetadata {
  title: string;
  subtitle?: string;
  companyName: string;
  companyLogo?: string;
  generatedBy: string;
  generatedAt: Date;
  period?: {
    start: Date;
    end: Date;
  };
}

export interface ProjectReportData {
  metadata: ReportMetadata;
  summary: {
    total: number;
    active: number;
    completed: number;
    delayed: number;
    totalValue: number;
  };
  projects: Array<{
    code: string;
    name: string;
    client: string;
    status: string;
    startDate?: Date;
    endDate?: Date;
    estimatedValue: number;
    actualValue: number;
    physicalProgress: number;
    financialProgress: number;
  }>;
}

export interface FinancialReportData {
  metadata: ReportMetadata;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    pendingIncome: number;
    pendingExpenses: number;
  };
  transactions: Array<{
    date: Date;
    type: 'income' | 'expense';
    category: string;
    description: string;
    value: number;
    dueDate?: Date;
    status: string;
    project?: string;
  }>;
  categoryBreakdown: Array<{
    category: string;
    value: number;
    percentage: number;
  }>;
}

export interface ResourcesReportData {
  metadata: ReportMetadata;
  summary: {
    totalMaterials: number;
    lowStock: number;
    totalValue: number;
  };
  materials: Array<{
    code: string;
    name: string;
    category: string;
    unit: string;
    unitCost: number;
    stockQuantity: number | null;
    minStock: number | null;
    supplier?: string;
  }>;
}

export interface ActivitiesReportData {
  metadata: ReportMetadata;
  summary: {
    totalLogs: number;
    workedDays: number;
    totalWorkers: number;
    projectsInvolved: number;
  };
  dailyLogs: Array<{
    date: Date;
    project: string;
    weather: string;
    workersCount: number;
    summary: string;
    observations?: string;
  }>;
}

export interface BudgetReportData {
  metadata: ReportMetadata;
  budget: {
    id: string;
    name: string;
    client: string;
    project: string;
    totalValue: number;
    discount: number;
    finalValue: number;
    validUntil: Date;
    items: Array<{
      code: string;
      description: string;
      unit: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: Date | undefined): string {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
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
  };
  return labels[status] || status;
}

function getWeatherLabel(weather: string): string {
  const labels: Record<string, string> = {
    sunny: 'Ensolarado',
    cloudy: 'Nublado',
    rainy: 'Chuvoso',
    stormy: 'Tempestade',
  };
  return labels[weather] || weather;
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
  };
  return labels[category] || category;
}

// =============================================================================
// Color Palette
// =============================================================================

const COLORS = {
  primary: '#2563eb',
  secondary: '#64748b',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  headerBg: '#f1f5f9',
  border: '#e2e8f0',
  text: '#1e293b',
  muted: '#64748b',
};

// =============================================================================
// Document Building Blocks
// =============================================================================

function createHeader(metadata: ReportMetadata): Content[] {
  const content: Content[] = [
    {
      columns: [
        {
          width: '*',
          stack: [
            { text: metadata.companyName, style: 'companyName' },
            { text: metadata.title, style: 'reportTitle' },
            ...(metadata.subtitle ? [{ text: metadata.subtitle, style: 'reportSubtitle' }] : []),
          ],
        },
        {
          width: 'auto',
          stack: [
            { text: 'Data de Geração', style: 'labelHeader', alignment: 'right' },
            { text: formatDate(metadata.generatedAt), style: 'valueHeader', alignment: 'right' },
            ...(metadata.generatedBy
              ? [{ text: `Por: ${metadata.generatedBy}`, style: 'generatedBy', alignment: 'right' }]
              : []),
          ],
        },
      ],
      margin: [0, 0, 0, 20],
    },
  ];

  if (metadata.period) {
    content.push({
      text: `Período: ${formatDate(metadata.period.start)} a ${formatDate(metadata.period.end)}`,
      style: 'period',
      margin: [0, 0, 0, 15],
    });
  }

  return content;
}

function createSummaryCards(
  cards: Array<{ label: string; value: string; subValue?: string; color?: string }>
): Content {
  return {
    columns: cards.map((card) => ({
      width: '*',
      stack: [
        { text: card.label, style: 'summaryLabel', color: COLORS.muted },
        { text: card.value, style: 'summaryValue', color: card.color || COLORS.text },
        ...(card.subValue ? [{ text: card.subValue, style: 'summarySubValue', color: COLORS.muted }] : []),
      ],
      margin: [5, 0, 5, 0],
    })),
    margin: [0, 0, 0, 20],
  };
}

function createTable(
  headers: string[],
  rows: Content[][],
  options?: { columnWidths?: ('*' | 'auto' | number)[] }
): Content {
  const tableBody: Content[][] = [
    headers.map((header) => ({
      text: header,
      style: 'tableHeader',
      fillColor: COLORS.headerBg,
    })),
    ...rows.map((row) => row.map((cell) => {
      // Handle cell - cast to ContentCell if it's an object
      const cellObj = cell as ContentCell;
      return { ...cellObj, style: cellObj.style || 'tableCell' };
    })),
  ];

  return {
    table: {
      headerRows: 1,
      widths: options?.columnWidths || headers.map(() => '*'),
      body: tableBody,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => COLORS.border,
      vLineColor: () => COLORS.border,
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6,
    },
    margin: [0, 0, 0, 15],
  };
}

function createFooter(currentPage: number, pageCount: number): Content {
  return {
    columns: [
      { text: 'ConstrutorPro - Sistema de Gestão de Construção', style: 'footer', width: '*' },
      { text: `Página ${currentPage} de ${pageCount}`, style: 'footer', alignment: 'right', width: 'auto' },
    ],
    margin: [40, 20, 40, 0],
  };
}

// =============================================================================
// Common Styles
// =============================================================================

const commonStyles = {
  companyName: { fontSize: 18, bold: true, color: COLORS.primary },
  reportTitle: { fontSize: 24, bold: true, color: COLORS.text, margin: [0, 5, 0, 0] },
  reportSubtitle: { fontSize: 12, color: COLORS.muted, margin: [0, 2, 0, 0] },
  labelHeader: { fontSize: 8, color: COLORS.muted },
  valueHeader: { fontSize: 10, bold: true },
  generatedBy: { fontSize: 8, color: COLORS.muted, margin: [0, 2, 0, 0] },
  period: { fontSize: 10, color: COLORS.muted },
  sectionTitle: { fontSize: 14, bold: true, color: COLORS.text, margin: [0, 10, 0, 10] },
  summaryLabel: { fontSize: 9, margin: [0, 0, 0, 2] },
  summaryValue: { fontSize: 16, bold: true },
  summarySubValue: { fontSize: 8, margin: [0, 2, 0, 0] },
  tableHeader: { fontSize: 9, bold: true, color: COLORS.text },
  tableCell: { fontSize: 9, color: COLORS.text },
  footer: { fontSize: 8, color: COLORS.muted },
};

// =============================================================================
// Helper to create PDF Buffer
// =============================================================================

async function createPdfBuffer(docDefinition: TDocumentDefinitions): Promise<Buffer> {
  // Dynamic import for pdfmake (ESM/CommonJS compatibility)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createPdf } = require('pdfmake/build/pdfmake');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfFonts = require('pdfmake/build/vfs_fonts');

  const pdfDocGenerator = createPdf(docDefinition, undefined, pdfFonts.pdfMake.vfs);

  return new Promise((resolve, reject) => {
    pdfDocGenerator.getBuffer((buffer: Buffer) => {
      resolve(buffer);
    });
  });
}

// =============================================================================
// Report Generators
// =============================================================================

export async function generateProjectsPDF(data: ProjectReportData): Promise<Buffer> {
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      ...createHeader(data.metadata),
      { text: 'Resumo Geral', style: 'sectionTitle' },
      createSummaryCards([
        { label: 'Total de Projetos', value: data.summary.total.toString() },
        { label: 'Em Andamento', value: data.summary.active.toString(), color: COLORS.info },
        { label: 'Concluídos', value: data.summary.completed.toString(), color: COLORS.success },
        { label: 'Atrasados', value: data.summary.delayed.toString(), color: COLORS.danger },
      ]),
      createSummaryCards([
        { label: 'Valor Total Estimado', value: formatCurrency(data.summary.totalValue) },
      ]),
      { text: 'Detalhamento de Projetos', style: 'sectionTitle', margin: [0, 20, 0, 10] },
      createTable(
        ['Código', 'Nome', 'Cliente', 'Status', 'Início', 'Fim', 'Valor Est.', 'Progresso'],
        data.projects.map((p) => [
          { text: p.code, fontSize: 8 },
          { text: p.name.substring(0, 25), fontSize: 8 },
          { text: p.client.substring(0, 20), fontSize: 8 },
          { text: getStatusLabel(p.status), fontSize: 8 },
          { text: formatDate(p.startDate), fontSize: 8 },
          { text: formatDate(p.endDate), fontSize: 8 },
          { text: formatCurrency(p.estimatedValue), fontSize: 8, alignment: 'right' },
          { text: `${p.physicalProgress.toFixed(0)}%`, fontSize: 8, alignment: 'center' },
        ]),
        { columnWidths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'] }
      ),
    ],
    styles: commonStyles,
    footer: (currentPage, pageCount) => createFooter(currentPage, pageCount),
    defaultStyle: { font: 'Roboto' },
  };

  return createPdfBuffer(docDefinition);
}

export async function generateFinancialPDF(data: FinancialReportData): Promise<Buffer> {
  const balanceColor = data.summary.balance >= 0 ? COLORS.success : COLORS.danger;

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      ...createHeader(data.metadata),
      { text: 'Resumo Financeiro', style: 'sectionTitle' },
      createSummaryCards([
        { label: 'Receitas', value: formatCurrency(data.summary.totalIncome), color: COLORS.success },
        { label: 'Despesas', value: formatCurrency(data.summary.totalExpenses), color: COLORS.danger },
        { label: 'Saldo', value: formatCurrency(data.summary.balance), color: balanceColor },
        { label: 'A Receber', value: formatCurrency(data.summary.pendingIncome), color: COLORS.info },
      ]),
      { text: 'Despesas por Categoria', style: 'sectionTitle', margin: [0, 20, 0, 10] },
      createTable(
        ['Categoria', 'Valor', '% do Total'],
        data.categoryBreakdown.map((c) => [
          { text: c.category, fontSize: 9 },
          { text: formatCurrency(c.value), fontSize: 9, alignment: 'right' },
          { text: `${c.percentage.toFixed(1)}%`, fontSize: 9, alignment: 'center' },
        ]),
        { columnWidths: ['*', 'auto', 'auto'] }
      ),
      { text: 'Transações', style: 'sectionTitle', margin: [0, 20, 0, 10] },
      createTable(
        ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Status'],
        data.transactions.slice(0, 50).map((t) => [
          { text: formatDate(t.date), fontSize: 8 },
          { text: t.type === 'income' ? 'Receita' : 'Despesa', fontSize: 8, color: t.type === 'income' ? COLORS.success : COLORS.danger },
          { text: getCategoryLabel(t.category), fontSize: 8 },
          { text: t.description.substring(0, 30), fontSize: 8 },
          { text: formatCurrency(t.value), fontSize: 8, alignment: 'right', color: t.type === 'income' ? COLORS.success : COLORS.danger },
          { text: getStatusLabel(t.status), fontSize: 8 },
        ]),
        { columnWidths: ['auto', 'auto', 'auto', '*', 'auto', 'auto'] }
      ),
    ],
    styles: commonStyles,
    footer: (currentPage, pageCount) => createFooter(currentPage, pageCount),
    defaultStyle: { font: 'Roboto' },
  };

  return createPdfBuffer(docDefinition);
}

export async function generateResourcesPDF(data: ResourcesReportData): Promise<Buffer> {
  const lowStockCount = data.materials.filter(
    (m) => m.stockQuantity !== null && m.minStock !== null && m.stockQuantity < m.minStock
  ).length;

  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      ...createHeader(data.metadata),
      { text: 'Resumo de Recursos', style: 'sectionTitle' },
      createSummaryCards([
        { label: 'Total de Materiais', value: data.summary.totalMaterials.toString() },
        { label: 'Estoque Baixo', value: lowStockCount.toString(), color: COLORS.danger },
        { label: 'Estoque Normal', value: (data.summary.totalMaterials - lowStockCount).toString(), color: COLORS.success },
        { label: 'Valor em Estoque', value: formatCurrency(data.summary.totalValue) },
      ]),
      { text: 'Materiais', style: 'sectionTitle', margin: [0, 20, 0, 10] },
      createTable(
        ['Código', 'Nome', 'Un.', 'Custo Unit.', 'Estoque', 'Mín.', 'Status'],
        data.materials.slice(0, 50).map((m) => {
          const isLowStock = m.stockQuantity !== null && m.minStock !== null && m.stockQuantity < m.minStock;
          return [
            { text: m.code, fontSize: 8 },
            { text: m.name.substring(0, 30), fontSize: 8 },
            { text: m.unit, fontSize: 8, alignment: 'center' },
            { text: formatCurrency(m.unitCost), fontSize: 8, alignment: 'right' },
            { text: m.stockQuantity?.toFixed(2) || '-', fontSize: 8, alignment: 'right' },
            { text: m.minStock?.toFixed(2) || '-', fontSize: 8, alignment: 'right' },
            { text: isLowStock ? 'Baixo' : 'Normal', fontSize: 8, color: isLowStock ? COLORS.danger : COLORS.success, alignment: 'center' },
          ];
        }),
        { columnWidths: ['auto', '*', 'auto', 'auto', 'auto', 'auto', 'auto'] }
      ),
    ],
    styles: commonStyles,
    footer: (currentPage, pageCount) => createFooter(currentPage, pageCount),
    defaultStyle: { font: 'Roboto' },
  };

  return createPdfBuffer(docDefinition);
}

export async function generateActivitiesPDF(data: ActivitiesReportData): Promise<Buffer> {
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      ...createHeader(data.metadata),
      { text: 'Resumo de Atividades', style: 'sectionTitle' },
      createSummaryCards([
        { label: 'Total de Registros', value: data.summary.totalLogs.toString() },
        { label: 'Dias Trabalhados', value: data.summary.workedDays.toString() },
        { label: 'Total Trabalhadores', value: data.summary.totalWorkers.toString() },
        { label: 'Projetos Envolvidos', value: data.summary.projectsInvolved.toString() },
      ]),
      { text: 'Diário de Obra', style: 'sectionTitle', margin: [0, 20, 0, 10] },
      ...data.dailyLogs.slice(0, 30).map((log) => ({
        stack: [
          {
            columns: [
              {
                width: '*',
                stack: [
                  { text: formatDate(log.date), style: 'logDate' },
                  { text: log.project, style: 'logProject' },
                ],
              },
              {
                width: 'auto',
                stack: [
                  { text: `Tempo: ${getWeatherLabel(log.weather)}`, style: 'logWeather' },
                  { text: `Trabalhadores: ${log.workersCount}`, style: 'logWorkers' },
                ],
              },
            ],
          },
          { text: log.summary, style: 'logSummary', margin: [0, 5, 0, 0] },
          ...(log.observations ? [{ text: `Observações: ${log.observations}`, style: 'logObservations', margin: [0, 3, 0, 0] }] : []),
          { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineColor: COLORS.border }], margin: [0, 10, 0, 10] },
        ],
      })),
    ],
    styles: {
      ...commonStyles,
      logDate: { fontSize: 11, bold: true },
      logProject: { fontSize: 10, color: COLORS.primary },
      logWeather: { fontSize: 9, color: COLORS.muted },
      logWorkers: { fontSize: 9, color: COLORS.muted },
      logSummary: { fontSize: 10 },
      logObservations: { fontSize: 9, italics: true, color: COLORS.muted },
    },
    footer: (currentPage, pageCount) => createFooter(currentPage, pageCount),
    defaultStyle: { font: 'Roboto' },
  };

  return createPdfBuffer(docDefinition);
}

export async function generateBudgetPDF(data: BudgetReportData): Promise<Buffer> {
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 60, 40, 60],
    content: [
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: data.metadata.companyName, style: 'companyName' },
              { text: 'PROPOSTA COMERCIAL', style: 'proposalTitle' },
            ],
          },
          {
            width: 'auto',
            stack: [
              { text: `Orçamento nº ${data.budget.id.substring(0, 8).toUpperCase()}`, style: 'budgetNumber', alignment: 'right' },
              { text: `Data: ${formatDate(data.metadata.generatedAt)}`, style: 'budgetDate', alignment: 'right' },
              { text: `Válido até: ${formatDate(data.budget.validUntil)}`, style: 'budgetValid', alignment: 'right' },
            ],
          },
        ],
        margin: [0, 0, 0, 20],
      },
      { text: 'Cliente', style: 'sectionTitle' },
      { text: data.budget.client, style: 'clientName', margin: [0, 0, 0, 10] },
      { text: `Projeto: ${data.budget.project}`, style: 'projectName', margin: [0, 0, 0, 20] },
      { text: 'Itens do Orçamento', style: 'sectionTitle' },
      createTable(
        ['Item', 'Descrição', 'Un.', 'Qtd.', 'Preço Unit.', 'Total'],
        data.budget.items.map((item, index) => [
          { text: (index + 1).toString(), fontSize: 9, alignment: 'center' },
          { text: item.description.substring(0, 40), fontSize: 9 },
          { text: item.unit, fontSize: 9, alignment: 'center' },
          { text: item.quantity.toFixed(2), fontSize: 9, alignment: 'right' },
          { text: formatCurrency(item.unitPrice), fontSize: 9, alignment: 'right' },
          { text: formatCurrency(item.totalPrice), fontSize: 9, alignment: 'right' },
        ]),
        { columnWidths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'] }
      ),
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            stack: [
              { columns: [{ text: 'Subtotal:', width: 'auto', style: 'totalLabel' }, { text: formatCurrency(data.budget.totalValue), width: 'auto', style: 'totalValue' }] },
              ...(data.budget.discount > 0
                ? [{ columns: [{ text: 'Desconto:', width: 'auto', style: 'totalLabel', color: COLORS.danger }, { text: `-${formatCurrency(data.budget.discount)}`, width: 'auto', style: 'totalValue', color: COLORS.danger }] }]
                : []),
              { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 150, y2: 2, lineColor: COLORS.text }], margin: [0, 5, 0, 5] },
              { columns: [{ text: 'TOTAL:', width: 'auto', style: 'totalLabelBold' }, { text: formatCurrency(data.budget.finalValue), width: 'auto', style: 'totalValueBold' }] },
            ],
          },
        ],
        margin: [0, 20, 0, 0],
      },
      { text: 'Condições e Prazos', style: 'sectionTitle', margin: [0, 30, 0, 10] },
      { text: 'Esta proposta é válida por 30 dias a partir da data de emissão. O prazo de execução será definido após aprovação. Pagamento conforme condições comerciais acordadas.', style: 'terms', margin: [0, 0, 0, 20] },
      {
        columns: [
          { width: '*', stack: [{ text: '________________________________', style: 'signature', alignment: 'center' }, { text: data.metadata.companyName, style: 'signatureLabel', alignment: 'center' }] },
          { width: '*', stack: [{ text: '________________________________', style: 'signature', alignment: 'center' }, { text: data.budget.client, style: 'signatureLabel', alignment: 'center' }] },
        ],
        margin: [0, 40, 0, 0],
      },
    ],
    styles: {
      ...commonStyles,
      companyName: { fontSize: 20, bold: true, color: COLORS.primary },
      proposalTitle: { fontSize: 14, color: COLORS.muted, margin: [0, 5, 0, 0] },
      budgetNumber: { fontSize: 12, bold: true },
      budgetDate: { fontSize: 10, color: COLORS.muted },
      budgetValid: { fontSize: 10, color: COLORS.muted },
      sectionTitle: { fontSize: 12, bold: true, color: COLORS.text, margin: [0, 10, 0, 5] },
      clientName: { fontSize: 14, bold: true },
      projectName: { fontSize: 11, color: COLORS.muted },
      totalLabel: { fontSize: 10, margin: [0, 3, 10, 3] },
      totalValue: { fontSize: 10, margin: [0, 3, 0, 3] },
      totalLabelBold: { fontSize: 11, bold: true, margin: [0, 3, 10, 3] },
      totalValueBold: { fontSize: 11, bold: true, margin: [0, 3, 0, 3] },
      terms: { fontSize: 9, color: COLORS.muted },
      signature: { fontSize: 10, margin: [0, 30, 0, 5] },
      signatureLabel: { fontSize: 9, color: COLORS.muted },
    },
    footer: (currentPage, pageCount) => createFooter(currentPage, pageCount),
    defaultStyle: { font: 'Roboto' },
  };

  return createPdfBuffer(docDefinition);
}
