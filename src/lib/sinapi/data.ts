// =============================================================================
// ConstrutorPro - SINAPI Database
// Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil
// Base de preços oficial do Brasil
// =============================================================================

// Principais composições SINAPI (amostra representativa)
// Dados baseados nas tabelas oficiais CAIXA/IBGE

export interface SINAPIComposicao {
  codigo: string;
  descricao: string;
  unidade: string;
  custoTotal: number;
  precoTotal: number;
  origem: string;
  categoria: string;
  itens: SINAPIItem[];
}

export interface SINAPIItem {
  codigo: string;
  descricao: string;
  tipo: 'material' | 'mao_de_obra' | 'equipamento' | 'servico';
  unidade: string;
  quantidade: number;
  precoUnitario: number;
  custoTotal: number;
}

// Composições SINAPI representativas para construção civil
export const SINAPI_COMPOSICOES: SINAPIComposicao[] = [
  // === FUNDAÇÕES ===
  {
    codigo: '89689',
    descricao: 'Lastro de concreto magro, e=5cm, traço 1:3:6 (cimento:areia:brita), preparo manual',
    unidade: 'm3',
    custoTotal: 289.45,
    precoTotal: 376.28,
    origem: 'SINAPI',
    categoria: 'Fundações',
    itens: [
      { codigo: '2615', descricao: 'Cimento Portland CP-II-E-32', tipo: 'material', unidade: 'kg', quantidade: 132, precoUnitario: 0.82, custoTotal: 108.24 },
      { codigo: '2633', descricao: 'Areia média para concreto', tipo: 'material', unidade: 'm3', quantidade: 0.396, precoUnitario: 125.50, custoTotal: 49.70 },
      { codigo: '2635', descricao: 'Brita 19mm', tipo: 'material', unidade: 'm3', quantidade: 0.792, precoUnitario: 138.90, custoTotal: 110.01 },
      { codigo: '9001', descricao: 'Servente', tipo: 'mao_de_obra', unidade: 'h', quantidade: 1.5, precoUnitario: 14.33, custoTotal: 21.50 },
    ],
  },
  {
    codigo: '89691',
    descricao: 'Concreto estrutural FCK=25MPa, lançamento convencional',
    unidade: 'm3',
    custoTotal: 485.32,
    precoTotal: 630.92,
    origem: 'SINAPI',
    categoria: 'Fundações',
    itens: [
      { codigo: '2615', descricao: 'Cimento Portland CP-II-E-40', tipo: 'material', unidade: 'kg', quantidade: 380, precoUnitario: 0.85, custoTotal: 323.00 },
      { codigo: '2633', descricao: 'Areia média para concreto', tipo: 'material', unidade: 'm3', quantidade: 0.52, precoUnitario: 125.50, custoTotal: 65.26 },
      { codigo: '2635', descricao: 'Brita 19mm', tipo: 'material', unidade: 'm3', quantidade: 0.88, precoUnitario: 138.90, custoTotal: 122.23 },
      { codigo: '9002', descricao: 'Pedreiro', tipo: 'mao_de_obra', unidade: 'h', quantidade: 2.0, precoUnitario: 18.67, custoTotal: 37.34 },
      { codigo: '9001', descricao: 'Servente', tipo: 'mao_de_obra', unidade: 'h', quantidade: 3.0, precoUnitario: 14.33, custoTotal: 42.99 },
    ],
  },
  {
    codigo: '89695',
    descricao: 'Armação de aço CA-50/60, inclusive dobramento e colocação',
    unidade: 'kg',
    custoTotal: 8.45,
    precoTotal: 10.99,
    origem: 'SINAPI',
    categoria: 'Fundações',
    itens: [
      { codigo: '3405', descricao: 'Aço CA-50', tipo: 'material', unidade: 'kg', quantidade: 1.02, precoUnitario: 6.25, custoTotal: 6.38 },
      { codigo: '3406', descricao: 'Arame recozido', tipo: 'material', unidade: 'kg', quantidade: 0.015, precoUnitario: 12.50, custoTotal: 0.19 },
      { codigo: '9003', descricao: 'Armador', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.08, precoUnitario: 19.85, custoTotal: 1.59 },
      { codigo: '9001', descricao: 'Servente', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.04, precoUnitario: 14.33, custoTotal: 0.57 },
    ],
  },

  // === ALVENARIA ===
  {
    codigo: '87521',
    descricao: 'Alvenaria de bloco cerâmico vazado 14x19x29cm, assentado com argamassa mista',
    unidade: 'm2',
    custoTotal: 52.78,
    precoTotal: 68.61,
    origem: 'SINAPI',
    categoria: 'Alvenaria',
    itens: [
      { codigo: '2421', descricao: 'Bloco cerâmico vazado 14x19x29cm', tipo: 'material', unidade: 'un', quantidade: 13, precoUnitario: 2.15, custoTotal: 27.95 },
      { codigo: '2625', descricao: 'Cal hidratada CH-I', tipo: 'material', unidade: 'kg', quantidade: 3.5, precoUnitario: 0.45, custoTotal: 1.58 },
      { codigo: '2615', descricao: 'Cimento Portland CP-II-E-32', tipo: 'material', unidade: 'kg', quantidade: 6.5, precoUnitario: 0.82, custoTotal: 5.33 },
      { codigo: '2633', descricao: 'Areia média', tipo: 'material', unidade: 'm3', quantidade: 0.028, precoUnitario: 125.50, custoTotal: 3.51 },
      { codigo: '9002', descricao: 'Pedreiro', tipo: 'mao_de_obra', unidade: 'h', quantidade: 1.2, precoUnitario: 18.67, custoTotal: 22.40 },
      { codigo: '9001', descricao: 'Servente', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.5, precoUnitario: 14.33, custoTotal: 7.17 },
    ],
  },
  {
    codigo: '87523',
    descricao: 'Alvenaria de bloco de concreto 14x19x39cm, assentado com argamassa mista',
    unidade: 'm2',
    custoTotal: 58.92,
    precoTotal: 76.60,
    origem: 'SINAPI',
    categoria: 'Alvenaria',
    itens: [
      { codigo: '2425', descricao: 'Bloco de concreto 14x19x39cm', tipo: 'material', unidade: 'un', quantidade: 12.5, precoUnitario: 2.45, custoTotal: 30.63 },
      { codigo: '2625', descricao: 'Cal hidratada CH-I', tipo: 'material', unidade: 'kg', quantidade: 3.5, precoUnitario: 0.45, custoTotal: 1.58 },
      { codigo: '2615', descricao: 'Cimento Portland CP-II-E-32', tipo: 'material', unidade: 'kg', quantidade: 6.5, precoUnitario: 0.82, custoTotal: 5.33 },
      { codigo: '2633', descricao: 'Areia média', tipo: 'material', unidade: 'm3', quantidade: 0.028, precoUnitario: 125.50, custoTotal: 3.51 },
      { codigo: '9002', descricao: 'Pedreiro', tipo: 'mao_de_obra', unidade: 'h', quantidade: 1.2, precoUnitario: 18.67, custoTotal: 22.40 },
      { codigo: '9001', descricao: 'Servente', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.5, precoUnitario: 14.33, custoTotal: 7.17 },
    ],
  },

  // === REVESTIMENTOS ===
  {
    codigo: '88121',
    descricao: 'Emboço interno, espessura 2cm, argamassa mista de cimento, cal e areia',
    unidade: 'm2',
    custoTotal: 32.45,
    precoTotal: 42.19,
    origem: 'SINAPI',
    categoria: 'Revestimentos',
    itens: [
      { codigo: '2615', descricao: 'Cimento Portland CP-II-E-32', tipo: 'material', unidade: 'kg', quantidade: 8.5, precoUnitario: 0.82, custoTotal: 6.97 },
      { codigo: '2625', descricao: 'Cal hidratada CH-I', tipo: 'material', unidade: 'kg', quantidade: 5.0, precoUnitario: 0.45, custoTotal: 2.25 },
      { codigo: '2633', descricao: 'Areia média', tipo: 'material', unidade: 'm3', quantidade: 0.022, precoUnitario: 125.50, custoTotal: 2.76 },
      { codigo: '9002', descricao: 'Pedreiro', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.8, precoUnitario: 18.67, custoTotal: 14.94 },
      { codigo: '9001', descricao: 'Servente', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.3, precoUnitario: 14.33, custoTotal: 4.30 },
    ],
  },
  {
    codigo: '88125',
    descricao: 'Reboco interno, espessura 1cm, pronto para pintura',
    unidade: 'm2',
    custoTotal: 24.80,
    precoTotal: 32.24,
    origem: 'SINAPI',
    categoria: 'Revestimentos',
    itens: [
      { codigo: '2615', descricao: 'Cimento Portland CP-II-E-32', tipo: 'material', unidade: 'kg', quantidade: 4.5, precoUnitario: 0.82, custoTotal: 3.69 },
      { codigo: '2625', descricao: 'Cal hidratada CH-I', tipo: 'material', unidade: 'kg', quantidade: 4.0, precoUnitario: 0.45, custoTotal: 1.80 },
      { codigo: '2633', descricao: 'Areia média', tipo: 'material', unidade: 'm3', quantidade: 0.012, precoUnitario: 125.50, custoTotal: 1.51 },
      { codigo: '9002', descricao: 'Pedreiro', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.6, precoUnitario: 18.67, custoTotal: 11.20 },
      { codigo: '9001', descricao: 'Servente', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.3, precoUnitario: 14.33, custoTotal: 4.30 },
    ],
  },
  {
    codigo: '88145',
    descricao: 'Assentamento de piso cerâmico 45x45cm, com argamassa colante AC-II',
    unidade: 'm2',
    custoTotal: 78.90,
    precoTotal: 102.57,
    origem: 'SINAPI',
    categoria: 'Revestimentos',
    itens: [
      { codigo: '2485', descricao: 'Piso cerâmico 45x45cm EPU', tipo: 'material', unidade: 'm2', quantidade: 1.05, precoUnitario: 42.00, custoTotal: 44.10 },
      { codigo: '2651', descricao: 'Argamassa colante AC-II', tipo: 'material', unidade: 'kg', quantidade: 4.0, precoUnitario: 2.85, custoTotal: 11.40 },
      { codigo: '2655', descricao: 'Rejunte', tipo: 'material', unidade: 'kg', quantidade: 0.5, precoUnitario: 4.50, custoTotal: 2.25 },
      { codigo: '9002', descricao: 'Pedreiro', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.9, precoUnitario: 18.67, custoTotal: 16.80 },
      { codigo: '9001', descricao: 'Servente', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.3, precoUnitario: 14.33, custoTotal: 4.30 },
    ],
  },

  // === PINTURA ===
  {
    codigo: '88651',
    descricao: 'Pintura em paredes internas com tinta acrílica, duas demãos',
    unidade: 'm2',
    custoTotal: 12.85,
    precoTotal: 16.71,
    origem: 'SINAPI',
    categoria: 'Pintura',
    itens: [
      { codigo: '3015', descricao: 'Tinta acrílica premium', tipo: 'material', unidade: 'l', quantidade: 0.35, precoUnitario: 18.50, custoTotal: 6.48 },
      { codigo: '3018', descricao: 'Selador acrílico', tipo: 'material', unidade: 'l', quantidade: 0.12, precoUnitario: 12.80, custoTotal: 1.54 },
      { codigo: '9004', descricao: 'Pintor', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.25, precoUnitario: 16.35, custoTotal: 4.09 },
    ],
  },
  {
    codigo: '88655',
    descricao: 'Pintura externa com tinta acrílica, duas demãos',
    unidade: 'm2',
    custoTotal: 14.20,
    precoTotal: 18.46,
    origem: 'SINAPI',
    categoria: 'Pintura',
    itens: [
      { codigo: '3016', descricao: 'Tinta acrílica externa', tipo: 'material', unidade: 'l', quantidade: 0.40, precoUnitario: 21.50, custoTotal: 8.60 },
      { codigo: '3019', descricao: 'Selador acrílico externo', tipo: 'material', unidade: 'l', quantidade: 0.12, precoUnitario: 14.20, custoTotal: 1.70 },
      { codigo: '9004', descricao: 'Pintor', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.25, precoUnitario: 16.35, custoTotal: 4.09 },
    ],
  },

  // === INSTALAÇÕES ELÉTRICAS ===
  {
    codigo: '91201',
    descricao: 'Ponto de luz/tomada embutido, com eletroduto PVC rígido 20mm',
    unidade: 'pt',
    custoTotal: 42.50,
    precoTotal: 55.25,
    origem: 'SINAPI',
    categoria: 'Instalações Elétricas',
    itens: [
      { codigo: '3215', descricao: 'Eletroduto PVC rígido 20mm', tipo: 'material', unidade: 'm', quantidade: 2.5, precoUnitario: 4.80, custoTotal: 12.00 },
      { codigo: '3220', descricao: 'Caixa de passagem 4x4"', tipo: 'material', unidade: 'un', quantidade: 1, precoUnitario: 5.50, custoTotal: 5.50 },
      { codigo: '3225', descricao: 'Cabo flexível 2,5mm²', tipo: 'material', unidade: 'm', quantidade: 3.0, precoUnitario: 3.20, custoTotal: 9.60 },
      { codigo: '3230', descricao: 'Tomada/Interruptor', tipo: 'material', unidade: 'un', quantidade: 1, precoUnitario: 8.50, custoTotal: 8.50 },
      { codigo: '9005', descricao: 'Eletricista', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.5, precoUnitario: 22.80, custoTotal: 11.40 },
    ],
  },

  // === INSTALAÇÕES HIDRÁULICAS ===
  {
    codigo: '91521',
    descricao: 'Ponto de água fria com tubo PVC rígido 25mm',
    unidade: 'pt',
    custoTotal: 58.90,
    precoTotal: 76.57,
    origem: 'SINAPI',
    categoria: 'Instalações Hidráulicas',
    itens: [
      { codigo: '3310', descricao: 'Tubo PVC rígido 25mm', tipo: 'material', unidade: 'm', quantidade: 3.0, precoUnitario: 8.50, custoTotal: 25.50 },
      { codigo: '3315', descricao: 'Conexões PVC', tipo: 'material', unidade: 'un', quantidade: 3, precoUnitario: 3.80, custoTotal: 11.40 },
      { codigo: '3320', descricao: 'Registro de gaveta 25mm', tipo: 'material', unidade: 'un', quantidade: 1, precoUnitario: 18.50, custoTotal: 18.50 },
      { codigo: '9006', descricao: 'Encanador', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.5, precoUnitario: 21.00, custoTotal: 10.50 },
    ],
  },
  {
    codigo: '91545',
    descricao: 'Ponto de esgoto com tubo PVC 100mm',
    unidade: 'pt',
    custoTotal: 85.20,
    precoTotal: 110.76,
    origem: 'SINAPI',
    categoria: 'Instalações Hidráulicas',
    itens: [
      { codigo: '3325', descricao: 'Tubo PVC esgoto 100mm', tipo: 'material', unidade: 'm', quantidade: 2.5, precoUnitario: 22.50, custoTotal: 56.25 },
      { codigo: '3330', descricao: 'Conexões esgoto 100mm', tipo: 'material', unidade: 'un', quantidade: 2, precoUnitario: 8.50, custoTotal: 17.00 },
      { codigo: '9006', descricao: 'Encanador', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.6, precoUnitario: 21.00, custoTotal: 12.60 },
    ],
  },

  // === COBERTURA ===
  {
    codigo: '86121',
    descricao: 'Telhado com telha cerâmica capa e canal, estrutura de madeira',
    unidade: 'm2',
    custoTotal: 145.80,
    precoTotal: 189.54,
    origem: 'SINAPI',
    categoria: 'Cobertura',
    itens: [
      { codigo: '2315', descricao: 'Telha cerâmica capa e canal', tipo: 'material', unidade: 'un', quantidade: 16, precoUnitario: 2.85, custoTotal: 45.60 },
      { codigo: '2320', descricao: 'Cumeeira cerâmica', tipo: 'material', unidade: 'un', quantidade: 0.2, precoUnitario: 8.50, custoTotal: 1.70 },
      { codigo: '2115', descricao: 'Madeira serrada para estrutura', tipo: 'material', unidade: 'm3', quantidade: 0.018, precoUnitario: 2850.00, custoTotal: 51.30 },
      { codigo: '2615', descricao: 'Cimento Portland CP-II-E-32', tipo: 'material', unidade: 'kg', quantidade: 2.5, precoUnitario: 0.82, custoTotal: 2.05 },
      { codigo: '2633', descricao: 'Areia média', tipo: 'material', unidade: 'm3', quantidade: 0.005, precoUnitario: 125.50, custoTotal: 0.63 },
      { codigo: '9002', descricao: 'Pedreiro', tipo: 'mao_de_obra', unidade: 'h', quantidade: 1.2, precoUnitario: 18.67, custoTotal: 22.40 },
      { codigo: '9001', descricao: 'Servente', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.6, precoUnitario: 14.33, custoTotal: 8.60 },
    ],
  },
  {
    codigo: '86135',
    descricao: 'Cobertura com telha metálica galvanizada, estrutura metálica',
    unidade: 'm2',
    custoTotal: 165.50,
    precoTotal: 215.15,
    origem: 'SINAPI',
    categoria: 'Cobertura',
    itens: [
      { codigo: '2350', descricao: 'Telha metálica galvanizada', tipo: 'material', unidade: 'm2', quantidade: 1.1, precoUnitario: 45.00, custoTotal: 49.50 },
      { codigo: '3110', descricao: 'Perfil metálico estrutural', tipo: 'material', unidade: 'kg', quantidade: 4.5, precoUnitario: 12.50, custoTotal: 56.25 },
      { codigo: '2355', descricao: 'Parafuso autoperfurante', tipo: 'material', unidade: 'un', quantidade: 8, precoUnitario: 0.85, custoTotal: 6.80 },
      { codigo: '9007', descricao: 'Montador de estruturas', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.8, precoUnitario: 24.50, custoTotal: 19.60 },
      { codigo: '9001', descricao: 'Servente', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.4, precoUnitario: 14.33, custoTotal: 5.73 },
    ],
  },

  // === ESQUADRIAS ===
  {
    codigo: '87121',
    descricao: 'Porta interna de madeira maciça 80x210cm, com batente',
    unidade: 'un',
    custoTotal: 485.00,
    precoTotal: 630.50,
    origem: 'SINAPI',
    categoria: 'Esquadrias',
    itens: [
      { codigo: '2515', descricao: 'Porta de madeira maciça', tipo: 'material', unidade: 'un', quantidade: 1, precoUnitario: 350.00, custoTotal: 350.00 },
      { codigo: '2520', descricao: 'Batente de madeira', tipo: 'material', unidade: 'un', quantidade: 1, precoUnitario: 85.00, custoTotal: 85.00 },
      { codigo: '2525', descricao: 'Fechadura cilíndrica', tipo: 'material', unidade: 'un', quantidade: 1, precoUnitario: 35.00, custoTotal: 35.00 },
      { codigo: '9002', descricao: 'Carpinteiro', tipo: 'mao_de_obra', unidade: 'h', quantidade: 2.5, precoUnitario: 19.85, custoTotal: 49.63 },
    ],
  },
  {
    codigo: '87145',
    descricao: 'Janela de alumínio anodizado 120x100cm, com vidro 4mm',
    unidade: 'un',
    custoTotal: 580.00,
    precoTotal: 754.00,
    origem: 'SINAPI',
    categoria: 'Esquadrias',
    itens: [
      { codigo: '2560', descricao: 'Janela de alumínio completa', tipo: 'material', unidade: 'un', quantidade: 1, precoUnitario: 420.00, custoTotal: 420.00 },
      { codigo: '2565', descricao: 'Vidro liso 4mm', tipo: 'material', unidade: 'm2', quantidade: 1.2, precoUnitario: 45.00, custoTotal: 54.00 },
      { codigo: '2570', descricao: 'Silicone para vidro', tipo: 'material', unidade: 'cartucho', quantidade: 0.5, precoUnitario: 22.00, custoTotal: 11.00 },
      { codigo: '9002', descricao: 'Pedreiro', tipo: 'mao_de_obra', unidade: 'h', quantidade: 2.0, precoUnitario: 18.67, custoTotal: 37.34 },
      { codigo: '9001', descricao: 'Servente', tipo: 'mao_de_obra', unidade: 'h', quantidade: 1.0, precoUnitario: 14.33, custoTotal: 14.33 },
    ],
  },

  // === IMPERMEABILIZAÇÃO ===
  {
    codigo: '88301',
    descricao: 'Impermeabilização com manta asfáltica 4mm, em laje',
    unidade: 'm2',
    custoTotal: 68.50,
    precoTotal: 89.05,
    origem: 'SINAPI',
    categoria: 'Impermeabilização',
    itens: [
      { codigo: '2715', descricao: 'Manta asfáltica 4mm', tipo: 'material', unidade: 'm2', quantidade: 1.15, precoUnitario: 38.00, custoTotal: 43.70 },
      { codigo: '2720', descricao: 'Primer asfáltico', tipo: 'material', unidade: 'l', quantidade: 0.3, precoUnitario: 15.50, custoTotal: 4.65 },
      { codigo: '9008', descricao: 'Impermeabilizador', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.5, precoUnitario: 20.50, custoTotal: 10.25 },
      { codigo: '9001', descricao: 'Servente', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.3, precoUnitario: 14.33, custoTotal: 4.30 },
    ],
  },

  // === PAVIMENTAÇÃO ===
  {
    codigo: '88215',
    descricao: 'Contrapiso em concreto armado, e=8cm, preparo mecânico',
    unidade: 'm2',
    custoTotal: 95.80,
    precoTotal: 124.54,
    origem: 'SINAPI',
    categoria: 'Pavimentação',
    itens: [
      { codigo: '2615', descricao: 'Cimento Portland CP-II-E-32', tipo: 'material', unidade: 'kg', quantidade: 35, precoUnitario: 0.82, custoTotal: 28.70 },
      { codigo: '2633', descricao: 'Areia média', tipo: 'material', unidade: 'm3', quantidade: 0.04, precoUnitario: 125.50, custoTotal: 5.02 },
      { codigo: '2635', descricao: 'Brita 19mm', tipo: 'material', unidade: 'm3', quantidade: 0.045, precoUnitario: 138.90, custoTotal: 6.25 },
      { codigo: '3405', descricao: 'Aço CA-60 4.2mm', tipo: 'material', unidade: 'kg', quantidade: 1.8, precoUnitario: 7.50, custoTotal: 13.50 },
      { codigo: '9002', descricao: 'Pedreiro', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.8, precoUnitario: 18.67, custoTotal: 14.94 },
      { codigo: '9001', descricao: 'Servente', tipo: 'mao_de_obra', unidade: 'h', quantidade: 0.6, precoUnitario: 14.33, custoTotal: 8.60 },
    ],
  },
];

// Materiais básicos SINAPI
export const SINAPI_MATERIAIS = [
  { codigo: '2615', descricao: 'Cimento Portland CP-II-E-32', unidade: 'kg', preco: 0.82 },
  { codigo: '2616', descricao: 'Cimento Portland CP-II-E-40', unidade: 'kg', preco: 0.85 },
  { codigo: '2625', descricao: 'Cal hidratada CH-I', unidade: 'kg', preco: 0.45 },
  { codigo: '2633', descricao: 'Areia média para concreto', unidade: 'm3', preco: 125.50 },
  { codigo: '2635', descricao: 'Brita 19mm', unidade: 'm3', preco: 138.90 },
  { codigo: '3405', descricao: 'Aço CA-50', unidade: 'kg', preco: 6.25 },
  { codigo: '3406', descricao: 'Arame recozido', unidade: 'kg', preco: 12.50 },
];

// Mão de obra SINAPI
export const SINAPI_MAO_DE_OBRA = [
  { codigo: '9001', descricao: 'Servente', unidade: 'h', preco: 14.33 },
  { codigo: '9002', descricao: 'Pedreiro', unidade: 'h', preco: 18.67 },
  { codigo: '9003', descricao: 'Armador', unidade: 'h', preco: 19.85 },
  { codigo: '9004', descricao: 'Pintor', unidade: 'h', preco: 16.35 },
  { codigo: '9005', descricao: 'Eletricista', unidade: 'h', preco: 22.80 },
  { codigo: '9006', descricao: 'Encanador', unidade: 'h', preco: 21.00 },
  { codigo: '9007', descricao: 'Montador de estruturas', unidade: 'h', preco: 24.50 },
  { codigo: '9008', descricao: 'Impermeabilizador', unidade: 'h', preco: 20.50 },
];

// Categorias SINAPI
export const SINAPI_CATEGORIAS = [
  { id: 'fundacoes', nome: 'Fundações' },
  { id: 'alvenaria', nome: 'Alvenaria' },
  { id: 'revestimentos', nome: 'Revestimentos' },
  { id: 'pintura', nome: 'Pintura' },
  { id: 'instalacoes-eletricas', nome: 'Instalações Elétricas' },
  { id: 'instalacoes-hidraulicas', nome: 'Instalações Hidráulicas' },
  { id: 'cobertura', nome: 'Cobertura' },
  { id: 'esquadrias', nome: 'Esquadrias' },
  { id: 'impermeabilizacao', nome: 'Impermeabilização' },
  { id: 'pavimentacao', nome: 'Pavimentação' },
];

// Função para buscar composições por categoria
export function getComposicoesByCategoria(categoria: string): SINAPIComposicao[] {
  return SINAPI_COMPOSICOES.filter((c) => c.categoria === categoria);
}

// Função para buscar composição por código
export function getComposicaoByCodigo(codigo: string): SINAPIComposicao | undefined {
  return SINAPI_COMPOSICOES.find((c) => c.codigo === codigo);
}

// Função para buscar composições por termo de busca
export function searchComposicoes(termo: string): SINAPIComposicao[] {
  const termoLower = termo.toLowerCase();
  return SINAPI_COMPOSICOES.filter(
    (c) =>
      c.codigo.includes(termo) ||
      c.descricao.toLowerCase().includes(termoLower) ||
      c.categoria.toLowerCase().includes(termoLower)
  );
}

// Função para aplicar índice de atualização de preços
export function aplicarIndiceAtualizacao(valor: number, indice: number): number {
  return valor * (1 + indice / 100);
}
