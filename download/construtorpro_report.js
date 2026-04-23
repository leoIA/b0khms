const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        Header, Footer, AlignmentType, LevelFormat, TableOfContents, 
        HeadingLevel, BorderStyle, WidthType, ShadingType, VerticalAlign, 
        PageNumber, PageBreak } = require('docx');
const fs = require('fs');

// Color Scheme: "Midnight Code" - Ideal para projetos de tecnologia
const colors = {
  primary: "020617",      // Midnight Black
  bodyText: "1E293B",     // Deep Slate Blue
  secondary: "64748B",    // Cool Blue-Gray
  accent: "94A3B8",       // Steady Silver
  tableBg: "F8FAFC",      // Glacial Blue-White
  tableHeader: "0F172A"   // Dark Slate
};

const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder };

// Numbering config for bullet lists
const numberingConfig = [
  { reference: "bullet-list",
    levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  { reference: "bullet-list-2",
    levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  { reference: "bullet-list-3",
    levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  { reference: "bullet-list-4",
    levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  { reference: "numbered-list-1",
    levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  { reference: "numbered-list-2",
    levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }
];

// Helper function for creating table cells
function createCell(text, isHeader = false, width = 2340) {
  return new TableCell({
    borders: cellBorders,
    width: { size: width, type: WidthType.DXA },
    shading: isHeader ? { fill: colors.tableHeader, type: ShadingType.CLEAR } : { fill: colors.tableBg, type: ShadingType.CLEAR },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ 
        text: text, 
        bold: isHeader, 
        size: isHeader ? 20 : 18, 
        color: isHeader ? "FFFFFF" : colors.bodyText,
        font: "Times New Roman"
      })]
    })]
  });
}

// Helper for bullet points
function bulletPoint(text, ref = "bullet-list") {
  return new Paragraph({
    numbering: { reference: ref, level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text: text, size: 22, color: colors.bodyText, font: "Times New Roman" })]
  });
}

// Helper for section paragraphs
function sectionPara(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text: text, size: 22, color: colors.bodyText, font: "Times New Roman" })]
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Times New Roman", size: 22 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal",
        run: { size: 56, bold: true, color: colors.primary, font: "Times New Roman" },
        paragraph: { spacing: { before: 240, after: 120 }, alignment: AlignmentType.CENTER } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: colors.primary, font: "Times New Roman" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: colors.secondary, font: "Times New Roman" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, color: colors.bodyText, font: "Times New Roman" },
        paragraph: { spacing: { before: 150, after: 80 }, outlineLevel: 2 } }
    ]
  },
  numbering: { config: numberingConfig },
  sections: [
    // ===== COVER PAGE =====
    {
      properties: {
        page: { margin: { top: 0, right: 0, bottom: 0, left: 0 } }
      },
      children: [
        new Paragraph({ spacing: { before: 6000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "RELATÓRIO TÉCNICO", size: 28, color: colors.secondary, font: "Times New Roman" })]
        }),
        new Paragraph({ spacing: { before: 400 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "ConstrutorPro", size: 72, bold: true, color: colors.primary, font: "Times New Roman" })]
        }),
        new Paragraph({ spacing: { before: 200 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Plataforma B2B SaaS para Gestão de Construtoras", size: 28, color: colors.secondary, font: "Times New Roman" })]
        }),
        new Paragraph({ spacing: { before: 2000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Documentação Completa do Sistema", size: 24, color: colors.bodyText, font: "Times New Roman" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Rotas, Fluxos, APIs e Arquitetura", size: 24, color: colors.bodyText, font: "Times New Roman" })]
        }),
        new Paragraph({ spacing: { before: 3000 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Versão 1.0 | Abril 2026", size: 20, color: colors.accent, font: "Times New Roman" })]
        })
      ]
    },
    // ===== TABLE OF CONTENTS =====
    {
      properties: {
        page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "ConstrutorPro - Relatório Técnico", size: 18, color: colors.secondary, font: "Times New Roman" })]
        })] })
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Página ", size: 18, font: "Times New Roman" }), new TextRun({ children: [PageNumber.CURRENT], size: 18 }), new TextRun({ text: " de ", size: 18, font: "Times New Roman" }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 })]
        })] })
      },
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Sumário")] }),
        new TableOfContents("Sumário", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 },
          children: [new TextRun({ text: "Nota: Clique com o botão direito no Sumário e selecione 'Atualizar Campo' para ver os números de página corretos.", size: 18, color: "999999", font: "Times New Roman", italics: true })]
        }),
        new Paragraph({ children: [new PageBreak()] })
      ]
    },
    // ===== MAIN CONTENT =====
    {
      properties: {
        page: { margin: { top: 1800, right: 1440, bottom: 1440, left: 1440 } }
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "ConstrutorPro - Relatório Técnico", size: 18, color: colors.secondary, font: "Times New Roman" })]
        })] })
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Página ", size: 18, font: "Times New Roman" }), new TextRun({ children: [PageNumber.CURRENT], size: 18 }), new TextRun({ text: " de ", size: 18, font: "Times New Roman" }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 })]
        })] })
      },
      children: [
        // ===== SECTION 1: VISÃO GERAL =====
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("1. Visão Geral do Projeto")] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.1 Descrição")] }),
        sectionPara("O ConstrutorPro é uma plataforma B2B SaaS desenvolvida especificamente para o mercado de construção civil brasileiro. O sistema oferece uma solução completa para gestão de construtoras, abrangendo desde o controle de projetos e orçamentos até o acompanhamento financeiro e operacional de obras. A plataforma foi projetada para atender às necessidades específicas do setor, incluindo composições de preços, diário de obra digital, cronogramas físico-financeiros e assistente de IA para engenheiros."),
        
        sectionPara("O sistema opera em modelo multi-tenant, permitindo que múltiplas empresas utilizem a plataforma de forma isolada e segura, cada uma com seus próprios dados, usuários e configurações. A arquitetura foi desenvolvida utilizando tecnologias modernas e escaláveis, garantindo alta performance e manutenibilidade."),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.2 Público-Alvo")] }),
        bulletPoint("Construtoras de pequeno, médio e grande porte"),
        bulletPoint("Incorporadoras imobiliárias"),
        bulletPoint("Empresas de engenharia civil"),
        bulletPoint("Escritórios de arquitetura com foco em obras"),
        bulletPoint("Gestores de projetos de construção"),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("1.3 Principais Funcionalidades")] }),
        sectionPara("O sistema contempla um conjunto abrangente de módulos que cobrem todas as etapas da gestão de uma construtora, desde o planejamento até a entrega da obra. Cada módulo foi desenvolvido pensando nas particularidades do mercado brasileiro de construção civil."),
        
        // ===== SECTION 2: STACK TECNOLÓGICO =====
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("2. Stack Tecnológico")] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.1 Frontend")] }),
        new Table({
          columnWidths: [3500, 5860],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [createCell("Tecnologia", true, 3500), createCell("Descrição", true, 5860)] }),
            new TableRow({ children: [createCell("Next.js 16.1.3", false, 3500), createCell("Framework React com App Router e Turbopack", false, 5860)] }),
            new TableRow({ children: [createCell("React 19", false, 3500), createCell("Biblioteca para construção de interfaces", false, 5860)] }),
            new TableRow({ children: [createCell("TypeScript 5", false, 3500), createCell("Linguagem tipada para JavaScript", false, 5860)] }),
            new TableRow({ children: [createCell("Tailwind CSS 4", false, 3500), createCell("Framework CSS utilitário", false, 5860)] }),
            new TableRow({ children: [createCell("shadcn/ui", false, 3500), createCell("Biblioteca de componentes (estilo New York)", false, 5860)] }),
            new TableRow({ children: [createCell("Recharts", false, 3500), createCell("Biblioteca de gráficos para React", false, 5860)] }),
            new TableRow({ children: [createCell("Framer Motion", false, 3500), createCell("Biblioteca de animações", false, 5860)] }),
            new TableRow({ children: [createCell("Lucide React", false, 3500), createCell("Biblioteca de ícones", false, 5860)] })
          ]
        }),
        new Paragraph({ spacing: { after: 200 } }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.2 Backend")] }),
        new Table({
          columnWidths: [3500, 5860],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [createCell("Tecnologia", true, 3500), createCell("Descrição", true, 5860)] }),
            new TableRow({ children: [createCell("Next.js API Routes", false, 3500), createCell("APIs serverless integradas", false, 5860)] }),
            new TableRow({ children: [createCell("Prisma ORM 6", false, 3500), createCell("ORM para banco de dados", false, 5860)] }),
            new TableRow({ children: [createCell("NextAuth.js 4", false, 3500), createCell("Autenticação e autorização", false, 5860)] }),
            new TableRow({ children: [createCell("bcryptjs", false, 3500), createCell("Hash de senhas", false, 5860)] }),
            new TableRow({ children: [createCell("Zod", false, 3500), createCell("Validação de schemas", false, 5860)] }),
            new TableRow({ children: [createCell("z-ai-web-dev-sdk", false, 3500), createCell("SDK para integração com IA", false, 5860)] })
          ]
        }),
        new Paragraph({ spacing: { after: 200 } }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("2.3 Banco de Dados")] }),
        new Table({
          columnWidths: [3500, 5860],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [createCell("Ambiente", true, 3500), createCell("Banco de Dados", true, 5860)] }),
            new TableRow({ children: [createCell("Desenvolvimento", false, 3500), createCell("SQLite (arquivo local)", false, 5860)] }),
            new TableRow({ children: [createCell("Produção", false, 3500), createCell("PostgreSQL (recomendado)", false, 5860)] })
          ]
        }),
        new Paragraph({ spacing: { after: 200 } }),
        
        // ===== SECTION 3: ESTRUTURA DE ROTAS =====
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("3. Estrutura de Rotas")] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.1 Rotas Públicas")] }),
        sectionPara("As rotas públicas são acessíveis sem autenticação e incluem páginas de marketing, informações sobre o produto e páginas de autenticação. Estas rotas utilizam o grupo de rotas (public) para organizar o código."),
        
        new Table({
          columnWidths: [3000, 6360],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [createCell("Rota", true, 3000), createCell("Descrição", true, 6360)] }),
            new TableRow({ children: [createCell("/", false, 3000), createCell("Página inicial (landing page)", false, 6360)] }),
            new TableRow({ children: [createCell("/precos", false, 3000), createCell("Página de preços e planos", false, 6360)] }),
            new TableRow({ children: [createCell("/sobre", false, 3000), createCell("Sobre a empresa/produto", false, 6360)] }),
            new TableRow({ children: [createCell("/contato", false, 3000), createCell("Formulário de contato", false, 6360)] }),
            new TableRow({ children: [createCell("/login", false, 3000), createCell("Página de autenticação", false, 6360)] })
          ]
        }),
        new Paragraph({ spacing: { after: 200 } }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("3.2 Rotas Autenticadas (Dashboard)")] }),
        sectionPara("Todas as rotas do dashboard requerem autenticação. O middleware controla o acesso baseado no perfil do usuário. A tabela abaixo apresenta os módulos principais e suas funcionalidades."),
        
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Módulo de Projetos")] }),
        new Table({
          columnWidths: [3500, 2800, 3060],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [createCell("Rota", true, 3500), createCell("Método", true, 2800), createCell("Descrição", true, 3060)] }),
            new TableRow({ children: [createCell("/projetos", false, 3500), createCell("GET", false, 2800), createCell("Listar projetos", false, 3060)] }),
            new TableRow({ children: [createCell("/projetos/novo", false, 3500), createCell("GET/POST", false, 2800), createCell("Criar novo projeto", false, 3060)] }),
            new TableRow({ children: [createCell("/projetos/[id]", false, 3500), createCell("GET", false, 2800), createCell("Visualizar projeto", false, 3060)] }),
            new TableRow({ children: [createCell("/projetos/[id]/editar", false, 3500), createCell("GET/PUT", false, 2800), createCell("Editar projeto", false, 3060)] })
          ]
        }),
        new Paragraph({ spacing: { after: 150 } }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Módulo de Orçamentos")] }),
        new Table({
          columnWidths: [3500, 2800, 3060],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [createCell("Rota", true, 3500), createCell("Método", true, 2800), createCell("Descrição", true, 3060)] }),
            new TableRow({ children: [createCell("/orcamentos", false, 3500), createCell("GET", false, 2800), createCell("Listar orçamentos", false, 3060)] }),
            new TableRow({ children: [createCell("/orcamentos/novo", false, 3500), createCell("GET/POST", false, 2800), createCell("Criar orçamento", false, 3060)] }),
            new TableRow({ children: [createCell("/orcamentos/[id]", false, 3500), createCell("GET", false, 2800), createCell("Visualizar orçamento", false, 3060)] }),
            new TableRow({ children: [createCell("/orcamentos/[id]/editar", false, 3500), createCell("GET/PUT", false, 2800), createCell("Editar orçamento", false, 3060)] })
          ]
        }),
        new Paragraph({ spacing: { after: 150 } }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Módulo Financeiro")] }),
        new Table({
          columnWidths: [3500, 2800, 3060],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [createCell("Rota", true, 3500), createCell("Método", true, 2800), createCell("Descrição", true, 3060)] }),
            new TableRow({ children: [createCell("/financeiro", false, 3500), createCell("GET", false, 2800), createCell("Dashboard financeiro", false, 3060)] }),
            new TableRow({ children: [createCell("/financeiro/nova-transacao", false, 3500), createCell("GET/POST", false, 2800), createCell("Nova transação", false, 3060)] })
          ]
        }),
        new Paragraph({ spacing: { after: 150 } }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Outros Módulos")] }),
        new Table({
          columnWidths: [3000, 3000, 3360],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [createCell("Módulo", true, 3000), createCell("Rota Base", true, 3000), createCell("Funcionalidades", true, 3360)] }),
            new TableRow({ children: [createCell("Clientes", false, 3000), createCell("/clientes", false, 3000), createCell("CRUD completo", false, 3360)] }),
            new TableRow({ children: [createCell("Fornecedores", false, 3000), createCell("/fornecedores", false, 3000), createCell("CRUD completo", false, 3360)] }),
            new TableRow({ children: [createCell("Composições", false, 3000), createCell("/composicoes", false, 3000), createCell("CRUD + itens", false, 3360)] }),
            new TableRow({ children: [createCell("Materiais", false, 3000), createCell("/materiais", false, 3000), createCell("Estoque + CRUD", false, 3360)] }),
            new TableRow({ children: [createCell("Cronograma", false, 3000), createCell("/cronograma", false, 3000), createCell("Tarefas + Gantt", false, 3360)] }),
            new TableRow({ children: [createCell("Diário de Obra", false, 3000), createCell("/diario-obra", false, 3000), createCell("Atividades + Fotos", false, 3360)] }),
            new TableRow({ children: [createCell("Medições", false, 3000), createCell("/medicoes", false, 3000), createCell("Medições de obra", false, 3360)] }),
            new TableRow({ children: [createCell("Cotações", false, 3000), createCell("/cotacoes", false, 3000), createCell("Cotações + Respostas", false, 3360)] }),
            new TableRow({ children: [createCell("Relatórios", false, 3000), createCell("/relatorios", false, 3000), createCell("Dashboards + Export", false, 3360)] }),
            new TableRow({ children: [createCell("IA", false, 3000), createCell("/ia", false, 3000), createCell("Assistente IA", false, 3360)] }),
            new TableRow({ children: [createCell("Admin", false, 3000), createCell("/admin", false, 3000), createCell("Gestão sistema", false, 3360)] })
          ]
        }),
        new Paragraph({ spacing: { after: 200 } }),
        
        // ===== SECTION 4: APIs =====
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("4. APIs REST")] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("4.1 Estrutura das APIs")] }),
        sectionPara("Todas as APIs seguem o padrão REST e estão localizadas em /api/. A autenticação é feita via sessão NextAuth, e as respostas são em formato JSON. O middleware garante que apenas usuários autenticados acessem as APIs protegidas."),
        
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("APIs de Projetos")] }),
        new Table({
          columnWidths: [4000, 1800, 3560],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [createCell("Endpoint", true, 4000), createCell("Método", true, 1800), createCell("Descrição", true, 3560)] }),
            new TableRow({ children: [createCell("/api/projetos", false, 4000), createCell("GET", false, 1800), createCell("Lista projetos da empresa", false, 3560)] }),
            new TableRow({ children: [createCell("/api/projetos", false, 4000), createCell("POST", false, 1800), createCell("Cria novo projeto", false, 3560)] }),
            new TableRow({ children: [createCell("/api/projetos/[id]", false, 4000), createCell("GET", false, 1800), createCell("Busca projeto por ID", false, 3560)] }),
            new TableRow({ children: [createCell("/api/projetos/[id]", false, 4000), createCell("PUT", false, 1800), createCell("Atualiza projeto", false, 3560)] }),
            new TableRow({ children: [createCell("/api/projetos/[id]", false, 4000), createCell("DELETE", false, 1800), createCell("Remove projeto", false, 3560)] }),
            new TableRow({ children: [createCell("/api/projetos/[id]/budget-vs-actual", false, 4000), createCell("GET", false, 1800), createCell("Comparativo orçado x real", false, 3560)] })
          ]
        }),
        new Paragraph({ spacing: { after: 150 } }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("APIs de Autenticação")] }),
        new Table({
          columnWidths: [4500, 1800, 3060],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [createCell("Endpoint", true, 4500), createCell("Método", true, 1800), createCell("Descrição", true, 3060)] }),
            new TableRow({ children: [createCell("/api/auth/signin/credentials", false, 4500), createCell("POST", false, 1800), createCell("Login com credenciais", false, 3060)] }),
            new TableRow({ children: [createCell("/api/auth/signout", false, 4500), createCell("POST", false, 1800), createCell("Logout do usuário", false, 3060)] }),
            new TableRow({ children: [createCell("/api/auth/session", false, 4500), createCell("GET", false, 1800), createCell("Dados da sessão atual", false, 3060)] }),
            new TableRow({ children: [createCell("/api/auth/csrf", false, 4500), createCell("GET", false, 1800), createCell("Token CSRF", false, 3060)] })
          ]
        }),
        new Paragraph({ spacing: { after: 150 } }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("APIs de IA")] }),
        new Table({
          columnWidths: [4000, 1800, 3560],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [createCell("Endpoint", true, 4000), createCell("Método", true, 1800), createCell("Descrição", true, 3560)] }),
            new TableRow({ children: [createCell("/api/ia/chat", false, 4000), createCell("POST", false, 1800), createCell("Chat com assistente IA", false, 3560)] }),
            new TableRow({ children: [createCell("/api/ia/conversas", false, 4000), createCell("GET", false, 1800), createCell("Lista conversas", false, 3560)] }),
            new TableRow({ children: [createCell("/api/ia/conversas/[id]", false, 4000), createCell("GET", false, 1800), createCell("Histórico de conversa", false, 3560)] }),
            new TableRow({ children: [createCell("/api/ia/orcamento", false, 4000), createCell("POST", false, 1800), createCell("Análise de orçamento", false, 3560)] })
          ]
        }),
        new Paragraph({ spacing: { after: 200 } }),
        
        // ===== SECTION 5: AUTENTICAÇÃO =====
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("5. Sistema de Autenticação")] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.1 Visão Geral")] }),
        sectionPara("O sistema utiliza NextAuth.js v4 com estratégia JWT para gerenciamento de sessões. A autenticação é feita via credenciais (email/senha) com senhas hasheadas usando bcrypt. O middleware controla o acesso às rotas protegidas e aplica regras de autorização baseadas em perfis."),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.2 Perfis de Usuário")] }),
        sectionPara("O sistema implementa controle de acesso baseado em roles (RBAC), com 8 perfis predefinidos que determinam as permissões de acesso a cada módulo."),
        
        new Table({
          columnWidths: [2500, 3000, 3860],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [createCell("Perfil", true, 2500), createCell("Nome", true, 3000), createCell("Acesso", true, 3860)] }),
            new TableRow({ children: [createCell("master_admin", false, 2500), createCell("Administrador Master", false, 3000), createCell("Acesso total ao sistema", false, 3860)] }),
            new TableRow({ children: [createCell("company_admin", false, 2500), createCell("Admin da Empresa", false, 3000), createCell("Gestão da empresa", false, 3860)] }),
            new TableRow({ children: [createCell("manager", false, 2500), createCell("Gerente", false, 3000), createCell("Todos os módulos operacionais", false, 3860)] }),
            new TableRow({ children: [createCell("engineer", false, 2500), createCell("Engenheiro", false, 3000), createCell("Projetos, orçamentos, cronograma", false, 3860)] }),
            new TableRow({ children: [createCell("finance", false, 2500), createCell("Financeiro", false, 3000), createCell("Módulo financeiro + relatórios", false, 3860)] }),
            new TableRow({ children: [createCell("procurement", false, 2500), createCell("Compras", false, 3000), createCell("Fornecedores, materiais, cotações", false, 3860)] }),
            new TableRow({ children: [createCell("operations", false, 2500), createCell("Operações", false, 3000), createCell("Diário de obra, cronograma", false, 3860)] }),
            new TableRow({ children: [createCell("viewer", false, 2500), createCell("Visualizador", false, 3000), createCell("Apenas leitura", false, 3860)] })
          ]
        }),
        new Paragraph({ spacing: { after: 200 } }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("5.3 Fluxo de Autenticação")] }),
        sectionPara("O processo de autenticação segue um fluxo seguro com múltiplas validações, garantindo que apenas usuários ativos de empresas ativas possam acessar o sistema."),
        
        new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun({ text: "Usuário acessa /login e insere credenciais", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun({ text: "Frontend envia POST para /api/auth/signin/credentials", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun({ text: "NextAuth invoca função authorize()", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun({ text: "Sistema busca usuário por email (case-insensitive)", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun({ text: "Valida se usuário está ativo", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun({ text: "Valida se empresa do usuário está ativa", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun({ text: "Compara senha com hash usando bcrypt.compare()", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun({ text: "Se válido, cria JWT com dados do usuário", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered-list-1", level: 0 }, children: [new TextRun({ text: "Redireciona para /dashboard", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ spacing: { after: 200 } }),
        
        // ===== SECTION 6: BANCO DE DADOS =====
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("6. Modelo de Dados")] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.1 Entidades Principais")] }),
        sectionPara("O banco de dados foi projetado para suportar o modelo multi-tenant, com isolamento de dados por empresa. O schema utiliza 35 modelos que cobrem todas as funcionalidades do sistema."),
        
        new Table({
          columnWidths: [2800, 3000, 3560],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [createCell("Modelo", true, 2800), createCell("Tabela", true, 3000), createCell("Descrição", true, 3560)] }),
            new TableRow({ children: [createCell("Company", false, 2800), createCell("companies", false, 3000), createCell("Empresas (multi-tenant)", false, 3560)] }),
            new TableRow({ children: [createCell("User", false, 2800), createCell("users", false, 3000), createCell("Usuários do sistema", false, 3560)] }),
            new TableRow({ children: [createCell("Project", false, 2800), createCell("projects", false, 3000), createCell("Projetos de construção", false, 3560)] }),
            new TableRow({ children: [createCell("Client", false, 2800), createCell("clients", false, 3000), createCell("Clientes da empresa", false, 3560)] }),
            new TableRow({ children: [createCell("Supplier", false, 2800), createCell("suppliers", false, 3000), createCell("Fornecedores", false, 3560)] }),
            new TableRow({ children: [createCell("Budget", false, 2800), createCell("budgets", false, 3000), createCell("Orçamentos", false, 3560)] }),
            new TableRow({ children: [createCell("Composition", false, 2800), createCell("compositions", false, 3000), createCell("Composições de preços", false, 3560)] }),
            new TableRow({ children: [createCell("Material", false, 2800), createCell("materials", false, 3000), createCell("Materiais/Insumos", false, 3560)] }),
            new TableRow({ children: [createCell("Schedule", false, 2800), createCell("schedules", false, 3000), createCell("Cronogramas", false, 3560)] }),
            new TableRow({ children: [createCell("DailyLog", false, 2800), createCell("daily_logs", false, 3000), createCell("Diário de obra", false, 3560)] }),
            new TableRow({ children: [createCell("Transaction", false, 2800), createCell("transactions", false, 3000), createCell("Transações financeiras", false, 3560)] }),
            new TableRow({ children: [createCell("AIConversation", false, 2800), createCell("ai_conversations", false, 3000), createCell("Conversas com IA", false, 3560)] })
          ]
        }),
        new Paragraph({ spacing: { after: 200 } }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("6.2 Enums do Sistema")] }),
        sectionPara("O schema utiliza diversos enums para garantir a integridade dos dados e padronização de valores em todo o sistema."),
        
        new Table({
          columnWidths: [3000, 6360],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [createCell("Enum", true, 3000), createCell("Valores", true, 6360)] }),
            new TableRow({ children: [createCell("UserRole", false, 3000), createCell("master_admin, company_admin, manager, engineer, finance, procurement, operations, viewer", false, 6360)] }),
            new TableRow({ children: [createCell("CompanyPlan", false, 3000), createCell("starter, professional, enterprise", false, 6360)] }),
            new TableRow({ children: [createCell("ProjectStatus", false, 3000), createCell("planning, active, paused, completed, cancelled", false, 6360)] }),
            new TableRow({ children: [createCell("BudgetStatus", false, 3000), createCell("draft, pending, approved, rejected, revision", false, 6360)] }),
            new TableRow({ children: [createCell("PaymentStatus", false, 3000), createCell("pending, partial, paid, overdue, cancelled", false, 6360)] }),
            new TableRow({ children: [createCell("ScheduleStatus", false, 3000), createCell("pending, in_progress, completed, delayed, cancelled", false, 6360)] })
          ]
        }),
        new Paragraph({ spacing: { after: 200 } }),
        
        // ===== SECTION 7: COMPONENTES UI =====
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("7. Biblioteca de Componentes")] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("7.1 Componentes shadcn/ui")] }),
        sectionPara("O sistema utiliza 50+ componentes da biblioteca shadcn/ui no estilo New York, garantindo consistência visual e acessibilidade. Todos os componentes são construídos sobre Radix UI primitives."),
        
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Componentes de Formulário")] }),
        bulletPoint("Button - Botões com variantes (default, destructive, outline, ghost, link)", "bullet-list-2"),
        bulletPoint("Input - Campos de texto com suporte a ícones", "bullet-list-2"),
        bulletPoint("Select - Seletores dropdown", "bullet-list-2"),
        bulletPoint("Checkbox - Caixas de seleção", "bullet-list-2"),
        bulletPoint("RadioGroup - Grupos de opções", "bullet-list-2"),
        bulletPoint("Switch - Interruptores toggle", "bullet-list-2"),
        bulletPoint("Textarea - Áreas de texto", "bullet-list-2"),
        bulletPoint("DatePicker - Seletores de data", "bullet-list-2"),
        
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Componentes de Feedback")] }),
        bulletPoint("Dialog - Modais e diálogos", "bullet-list-3"),
        bulletPoint("AlertDialog - Diálogos de confirmação", "bullet-list-3"),
        bulletPoint("Toast/Sonner - Notificações", "bullet-list-3"),
        bulletPoint("Progress - Barras de progresso", "bullet-list-3"),
        bulletPoint("Skeleton - Estados de carregamento", "bullet-list-3"),
        
        new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun("Componentes de Navegação")] }),
        bulletPoint("Tabs - Abas de navegação", "bullet-list-4"),
        bulletPoint("DropdownMenu - Menus dropdown", "bullet-list-4"),
        bulletPoint("NavigationMenu - Menu principal", "bullet-list-4"),
        bulletPoint("Breadcrumb - Navegação estrutural", "bullet-list-4"),
        new Paragraph({ spacing: { after: 200 } }),
        
        // ===== SECTION 8: FLUXOS =====
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("8. Fluxos Principais")] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.1 Fluxo de Criação de Projeto")] }),
        sectionPara("O processo de criação de um novo projeto envolve múltiplas etapas e entidades, desde o cadastro inicial até a associação com orçamentos e cronogramas."),
        
        new Paragraph({ numbering: { reference: "numbered-list-2", level: 0 }, children: [new TextRun({ text: "Usuário acessa /projetos/novo", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered-list-2", level: 0 }, children: [new TextRun({ text: "Sistema carrega lista de clientes para seleção", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered-list-2", level: 0 }, children: [new TextRun({ text: "Usuário preenche dados do projeto (nome, código, endereço, datas, valor)", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered-list-2", level: 0 }, children: [new TextRun({ text: "Frontend valida campos com Zod schema", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered-list-2", level: 0 }, children: [new TextRun({ text: "POST para /api/projetos com dados validados", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered-list-2", level: 0 }, children: [new TextRun({ text: "Backend cria projeto vinculado à empresa do usuário", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered-list-2", level: 0 }, children: [new TextRun({ text: "Sistema registra atividade no log", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ numbering: { reference: "numbered-list-2", level: 0 }, children: [new TextRun({ text: "Redireciona para página do projeto criado", size: 22, font: "Times New Roman" })] }),
        new Paragraph({ spacing: { after: 200 } }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.2 Fluxo de Diário de Obra")] }),
        sectionPara("O diário de obra é um dos módulos mais importantes, permitindo o registro diário de atividades, condições climáticas, trabalhadores e ocorrências."),
        
        sectionPara("Funcionalidades:"),
        bulletPoint("Registro de condições climáticas (ensolarado, nublado, chuvoso, tempestade)"),
        bulletPoint("Controle de temperatura mínima e máxima"),
        bulletPoint("Horário de início e fim dos trabalhos"),
        bulletPoint("Número de trabalhadores na obra"),
        bulletPoint("Resumo das atividades do dia"),
        bulletPoint("Registro de ocorrências e incidentes"),
        bulletPoint("Upload de fotos"),
        bulletPoint("Registro de visitantes"),
        new Paragraph({ spacing: { after: 200 } }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("8.3 Fluxo de Assistente IA")] }),
        sectionPara("O módulo de IA oferece um assistente inteligente para engenheiros, utilizando o modelo GLM via z-ai-web-dev-sdk. O assistente pode ajudar com análises técnicas, sugestões de composições, e consultas sobre normas técnicas."),
        
        bulletPoint("Chat contextualizado com histórico de conversas"),
        bulletPoint("Análise de orçamentos com sugestões de otimização"),
        bulletPoint("Geração de relatórios automáticos"),
        bulletPoint("Respostas baseadas no contexto da construção civil brasileira"),
        new Paragraph({ spacing: { after: 200 } }),
        
        // ===== SECTION 9: SEGURANÇA =====
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("9. Segurança")] }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("9.1 Medidas Implementadas")] }),
        bulletPoint("Senhas hasheadas com bcrypt (salt rounds: 10)"),
        bulletPoint("Sessões JWT com expiração configurável"),
        bulletPoint("Proteção CSRF em todos os formulários"),
        bulletPoint("Validação de entrada com Zod schemas"),
        bulletPoint("Isolamento de dados por empresa (multi-tenant)"),
        bulletPoint("Middleware de autorização por perfil"),
        bulletPoint("Headers de segurança (HSTS, XSS Protection, Frame Options)"),
        bulletPoint("Variáveis de ambiente para dados sensíveis"),
        new Paragraph({ spacing: { after: 200 } }),
        
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("9.2 Variáveis de Ambiente")] }),
        new Table({
          columnWidths: [3500, 5860],
          margins: { top: 100, bottom: 100, left: 180, right: 180 },
          rows: [
            new TableRow({ tableHeader: true, children: [createCell("Variável", true, 3500), createCell("Descrição", true, 5860)] }),
            new TableRow({ children: [createCell("DATABASE_URL", false, 3500), createCell("URL de conexão com banco de dados", false, 5860)] }),
            new TableRow({ children: [createCell("NEXTAUTH_SECRET", false, 3500), createCell("Chave secreta para JWT", false, 5860)] }),
            new TableRow({ children: [createCell("NEXTAUTH_URL", false, 3500), createCell("URL base da aplicação", false, 5860)] })
          ]
        }),
        new Paragraph({ spacing: { after: 200 } }),
        
        // ===== SECTION 10: CONCLUSÃO =====
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("10. Conclusão")] }),
        
        sectionPara("O ConstrutorPro é uma plataforma completa e moderna para gestão de construtoras, desenvolvida com tecnologias de ponta e arquitetura escalável. O sistema oferece um conjunto abrangente de funcionalidades que cobrem todas as necessidades do setor de construção civil brasileiro, desde o planejamento de projetos até o controle financeiro e operacional."),
        
        sectionPara("A arquitetura multi-tenant permite que múltiplas empresas utilizem a plataforma de forma isolada, enquanto o sistema de perfis garante que cada usuário tenha acesso apenas às funcionalidades pertinentes ao seu papel na organização. A integração com IA através do assistente inteligente adiciona um diferencial competitivo significativo, auxiliando engenheiros e gestores em suas decisões técnicas e operacionais."),
        
        sectionPara("O código-fonte está bem estruturado seguindo as melhores práticas de desenvolvimento, com tipagem forte em TypeScript, componentes reutilizáveis, e APIs RESTful bem definidas. A escolha do Next.js 16 com App Router e Turbopack garante alta performance tanto no desenvolvimento quanto em produção.")
      ]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/z/my-project/download/ConstrutorPro_Relatorio_Tecnico.docx", buffer);
  console.log("Relatório gerado com sucesso!");
});
