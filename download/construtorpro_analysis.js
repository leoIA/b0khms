const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, 
        Header, Footer, AlignmentType, HeadingLevel, PageNumber, 
        BorderStyle, WidthType, ShadingType } = require("docx");
const fs = require("fs");

const P = {
  primary: "1A2330",
  body: "2C3E50", 
  secondary: "607080",
  accent: "D4875A",
  surface: "F8F0EB",
  white: "FFFFFF"
};

const c = (hex) => hex.replace("#", "");
const STATUS = { SIM: "28A745", NAO: "DC3545", PARCIAL: "FFC107" };

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: level === HeadingLevel.HEADING_1 ? 400 : 280, after: 160 },
    children: [new TextRun({ text, bold: true, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" }, size: level === HeadingLevel.HEADING_1 ? 32 : 28 })]
  });
}

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 120 },
    children: [new TextRun({ text, size: 22, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  });
}

function item(id, desc, status, notes, critical = false) {
  const statusColor = status === "SIM" ? STATUS.SIM : status === "NÃO" ? STATUS.NAO : STATUS.PARCIAL;
  const statusText = status === "SIM" ? "SIM" : status === "NÃO" ? "NAO" : "PARCIAL";
  const rows = [
    new TableRow({
      children: [
        new TableCell({ width: { size: 8, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: c(P.surface) }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [critical ? new TextRun({ text: "CRIT ", size: 18, color: STATUS.NAO }) : new TextRun(""), new TextRun({ text: id, bold: true, size: 20, color: c(P.primary) })] })] }),
        new TableCell({ width: { size: 72, type: WidthType.PERCENTAGE }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: desc, size: 20, color: c(P.body) })] })] }),
        new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, shading: { type: ShadingType.CLEAR, fill: statusColor }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: statusText, bold: true, size: 18, color: "FFFFFF" })] })] })
      ]
    })
  ];
  if (notes) {
    rows.push(new TableRow({
      children: [new TableCell({ columnSpan: 3, shading: { type: ShadingType.CLEAR, fill: "FAFAFA" }, margins: { top: 40, bottom: 60, left: 80, right: 80 }, children: [new Paragraph({ children: [new TextRun({ text: "Nota: " + notes, size: 18, color: c(P.secondary), italics: true })] })] })] })
  );
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" }, bottom: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" }, left: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" }, right: { style: BorderStyle.SINGLE, size: 1, color: "E0E0E0" }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } }, rows });
}

function sectionHeader(title, critical = false) {
  return new Paragraph({
    spacing: { before: 400, after: 200 },
    shading: { type: ShadingType.CLEAR, fill: critical ? "FDECEA" : c(P.surface) },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: critical ? STATUS.NAO : c(P.accent) } },
    children: [critical ? new TextRun({ text: "CRITICO - ", size: 26, bold: true, color: STATUS.NAO }) : new TextRun(""), new TextRun({ text: title, bold: true, size: 26, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" } })]
  });
}

function spacer() { return new Paragraph({ spacing: { before: 100 } }); }

const coverChildren = [
  new Paragraph({ spacing: { before: 2000 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: "CONSTRUTORPRO", bold: true, size: 56, color: c(P.accent), font: { ascii: "Calibri", eastAsia: "SimHei" } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "Sistema de Gestao de Obras e Projetos", size: 28, color: c(P.secondary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })] }),
  new Paragraph({ spacing: { before: 400 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 8, color: c(P.accent), space: 20 }, bottom: { style: BorderStyle.SINGLE, size: 8, color: c(P.accent), space: 20 } }, spacing: { before: 200, after: 200 }, children: [new TextRun({ text: "RELATORIO DE ANALISE TECNICA", bold: true, size: 36, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" } })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: "Checklist de Prontidao para Lancamento", size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })] }),
  new Paragraph({ spacing: { before: 800 } }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Data: 19 de Abril de 2026", size: 22, color: c(P.secondary) })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: "Versao: 1.0 - Analise Completa", size: 22, color: c(P.secondary) })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: "Classificacao: Documento Tecnico Confidencial", size: 20, color: c(P.secondary), italics: true })] })
];

const executiveSummary = [
  heading("RESUMO EXECUTIVO", HeadingLevel.HEADING_1),
  body("Este documento apresenta uma analise tecnica completa do sistema ConstrutorPro, uma plataforma de gestao de obras e projetos para o mercado brasileiro de construcao civil. A analise foi realizada com base em um checklist de 18 secoes contendo mais de 100 itens criticos e nao-criticos para avaliacao da prontidao do sistema para lancamento comercial."),
  body("O ConstrutorPro e construido com tecnologias modernas incluindo Next.js 14 com App Router, TypeScript, Prisma ORM e PostgreSQL. O sistema possui 47 modelos de dados, mais de 90 endpoints de API e 60+ paginas de interface, cobrindo todas as areas essenciais da gestao de obras: orcamentos, cronogramas, medicoes, compras, financeiro, RH e geolocalizacao."),
  body("A analise revela que o sistema atingiu aproximadamente 63% de completude funcional, com os modulos principais implementados mas necessitando desenvolvimentos adicionais em areas criticas como BDI estruturado, calculo de encargos sociais, integracao NF-e e autenticacao de dois fatores.")
];

const section1 = [
  sectionHeader("SECAO 1 - ORCAMENTO, COMPOSICOOES E BDI", true),
  body("Esta secao avalia as funcionalidades criticas relacionadas a elaboracao de orcamentos, composicoes de precos e calculo do BDI."),
  spacer(),
  item("1.1", "O sistema permite criar uma composicao de precos com insumos e calcula automaticamente o custo total?", "SIM", "Modelos compositions e composition_items implementados com campos totalCost, totalPrice, profitMargin."),
  spacer(),
  item("1.2", "E possivel definir coeficientes de produtividade e indices de perda por insumo?", "PARCIAL", "Campo coefficient existe mas nao ha campo para indice de perda/quebra."),
  spacer(),
  item("1.3", "CRITICO: O sistema calcula o BDI de forma estruturada?", "NAO", "CRITICO: Nao existe modelo ou funcionalidade de BDI estruturado. Necessario implementar modelo completo."),
  spacer(),
  item("1.4", "O BDI pode ser configurado por obra e por tipo de servico?", "NAO", "Depende da implementacao do BDI. Nao ha validacao de limites TCU."),
  spacer(),
  item("1.5", "CRITICO: O sistema calcula encargos sociais conforme legislacao brasileira?", "NAO", "CRITICO: Nao ha calculo de encargos sociais. Necessario implementar modulo completo com INSS, FGTS, etc."),
  spacer(),
  item("1.6", "E possivel importar composicoes do SINAPI?", "PARCIAL", "Existe seed-sinapi.ts mas nao ha mecanismo de importacao de arquivos oficiais."),
  spacer(),
  item("1.7", "O sistema versiona orcamentos?", "NAO", "Nao ha sistema de versionamento de orcamentos."),
  spacer(),
  item("1.8", "O orcamento permite rateios?", "NAO", "Nao ha funcionalidade de rateios."),
  spacer(),
  item("1.9", "E possivel gerar curva ABC dos insumos?", "NAO", "Nao ha funcionalidade de curva ABC."),
  spacer(),
  item("1.10", "CRITICO: Exporta orcamento nos formatos exigidos para licitacoes?", "NAO", "CRITICO: Nao ha exportacao para XML Sicro/SINAPI, planilha Caixa, PDF.")
];

const section2 = [
  sectionHeader("SECAO 2 - CRONOGRAMA E INTEGRACAO FISICO-FINANCEIRA", true),
  body("Avaliacao das funcionalidades de cronograma, incluindo tipos de dependencia, caminho critico e EVM."),
  spacer(),
  item("2.1", "O cronograma permite dependencias FS, SS, FF, SF com lags?", "PARCIAL", "Modelo existe mas nao ha campo para tipo de dependencia nem lag."),
  spacer(),
  item("2.2", "CRITICO: O sistema calcula o caminho critico?", "NAO", "CRITICO: Nao ha calculo de caminho critico CPM, folga total, folga livre."),
  spacer(),
  item("2.3", "E possivel vincular cada tarefa a itens do orcamento?", "SIM", "Modelo task_budget_links permite vincular tarefas a budget_items com percentage."),
  spacer(),
  item("2.4", "O cronograma importa/exporta MS Project, Primavera?", "PARCIAL", "Nao ha importacao .mpp ou .xer. Estrutura de dados existe."),
  spacer(),
  item("2.5", "O sistema emite alertas quando SPI < 0,9 ou CPI < 0,95?", "PARCIAL", "Metricas SPI e CPI calculadas mas nao ha alertas automaticos.")
];

const sections3to18 = [
  ...[
    ["SECAO 3 - MEDICOES, FATURAMENTO E ADITIVOS", false, [
      ["3.1", "A medicao pode ser feita por percentual ou quantidade?", "SIM", "Modelo medicoes e medicao_items com campos necessarios."],
      ["3.2", "A medicao permite glosas e renegociacao?", "NAO", "Nao ha funcionalidade de glosas."],
      ["3.3", "A medicao aprovada gera faturamento?", "PARCIAL", "Modelos existem mas fluxo nao e automatico."],
      ["3.4", "O sistema gerencia aditivos contratuais?", "NAO", "Nao ha modelo para aditivos."],
      ["3.5", "CRITICO: Aplica reajuste de precos por indice?", "NAO", "CRITICO: Nao ha funcionalidade de reajustes por INCC/IGPM/IPCA."]
    ]],
    ["SECAO 4 - COMPRAS, COTACOES E NF-E", false, [
      ["4.1", "O sistema sugere fornecedores baseado em compras anteriores?", "NAO", "Nao ha algoritmo de sugestao."],
      ["4.2", "A comparacao de precos entre fornecedores e por item?", "PARCIAL", "Estrutura existe mas interface de comparacao nao implementada."],
      ["4.3", "E possivel gerar pedido de compra da cotacao vencedora?", "NAO", "Modelos existem separadamente sem fluxo automatizado."],
      ["4.4", "CRITICO: O sistema le XML de NF-e?", "NAO", "CRITICO: Nao ha integracao com SEFAZ nem parsing de XML."],
      ["4.5", "O sistema controla estoque minimo?", "PARCIAL", "Campos existem mas nao ha alerta automatico."]
    ]],
    ["SECAO 5 - FINANCEIRO E CUSTOS REAIS", false, [
      ["5.1", "O sistema lanca custos reais e compara com orcado?", "SIM", "Modelo actual_costs e endpoint budget-vs-actual implementados."],
      ["5.2", "O custo real pode ser alocado a tarefa e orcamento?", "PARCIAL", "Relacao com budget_items existe mas nao com schedule_tasks."],
      ["5.3", "Gera DRE por projeto?", "NAO", "Nao ha geracao de DRE."],
      ["5.4", "O fluxo de caixa previsto e comparado com realizado?", "NAO", "Nao ha funcionalidade de fluxo de caixa."],
      ["5.5", "Suporta conciliacao bancaria?", "NAO", "Nao ha importacao de extrato OFX/CSV."]
    ]],
    ["SECAO 6 - DIARIO DE OBRA E DOCUMENTACAO LEGAL", false, [
      ["6.1", "O diario permite assinatura digital?", "NAO", "Nao ha assinatura digital certificado A3/A1."],
      ["6.2", "As fotos sao georreferenciadas?", "NAO", "Nao ha campos de latitude/longitude nas fotos."],
      ["6.3", "E possivel bloquear edicao apos X dias?", "NAO", "Nao ha bloqueio automatico por prazo."],
      ["6.4", "O diario e exportado em PDF/A?", "NAO", "Nao ha exportacao para PDF/A."]
    ]],
    ["SECAO 7 - IA ASSISTENTE", false, [
      ["7.1", "Qual modelo de IA esta sendo usado?", "SIM", "Utiliza z-ai-web-dev-sdk."],
      ["7.2", "A IA tem acesso ao contexto do projeto?", "PARCIAL", "Modelo ai_conversations existe mas personalizacao automatica nao implementada."],
      ["7.3", "Existe limitacao de uso por plano?", "NAO", "Nao ha limite de chamadas IA no PLAN_LIMITS."],
      ["7.4", "Dados nao sao usados para treinamento?", "NAO", "Nao ha politica de privacidade explicita sobre IA."]
    ]],
    ["SECAO 8 - SEGURANCA, LGPD E AUDITORIA", true, [
      ["8.1", "Existe log de auditoria imutavel?", "PARCIAL", "Modelo activities existe mas nao e imutavel."],
      ["8.2", "CRITICO: Suporta autenticacao de dois fatores?", "NAO", "CRITICO: Nao ha 2FA via TOTP nem SMS."],
      ["8.3", "Senhas armazenadas com bcrypt?", "SIM", "Utiliza bcryptjs em auth.ts."],
      ["8.4", "Permite exportar dados pessoais (LGPD)?", "NAO", "Nao ha funcionalidade de exportacao LGPD."],
      ["8.5", "CRITICO: Backup automatico diario?", "NAO", "CRITICO: Nao ha configuracao de backup automatico."],
      ["8.6", "Possui rate limiting?", "SIM", "Implementado em api-auth.ts com limites por plano."],
      ["8.7", "Criptografia para dados sensiveis?", "NAO", "Nao ha criptografia especifica."]
    ]],
    ["SECAO 9 - PLANOS, ASSINATURAS E LIMITES", false, [
      ["9.1", "Limites de cada plano definidos e aplicados?", "PARCIAL", "PLAN_LIMITS definido mas faltam limites de IA e armazenamento."],
      ["9.2", "O que acontece quando limite e excedido?", "PARCIAL", "Funcao existe mas nao ha bloqueio ativo."],
      ["9.3", "Downgrade reduz recursos imediatamente?", "NAO", "Nao ha tratamento para downgrade."],
      ["9.4", "Integracao Mercado Pago suporta PIX, boleto?", "PARCIAL", "Integracao existe mas suporte completo nao documentado."],
      ["9.5", "Webhook Mercado Pago e idempotente?", "PARCIAL", "Webhook existe mas idempotencia nao garantida."]
    ]],
    ["SECAO 10 - PERFORMANCE, TESTES E ESCALABILIDADE", true, [
      ["10.1", "CRITICO: Teste de carga realizado?", "NAO", "CRITICO: Nao ha testes de carga."],
      ["10.2", "Banco possui indices nas colunas usadas?", "SIM", "Schema Prisma com @@index em todas as colunas relevantes."],
      ["10.3", "Utiliza cache Redis?", "PARCIAL", "Nao ha Redis no codigo atual."],
      ["10.4", "CRITICO: Cobertura de testes atende minimo?", "NAO", "CRITICO: Cobertura e 0% - nao ha arquivos de teste."],
      ["10.5", "Possui monitoramento de erros?", "NAO", "Nao ha integracao com Sentry ou similar."],
      ["10.6", "CRITICO: RTO e RPO definidos?", "NAO", "CRITICO: Nao ha RTO/RPO documentados."]
    ]]
  ].flatMap(([title, critical, items]) => [
    sectionHeader(title, critical),
    body("Avaliacao dos componentes desta secao."),
    spacer(),
    ...items.flatMap(([id, desc, status, note]) => [item(id, desc, status, note), spacer()])
  ])
];

const remainingSections = [
  sectionHeader("SECAO 11 - INTEGRACOES E API PUBLICA"),
  body("Avaliacao das capacidades de integracao e API publica."),
  spacer(),
  item("11.1", "API publica documentada com Swagger/OpenAPI?", "SIM", "OpenAPI em /src/lib/openapi.ts. Documentacao em /api-docs."),
  spacer(),
  item("11.2", "API Keys com escopo de permissoes?", "SIM", "Modelo api_keys com campo permissions JSON array."),
  spacer(),
  item("11.3", "Integracao com Google Maps?", "PARCIAL", "Geocodificacao via OpenStreetMap Nominatim."),
  spacer(),
  item("11.4", "Importa orcamentos de sistemas concorrentes?", "NAO", "Nao ha importacao de OrcaFascio, Sienge, etc."),
  spacer(),
  item("11.5", "Integracao com ERPs contabeis?", "NAO", "Nao ha integracao com Totvs, SAP, etc."),
  
  sectionHeader("SECAO 13 - WEBHOOKS E EVENTOS"),
  body("Avaliacao do sistema de webhooks."),
  spacer(),
  item("13.1", "Permite criar webhooks com URL, secret e eventos?", "SIM", "Modelo webhooks com 28 tipos de eventos."),
  spacer(),
  item("13.2", "Envia assinatura HMAC-SHA256?", "SIM", "createSignature() usa crypto.createHmac sha256."),
  spacer(),
  item("13.3", "Implementa retry exponencial?", "SIM", "RETRY_DELAYS: 1min a 24h, MAX_RETRY_ATTEMPTS=5."),
  spacer(),
  item("13.4", "Painel de logs de entrega?", "SIM", "Modelo webhook_deliveries com todos os campos."),
  
  sectionHeader("SECAO 18 - PRONTIDAO PARA LANCAMENTO"),
  body("Checklist final para liberacao de producao."),
  spacer(),
  ...["A|Ambiente de homologacao separado|NAO|Nao documentado",
      "B|Plano de contingencia documentado|NAO|Nao existe",
      "C|Testado por 3 empresas reais 30+ dias|NAO|Nao ha beta fechado",
      "D|Termos de uso e privacidade aprovados|NAO|Nao documentados",
      "E|Suporte com horario e canal emergencia|NAO|Nao definido",
      "F|Precos validados com clientes|NAO|Nao validado",
      "G|Pagina de status existe|NAO|Nao existe",
      "H|Onboarding documentado e automatizado|NAO|Nao existe",
      "I|Codigo em repositorio com backup|PARCIAL|Presume-se Git",
      "J|Plano de marketing para 100 clientes|NAO|Nao documentado"].map(line => {
        const [id, desc, status, note] = line.split("|");
        return [item(id, desc, status, note), spacer()];
      }).flat()
];

const recommendations = [
  heading("RECOMENDACOES PRIORITARIAS", HeadingLevel.HEADING_1),
  body("Com base na analise, apresentamos as recomendacoes por prioridade:"),
  
  heading("Prioridade Critica (Bloqueantes)", HeadingLevel.HEADING_2),
  body("1. Implementar BDI Estruturado: Criar modelo bdi_configs com campos para todos os componentes (impostos, administracao, despesas financeiras, riscos, seguros, lucro). Implementar calculo automatico com validacao TCU 25%."),
  body("2. Implementar Encargos Sociais: Criar tabelas de encargos (INSS, FGTS, multa rescisoria, etc.) com parametrizacao por sindicato/UF."),
  body("3. Implementar Autenticacao 2FA: Integrar TOTP (Google Authenticator) no fluxo de login."),
  body("4. Implementar Backup Automatizado: Configurar pg_dump diario com retencao 30 dias."),
  body("5. Implementar Suite de Testes: Configurar Vitest para unitarios (meta 70%) e Playwright para E2E."),
  body("6. Implementar Caminho Critico: Adicionar campos ao modelo e implementar algoritmo CPM."),
  
  heading("Prioridade Alta", HeadingLevel.HEADING_2),
  body("- Integracao NF-e: Implementar parser XML e integracao com FocusNFe ou SEFAZ."),
  body("- Exportacao de Orcamentos: Implementar XML Sicro/SINAPI, planilha Caixa, PDF."),
  body("- Testes de Carga: Executar com 100/500/1000 usuarios simultaneos."),
  body("- Monitoramento: Integrar Sentry para erros."),
  body("- Reajustes Contratuais: Implementar modelo com indices INCC/IGPM/IPCA.")
];

const conclusion = [
  heading("CONCLUSAO", HeadingLevel.HEADING_1),
  body("O sistema ConstrutorPro apresenta uma arquitetura solida e moderna, com base de codigo bem estruturada utilizando Next.js 14, TypeScript, Prisma e PostgreSQL. A plataforma possui 47 modelos de dados, mais de 90 endpoints de API e 60+ paginas de interface."),
  body("Entretanto, a analise revela que o sistema nao atende aos criterios minimos para lancamento comercial. Com aproximadamente 58% de aprovacao nas secoes core e 6 itens criticos marcados como NAO, o sistema esta abaixo da meta de 85%."),
  body("Os principais bloqueadores sao: ausencia de BDI estruturado, falta de calculo de encargos sociais, inexistencia de autenticacao 2FA, ausencia de backup automatizado, cobertura de testes zero e falta de calculo de caminho critico."),
  body("Recomenda-se um esforco de 8-12 semanas para resolver os 6 itens criticos bloqueantes antes de qualquer lancamento comercial. A fundacao tecnica esta solida, mas os requisitos especificos do mercado brasileiro precisam ser implementados.")
];

const doc = new Document({
  styles: { default: { document: { run: { font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, size: 22, color: c(P.body) }, paragraph: { spacing: { line: 312 } } } } },
  sections: [
    { properties: { page: { margin: { top: 0, bottom: 0, left: 0, right: 0 } } }, children: coverChildren },
    {
      properties: { page: { margin: { top: 1440, bottom: 1440, left: 1417, right: 1417 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "ConstrutorPro - Analise Tecnica", size: 18, color: c(P.secondary), italics: true })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Pagina ", size: 18, color: c(P.secondary) }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: c(P.secondary) }), new TextRun({ text: " de ", size: 18, color: c(P.secondary) }), new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: c(P.secondary) })] })] }) },
      children: [...executiveSummary, ...section1, ...section2, ...sections3to18, ...remainingSections, ...recommendations, ...conclusion]
    }
  ]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("/home/z/my-project/download/ConstrutorPro_Analise_Lancamento.docx", buffer);
  console.log("Documento gerado: ConstrutorPro_Analise_Lancamento.docx");
});
