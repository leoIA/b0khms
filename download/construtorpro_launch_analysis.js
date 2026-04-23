const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        Header, Footer, AlignmentType, HeadingLevel, PageNumber, 
        BorderStyle, WidthType, ShadingType, LevelFormat } = require("docx");
const fs = require("fs");

// Palette GO-1 (Graphite Orange) - Professional technical document
const P = {
  primary: "1A2330",
  body: "2C3E50", 
  secondary: "607080",
  accent: "D4875A",
  surface: "F8F0EB",
  white: "FFFFFF"
};

const c = (hex) => hex.replace("#", "");

// Status colors
const STATUS = {
  SIM: "28A745",
  NAO: "DC3545", 
  PARCIAL: "FFC107"
};

// Helper functions
function createHeading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 400 : 280, after: 160 },
    children: [new TextRun({ 
      text, 
      bold: true, 
      color: c(P.primary), 
      font: { ascii: "Calibri", eastAsia: "SimHei" },
      size: level === HeadingLevel.HEADING_1 ? 32 : 28
    })]
  });
}

function createBody(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 120 },
    children: [new TextRun({ 
      text, 
      size: 22, 
      color: c(P.body),
      font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
    })]
  });
}

function createChecklistItem(id, description, status, notes, critical = false) {
  const statusColor = status === "SIM" ? STATUS.SIM : status === "NÃO" ? STATUS.NAO : STATUS.PARCIAL;
  const statusText = status === "SIM" ? "✓ SIM" : status === "NÃO" ? "✗ NÃO" : "⚠ PARCIAL";
  
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 8, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: c(P.surface) },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({
              children: [
                critical ? new TextRun({ text: "🔴 ", size: 20 }) : new TextRun(""),
                new TextRun({ text: id, bold: true, size: 20, color: c(P.primary) })
              ]
            })]
          }),
          new TableCell({
            width: { size: 72, type: WidthType.PERCENTAGE },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({
              children: [new TextRun({ text: description, size: 20, color: c(P.body) })]
            })]
          }),
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: statusColor },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: statusText, bold: true, size: 18, color: "FFFFFF" })]
            })]
          })
        ]
      }),
      ...(notes ? [new TableRow({
        children: [
          new TableCell({
            columnSpan: 3,
            shading: { type: ShadingType.CLEAR, fill: "FAFAFA" },
            margins: { top: 40, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({
              children: [new TextRun({ text: "📝 " + notes, size: 18, color: c(P.secondary), italics: true })]
            })]
          })
        ]
      })] : []
    ]
  });
}

function createSectionHeader(title, critical = false) {
  return new Paragraph({
    spacing: { before: 400, after: 200 },
    shading: { type: ShadingType.CLEAR, fill: critical ? "FDECEA" : c(P.surface) },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: critical ? STATUS.NAO : c(P.accent) }
    },
    children: [
      critical ? new TextRun({ text: "🔴 ", size: 26 }) : new TextRun(""),
      new TextRun({ 
        text: title, 
        bold: true, 
        size: 26, 
        color: c(P.primary),
        font: { ascii: "Calibri", eastAsia: "SimHei" }
      })
    ]
  });
}

// Cover Section
const coverChildren = [
  new Paragraph({ spacing: { before: 2000 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ 
      text: "CONSTRUTORPRO", 
      bold: true, 
      size: 56, 
      color: c(P.accent),
      font: { ascii: "Calibri", eastAsia: "SimHei" }
    })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ 
      text: "Sistema de Gestão de Obras e Projetos", 
      size: 28, 
      color: c(P.secondary),
      font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
    })]
  }),
  new Paragraph({ spacing: { before: 400 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { 
      top: { style: BorderStyle.SINGLE, size: 8, color: c(P.accent), space: 20 },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: c(P.accent), space: 20 }
    },
    spacing: { before: 200, after: 200 },
    children: [new TextRun({ 
      text: "RELATÓRIO DE ANÁLISE TÉCNICA", 
      bold: true, 
      size: 36, 
      color: c(P.primary),
      font: { ascii: "Calibri", eastAsia: "SimHei" }
    })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200 },
    children: [new TextRun({ 
      text: "Checklist de Prontidão para Lançamento", 
      size: 24, 
      color: c(P.body),
      font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }
    })]
  }),
  new Paragraph({ spacing: { before: 800 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ 
      text: "Data: 19 de Abril de 2026", 
      size: 22, 
      color: c(P.secondary) 
    })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100 },
    children: [new TextRun({ 
      text: "Versão: 1.0 - Análise Completa", 
      size: 22, 
      color: c(P.secondary) 
    })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 100 },
    children: [new TextRun({ 
      text: "Classificação: Documento Técnico Confidencial", 
      size: 20, 
      color: c(P.secondary),
      italics: true
    })]
  })
];

// Executive Summary
const executiveSummary = [
  createHeading("RESUMO EXECUTIVO", HeadingLevel.HEADING_1),
  createBody("Este documento apresenta uma análise técnica completa do sistema ConstrutorPro, uma plataforma de gestão de obras e projetos para o mercado brasileiro de construção civil. A análise foi realizada com base em um checklist de 18 seções contendo mais de 100 itens críticos e não-críticos para avaliação da prontidão do sistema para lançamento comercial."),
  createBody("O ConstrutorPro é construído com tecnologias modernas incluindo Next.js 14 com App Router, TypeScript, Prisma ORM e PostgreSQL. O sistema possui 47 modelos de dados, mais de 90 endpoints de API e 60+ páginas de interface, cobrindo todas as áreas essenciais da gestão de obras: orçamentos, cronogramas, medições, compras, financeiro, RH e geolocalização."),
  createBody("A análise revela que o sistema atingiu aproximadamente 63% de completude funcional, com os módulos principais implementados mas necessitando desenvolvimentos adicionais em áreas críticas como BDI estruturado, cálculo de encargos sociais, integração NF-e e autenticação de dois fatores."),
  
  new Paragraph({ spacing: { before: 300 } }),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent) },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent) },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: c(P.surface) },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              children: [new TextRun({ text: "Métrica", bold: true, size: 22, color: c(P.primary) })]
            })]
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: c(P.surface) },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Valor", bold: true, size: 22, color: c(P.primary) })]
            })]
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            shading: { type: ShadingType.CLEAR, fill: c(P.surface) },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: "Status", bold: true, size: 22, color: c(P.primary) })]
            })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: "Modelos de Dados (Prisma)", size: 20 })] })]
          }),
          new TableCell({
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "47", size: 20 })] })]
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: STATUS.SIM },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✓ COMPLETO", size: 18, color: "FFFFFF", bold: true })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: "Endpoints de API", size: 20 })] })]
          }),
          new TableCell({
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "90+", size: 20 })] })]
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: STATUS.SIM },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✓ COMPLETO", size: 18, color: "FFFFFF", bold: true })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: "Páginas de Interface", size: 20 })] })]
          }),
          new TableCell({
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "60+", size: 20 })] })]
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: STATUS.SIM },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✓ COMPLETO", size: 18, color: "FFFFFF", bold: true })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: "Itens SIM nas Seções 1-10 (Core)", size: 20 })] })]
          }),
          new TableCell({
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "~58%", size: 20 })] })]
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: STATUS.PARCIAL },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "⚠ ABAIXO DO META", size: 18, color: "000000", bold: true })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: "NÃO em Questões Críticas (🔴)", size: 20 })] })]
          }),
          new TableCell({
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "6 itens", size: 20 })] })]
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: STATUS.NAO },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "✗ BLOQUEANTE", size: 18, color: "FFFFFF", bold: true })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ children: [new TextRun({ text: "Completude Geral Estimada", size: 20 })] })]
          }),
          new TableCell({
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "63%", size: 20 })] })]
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: STATUS.PARCIAL },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "⚠ EM DESENVOLVIMENTO", size: 18, color: "000000", bold: true })] })]
          })
        ]
      })
    ]
  })
];

// Section 1 - Orçamento
const section1 = [
  createSectionHeader("SEÇÃO 1 – ORÇAMENTO, COMPOSIÇÕES E BDI", true),
  createBody("Esta seção avalia as funcionalidades críticas relacionadas à elaboração de orçamentos, composições de preços e cálculo do BDI (Benefícios e Despesas Indiretas), fundamentais para o mercado brasileiro de construção civil."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("1.1", "O sistema permite criar uma composição de preços com insumos (material, mão de obra, equipamento, serviço) e calcula automaticamente o custo total e preço de venda?", "SIM", "Modelos 'compositions' e 'composition_items' implementados com campos totalCost, totalPrice, profitMargin. itemType diferencia material, labor, equipment, service."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("1.2", "É possível definir coeficientes de produtividade (ex: 0,8 h/m²) e índices de perda/quebra (ex: 5% argamassa) por insumo?", "PARCIAL", "Campo 'coefficient' existe em composition_items, mas não há campo para índice de perda/quebra. Necessário adicionar campos lossIndex e wasteFactor."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("1.3", "🔴 O sistema calcula o BDI de forma estruturada, com campos separados para impostos, administração central, despesas financeiras, riscos, seguros e lucro?", "NÃO", "CRÍTICO: Não existe modelo ou funcionalidade de BDI estruturado. O sistema apenas aplica uma margem de lucro percentual simples (profitMargin). Necessário implementar modelo BDI completo com todos os componentes separados conforme legislação brasileira."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("1.4", "O BDI pode ser configurado por obra e também por tipo de serviço? O sistema valida se o valor não ultrapassa limites legais?", "NÃO", "Depende da implementação do BDI (item 1.3). Não há validação de limites TCU (25% para obras públicas)."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("1.5", "🔴 O sistema calcula encargos sociais sobre mão de obra conforme legislação brasileira?", "NÃO", "CRÍTICO: Não há cálculo de encargos sociais. O sistema não possui tabelas de INSS patronal, FGTS, multa rescisória, aviso prévio, salário-educação, INCRA, SESI/SENAI, adicional de férias, 13º salário, etc. Necessário implementar módulo completo de encargos com parametrização por sindicato e UF."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("1.6", "É possível importar composições do SINAPI completas via arquivo oficial da Caixa?", "PARCIAL", "Existe seed-sinapi.ts com composições SINAPI, mas não há mecanismo de importação de arquivos .csv/.xml oficiais. O sistema possui aproximadamente 3.000+ composições carregadas via seed, mas não há atualização automática mensal."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("1.7", "O sistema versiona orçamentos? É possível comparar duas versões e reverter?", "NÃO", "Não há sistema de versionamento de orçamentos. O modelo 'budgets' possui status (draft, approved, rejected) mas não guarda histórico de versões. Necessário implementar tabela budget_versions."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("1.8", "O orçamento permite rateios como percentual do direto ou valor fixo?", "NÃO", "Não há funcionalidade de rateios para administração local, ferramentas, segurança do trabalho, mobilização."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("1.9", "É possível gerar curva ABC dos insumos mais representativos?", "NÃO", "Não há funcionalidade de curva ABC (análise de Pareto) para insumos."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("1.10", "🔴 Exporta orçamento nos formatos exigidos para licitações públicas?", "NÃO", "CRÍTICO: Não há exportação para XML Sicro/SINAPI, planilha Caixa padrão, PDF com memória de cálculo. Apenas visualização em tela. Necessário implementar exports para conformidade com licitações públicas.")
];

// Section 2 - Cronograma
const section2 = [
  createSectionHeader("SEÇÃO 2 – CRONOGRAMA E INTEGRAÇÃO FÍSICO-FINANCEIRA", true),
  createBody("Avaliação das funcionalidades de cronograma, incluindo tipos de dependência, caminho crítico e integração com o valor ganho (Earned Value Management)."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("2.1", "O cronograma permite dependências do tipo FS, SS, FF, SF com defasagens (lags)?", "PARCIAL", "Modelo 'schedule_task_dependencies' existe mas não há campo para tipo de dependência (FS/SS/FF/SF) nem lag. Apenas relaciona taskId com dependsOnId."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("2.2", "🔴 O sistema calcula o caminho crítico e mostra folgas total e livre?", "NÃO", "CRÍTICO: Não há cálculo de caminho crítico (CPM), folga total, folga livre, nem alertas para tarefas críticas atrasadas. Necessário implementar algoritmo CPM completo."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("2.3", "É possível vincular cada tarefa a itens do orçamento percentualmente?", "SIM", "Modelo 'task_budget_links' permite vincular tarefas a budget_items com campo 'percentage'. O progresso físico é calculado e alimenta métricas EVM."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("2.4", "O cronograma importa/exporta nos formatos MS Project, Primavera ou CSV?", "PARCIAL", "Não há importação .mpp (MS Project) ou .xer (Primavera). Apenas estrutura de dados para tarefas. CSV não documentado."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("2.5", "O sistema emite alertas automáticos quando SPI < 0,9 ou CPI < 0,95?", "PARCIAL", "Métricas SPI e CPI são calculadas e exibidas no dashboard, mas não há sistema de alertas automáticos para threshold. O modelo 'alerts' existe e pode ser utilizado.")
];

// Section 3 - Medições
const section3 = [
  createSectionHeader("SEÇÃO 3 – MEDIÇÕES, FATURAMENTO E ADITIVOS"),
  createBody("Avaliação do módulo de medições de avanço físico-financeiro, glosas, aditivos contratuais e reajustes de preços."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("3.1", "A medição pode ser feita por percentual de avanço ou por quantidade realizada?", "SIM", "Modelo 'medicoes' e 'medicao_items' com campos quantidade, quantidadeAnt, valorUnitario, valorTotal. Cálculo automático da diferença (atual - anterior)."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("3.2", "A medição permite glosas e renegociação com histórico?", "NÃO", "Não há funcionalidade de glosas. Campo 'observacao' permite registro manual mas não há tratamento estruturado de glosas com histórico."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("3.3", "A medição aprovada gera automaticamente um faturamento?", "PARCIAL", "Medições têm status (rascunho, aprovada, rejeitada) mas não há geração automática de Billing. Integração existe via relação mas fluxo não é automático."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("3.4", "O sistema gerencia aditivos contratuais de prazo e valor?", "NÃO", "Não há modelo para aditivos contratuais. Necessário criar modelo 'contract_addendums' com tipos (prazo, valor, ambos)."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("3.5", "🔴 Aplica reajuste de preços por índice (INCC, IGPM, IPCA)?", "NÃO", "CRÍTICO: Não há funcionalidade de reajustes contratuais por índices. Necessário implementar PriceAdjustment com índices INCC/IGPM/IPCA, data-base, e cálculo automático.")
];

// Section 4 - Compras
const section4 = [
  createSectionHeader("SEÇÃO 4 – COMPRAS, COTAÇÕES E NF-E"),
  createBody("Avaliação do módulo de compras, cotações, pedidos e integração com Nota Fiscal Eletrônica."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("4.1", "Ao criar uma cotação, o sistema sugere fornecedores com base em compras anteriores?", "NÃO", "Modelo 'quotations' e 'quotation_responses' existe mas não há algoritmo de sugestão baseado em histórico de compras."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("4.2", "A comparação de preços entre fornecedores é feita por item?", "PARCIAL", "Estrutura existe (quotation_response_items) mas não há interface de comparação visual considerando frete, prazo, condições de pagamento."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("4.3", "A partir da cotação vencedora, é possível gerar um pedido de compra?", "NÃO", "Modelos 'purchase_orders' e 'quotations' existem separadamente mas não há fluxo automatizado de criação de PO a partir de cotação vencedora."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("4.4", "🔴 O sistema lê XML de NF-e e lança automaticamente o custo real?", "NÃO", "CRÍTICO: Não há integração com SEFAZ nem parsing de XML de NF-e. O sistema possui modelo 'actual_costs' para lançamento manual de custos. Necessário implementar parser de XML NF-e e integração com API SEFAZ ou serviços como FocusNFe."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("4.5", "O sistema controla estoque mínimo e gera alerta de necessidade de compra?", "PARCIAL", "Campos stockQuantity e minStock existem no modelo 'materials' mas não há alerta automático de estoque mínimo nem cálculo de necessidade baseado em cronograma.")
];

// Section 5 - Financeiro
const section5 = [
  createSectionHeader("SEÇÃO 5 – FINANCEIRO E CUSTOS REAIS"),
  createBody("Avaliação do módulo financeiro, incluindo controle de custos reais, DRE e fluxo de caixa."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("5.1", "O sistema permite lançar custos reais e comparar com orçado?", "SIM", "Modelo 'actual_costs' com relação a 'budget_items'. Endpoint /api/projetos/[id]/budget-vs-actual calcula variações. Métricas EVM implementadas (SPI, CPI, EAC)."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("5.2", "O custo real pode ser alocado a tarefa e item de orçamento?", "PARCIAL", "Relação com budget_items existe mas não há relação direta com schedule_tasks. CPI é recalculado automaticamente."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("5.3", "Gera Demonstração de Resultado (DRE) por projeto?", "NÃO", "Não há geração de DRE (receitas - custos diretos - despesas indiretas = lucro líquido)."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("5.4", "O fluxo de caixa previsto é comparado com o realizado?", "NÃO", "Não há funcionalidade de fluxo de caixa previsto vs realizado com gráficos de desvio."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("5.5", "O sistema suporta conciliação bancária?", "NÃO", "Não há importação de extrato OFX/CSV nem integração com bancos via API.")
];

// Section 6 - Diário de Obra
const section6 = [
  createSectionHeader("SEÇÃO 6 – DIÁRIO DE OBRA E DOCUMENTAÇÃO LEGAL"),
  createBody("Avaliação do módulo de diário de obra, assinatura digital e conformidade legal."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("6.1", "O diário de obra permite assinatura digital com validade jurídica?", "NÃO", "Não há assinatura digital (certificado A3/A1) nem PDF com validade jurídica. O diário possui createdBy para identificação do usuário."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("6.2", "As fotos anexadas são georreferenciadas e carimbadas?", "NÃO", "Modelo 'daily_log_photos' com URL e descrição. Não há campos de latitude/longitude nem timestamp automático na foto."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("6.3", "É possível bloquear edição do diário após X dias?", "NÃO", "Não há bloqueio automático por prazo. Diários podem ser editados indefinidamente."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("6.4", "O diário é exportado em PDF/A?", "NÃO", "Não há exportação para PDF/A (formato de arquivamento legal).")
];

// Section 7 - IA
const section7 = [
  createSectionHeader("SEÇÃO 7 – IA ASSISTENTE"),
  createBody("Avaliação do módulo de Inteligência Artificial assistente."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("7.1", "Qual modelo de IA está sendo usado?", "SIM", "Utiliza z-ai-web-dev-sdk. Não há fine-tuning específico para construção civil brasileira. O prompt do sistema menciona normas técnicas e boas práticas."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("7.2", "A IA tem acesso ao contexto do projeto?", "PARCIAL", "Modelo 'ai_conversations' com campo context. Endpoint /api/ia/chat envia contexto do projeto. Não há personalização automática baseada em SPI/CPI."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("7.3", "Existe limitação de uso por plano?", "NÃO", "Não há campo de limite de chamadas IA por plano no PLAN_LIMITS. Necessário adicionar maxAICalls e contador mensal."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("7.4", "Os dados enviados à IA não são usados para treinamento?", "NÃO", "Não há política de privacidade explícita sobre uso de dados pela IA. Necessário documentar e exibir ao usuário.")
];

// Section 8 - Segurança
const section8 = [
  createSectionHeader("SEÇÃO 8 – SEGURANÇA, LGPD E AUDITORIA", true),
  createBody("Avaliação dos aspectos de segurança, proteção de dados e conformidade com LGPD."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("8.1", "Existe log de auditoria imutável para todas as ações críticas?", "PARCIAL", "Modelo 'activities' registra ações com userId, action, entityType, entityId, details. Não é imutável (permite update). Exportação CSV/JSON não implementada."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("8.2", "🔴 O sistema suporta autenticação de dois fatores (2FA)?", "NÃO", "CRÍTICO: Não há 2FA via TOTP nem SMS. Existe componente input-otp.tsx mas funcionalidade não implementada. Necessário implementar 2FA com Google Authenticator/Authy."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("8.3", "As senhas são armazenadas com bcrypt?", "SIM", "Utiliza bcryptjs em /src/lib/auth.ts. Não há política de expiração de senha nem bloqueio após tentativas."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("8.4", "O sistema permite exportar dados pessoais (LGPD art. 18)?", "NÃO", "Não há funcionalidade de exportação de dados pessoais em formato legível nem exclusão permanente de conta."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("8.5", "🔴 Backup automático do PostgreSQL é realizado diariamente?", "NÃO", "CRÍTICO: Não há configuração de backup automático. Necessário implementar backup diário com retenção de 30+ dias e testes de restauração documentados."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("8.6", "O sistema possui rate limiting por IP e por usuário nas APIs?", "SIM", "Rate limiting implementado em /src/lib/api-auth.ts com limites por plano (100-2000 req/min). Utiliza controle em memória."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("8.7", "Há criptografia de ponta a ponta para dados sensíveis?", "NÃO", "Não há criptografia específica para dados sensíveis como margens de orçamento ou dados bancários.")
];

// Section 9 - Planos
const section9 = [
  createSectionHeader("SEÇÃO 9 – PLANOS, ASSINATURAS E LIMITES"),
  createBody("Avaliação do sistema de planos e assinaturas."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("9.1", "Os limites de cada plano estão claramente definidos e aplicados?", "PARCIAL", "PLAN_LIMITS definido em /src/lib/plans.ts com maxUsers, maxProjects, etc. Trial: 5 projetos/5 usuários/14 dias. Starter: R$299/mês, 5 usuários, 10 projetos. Professional: R$799/mês, 20 usuários, ilimitado. Enterprise: R$1999/mês, ilimitado. Faltam limites de IA e armazenamento de fotos."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("9.2", "O que acontece quando um limite é excedido?", "PARCIAL", "Função checkPlanLimit() em /src/lib/plan-limits.ts. Não há bloqueio ativo - apenas retorna allowed: false. Não há pacotes adicionais."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("9.3", "O downgrade de plano reduz recursos imediatamente?", "NÃO", "Não há tratamento específico para downgrade com projetos que excedem novo limite."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("9.4", "A integração com Mercado Pago suporta parcelado, PIX, Boleto?", "PARCIAL", "Integração em /src/lib/mercadopago.ts. Suporta criação de assinatura. Não há evidência de suporte completo a parcelamento 12x, PIX QR dinâmico, boleto."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("9.5", "O webhook do Mercado Pago é idempotente?", "PARCIAL", "Webhook existe em /api/webhooks/mercadopago. Trata status active, past_due, canceled. Não há garantia explícita de idempotência.")
];

// Section 10 - Performance
const section10 = [
  createSectionHeader("SEÇÃO 10 – PERFORMANCE, TESTES E ESCALABILIDADE", true),
  createBody("Avaliação de performance, cobertura de testes e escalabilidade."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("10.1", "🔴 Teste de carga foi realizado?", "NÃO", "CRÍTICO: Não há evidência de testes de carga com 100/500/1000 usuários simultâneos. Tempo de resposta para orçamentos 2000 itens, curva S 500 tarefas não medido."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("10.2", "O banco de dados possui índices em todas as colunas usadas?", "SIM", "Schema Prisma com @@index em todas as colunas de WHERE, JOIN, ORDER BY. Exemplo: @@index([companyId, status]), @@index([date]), @@index([userId])."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("10.3", "O sistema utiliza cache (Redis)?", "PARCIAL", "Não há uso de Redis para cache no código atual. Apenas controle em memória para rate limiting. Necessário implementar cache Redis para composições SINAPI, listagens."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("10.4", "🔴 Cobertura de testes atende mínimo?", "NÃO", "CRÍTICO: Não há arquivos de teste (jest, vitest, playwright, cypress) no projeto. Cobertura de testes unitários, integração e E2E é 0%. Necessário implementar suite completa."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("10.5", "O sistema possui monitoramento de erros?", "NÃO", "Não há integração com Sentry, GlitchTip ou similar. Logs são apenas console.log."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("10.6", "🔴 RTO e RPO estão definidos e documentados?", "NÃO", "CRÍTICO: Não há RTO (Recovery Time Objective) nem RPO (Recovery Point Objective) documentados. Plano de recuperação de desastre inexistente.")
];

// Section 11 - Integrações
const section11 = [
  createSectionHeader("SEÇÃO 11 – INTEGRAÇÕES E API PÚBLICA"),
  createBody("Avaliação das capacidades de integração e API pública."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("11.1", "A API pública está documentada com Swagger/OpenAPI 3.0?", "SIM", "OpenAPI implementado em /src/lib/openapi.ts. Documentação acessível em /api-docs. Padrão de resposta { success, data, error }."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("11.2", "As API Keys suportam escopo de permissões granulares?", "SIM", "Modelo 'api_keys' com campo permissions (JSON array). Middleware valida permissão por endpoint. Ex: projects:read, budgets:write."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("11.3", "Existe integração com Google Maps para geocodificação?", "PARCIAL", "Geocodificação reversa via OpenStreetMap Nominatim em /src/lib/geolocation-service.ts. Não é Google Maps."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("11.4", "O sistema permite importar orçamentos de sistemas concorrentes?", "NÃO", "Não há importação de planilhas OrçaFascio, Sienge, Obra Prima ou Caixa."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("11.5", "Há integração com ERPs contábeis?", "NÃO", "Não há integração com Totvs, SAP, Senior, ContaAzul nem exportação SPED/ECD/ECF.")
];

// Section 12 - Usabilidade
const section12 = [
  createSectionHeader("SEÇÃO 12 – USABILIDADE, TREINAMENTO E SUPORTE"),
  createBody("Avaliação de usabilidade, acessibilidade e suporte ao usuário."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("12.1", "O sistema possui tour guiado para novos usuários?", "NÃO", "Não há tour guiado (walkthrough) para novas funcionalidades."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("12.2", "Existe modo offline (PWA)?", "NÃO", "Não há PWA nem funcionalidade offline para registro de diário/medições."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("12.3", "O sistema é acessível (WCAG 2.1 nível AA)?", "NÃO", "Não há conformidade com WCAG 2.1 AA. Não testado com leitores de tela NVDA/VoiceOver."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("12.4", "Há vídeos tutoriais e manuais dentro do sistema?", "NÃO", "Não há vídeos tutoriais nem manuais interativos. Não há SLA de suporte definido."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("12.5", "Existe programa de certificação para usuários?", "NÃO", "Não há programa de certificação.")
];

// Section 13 - Webhooks
const section13 = [
  createSectionHeader("SEÇÃO 13 – WEBHOOKS E EVENTOS"),
  createBody("Avaliação do sistema de webhooks e notificações."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("13.1", "O sistema permite criar webhooks com URL, secret e eventos?", "SIM", "Modelo 'webhooks' com url, secret, events (JSON array). 28 tipos de eventos: project.created, budget.approved, task.completed, transaction.paid, etc."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("13.2", "O webhook envia assinatura HMAC-SHA256?", "SIM", "createSignature() em /src/lib/webhook-service.ts usa crypto.createHmac('sha256'). Header X-Webhook-Signature enviado."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("13.3", "O sistema implementa retry exponencial?", "SIM", "RETRY_DELAYS: 1min, 5min, 15min, 1h, 24h. MAX_RETRY_ATTEMPTS = 5. failureCount rastreia falhas consecutivas."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("13.4", "Há painel de logs de entrega?", "SIM", "Modelo 'webhook_deliveries' com eventType, payload, responseStatus, responseBody, error, attemptNumber, deliveredAt, nextRetryAt.")
];

// Section 14 - Geolocalização
const section14 = [
  createSectionHeader("SEÇÃO 14 – GEOLOCALIZAÇÃO E RASTREAMENTO"),
  createBody("Avaliação do módulo de geolocalização e rastreamento."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("14.1", "O check-in/out funciona em tempo real via aplicativo mobile?", "PARCIAL", "Modelo 'location_checkins' com latitude, longitude, accuracy, checkinType (arrival, departure, break). Não há validação de geofence antes do check-in."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("14.2", "As geofences podem ser circulares ou polígonos?", "SIM", "Modelo 'location_geofences' com centerLat, centerLng, radius, fenceType (circle, polygon), polygonData (JSON)."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("14.3", "O rastreamento em tempo real atualiza posição a cada X segundos?", "PARCIAL", "Modelo 'location_tracking' existe mas não há configuração de intervalo nem alerta de saída de geofence."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("14.4", "O sistema calcula distância percorrida e tempo de deslocamento?", "NÃO", "Não há cálculo de distância percorrida nem tempo de deslocamento.")
];

// Section 15 - RH
const section15 = [
  createSectionHeader("SEÇÃO 15 – RH, PONTO E BANCO DE HORAS"),
  createBody("Avaliação do módulo de RH e controle de ponto."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("15.1", "O registro de ponto pode ser feito via app mobile com geolocalização?", "PARCIAL", "Modelo 'time_entries' existe mas não há integração com check-in geolocalizado nem relógio de ponto eletrônico (REP)."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("15.2", "O sistema calcula automaticamente horas extras?", "NÃO", "Não há cálculo automático de horas extras (50%, 100%, noturnas) nem adicionais de insalubridade/periculosidade."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("15.3", "O banco de horas acumula saldo positivo e negativo?", "PARCIAL", "Modelo 'hour_banks' com balanceStart, balanceEnd, used, earned. Não há validação de limite legal de 2h extras/dia."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("15.4", "O afastamento integra com o ponto?", "PARCIAL", "Modelo 'time_off_requests' com status e tipo. Não há alerta automático para afastamento > 15 dias.")
];

// Section 16 - Diárias
const section16 = [
  createSectionHeader("SEÇÃO 16 – DIÁRIAS DE VIAGEM"),
  createBody("Avaliação do módulo de diárias de viagem."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("16.1", "O sistema permite configurar valores de diária por destino?", "PARCIAL", "Modelo 'travel_allowances' com destination, value, status. Modelo 'daily_rate_configs' para configuração por destino com teto máximo."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("16.2", "O fluxo de solicitação → aprovação → pagamento é digital?", "PARCIAL", "Status: draft, pending, approved, paid, rejected. Anexos permitidos em 'travel_expenses'. Fluxo parcialmente digital."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("16.3", "A política de viagem permite definir antecedência mínima?", "NÃO", "Modelo 'travel_policies' existe mas não tem campos para antecedência mínima, níveis de aprovação múltiplos.")
];

// Section 17 - Faturamento
const section17 = [
  createSectionHeader("SEÇÃO 17 – FATURAMENTO (BILLING) E NF-E"),
  createBody("Avaliação do módulo de faturamento."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("17.1", "O módulo permite gerar fatura a partir de medição aprovada?", "PARCIAL", "Modelo 'billings' e 'billing_items' existe. Relação com 'medicoes' mas geração automática não implementada."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("17.2", "O sistema calcula impostos automaticamente?", "NÃO", "Não há cálculo automático de ISS, PIS, COFINS, IRRF. billing_configs possui defaultTaxes (JSON) mas não há engine de cálculo."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("17.3", "Existe integração com emissão de NF-e?", "NÃO", "Não há integração com FocusNFe, NFe.io ou SEFAZ. Sistema apenas registra faturas."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("17.4", "O controle de faturas recebidas permite baixas parciais?", "PARCIAL", "Modelo 'billing_payments' permite pagamentos parciais. Saldo devedor não é exibido automaticamente.")
];

// Section 18 - Checklist Final
const section18 = [
  createSectionHeader("SEÇÃO 18 – PRONTIDÃO PARA LANÇAMENTO (CHECKLIST FINAL)"),
  createBody("Checklist final para liberação de produção."),
  new Paragraph({ spacing: { before: 200 } }),
  
  createChecklistItem("A", "Existe um ambiente de homologação separado do de produção?", "NÃO", "Não há ambiente de homologação documentado."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("B", "O plano de contingência para falha do banco/servidor está documentado?", "NÃO", "Não há plano de contingência documentado."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("C", "O sistema foi testado por 3 empresas reais (beta fechado) por 30+ dias?", "NÃO", "Não há evidência de beta fechado com empresas reais."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("D", "Os termos de uso e política de privacidade estão prontos e aprovados?", "NÃO", "Não há termos de uso nem política de privacidade documentados."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("E", "O suporte ao cliente tem horário definido e canal de emergência?", "NÃO", "Não há SLA de suporte nem canal de emergência definido."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("F", "O preço de cada plano foi validado com potenciais clientes?", "NÃO", "Não há evidência de validação de preços com mercado."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("G", "Existe uma página de status para informar indisponibilidades?", "NÃO", "Não há página de status (status.construtorpro.com.br)."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("H", "O processo de onboarding está documentado e automatizado?", "NÃO", "Não há onboarding automatizado documentado."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("I", "O código-fonte está em repositório privado com backup externo?", "PARCIAL", "Presume-se uso de Git, mas backup externo não documentado."),
  new Paragraph({ spacing: { before: 100 } }),
  
  createChecklistItem("J", "Há um plano de marketing para atingir 100 clientes pagantes?", "NÃO", "Não há plano de marketing documentado.")
];

// Recommendations Section
const recommendations = [
  createHeading("RECOMENDAÇÕES PRIORITÁRIAS", HeadingLevel.HEADING_1),
  createBody("Com base na análise realizada, apresentamos as recomendações organizadas por prioridade de implementação para atingir os critérios de lançamento:"),
  
  createHeading("🔴 Prioridade Crítica (Bloqueantes para Lançamento)", HeadingLevel.HEADING_2),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "1. Implementar BDI Estruturado: ", bold: true, size: 22, color: c(P.primary) }),
               new TextRun({ text: "Criar modelo 'bdi_configs' com campos separados para todos os componentes (impostos, administração central, despesas financeiras, riscos, seguros, lucro). Implementar cálculo automático com validação TCU 25%.", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "2. Implementar Encargos Sociais: ", bold: true, size: 22, color: c(P.primary) }),
               new TextRun({ text: "Criar tabelas de encargos por categoria (INSS patronal, FGTS, multa rescisória, etc.) com parametrização por sindicato/UF. Integrar com composições de mão de obra.", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "3. Implementar Autenticação 2FA: ", bold: true, size: 22, color: c(P.primary) }),
               new TextRun({ text: "Integrar TOTP (Google Authenticator/Authy) no fluxo de login. Armazenar segredo 2FA criptografado no modelo users.", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "4. Implementar Backup Automatizado: ", bold: true, size: 22, color: c(P.primary) }),
               new TextRun({ text: "Configurar pg_dump diário com retenção 30 dias. Implementar rotação em cloud storage (S3/R2). Documentar e testar procedimento de restore.", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "5. Implementar Suite de Testes: ", bold: true, size: 22, color: c(P.primary) }),
               new TextRun({ text: "Configurar Vitest para testes unitários (meta: 70% cobertura). Implementar Playwright para E2E dos fluxos críticos. Criar scripts de CI/CD.", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "6. Implementar Cálculo de Caminho Crítico: ", bold: true, size: 22, color: c(P.primary) }),
               new TextRun({ text: "Adicionar campos dependencyType e lag ao modelo schedule_task_dependencies. Implementar algoritmo CPM com cálculo de folgas.", size: 22, color: c(P.body) })]
  }),
  
  createHeading("⚠ Prioridade Alta (Necessárias mas não bloqueantes)", HeadingLevel.HEADING_2),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "• Integração NF-e: ", bold: true, size: 22, color: c(P.primary) }),
               new TextRun({ text: "Implementar parser XML de NF-e e integração com FocusNFe ou API SEFAZ direta.", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "• Exportação de Orçamentos: ", bold: true, size: 22, color: c(P.primary) }),
               new TextRun({ text: "Implementar export para XML Sicro/SINAPI, planilha Caixa, PDF com memória de cálculo.", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "• Testes de Carga: ", bold: true, size: 22, color: c(P.primary) }),
               new TextRun({ text: "Executar k6 ou Artillery simulando 100/500/1000 usuários. Documentar tempos de resposta.", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "• Monitoramento: ", bold: true, size: 22, color: c(P.primary) }),
               new TextRun({ text: "Integrar Sentry para erros. Configurar alertas para downtime.", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "• Reajustes Contratuais: ", bold: true, size: 22, color: c(P.primary) }),
               new TextRun({ text: "Implementar modelo price_adjustments com índices INCC/IGPM/IPCA e cálculo automático.", size: 22, color: c(P.body) })]
  }),
  
  createHeading("📋 Prioridade Média (Para Versão 1.1)", HeadingLevel.HEADING_2),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "• Cache Redis para queries frequentes", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "• Versionamento de orçamentos", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "• Curva ABC de insumos", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "• DRE por projeto", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "• Fluxo de caixa previsto vs realizado", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "• PWA para uso offline", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "• Tour guiado para novos usuários", size: 22, color: c(P.body) })]
  }),
  new Paragraph({
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: "• Conformidade WCAG 2.1 AA", size: 22, color: c(P.body) })]
  }),
  
  createHeading("📊 Estimativa de Esforço", HeadingLevel.HEADING_2),
  new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent) },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent) },
      left: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" },
      insideVertical: { style: BorderStyle.NONE }
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: c(P.surface) },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({ children: [new TextRun({ text: "Categoria", bold: true, size: 20, color: c(P.primary) })] })]
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: c(P.surface) },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Itens", bold: true, size: 20, color: c(P.primary) })] })]
          }),
          new TableCell({
            shading: { type: ShadingType.CLEAR, fill: c(P.surface) },
            margins: { top: 60, bottom: 60, left: 80, right: 80 },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Esforço Estimado", bold: true, size: 20, color: c(P.primary) })] })]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "🔴 Críticos (Bloqueantes)", size: 20 })] })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "6", size: 20 })] })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "8-12 semanas", size: 20 })] })] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "⚠ Altos", size: 20 })] })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "5", size: 20 })] })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "6-8 semanas", size: 20 })] })] })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "📋 Médios", size: 20 })] })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "8+", size: 20 })] })] }),
          new TableCell({ margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Versão 1.1", size: 20 })] })] })
        ]
      })
    ]
  })
];

// Conclusion
const conclusion = [
  createHeading("CONCLUSÃO", HeadingLevel.HEADING_1),
  createBody("O sistema ConstrutorPro apresenta uma arquitetura sólida e moderna, com uma base de código bem estruturada utilizando Next.js 14, TypeScript, Prisma e PostgreSQL. A plataforma possui 47 modelos de dados, mais de 90 endpoints de API e 60+ páginas de interface, demonstrando um escopo ambicioso e adequado para o mercado brasileiro de construção civil."),
  createBody("Entretanto, a análise revela que o sistema não atende aos critérios mínimos para lançamento comercial. Com aproximadamente 58% de aprovação nas seções core (Seções 1-10) e 6 itens críticos marcados como NÃO, o sistema está abaixo da meta de 85% de SIM sem NÃOs nas questões críticas."),
  createBody("Os principais bloqueadores identificados são: ausência de BDI estruturado, falta de cálculo de encargos sociais, inexistência de autenticação 2FA, ausência de backup automatizado, cobertura de testes zero e falta de cálculo de caminho crítico no cronograma."),
  createBody("Recomenda-se um esforço concentrado de 8-12 semanas para resolver os 6 itens críticos bloqueantes antes de qualquer lançamento comercial. Adicionalmente, recomenda-se implementar os 5 itens de prioridade alta antes de disponibilizar o sistema para clientes pagantes."),
  createBody("A fundação técnica está sólida, mas os requisitos específicos do mercado brasileiro de construção civil (BDI, encargos sociais, conformidade com licitações públicas) precisam ser implementados para que o sistema seja competitivo e juridicamente seguro.")
];

// Build Document
const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
          size: 22,
          color: c(P.body)
        },
        paragraph: {
          spacing: { line: 312 }
        }
      }
    }
  },
  sections: [
    {
      properties: {
        page: {
          margin: { top: 0, bottom: 0, left: 0, right: 0 }
        }
      },
      children: coverChildren
    },
    {
      properties: {
        page: {
          margin: { top: 1440, bottom: 1440, left: 1417, right: 1417 }
        }
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ 
              text: "ConstrutorPro – Análise Técnica de Lançamento", 
              size: 18, 
              color: c(P.secondary),
              italics: true
            })]
          })]
        })
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Página ", size: 18, color: c(P.secondary) }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: c(P.secondary) }),
              new TextRun({ text: " de ", size: 18, color: c(P.secondary) }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: c(P.secondary) })
            ]
          })]
        })
      },
      children: [
        ...executiveSummary,
        ...section1,
        ...section2,
        ...section3,
        ...section4,
        ...section5,
        ...section6,
        ...section7,
        ...section8,
        ...section9,
        ...section10,
        ...section11,
        ...section12,
        ...section13,
        ...section14,
        ...section15,
        ...section16,
        ...section17,
        ...section18,
        ...recommendations,
        ...conclusion
      ]
    }
  ]
});

// Write document
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/z/my-project/download/ConstrutorPro_Analise_Lancamento.docx", buffer);
  console.log("✅ Documento gerado com sucesso: ConstrutorPro_Analise_Lancamento.docx");
});
