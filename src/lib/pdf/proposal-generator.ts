// =============================================================================
// ConstrutorPro - PDF Proposal Generator Service
// Geração profissional de propostas comerciais em PDF
// =============================================================================

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =============================================================================
// Types
// =============================================================================

export interface ProposalPDFData {
  // Company info
  company: {
    name: string;
    tradingName?: string;
    cnpj: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    logo?: string;
  };

  // Proposal info
  proposal: {
    number: string;
    title: string;
    objective?: string;
    version: number;
    status: string;
    subtotal: number;
    discountType?: string;
    discountValue?: number;
    discountReason?: string;
    totalValue: number;
    paymentTerms?: string;
    deliveryTime?: string;
    warrantyTerms?: string;
    validUntil?: Date;
    deliveryAddress?: string;
    terms?: string;
    clientNotes?: string;
    customIntroduction?: string;
    createdAt: Date;
    sentAt?: Date;
    acceptedAt?: Date;
  };

  // Client info
  client?: {
    name: string;
    email?: string;
    phone?: string;
    mobile?: string;
    cpfCnpj?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };

  // Project info
  project?: {
    name: string;
    code?: string;
    address?: string;
    city?: string;
    state?: string;
  };

  // Items
  items: Array<{
    code?: string;
    title: string;
    description?: string;
    category?: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;

  // Presentation options
  options: {
    includeCover: boolean;
    includeSummary: boolean;
    includeTimeline: boolean;
    includeTeam: boolean;
    includePortfolio: boolean;
    requiresSignature: boolean;
  };
}

// =============================================================================
// Color Palette
// =============================================================================

const COLORS = {
  primary: '#1e40af',
  secondary: '#3b82f6',
  accent: '#0ea5e9',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  text: '#1e293b',
  muted: '#64748b',
  light: '#f8fafc',
  border: '#e2e8f0',
  headerBg: '#1e40af',
  lightBg: '#eff6ff',
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDate(date: Date | undefined): string {
  if (!date) return '-';
  try {
    return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return '-';
  }
}

function formatDateShort(date: Date | undefined): string {
  if (!date) return '-';
  try {
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return '-';
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Rascunho',
    review: 'Em Revisão',
    sent: 'Enviada',
    viewed: 'Visualizada',
    accepted: 'Aceita',
    rejected: 'Rejeitada',
    expired: 'Expirada',
    cancelled: 'Cancelada',
  };
  return labels[status] || status;
}

// =============================================================================
// PDF Generation
// =============================================================================

export async function generateProposalPDF(data: ProposalPDFData): Promise<Buffer> {
  // Dynamic import for pdfmake
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createPdf } = require('pdfmake/build/pdfmake');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfFonts = require('pdfmake/build/vfs_fonts');

  const content: unknown[] = [];

  // ==========================================================================
  // COVER PAGE (if enabled)
  // ==========================================================================
  if (data.options.includeCover) {
    content.push(
      // Cover page content
      {
        stack: [
          // Company name at top
          { text: data.company.name, style: 'coverCompany', alignment: 'center' },
          ...(data.company.tradingName ? [{ text: data.company.tradingName, style: 'coverTradingName', alignment: 'center' }] : []),
          { text: '', margin: [0, 40, 0, 0] },

          // Proposal title
          { text: 'PROPOSTA COMERCIAL', style: 'coverProposalTitle', alignment: 'center' },
          { text: '', margin: [0, 20, 0, 0] },

          // Proposal number
          { text: data.proposal.number, style: 'coverProposalNumber', alignment: 'center' },
          { text: '', margin: [0, 10, 0, 0] },

          // Title
          { text: data.proposal.title, style: 'coverTitle', alignment: 'center' },
          { text: '', margin: [0, 60, 0, 0] },

          // Client box
          {
            stack: [
              { text: 'PREPARADO PARA', style: 'coverLabel', alignment: 'center' },
              { text: '', margin: [0, 10, 0, 0] },
              { text: data.client?.name || 'Cliente', style: 'coverClientName', alignment: 'center' },
              ...(data.client?.cpfCnpj ? [{ text: data.client.cpfCnpj, style: 'coverClientDoc', alignment: 'center' }] : []),
              ...(data.client?.address ? [{ text: `${data.client.address}${data.client.city ? `, ${data.client.city}` : ''}${data.client.state ? ` - ${data.client.state}` : ''}`, style: 'coverClientAddress', alignment: 'center' }] : []),
            ],
            alignment: 'center',
            margin: [60, 0, 60, 0],
          },

          { text: '', margin: [0, 60, 0, 0] },

          // Date
          {
            columns: [
              { width: '*', text: '' },
              {
                width: 'auto',
                stack: [
                  { text: 'Data de Emissão', style: 'coverDateLabel', alignment: 'right' },
                  { text: formatDateShort(data.proposal.createdAt), style: 'coverDateValue', alignment: 'right' },
                ],
              },
            ],
          },

          { text: '', margin: [0, 40, 0, 0] },

          // Company footer on cover
          {
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineColor: COLORS.border }] },
              { text: '', margin: [0, 10, 0, 0] },
              { text: data.company.name, style: 'coverFooterCompany', alignment: 'center' },
              ...(data.company.cnpj ? [{ text: `CNPJ: ${data.company.cnpj}`, style: 'coverFooterDoc', alignment: 'center' }] : []),
              {
                text: [
                  ...(data.company.phone ? [{ text: `Tel: ${data.company.phone}`, style: 'coverFooterInfo' }] : []),
                  ...(data.company.email ? [{ text: `  |  ${data.company.email}`, style: 'coverFooterInfo' }] : []),
                ],
                alignment: 'center',
              },
            ],
          },
        ],
        pageBreak: 'after',
      }
    );
  }

  // ==========================================================================
  // MAIN CONTENT
  // ==========================================================================

  // Header for non-cover pages
  const headerContent = {
    columns: [
      {
        width: '*',
        stack: [
          { text: data.company.name, style: 'headerCompany' },
          { text: 'PROPOSTA COMERCIAL', style: 'headerProposalType' },
        ],
      },
      {
        width: 'auto',
        stack: [
          { text: data.proposal.number, style: 'headerNumber', alignment: 'right' },
          { text: `Versão ${data.proposal.version}`, style: 'headerVersion', alignment: 'right' },
        ],
      },
    ],
    margin: [0, 0, 0, 20],
  };
  content.push(headerContent);

  // Introduction
  if (data.proposal.customIntroduction) {
    content.push({
      text: data.proposal.customIntroduction,
      style: 'introduction',
      margin: [0, 0, 0, 20],
    });
  } else if (data.client) {
    content.push({
      text: `Prezados(as),\n\nApresentamos a seguir nossa proposta comercial para os serviços descritos, elaborada especificamente para atender às necessidades de ${data.client.name}. Estamos à disposição para esclarecer quaisquer dúvidas e ajustar os termos conforme necessário.\n\nAgradecemos a oportunidade e confiamos que nossa proposta atenderá às expectativas.`,
      style: 'introduction',
      margin: [0, 0, 0, 20],
    });
  }

  // Client and Project Info
  content.push({
    columns: [
      {
        width: data.project ? '*' : '100%',
        stack: [
          { text: 'DADOS DO CLIENTE', style: 'sectionTitle' },
          { text: data.client?.name || 'Não informado', style: 'infoValue' },
          ...(data.client?.cpfCnpj ? [{ text: data.client.cpfCnpj, style: 'infoSubValue' }] : []),
          ...(data.client?.email ? [{ text: data.client.email, style: 'infoSubValue' }] : []),
          ...(data.client?.phone || data.client?.mobile ? [{ text: data.client.phone || data.client.mobile, style: 'infoSubValue' }] : []),
          ...(data.client?.address ? [{
            text: `${data.client.address}${data.client.city ? `, ${data.client.city}` : ''}${data.client.state ? ` - ${data.client.state}` : ''}${data.client.zipCode ? `  CEP: ${data.client.zipCode}` : ''}`,
            style: 'infoSubValue'
          }] : []),
        ],
      },
      ...(data.project ? [{
        width: '*',
        stack: [
          { text: 'DADOS DO PROJETO', style: 'sectionTitle' },
          { text: data.project.name, style: 'infoValue' },
          ...(data.project.code ? [{ text: `Código: ${data.project.code}`, style: 'infoSubValue' }] : []),
          ...(data.project.address ? [{
            text: `${data.project.address}${data.project.city ? `, ${data.project.city}` : ''}${data.project.state ? ` - ${data.project.state}` : ''}`,
            style: 'infoSubValue'
          }] : []),
        ],
      }] : []),
    ],
    margin: [0, 0, 0, 20],
    columnGap: 20,
  });

  // Objective
  if (data.proposal.objective) {
    content.push({ text: 'OBJETIVO', style: 'sectionTitle' });
    content.push({ text: data.proposal.objective, style: 'objectiveText', margin: [0, 0, 0, 20] });
  }

  // ==========================================================================
  // ITEMS TABLE
  // ==========================================================================
  content.push({ text: 'ITENS DA PROPOSTA', style: 'sectionTitle' });

  // Group items by category if categories exist
  const hasCategories = data.items.some(item => item.category);

  if (hasCategories) {
    const categories = [...new Set(data.items.map(item => item.category).filter(Boolean))];

    for (const category of categories) {
      const categoryItems = data.items.filter(item => item.category === category);
      let categoryTotal = 0;

      content.push({ text: category || 'Outros', style: 'categoryTitle' });

      const tableBody: unknown[][] = [
        [
          { text: '#', style: 'tableHeader', fillColor: COLORS.headerBg, color: '#ffffff' },
          { text: 'Descrição', style: 'tableHeader', fillColor: COLORS.headerBg, color: '#ffffff' },
          { text: 'Un.', style: 'tableHeader', fillColor: COLORS.headerBg, color: '#ffffff', alignment: 'center' },
          { text: 'Qtd.', style: 'tableHeader', fillColor: COLORS.headerBg, color: '#ffffff', alignment: 'right' },
          { text: 'Preço Unit.', style: 'tableHeader', fillColor: COLORS.headerBg, color: '#ffffff', alignment: 'right' },
          { text: 'Total', style: 'tableHeader', fillColor: COLORS.headerBg, color: '#ffffff', alignment: 'right' },
        ],
      ];

      categoryItems.forEach((item, index) => {
        categoryTotal += item.totalPrice;
        tableBody.push([
          { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
          {
            stack: [
              { text: item.title, style: 'tableCell' },
              ...(item.description ? [{ text: item.description, style: 'tableCellDescription' }] : []),
              ...(item.code ? [{ text: `Cód: ${item.code}`, style: 'tableCellCode' }] : []),
            ],
          },
          { text: item.unit, style: 'tableCell', alignment: 'center' },
          { text: item.quantity.toFixed(2), style: 'tableCell', alignment: 'right' },
          { text: formatCurrency(item.unitPrice), style: 'tableCell', alignment: 'right' },
          { text: formatCurrency(item.totalPrice), style: 'tableCellBold', alignment: 'right' },
        ]);
      });

      content.push({
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
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
        margin: [0, 0, 0, 5],
      });

      content.push({
        columns: [
          { width: '*', text: '' },
          { width: 'auto', text: `Subtotal ${category}: ${formatCurrency(categoryTotal)}`, style: 'categoryTotal', alignment: 'right' },
        ],
        margin: [0, 0, 0, 15],
      });
    }
  } else {
    // Simple table without categories
    const tableBody: unknown[][] = [
      [
        { text: '#', style: 'tableHeader', fillColor: COLORS.headerBg, color: '#ffffff' },
        { text: 'Descrição', style: 'tableHeader', fillColor: COLORS.headerBg, color: '#ffffff' },
        { text: 'Un.', style: 'tableHeader', fillColor: COLORS.headerBg, color: '#ffffff', alignment: 'center' },
        { text: 'Qtd.', style: 'tableHeader', fillColor: COLORS.headerBg, color: '#ffffff', alignment: 'right' },
        { text: 'Preço Unit.', style: 'tableHeader', fillColor: COLORS.headerBg, color: '#ffffff', alignment: 'right' },
        { text: 'Total', style: 'tableHeader', fillColor: COLORS.headerBg, color: '#ffffff', alignment: 'right' },
      ],
    ];

    data.items.forEach((item, index) => {
      tableBody.push([
        { text: (index + 1).toString(), style: 'tableCell', alignment: 'center' },
        {
          stack: [
            { text: item.title, style: 'tableCell' },
            ...(item.description ? [{ text: item.description, style: 'tableCellDescription' }] : []),
            ...(item.code ? [{ text: `Cód: ${item.code}`, style: 'tableCellCode' }] : []),
          ],
        },
        { text: item.unit, style: 'tableCell', alignment: 'center' },
        { text: item.quantity.toFixed(2), style: 'tableCell', alignment: 'right' },
        { text: formatCurrency(item.unitPrice), style: 'tableCell', alignment: 'right' },
        { text: formatCurrency(item.totalPrice), style: 'tableCellBold', alignment: 'right' },
      ]);
    });

    content.push({
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto', 'auto', 'auto'],
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
    });
  }

  // ==========================================================================
  // TOTALS
  // ==========================================================================
  content.push({
    columns: [
      { width: '*', text: '' },
      {
        width: 'auto',
        stack: [
          { columns: [{ text: 'Subtotal:', width: 100, style: 'totalLabel' }, { text: formatCurrency(data.proposal.subtotal), width: 100, style: 'totalValue', alignment: 'right' }] },
          ...(data.proposal.discountValue && data.proposal.discountValue > 0 ? [{
            columns: [
              { text: `Desconto${data.proposal.discountReason ? ` (${data.proposal.discountReason})` : ''}:`, width: 100, style: 'totalLabelDiscount' },
              { text: `-${formatCurrency(data.proposal.discountType === 'percentage' ? data.proposal.subtotal * (data.proposal.discountValue / 100) : data.proposal.discountValue)}`, width: 100, style: 'totalValueDiscount', alignment: 'right' },
            ],
          }] : []),
          { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 200, y2: 5, lineColor: COLORS.text }], margin: [0, 5, 0, 5] },
          { columns: [{ text: 'TOTAL:', width: 100, style: 'totalLabelBold' }, { text: formatCurrency(data.proposal.totalValue), width: 100, style: 'totalValueBold', alignment: 'right' }] },
        ],
      },
    ],
    margin: [0, 10, 0, 20],
  });

  // ==========================================================================
  // COMMERCIAL CONDITIONS
  // ==========================================================================
  content.push({ text: 'CONDIÇÕES COMERCIAIS', style: 'sectionTitle' });

  const conditionsStack: unknown[] = [];

  if (data.proposal.paymentTerms) {
    conditionsStack.push({
      columns: [
        { width: 120, text: 'Pagamento:', style: 'conditionLabel' },
        { width: '*', text: data.proposal.paymentTerms, style: 'conditionValue' },
      ],
    });
  }

  if (data.proposal.deliveryTime) {
    conditionsStack.push({
      columns: [
        { width: 120, text: 'Prazo de Execução:', style: 'conditionLabel' },
        { width: '*', text: data.proposal.deliveryTime, style: 'conditionValue' },
      ],
    });
  }

  if (data.proposal.warrantyTerms) {
    conditionsStack.push({
      columns: [
        { width: 120, text: 'Garantia:', style: 'conditionLabel' },
        { width: '*', text: data.proposal.warrantyTerms, style: 'conditionValue' },
      ],
    });
  }

  if (data.proposal.validUntil) {
    conditionsStack.push({
      columns: [
        { width: 120, text: 'Validade:', style: 'conditionLabel' },
        { width: '*', text: `Esta proposta é válida até ${formatDate(data.proposal.validUntil)}`, style: 'conditionValue' },
      ],
    });
  }

  if (data.proposal.deliveryAddress) {
    conditionsStack.push({
      columns: [
        { width: 120, text: 'Local de Execução:', style: 'conditionLabel' },
        { width: '*', text: data.proposal.deliveryAddress, style: 'conditionValue' },
      ],
    });
  }

  if (conditionsStack.length > 0) {
    content.push({ stack: conditionsStack, margin: [0, 0, 0, 20] });
  }

  // ==========================================================================
  // TERMS AND CONDITIONS
  // ==========================================================================
  if (data.proposal.terms) {
    content.push({ text: 'TERMOS E CONDIÇÕES', style: 'sectionTitle' });
    content.push({ text: data.proposal.terms, style: 'termsText', margin: [0, 0, 0, 20] });
  }

  // Client notes
  if (data.proposal.clientNotes) {
    content.push({ text: 'OBSERVAÇÕES', style: 'sectionTitle' });
    content.push({ text: data.proposal.clientNotes, style: 'termsText', margin: [0, 0, 0, 20] });
  }

  // ==========================================================================
  // SIGNATURE AREA
  // ==========================================================================
  if (data.options.requiresSignature) {
    content.push({ text: '', margin: [0, 30, 0, 0] });
    content.push({
      columns: [
        {
          width: '*',
          stack: [
            { text: '________________________________', style: 'signatureLine', alignment: 'center' },
            { text: data.company.name, style: 'signatureLabel', alignment: 'center' },
            { text: formatDateShort(new Date()), style: 'signatureDate', alignment: 'center' },
          ],
        },
        { width: 40, text: '' },
        {
          width: '*',
          stack: [
            { text: '________________________________', style: 'signatureLine', alignment: 'center' },
            { text: data.client?.name || 'Cliente', style: 'signatureLabel', alignment: 'center' },
            { text: 'Data: ____/____/________', style: 'signatureDate', alignment: 'center' },
          ],
        },
      ],
      margin: [0, 30, 0, 0],
    });
  }

  // ==========================================================================
  // Document Definition
  // ==========================================================================
  const docDefinition = {
    pageSize: 'A4' as const,
    pageMargins: [40, 60, 40, 80],
    content,
    styles: {
      // Cover styles
      coverCompany: { fontSize: 14, color: COLORS.muted, margin: [0, 20, 0, 0] },
      coverTradingName: { fontSize: 11, color: COLORS.muted },
      coverProposalTitle: { fontSize: 32, bold: true, color: COLORS.primary },
      coverProposalNumber: { fontSize: 14, color: COLORS.secondary },
      coverTitle: { fontSize: 18, color: COLORS.text },
      coverLabel: { fontSize: 10, color: COLORS.muted },
      coverClientName: { fontSize: 20, bold: true, color: COLORS.text },
      coverClientDoc: { fontSize: 12, color: COLORS.muted },
      coverClientAddress: { fontSize: 11, color: COLORS.muted },
      coverDateLabel: { fontSize: 9, color: COLORS.muted },
      coverDateValue: { fontSize: 11, bold: true },
      coverFooterCompany: { fontSize: 10, bold: true, color: COLORS.text },
      coverFooterDoc: { fontSize: 8, color: COLORS.muted },
      coverFooterInfo: { fontSize: 8, color: COLORS.muted },

      // Header styles
      headerCompany: { fontSize: 16, bold: true, color: COLORS.primary },
      headerProposalType: { fontSize: 10, color: COLORS.muted },
      headerNumber: { fontSize: 12, bold: true, color: COLORS.secondary },
      headerVersion: { fontSize: 9, color: COLORS.muted },

      // Section styles
      sectionTitle: { fontSize: 11, bold: true, color: COLORS.primary, margin: [0, 15, 0, 8] },
      categoryTitle: { fontSize: 10, bold: true, color: COLORS.text, margin: [0, 10, 0, 5] },
      categoryTotal: { fontSize: 9, bold: true, color: COLORS.text },

      // Info styles
      infoValue: { fontSize: 11, bold: true, color: COLORS.text },
      infoSubValue: { fontSize: 9, color: COLORS.muted, margin: [0, 2, 0, 0] },

      // Introduction
      introduction: { fontSize: 10, color: COLORS.text, lineHeight: 1.5 },

      // Objective
      objectiveText: { fontSize: 10, color: COLORS.text, lineHeight: 1.5 },

      // Table styles
      tableHeader: { fontSize: 9, bold: true },
      tableCell: { fontSize: 9, color: COLORS.text },
      tableCellDescription: { fontSize: 8, color: COLORS.muted, italics: true },
      tableCellCode: { fontSize: 7, color: COLORS.muted },
      tableCellBold: { fontSize: 9, bold: true, color: COLORS.text },

      // Total styles
      totalLabel: { fontSize: 10, color: COLORS.muted },
      totalValue: { fontSize: 10, color: COLORS.text },
      totalLabelDiscount: { fontSize: 10, color: COLORS.danger },
      totalValueDiscount: { fontSize: 10, color: COLORS.danger },
      totalLabelBold: { fontSize: 12, bold: true, color: COLORS.text },
      totalValueBold: { fontSize: 12, bold: true, color: COLORS.primary },

      // Condition styles
      conditionLabel: { fontSize: 9, color: COLORS.muted, bold: true },
      conditionValue: { fontSize: 9, color: COLORS.text },

      // Terms styles
      termsText: { fontSize: 9, color: COLORS.muted, lineHeight: 1.4 },

      // Signature styles
      signatureLine: { fontSize: 10, color: COLORS.text },
      signatureLabel: { fontSize: 9, bold: true, color: COLORS.text, margin: [0, 5, 0, 0] },
      signatureDate: { fontSize: 8, color: COLORS.muted },

      // Footer
      footer: { fontSize: 8, color: COLORS.muted },
    },
    footer: (currentPage: number, pageCount: number) => ({
      columns: [
        { text: `${data.company.name} | ${data.proposal.number}`, style: 'footer', width: '*' },
        { text: `Página ${currentPage} de ${pageCount}`, style: 'footer', alignment: 'right', width: 'auto' },
      ],
      margin: [40, 20, 40, 0],
    }),
    defaultStyle: { font: 'Roboto' },
  };

  const pdfDocGenerator = createPdf(docDefinition, undefined, pdfFonts.pdfMake.vfs);

  return new Promise((resolve, reject) => {
    pdfDocGenerator.getBuffer((buffer: Buffer) => {
      resolve(buffer);
    });
  });
}
