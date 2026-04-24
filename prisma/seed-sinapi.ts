// =============================================================================
// ConstrutorPro - SINAPI Seed Data
// Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil
// Composições de Preços Reais do Mercado Brasileiro
// =============================================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// =============================================================================
// Dados SINAPI - Composições de Preços Reais
// =============================================================================

interface SinapiComposition {
  codigo: string;
  nome: string;
  descricao: string;
  unidade: string;
  custoMaterial: number;
  custoMaoDeObra: number;
  custoEquipamento: number;
  categoria: string;
  itens: {
    descricao: string;
    unidade: string;
    quantidade: number;
    custoUnitario: number;
    tipo: 'material' | 'labor' | 'equipment' | 'service' | 'other';
  }[];
}

// Composições SINAPI reais - Valores baseados em Janeiro 2024
const sinapiCompositions: SinapiComposition[] = [
  // ============================================================================
  // SERVIÇOS PRELIMINARES
  // ============================================================================
  {
    codigo: '87266',
    nome: 'Locação de obra',
    descricao: 'Locação de obra com gabarito de madeira e trena de aço, inclusive equipamentos de proteção individual.',
    unidade: 'm2',
    custoMaterial: 2.45,
    custoMaoDeObra: 4.80,
    custoEquipamento: 0.75,
    categoria: 'Preliminar',
    itens: [
      { descricao: 'Madeira serrada 2,5x7,5cm', unidade: 'm', quantidade: 0.15, custoUnitario: 18.50, tipo: 'material' },
      { descricao: 'Pregos 18x27', unidade: 'kg', quantidade: 0.02, custoUnitario: 12.00, tipo: 'material' },
      { descricao: 'Trena de aço 5m', unidade: 'un', quantidade: 0.001, custoUnitario: 35.00, tipo: 'material' },
      { descricao: 'Pedreiro', unidade: 'h', quantidade: 0.15, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.15, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '87267',
    nome: 'Plataforma de trabalho',
    descricao: 'Plataforma de trabalho em madeira com dimensões de 2,44x1,22m, para andaime.',
    unidade: 'm2',
    custoMaterial: 45.00,
    custoMaoDeObra: 18.00,
    custoEquipamento: 0,
    categoria: 'Preliminar',
    itens: [
      { descricao: 'Madeira compensado 12mm', unidade: 'm2', quantidade: 1.1, custoUnitario: 35.00, tipo: 'material' },
      { descricao: 'Madeira serrada 2,5x7,5cm', unidade: 'm', quantidade: 2.0, custoUnitario: 18.50, tipo: 'material' },
      { descricao: 'Pregos 18x36', unidade: 'kg', quantidade: 0.3, custoUnitario: 14.00, tipo: 'material' },
      { descricao: 'Carpinteiro', unidade: 'h', quantidade: 0.6, custoUnitario: 28.00, tipo: 'labor' },
    ],
  },

  // ============================================================================
  // INFRAESTRUTURA - FUNDAÇÕES
  // ============================================================================
  {
    codigo: '74115',
    nome: 'Concreto estrutural fck 25 MPa',
    descricao: 'Concreto estrutural com resistência característica fck 25 MPa, traço 1:2,5:3,5, aplicado em estruturas.',
    unidade: 'm3',
    custoMaterial: 380.00,
    custoMaoDeObra: 95.00,
    custoEquipamento: 45.00,
    categoria: 'Infraestrutura',
    itens: [
      { descricao: 'Cimento CP-II-E-32', unidade: 'kg', quantidade: 350, custoUnitario: 0.85, tipo: 'material' },
      { descricao: 'Areia média', unidade: 'm3', quantidade: 0.45, custoUnitario: 120.00, tipo: 'material' },
      { descricao: 'Brita 19mm', unidade: 'm3', quantidade: 0.85, custoUnitario: 110.00, tipo: 'material' },
      { descricao: 'Água', unidade: 'l', quantidade: 180, custoUnitario: 0.005, tipo: 'material' },
      { descricao: 'Aditivo plastificante', unidade: 'l', quantidade: 3.5, custoUnitario: 8.50, tipo: 'material' },
      { descricao: 'Pedreiro', unidade: 'h', quantidade: 1.5, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 3.0, custoUnitario: 18.00, tipo: 'labor' },
      { descricao: 'Betoneira 400l', unidade: 'h', quantidade: 1.5, custoUnitario: 25.00, tipo: 'equipment' },
    ],
  },
  {
    codigo: '74116',
    nome: 'Concreto estrutural fck 30 MPa',
    descricao: 'Concreto estrutural com resistência característica fck 30 MPa, para elementos estruturais mais exigentes.',
    unidade: 'm3',
    custoMaterial: 420.00,
    custoMaoDeObra: 95.00,
    custoEquipamento: 45.00,
    categoria: 'Infraestrutura',
    itens: [
      { descricao: 'Cimento CP-V-ARI', unidade: 'kg', quantidade: 400, custoUnitario: 0.95, tipo: 'material' },
      { descricao: 'Areia média', unidade: 'm3', quantidade: 0.42, custoUnitario: 120.00, tipo: 'material' },
      { descricao: 'Brita 19mm', unidade: 'm3', quantidade: 0.88, custoUnitario: 110.00, tipo: 'material' },
      { descricao: 'Água', unidade: 'l', quantidade: 170, custoUnitario: 0.005, tipo: 'material' },
      { descricao: 'Aditivo plastificante', unidade: 'l', quantidade: 4.0, custoUnitario: 8.50, tipo: 'material' },
      { descricao: 'Pedreiro', unidade: 'h', quantidade: 1.5, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 3.0, custoUnitario: 18.00, tipo: 'labor' },
      { descricao: 'Betoneira 400l', unidade: 'h', quantidade: 1.5, custoUnitario: 25.00, tipo: 'equipment' },
    ],
  },
  {
    codigo: '87289',
    nome: 'Armação de aço CA-50',
    descricao: 'Armação de aço CA-50, diâmetro 10mm, cortada e dobrada, com amarração com arame recozido.',
    unidade: 'kg',
    custoMaterial: 8.50,
    custoMaoDeObra: 4.20,
    custoEquipamento: 0.30,
    categoria: 'Infraestrutura',
    itens: [
      { descricao: 'Aço CA-50 10mm', unidade: 'kg', quantidade: 1.02, custoUnitario: 7.80, tipo: 'material' },
      { descricao: 'Arame recozido 18BWG', unidade: 'kg', quantidade: 0.02, custoUnitario: 15.00, tipo: 'material' },
      { descricao: 'Armador', unidade: 'h', quantidade: 0.12, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.08, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '87290',
    nome: 'Armação de aço CA-60',
    descricao: 'Armação de aço CA-60, diâmetro 5mm, para telas e estribos.',
    unidade: 'kg',
    custoMaterial: 9.20,
    custoMaoDeObra: 5.80,
    custoEquipamento: 0.40,
    categoria: 'Infraestrutura',
    itens: [
      { descricao: 'Aço CA-60 5mm', unidade: 'kg', quantidade: 1.02, custoUnitario: 8.50, tipo: 'material' },
      { descricao: 'Arame recozido 18BWG', unidade: 'kg', quantidade: 0.025, custoUnitario: 15.00, tipo: 'material' },
      { descricao: 'Armador', unidade: 'h', quantidade: 0.15, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.10, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '87368',
    nome: 'Escavação manual',
    descricao: 'Escavação manual em solo de 1ª categoria, para fundação, com profundidade até 2m.',
    unidade: 'm3',
    custoMaterial: 0,
    custoMaoDeObra: 68.00,
    custoEquipamento: 0,
    categoria: 'Infraestrutura',
    itens: [
      { descricao: 'Servente', unidade: 'h', quantidade: 3.5, custoUnitario: 18.00, tipo: 'labor' },
      { descricao: 'Ferramenta manual', unidade: 'vb', quantidade: 1, custoUnitario: 4.00, tipo: 'material' },
    ],
  },
  {
    codigo: '87369',
    nome: 'Escavação mecanizada',
    descricao: 'Escavação mecanizada com retroescavadeira, para fundação, em solo de 1ª categoria.',
    unidade: 'm3',
    custoMaterial: 0,
    custoMaoDeObra: 12.00,
    custoEquipamento: 35.00,
    categoria: 'Infraestrutura',
    itens: [
      { descricao: 'Operador de máquinas', unidade: 'h', quantidade: 0.3, custoUnitario: 38.00, tipo: 'labor' },
      { descricao: 'Retroescavadeira', unidade: 'h', quantidade: 0.3, custoUnitario: 115.00, tipo: 'equipment' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.2, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '87370',
    nome: 'Reaterro compactado',
    descricao: 'Reaterro de valas com material da escavação, compactado manualmente com soquete.',
    unidade: 'm3',
    custoMaterial: 5.00,
    custoMaoDeObra: 42.00,
    custoEquipamento: 0,
    categoria: 'Infraestrutura',
    itens: [
      { descricao: 'Servente', unidade: 'h', quantidade: 2.2, custoUnitario: 18.00, tipo: 'labor' },
      { descricao: 'Soquete manual', unidade: 'un', quantidade: 0.01, custoUnitario: 500.00, tipo: 'equipment' },
    ],
  },
  {
    codigo: '87371',
    nome: 'Alvenaria de tijolo cerâmico furado',
    descricao: 'Alvenaria de tijolo cerâmico furado 9x19x19cm, assentada com argamassa mista de cal e cimento.',
    unidade: 'm2',
    custoMaterial: 48.50,
    custoMaoDeObra: 42.00,
    custoEquipamento: 0,
    categoria: 'Superestrutura',
    itens: [
      { descricao: 'Tijolo cerâmico furado 9x19x19cm', unidade: 'mil', quantidade: 0.025, custoUnitario: 950.00, tipo: 'material' },
      { descricao: 'Cimento CP-II-E-32', unidade: 'kg', quantidade: 5, custoUnitario: 0.85, tipo: 'material' },
      { descricao: 'Cal hidratada CH-I', unidade: 'kg', quantidade: 8, custoUnitario: 0.55, tipo: 'material' },
      { descricao: 'Areia média', unidade: 'm3', quantidade: 0.025, custoUnitario: 120.00, tipo: 'material' },
      { descricao: 'Pedreiro', unidade: 'h', quantidade: 1.0, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 1.0, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '87372',
    nome: 'Alvenaria de bloco de concreto',
    descricao: 'Alvenaria de bloco de concreto 14x19x39cm, assentada com argamassa de cimento e areia.',
    unidade: 'm2',
    custoMaterial: 52.00,
    custoMaoDeObra: 38.00,
    custoEquipamento: 0,
    categoria: 'Superestrutura',
    itens: [
      { descricao: 'Bloco de concreto 14x19x39cm', unidade: 'un', quantidade: 12.5, custoUnitario: 3.50, tipo: 'material' },
      { descricao: 'Cimento CP-II-E-32', unidade: 'kg', quantidade: 6, custoUnitario: 0.85, tipo: 'material' },
      { descricao: 'Areia média', unidade: 'm3', quantidade: 0.03, custoUnitario: 120.00, tipo: 'material' },
      { descricao: 'Pedreiro', unidade: 'h', quantidade: 0.9, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.9, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '87373',
    nome: 'Alvenaria de bloco cerâmico',
    descricao: 'Alvenaria de bloco cerâmico para vedação 14x19x29cm, assentada com argamassa colante.',
    unidade: 'm2',
    custoMaterial: 46.00,
    custoMaoDeObra: 35.00,
    custoEquipamento: 0,
    categoria: 'Superestrutura',
    itens: [
      { descricao: 'Bloco cerâmico 14x19x29cm', unidade: 'un', quantidade: 17.5, custoUnitario: 2.20, tipo: 'material' },
      { descricao: 'Argamassa colante AC-II', unidade: 'kg', quantidade: 5, custoUnitario: 1.80, tipo: 'material' },
      { descricao: 'Pedreiro', unidade: 'h', quantidade: 0.8, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.8, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },

  // ============================================================================
  // ARGAMASSAS E REBOCOS
  // ============================================================================
  {
    codigo: '74215',
    nome: 'Argamassa de assentamento',
    descricao: 'Argamassa mista de cimento, cal e areia, traço 1:2:8, para assentamento de alvenaria.',
    unidade: 'm3',
    custoMaterial: 280.00,
    custoMaoDeObra: 120.00,
    custoEquipamento: 15.00,
    categoria: 'Argamassa',
    itens: [
      { descricao: 'Cimento CP-II-E-32', unidade: 'kg', quantidade: 220, custoUnitario: 0.85, tipo: 'material' },
      { descricao: 'Cal hidratada CH-I', unidade: 'kg', quantidade: 140, custoUnitario: 0.55, tipo: 'material' },
      { descricao: 'Areia média', unidade: 'm3', quantidade: 1.05, custoUnitario: 120.00, tipo: 'material' },
      { descricao: 'Servente', unidade: 'h', quantidade: 6.5, custoUnitario: 18.00, tipo: 'labor' },
      { descricao: 'Betoneira 400l', unidade: 'h', quantidade: 0.8, custoUnitario: 18.00, tipo: 'equipment' },
    ],
  },
  {
    codigo: '87521',
    nome: 'Reboco interno',
    descricao: 'Reboco interno de paredes e teto em argamassa mista, com espessura de 1,5cm.',
    unidade: 'm2',
    custoMaterial: 18.50,
    custoMaoDeObra: 32.00,
    custoEquipamento: 0,
    categoria: 'Reboco',
    itens: [
      { descricao: 'Cimento CP-II-E-32', unidade: 'kg', quantidade: 5, custoUnitario: 0.85, tipo: 'material' },
      { descricao: 'Cal hidratada CH-I', unidade: 'kg', quantidade: 10, custoUnitario: 0.55, tipo: 'material' },
      { descricao: 'Areia média', unidade: 'm3', quantidade: 0.018, custoUnitario: 120.00, tipo: 'material' },
      { descricao: 'Pedreiro', unidade: 'h', quantidade: 0.8, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.5, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '87522',
    nome: 'Reboco externo',
    descricao: 'Reboco externo de paredes em argamassa de cimento e areia, com espessura de 2cm, aplicado em duas camadas.',
    unidade: 'm2',
    custoMaterial: 22.00,
    custoMaoDeObra: 38.00,
    custoEquipamento: 0,
    categoria: 'Reboco',
    itens: [
      { descricao: 'Cimento CP-II-E-32', unidade: 'kg', quantidade: 8, custoUnitario: 0.85, tipo: 'material' },
      { descricao: 'Cal hidratada CH-I', unidade: 'kg', quantidade: 6, custoUnitario: 0.55, tipo: 'material' },
      { descricao: 'Areia média', unidade: 'm3', quantidade: 0.022, custoUnitario: 120.00, tipo: 'material' },
      { descricao: 'Aditivo impermeabilizante', unidade: 'l', quantidade: 0.2, custoUnitario: 18.00, tipo: 'material' },
      { descricao: 'Pedreiro', unidade: 'h', quantidade: 0.9, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.6, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '87523',
    nome: 'Chapisco interno',
    descricao: 'Chapisco interno em argamassa de cimento e areia, traço 1:3, aplicado com colher.',
    unidade: 'm2',
    custoMaterial: 6.50,
    custoMaoDeObra: 12.00,
    custoEquipamento: 0,
    categoria: 'Reboco',
    itens: [
      { descricao: 'Cimento CP-II-E-32', unidade: 'kg', quantidade: 4, custoUnitario: 0.85, tipo: 'material' },
      { descricao: 'Areia média', unidade: 'm3', quantidade: 0.008, custoUnitario: 120.00, tipo: 'material' },
      { descricao: 'Pedreiro', unidade: 'h', quantidade: 0.3, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.2, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '87524',
    nome: 'Emboço',
    descricao: 'Emboço de paredes e tetos em argamassa mista, com espessura de 1cm, para receber reboco.',
    unidade: 'm2',
    custoMaterial: 14.00,
    custoMaoDeObra: 22.00,
    custoEquipamento: 0,
    categoria: 'Reboco',
    itens: [
      { descricao: 'Cimento CP-II-E-32', unidade: 'kg', quantidade: 4, custoUnitario: 0.85, tipo: 'material' },
      { descricao: 'Cal hidratada CH-I', unidade: 'kg', quantidade: 6, custoUnitario: 0.55, tipo: 'material' },
      { descricao: 'Areia média', unidade: 'm3', quantidade: 0.012, custoUnitario: 120.00, tipo: 'material' },
      { descricao: 'Pedreiro', unidade: 'h', quantidade: 0.5, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.4, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },

  // ============================================================================
  // PINTURAS
  // ============================================================================
  {
    codigo: '85441',
    nome: 'Pintura látex interna',
    descricao: 'Pintura interna com tinta látex acrílica, sobre reboco novo, com aplicação de selador e duas demãos.',
    unidade: 'm2',
    custoMaterial: 12.50,
    custoMaoDeObra: 14.00,
    custoEquipamento: 0,
    categoria: 'Pintura',
    itens: [
      { descricao: 'Tinta látex acrílica', unidade: 'l', quantidade: 0.35, custoUnitario: 28.00, tipo: 'material' },
      { descricao: 'Selador acrílico', unidade: 'l', quantidade: 0.15, custoUnitario: 18.00, tipo: 'material' },
      { descricao: 'Massa corrida', unidade: 'kg', quantidade: 0.3, custoUnitario: 8.00, tipo: 'material' },
      { descricao: 'Pintor', unidade: 'h', quantidade: 0.5, custoUnitario: 26.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '85442',
    nome: 'Pintura látex externa',
    descricao: 'Pintura externa com tinta látex acrílica de alta resistência, sobre reboco novo, com aplicação de selador e duas demãos.',
    unidade: 'm2',
    custoMaterial: 16.00,
    custoMaoDeObra: 16.00,
    custoEquipamento: 0,
    categoria: 'Pintura',
    itens: [
      { descricao: 'Tinta látex acrílica externa', unidade: 'l', quantidade: 0.40, custoUnitario: 35.00, tipo: 'material' },
      { descricao: 'Selador acrílico', unidade: 'l', quantidade: 0.15, custoUnitario: 18.00, tipo: 'material' },
      { descricao: 'Pintor', unidade: 'h', quantidade: 0.55, custoUnitario: 26.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '85445',
    nome: 'Pintura esmalte sintético',
    descricao: 'Pintura em madeira ou metal com esmalte sintético brilhante, com fundo e duas demãos.',
    unidade: 'm2',
    custoMaterial: 22.00,
    custoMaoDeObra: 28.00,
    custoEquipamento: 0,
    categoria: 'Pintura',
    itens: [
      { descricao: 'Esmalte sintético brilhante', unidade: 'l', quantidade: 0.35, custoUnitario: 48.00, tipo: 'material' },
      { descricao: 'Fundo branco', unidade: 'l', quantidade: 0.15, custoUnitario: 25.00, tipo: 'material' },
      { descricao: 'Diluente', unidade: 'l', quantidade: 0.10, custoUnitario: 12.00, tipo: 'material' },
      { descricao: 'Lixa d\'água 180', unidade: 'un', quantidade: 0.1, custoUnitario: 3.50, tipo: 'material' },
      { descricao: 'Pintor', unidade: 'h', quantidade: 0.8, custoUnitario: 26.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '85446',
    nome: 'Pintura texturizada',
    descricao: 'Pintura texturizada em parede externa, com massa textura à base de quartzo e aplicação com rolo.',
    unidade: 'm2',
    custoMaterial: 18.50,
    custoMaoDeObra: 22.00,
    custoEquipamento: 0,
    categoria: 'Pintura',
    itens: [
      { descricao: 'Massa textura quartzol', unidade: 'kg', quantidade: 1.2, custoUnitario: 12.00, tipo: 'material' },
      { descricao: 'Tinta látex acrílica', unidade: 'l', quantidade: 0.20, custoUnitario: 35.00, tipo: 'material' },
      { descricao: 'Pintor', unidade: 'h', quantidade: 0.7, custoUnitario: 26.00, tipo: 'labor' },
    ],
  },

  // ============================================================================
  // PISOS E REVESTIMENTOS
  // ============================================================================
  {
    codigo: '86241',
    nome: 'Contrapiso',
    descricao: 'Contrapiso em argamassa de cimento e areia, com espessura de 4cm, com caimento para ralos.',
    unidade: 'm2',
    custoMaterial: 28.00,
    custoMaoDeObra: 32.00,
    custoEquipamento: 0,
    categoria: 'Piso',
    itens: [
      { descricao: 'Cimento CP-II-E-32', unidade: 'kg', quantidade: 18, custoUnitario: 0.85, tipo: 'material' },
      { descricao: 'Areia média', unidade: 'm3', quantidade: 0.045, custoUnitario: 120.00, tipo: 'material' },
      { descricao: 'Pedreiro', unidade: 'h', quantidade: 0.7, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.8, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '86242',
    nome: 'Piso cerâmico interno 45x45cm',
    descricao: 'Assentamento de piso cerâmico esmaltado 45x45cm, com argamassa colante AC-II e rejunte.',
    unidade: 'm2',
    custoMaterial: 65.00,
    custoMaoDeObra: 42.00,
    custoEquipamento: 0,
    categoria: 'Piso',
    itens: [
      { descricao: 'Piso cerâmico 45x45cm', unidade: 'm2', quantidade: 1.08, custoUnitario: 45.00, tipo: 'material' },
      { descricao: 'Argamassa colante AC-II', unidade: 'kg', quantidade: 4, custoUnitario: 2.50, tipo: 'material' },
      { descricao: 'Rejunte', unidade: 'kg', quantidade: 0.5, custoUnitario: 8.00, tipo: 'material' },
      { descricao: 'Assentador', unidade: 'h', quantidade: 1.0, custoUnitario: 30.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.4, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '86243',
    nome: 'Piso porcelanato 60x60cm',
    descricao: 'Assentamento de piso porcelanato polido 60x60cm, com argamassa colante especial e rejunte epóxi.',
    unidade: 'm2',
    custoMaterial: 120.00,
    custoMaoDeObra: 55.00,
    custoEquipamento: 0,
    categoria: 'Piso',
    itens: [
      { descricao: 'Porcelanato 60x60cm', unidade: 'm2', quantidade: 1.08, custoUnitario: 95.00, tipo: 'material' },
      { descricao: 'Argamassa colante AC-III', unidade: 'kg', quantidade: 5, custoUnitario: 3.50, tipo: 'material' },
      { descricao: 'Rejunte epóxi', unidade: 'kg', quantidade: 0.6, custoUnitario: 28.00, tipo: 'material' },
      { descricao: 'Assentador', unidade: 'h', quantidade: 1.2, custoUnitario: 32.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.5, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '86244',
    nome: 'Rodapé cerâmico 10cm',
    descricao: 'Assentamento de rodapé cerâmico 10cm de altura, com argamassa colante e rejunte.',
    unidade: 'm',
    custoMaterial: 18.00,
    custoMaoDeObra: 12.00,
    custoEquipamento: 0,
    categoria: 'Piso',
    itens: [
      { descricao: 'Rodapé cerâmico 10cm', unidade: 'm', quantidade: 1.05, custoUnitario: 12.00, tipo: 'material' },
      { descricao: 'Argamassa colante AC-II', unidade: 'kg', quantidade: 1, custoUnitario: 2.50, tipo: 'material' },
      { descricao: 'Rejunte', unidade: 'kg', quantidade: 0.1, custoUnitario: 8.00, tipo: 'material' },
      { descricao: 'Assentador', unidade: 'h', quantidade: 0.3, custoUnitario: 30.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '86301',
    nome: 'Azulejo 15x15cm',
    descricao: 'Assentamento de azulejo branco 15x15cm em paredes, com argamassa colante e rejunte.',
    unidade: 'm2',
    custoMaterial: 48.00,
    custoMaoDeObra: 45.00,
    custoEquipamento: 0,
    categoria: 'Revestimento',
    itens: [
      { descricao: 'Azulejo 15x15cm', unidade: 'm2', quantidade: 1.08, custoUnitario: 32.00, tipo: 'material' },
      { descricao: 'Argamassa colante AC-II', unidade: 'kg', quantidade: 4.5, custoUnitario: 2.50, tipo: 'material' },
      { descricao: 'Rejunte', unidade: 'kg', quantidade: 0.6, custoUnitario: 8.00, tipo: 'material' },
      { descricao: 'Assentador', unidade: 'h', quantidade: 1.1, custoUnitario: 30.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.4, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '86302',
    nome: 'Revestimento cerâmico box 20x30cm',
    descricao: 'Assentamento de revestimento cerâmico para box de banheiro 20x30cm, com argamassa colante e rejunte.',
    unidade: 'm2',
    custoMaterial: 55.00,
    custoMaoDeObra: 48.00,
    custoEquipamento: 0,
    categoria: 'Revestimento',
    itens: [
      { descricao: 'Revestimento cerâmico 20x30cm', unidade: 'm2', quantidade: 1.08, custoUnitario: 38.00, tipo: 'material' },
      { descricao: 'Argamassa colante AC-II', unidade: 'kg', quantidade: 4.5, custoUnitario: 2.50, tipo: 'material' },
      { descricao: 'Rejunte', unidade: 'kg', quantidade: 0.6, custoUnitario: 8.00, tipo: 'material' },
      { descricao: 'Assentador', unidade: 'h', quantidade: 1.2, custoUnitario: 30.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.4, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },

  // ============================================================================
  // COBERTURAS E ESTRUTURAS
  // ============================================================================
  {
    codigo: '87701',
    nome: 'Estrutura de telhado madeira',
    descricao: 'Estrutura de telhado em madeira, com tesouras, caibros, ripas e pontaletes.',
    unidade: 'm2',
    custoMaterial: 85.00,
    custoMaoDeObra: 55.00,
    custoEquipamento: 5.00,
    categoria: 'Cobertura',
    itens: [
      { descricao: 'Madeira serrada 6x12cm', unidade: 'm', quantidade: 0.35, custoUnitario: 45.00, tipo: 'material' },
      { descricao: 'Madeira serrada 5x7cm', unidade: 'm', quantidade: 1.2, custoUnitario: 28.00, tipo: 'material' },
      { descricao: 'Ripa 2x4cm', unidade: 'm', quantidade: 3.0, custoUnitario: 8.00, tipo: 'material' },
      { descricao: 'Pregos diversos', unidade: 'kg', quantidade: 0.8, custoUnitario: 14.00, tipo: 'material' },
      { descricao: 'Carpinteiro', unidade: 'h', quantidade: 1.5, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.8, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '87702',
    nome: 'Telha cerâmica capa canal',
    descricao: 'Cobertura com telha cerâmica capa canal 41x24cm, inclusive ripamento.',
    unidade: 'm2',
    custoMaterial: 65.00,
    custoMaoDeObra: 35.00,
    custoEquipamento: 0,
    categoria: 'Cobertura',
    itens: [
      { descricao: 'Telha cerâmica capa canal', unidade: 'un', quantidade: 16, custoUnitario: 3.20, tipo: 'material' },
      { descricao: 'Telha meio canal', unidade: 'un', quantidade: 0.5, custoUnitario: 2.50, tipo: 'material' },
      { descricao: 'Ripa 2x4cm', unidade: 'm', quantidade: 2.0, custoUnitario: 8.00, tipo: 'material' },
      { descricao: 'Carpinteiro', unidade: 'h', quantidade: 0.8, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.6, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '87703',
    nome: 'Telha fibrocimento 4mm',
    descricao: 'Cobertura com telha de fibrocimento ondulada 4mm, com estrutura metálica simples.',
    unidade: 'm2',
    custoMaterial: 48.00,
    custoMaoDeObra: 28.00,
    custoEquipamento: 0,
    categoria: 'Cobertura',
    itens: [
      { descricao: 'Telha fibrocimento 4mm', unidade: 'm2', quantidade: 1.1, custoUnitario: 35.00, tipo: 'material' },
      { descricao: 'Parafuso com bucha', unidade: 'un', quantidade: 6, custoUnitario: 1.20, tipo: 'material' },
      { descricao: 'Cumeeira fibrocimento', unidade: 'm', quantidade: 0.08, custoUnitario: 25.00, tipo: 'material' },
      { descricao: 'Montador', unidade: 'h', quantidade: 0.7, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.5, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '87704',
    nome: 'Calha de alumínio',
    descricao: 'Calha de alumínio liso 0,6mm, com 30cm de largura, inclusive supports e acessórios.',
    unidade: 'm',
    custoMaterial: 58.00,
    custoMaoDeObra: 22.00,
    custoEquipamento: 0,
    categoria: 'Cobertura',
    itens: [
      { descricao: 'Calha alumínio 0,6mm', unidade: 'm', quantidade: 1.05, custoUnitario: 45.00, tipo: 'material' },
      { descricao: 'Suporte para calha', unidade: 'un', quantidade: 1.2, custoUnitario: 6.00, tipo: 'material' },
      { descricao: 'Conector calha', unidade: 'un', quantidade: 0.15, custoUnitario: 18.00, tipo: 'material' },
      { descricao: 'Soldador', unidade: 'h', quantidade: 0.4, custoUnitario: 32.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.3, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },

  // ============================================================================
  // ESQUADRIAS
  // ============================================================================
  {
    codigo: '88121',
    nome: 'Porta interna madeira',
    descricao: 'Porta interna de madeira maciça 80x210cm, com fechadura cilíndrica, dobradiças e batente.',
    unidade: 'un',
    custoMaterial: 480.00,
    custoMaoDeObra: 120.00,
    custoEquipamento: 0,
    categoria: 'Esquadria',
    itens: [
      { descricao: 'Porta madeira maciça 80x210cm', unidade: 'un', quantidade: 1, custoUnitario: 380.00, tipo: 'material' },
      { descricao: 'Batente madeira 8x15cm', unidade: 'un', quantidade: 1, custoUnitario: 85.00, tipo: 'material' },
      { descricao: 'Fechadura cilíndrica', unidade: 'un', quantidade: 1, custoUnitario: 65.00, tipo: 'material' },
      { descricao: 'Dobradiça 3x3"', unidade: 'par', quantidade: 1.5, custoUnitario: 18.00, tipo: 'material' },
      { descricao: 'Carpinteiro', unidade: 'h', quantidade: 3, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 1, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '88122',
    nome: 'Janela de alumínio basculante',
    descricao: 'Janela de alumínio anodizado basculante 100x120cm, com vidro liso 4mm e fechadura.',
    unidade: 'un',
    custoMaterial: 380.00,
    custoMaoDeObra: 85.00,
    custoEquipamento: 0,
    categoria: 'Esquadria',
    itens: [
      { descricao: 'Janela alumínio basculante', unidade: 'un', quantidade: 1, custoUnitario: 320.00, tipo: 'material' },
      { descricao: 'Vidro liso 4mm', unidade: 'm2', quantidade: 1.3, custoUnitario: 45.00, tipo: 'material' },
      { descricao: 'Silicone', unidade: 'cartucho', quantidade: 0.3, custoUnitario: 18.00, tipo: 'material' },
      { descricao: 'Montador', unidade: 'h', quantidade: 2.5, custoUnitario: 28.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '88123',
    nome: 'Janela de alumínio maxim-ar',
    descricao: 'Janela de alumínio anodizado maxim-ar 120x100cm, com vidro liso 4mm.',
    unidade: 'un',
    custoMaterial: 420.00,
    custoMaoDeObra: 95.00,
    custoEquipamento: 0,
    categoria: 'Esquadria',
    itens: [
      { descricao: 'Janela alumínio maxim-ar', unidade: 'un', quantidade: 1, custoUnitario: 360.00, tipo: 'material' },
      { descricao: 'Vidro liso 4mm', unidade: 'm2', quantidade: 1.4, custoUnitario: 45.00, tipo: 'material' },
      { descricao: 'Silicone', unidade: 'cartucho', quantidade: 0.3, custoUnitario: 18.00, tipo: 'material' },
      { descricao: 'Montador', unidade: 'h', quantidade: 2.8, custoUnitario: 28.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '88124',
    nome: 'Portão de alumínio',
    descricao: 'Portão de alumínio anodizado basculante para garagem 300x220cm, com motor.',
    unidade: 'un',
    custoMaterial: 3800.00,
    custoMaoDeObra: 450.00,
    custoEquipamento: 0,
    categoria: 'Esquadria',
    itens: [
      { descricao: 'Portão alumínio basculante', unidade: 'un', quantidade: 1, custoUnitario: 2800.00, tipo: 'material' },
      { descricao: 'Motor para portão', unidade: 'un', quantidade: 1, custoUnitario: 850.00, tipo: 'material' },
      { descricao: 'Controle remoto', unidade: 'un', quantidade: 2, custoUnitario: 45.00, tipo: 'material' },
      { descricao: 'Montador', unidade: 'h', quantidade: 12, custoUnitario: 30.00, tipo: 'labor' },
      { descricao: 'Eletricista', unidade: 'h', quantidade: 3, custoUnitario: 32.00, tipo: 'labor' },
    ],
  },

  // ============================================================================
  // INSTALAÇÕES ELÉTRICAS
  // ============================================================================
  {
    codigo: '89721',
    nome: 'Ponto de luz',
    descricao: 'Ponto de luz em embutido, com eletroduto corrugado 20mm, fiação e caixa de passagem.',
    unidade: 'pt',
    custoMaterial: 28.00,
    custoMaoDeObra: 32.00,
    custoEquipamento: 0,
    categoria: 'Elétrica',
    itens: [
      { descricao: 'Eletroduto corrugado 20mm', unidade: 'm', quantidade: 2.5, custoUnitario: 3.50, tipo: 'material' },
      { descricao: 'Fio 1,5mm²', unidade: 'm', quantidade: 6, custoUnitario: 2.20, tipo: 'material' },
      { descricao: 'Caixa de passagem 4x4"', unidade: 'un', quantidade: 1, custoUnitario: 4.50, tipo: 'material' },
      { descricao: 'Luminária ponto de luz', unidade: 'un', quantidade: 1, custoUnitario: 8.00, tipo: 'material' },
      { descricao: 'Eletricista', unidade: 'h', quantidade: 0.8, custoUnitario: 32.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.3, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '89722',
    nome: 'Tomada simples',
    descricao: 'Ponto de tomada simples 10A, com eletroduto, fiação e caixa 4x4".',
    unidade: 'pt',
    custoMaterial: 22.00,
    custoMaoDeObra: 25.00,
    custoEquipamento: 0,
    categoria: 'Elétrica',
    itens: [
      { descricao: 'Eletroduto corrugado 20mm', unidade: 'm', quantidade: 2, custoUnitario: 3.50, tipo: 'material' },
      { descricao: 'Fio 2,5mm²', unidade: 'm', quantidade: 6, custoUnitario: 3.20, tipo: 'material' },
      { descricao: 'Caixa 4x4"', unidade: 'un', quantidade: 1, custoUnitario: 4.50, tipo: 'material' },
      { descricao: 'Tomada simples 10A', unidade: 'un', quantidade: 1, custoUnitario: 6.00, tipo: 'material' },
      { descricao: 'Espelho 4x2"', unidade: 'un', quantidade: 1, custoUnitario: 3.00, tipo: 'material' },
      { descricao: 'Eletricista', unidade: 'h', quantidade: 0.6, custoUnitario: 32.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '89723',
    nome: 'Quadro de distribuição',
    descricao: 'Quadro de distribuição para 12 circuitos, com disjuntores, barramentos e fiação.',
    unidade: 'un',
    custoMaterial: 650.00,
    custoMaoDeObra: 280.00,
    custoEquipamento: 0,
    categoria: 'Elétrica',
    itens: [
      { descricao: 'Quadro distribuição 12 circuitos', unidade: 'un', quantidade: 1, custoUnitario: 180.00, tipo: 'material' },
      { descricao: 'Disjuntor bipolar 40A', unidade: 'un', quantidade: 1, custoUnitario: 85.00, tipo: 'material' },
      { descricao: 'Disjuntor monopolar 20A', unidade: 'un', quantidade: 6, custoUnitario: 28.00, tipo: 'material' },
      { descricao: 'Disjuntor monopolar 10A', unidade: 'un', quantidade: 5, custoUnitario: 25.00, tipo: 'material' },
      { descricao: 'Barramento de neutro', unidade: 'un', quantidade: 1, custoUnitario: 35.00, tipo: 'material' },
      { descricao: 'Eletricista', unidade: 'h', quantidade: 7, custoUnitario: 32.00, tipo: 'labor' },
    ],
  },

  // ============================================================================
  // INSTALAÇÕES HIDROSSANITÁRIAS
  // ============================================================================
  {
    codigo: '89861',
    nome: 'Ponto de água fria',
    descricao: 'Ponto de água fria com tubo PVC soldável 20mm, conexões e registro de gaveta.',
    unidade: 'pt',
    custoMaterial: 45.00,
    custoMaoDeObra: 38.00,
    custoEquipamento: 0,
    categoria: 'Hidráulica',
    itens: [
      { descricao: 'Tubo PVC 20mm', unidade: 'm', quantidade: 3, custoUnitario: 6.50, tipo: 'material' },
      { descricao: 'Conexões PVC 20mm', unidade: 'un', quantidade: 4, custoUnitario: 3.50, tipo: 'material' },
      { descricao: 'Registro de gaveta 20mm', unidade: 'un', quantidade: 1, custoUnitario: 18.00, tipo: 'material' },
      { descricao: 'Adesivo PVC', unidade: 'un', quantidade: 0.2, custoUnitario: 12.00, tipo: 'material' },
      { descricao: 'Encanador', unidade: 'h', quantidade: 1.0, custoUnitario: 32.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.3, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '89862',
    nome: 'Ponto de esgoto 100mm',
    descricao: 'Ponto de esgoto com tubo PVC 100mm, conexões e caixa de inspeção.',
    unidade: 'pt',
    custoMaterial: 85.00,
    custoMaoDeObra: 65.00,
    custoEquipamento: 0,
    categoria: 'Hidráulica',
    itens: [
      { descricao: 'Tubo PVC 100mm', unidade: 'm', quantidade: 2.5, custoUnitario: 28.00, tipo: 'material' },
      { descricao: 'Joelho 90° PVC 100mm', unidade: 'un', quantidade: 2, custoUnitario: 15.00, tipo: 'material' },
      { descricao: 'Caixa de inspeção', unidade: 'un', quantidade: 1, custoUnitario: 35.00, tipo: 'material' },
      { descricao: 'Adesivo PVC', unidade: 'un', quantidade: 0.3, custoUnitario: 12.00, tipo: 'material' },
      { descricao: 'Encanador', unidade: 'h', quantidade: 1.5, custoUnitario: 32.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 1.0, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '89863',
    nome: 'Caixa d\'água 1000 litros',
    descricao: 'Caixa d\'água de polietileno 1000 litros, com tampa, base de apoio e instalação.',
    unidade: 'un',
    custoMaterial: 380.00,
    custoMaoDeObra: 120.00,
    custoEquipamento: 0,
    categoria: 'Hidráulica',
    itens: [
      { descricao: 'Caixa d\'água 1000L', unidade: 'un', quantidade: 1, custoUnitario: 320.00, tipo: 'material' },
      { descricao: 'Tampa caixa d\'água', unidade: 'un', quantidade: 1, custoUnitario: 25.00, tipo: 'material' },
      { descricao: 'Base de apoio', unidade: 'un', quantidade: 1, custoUnitario: 35.00, tipo: 'material' },
      { descricao: 'Tubo PVC 25mm', unidade: 'm', quantidade: 2, custoUnitario: 8.00, tipo: 'material' },
      { descricao: 'Flauta d\'água', unidade: 'un', quantidade: 1, custoUnitario: 28.00, tipo: 'material' },
      { descricao: 'Encanador', unidade: 'h', quantidade: 2.5, custoUnitario: 32.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 1.5, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },

  // ============================================================================
  // LOUÇAS E METAIS
  // ============================================================================
  {
    codigo: '89901',
    nome: 'Bacia sanitária caixa acoplada',
    descricao: 'Instalação de bacia sanitária com caixa acoplada branca, inclusive conexões.',
    unidade: 'un',
    custoMaterial: 420.00,
    custoMaoDeObra: 85.00,
    custoEquipamento: 0,
    categoria: 'Louças',
    itens: [
      { descricao: 'Bacia sanitária caixa acoplada', unidade: 'un', quantidade: 1, custoUnitario: 380.00, tipo: 'material' },
      { descricao: 'Assento sanitário', unidade: 'un', quantidade: 1, custoUnitario: 35.00, tipo: 'material' },
      { descricao: 'Flexível 40cm', unidade: 'un', quantidade: 1, custoUnitario: 18.00, tipo: 'material' },
      { descricao: 'Encanador', unidade: 'h', quantidade: 2.0, custoUnitario: 32.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.5, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '89902',
    nome: 'Lavatório com coluna',
    descricao: 'Instalação de lavatório com coluna branco 60cm, inclusive torneira e sifão.',
    unidade: 'un',
    custoMaterial: 380.00,
    custoMaoDeObra: 75.00,
    custoEquipamento: 0,
    categoria: 'Louças',
    itens: [
      { descricao: 'Lavatório com coluna 60cm', unidade: 'un', quantidade: 1, custoUnitario: 280.00, tipo: 'material' },
      { descricao: 'Torneira lavatório', unidade: 'un', quantidade: 1, custoUnitario: 75.00, tipo: 'material' },
      { descricao: 'Sifão cromado', unidade: 'un', quantidade: 1, custoUnitario: 25.00, tipo: 'material' },
      { descricao: 'Encanador', unidade: 'h', quantidade: 1.8, custoUnitario: 32.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.4, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '89903',
    nome: 'Torneira de cozinha',
    descricao: 'Instalação de torneira de cozinha com misturador monocomando.',
    unidade: 'un',
    custoMaterial: 185.00,
    custoMaoDeObra: 45.00,
    custoEquipamento: 0,
    categoria: 'Metais',
    itens: [
      { descricao: 'Torneira cozinha misturador', unidade: 'un', quantidade: 1, custoUnitario: 165.00, tipo: 'material' },
      { descricao: 'Flexíveis 30cm', unidade: 'par', quantidade: 1, custoUnitario: 18.00, tipo: 'material' },
      { descricao: 'Encanador', unidade: 'h', quantidade: 1.0, custoUnitario: 32.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '89904',
    nome: 'Chuveiro elétrico',
    descricao: 'Instalação de chuveiro elétrico, inclusive ponto elétrico dedicado.',
    unidade: 'un',
    custoMaterial: 185.00,
    custoMaoDeObra: 85.00,
    custoEquipamento: 0,
    categoria: 'Metais',
    itens: [
      { descricao: 'Chuveiro elétrico 5500W', unidade: 'un', quantidade: 1, custoUnitario: 120.00, tipo: 'material' },
      { descricao: 'Disjuntor bipolar 40A', unidade: 'un', quantidade: 1, custoUnitario: 85.00, tipo: 'material' },
      { descricao: 'Fio 4mm²', unidade: 'm', quantidade: 8, custoUnitario: 5.50, tipo: 'material' },
      { descricao: 'Eletricista', unidade: 'h', quantidade: 1.5, custoUnitario: 32.00, tipo: 'labor' },
      { descricao: 'Encanador', unidade: 'h', quantidade: 0.8, custoUnitario: 32.00, tipo: 'labor' },
    ],
  },

  // ============================================================================
  // IMPERMEABILIZAÇÃO
  // ============================================================================
  {
    codigo: '87801',
    nome: 'Impermeabilização de laje',
    descricao: 'Impermeabilização de laje com manta asfáltica 4mm, aplicada a quente.',
    unidade: 'm2',
    custoMaterial: 58.00,
    custoMaoDeObra: 42.00,
    custoEquipamento: 15.00,
    categoria: 'Impermeabilização',
    itens: [
      { descricao: 'Manta asfáltica 4mm', unidade: 'm2', quantidade: 1.15, custoUnitario: 42.00, tipo: 'material' },
      { descricao: 'Primer asfáltico', unidade: 'l', quantidade: 0.35, custoUnitario: 18.00, tipo: 'material' },
      { descricao: 'Gás GLP', unidade: 'kg', quantidade: 0.3, custoUnitario: 12.00, tipo: 'material' },
      { descricao: 'Impermeabilizador', unidade: 'h', quantidade: 1.0, custoUnitario: 32.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.5, custoUnitario: 18.00, tipo: 'labor' },
      { descricao: 'Maçarico', unidade: 'h', quantidade: 0.5, custoUnitario: 25.00, tipo: 'equipment' },
    ],
  },
  {
    codigo: '87802',
    nome: 'Impermeabilização de caixa d\'água',
    descricao: 'Impermeabilização interna de caixa d\'água com argamassa polimérica.',
    unidade: 'm2',
    custoMaterial: 32.00,
    custoMaoDeObra: 45.00,
    custoEquipamento: 0,
    categoria: 'Impermeabilização',
    itens: [
      { descricao: 'Argamassa polimérica', unidade: 'kg', quantidade: 2.5, custoUnitario: 8.50, tipo: 'material' },
      { descricao: 'Aditivo hidrófugo', unidade: 'l', quantidade: 0.5, custoUnitario: 15.00, tipo: 'material' },
      { descricao: 'Cimento CP-II-E-32', unidade: 'kg', quantidade: 5, custoUnitario: 0.85, tipo: 'material' },
      { descricao: 'Pedreiro', unidade: 'h', quantidade: 1.2, custoUnitario: 28.00, tipo: 'labor' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.8, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },

  // ============================================================================
  // LIMPEZA E ACABAMENTO
  // ============================================================================
  {
    codigo: '87201',
    nome: 'Limpeza final de obra',
    descricao: 'Limpeza final de obra, incluindo lavagem de pisos, vidros e retirada de resíduos.',
    unidade: 'm2',
    custoMaterial: 3.50,
    custoMaoDeObra: 12.00,
    custoEquipamento: 0,
    categoria: 'Acabamento',
    itens: [
      { descricao: 'Detergente neutro', unidade: 'l', quantidade: 0.05, custoUnitario: 12.00, tipo: 'material' },
      { descricao: 'Esponja', unidade: 'un', quantidade: 0.1, custoUnitario: 3.50, tipo: 'material' },
      { descricao: 'Saco de lixo', unidade: 'un', quantidade: 0.2, custoUnitario: 2.50, tipo: 'material' },
      { descricao: 'Servente', unidade: 'h', quantidade: 0.6, custoUnitario: 18.00, tipo: 'labor' },
    ],
  },
  {
    codigo: '87202',
    nome: 'Vidro temperado 8mm',
    descricao: 'Instalação de vidro temperado 8mm em box de banheiro, com ferragens.',
    unidade: 'm2',
    custoMaterial: 280.00,
    custoMaoDeObra: 85.00,
    custoEquipamento: 0,
    categoria: 'Acabamento',
    itens: [
      { descricao: 'Vidro temperado 8mm', unidade: 'm2', quantidade: 1.05, custoUnitario: 250.00, tipo: 'material' },
      { descricao: 'Dobradiça vidro', unidade: 'un', quantidade: 1.5, custoUnitario: 45.00, tipo: 'material' },
      { descricao: 'Puxador vidro', unidade: 'un', quantidade: 0.3, custoUnitario: 85.00, tipo: 'material' },
      { descricao: 'Silicone estrutural', unidade: 'cartucho', quantidade: 0.5, custoUnitario: 28.00, tipo: 'material' },
      { descricao: 'Vidraceiro', unidade: 'h', quantidade: 2.0, custoUnitario: 35.00, tipo: 'labor' },
    ],
  },
];

// =============================================================================
// Função Principal de Seed
// =============================================================================

async function main() {
  console.log('🌱 Iniciando seed SINAPI...');

  // Buscar ou criar empresa demo
  let company = await prisma.companies.findFirst({
    where: { cnpj: '00.000.000/0001-00' },
  });

  if (!company) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Criar empresa master para SINAPI
    company = await prisma.companies.create({
      data: {
        name: 'SINAPI - Base Nacional',
        tradingName: 'SINAPI',
        cnpj: '00.000.000/0001-00',
        email: 'sinapi@construtorpro.com',
        phone: '(61) 0000-0000',
        plan: 'enterprise',
        isActive: true,
      },
    });

    console.log('✅ Empresa SINAPI criada');
  }

  // Limpar composições SINAPI existentes
  const existingCompositions = await prisma.compositions.findMany({
    where: { companyId: company.id },
    select: { id: true },
  });

  if (existingCompositions.length > 0) {
    // Deletar itens primeiro
    for (const comp of existingCompositions) {
      await prisma.compositions_items.deleteMany({
        where: { compositionId: comp.id },
      });
    }
    // Deletar composições
    await prisma.compositions.deleteMany({
      where: { companyId: company.id },
    });
    console.log(`🗑️ Removidas ${existingCompositions.length} composições existentes`);
  }

  // Criar novas composições SINAPI
  let created = 0;
  
  for (const sinapiComp of sinapiCompositions) {
    const totalCost = sinapiComp.custoMaterial + sinapiComp.custoMaoDeObra + sinapiComp.custoEquipamento;
    const profitMargin = 30;
    const totalPrice = totalCost * (1 + profitMargin / 100);

    const composition = await prisma.compositions.create({
      data: {
        companyId: company.id,
        code: sinapiComp.codigo,
        name: sinapiComp.nome,
        description: sinapiComp.descricao,
        unit: sinapiComp.unidade,
        totalCost,
        totalPrice,
        profitMargin,
        isActive: true,
        items: {
          create: sinapiComp.itens.map((item, index) => ({
            description: item.descricao,
            unit: item.unidade,
            quantity: item.quantidade,
            unitCost: item.custoUnitario,
            totalCost: item.quantidade * item.custoUnitario,
            itemType: item.tipo,
            order: index,
          })),
        },
      },
    });

    created++;
    console.log(`✅ Criada: ${sinapiComp.codigo} - ${sinapiComp.nome}`);
  }

  console.log(`\n🎉 Seed SINAPI concluído!`);
  console.log(`📊 Total de composições criadas: ${created}`);
  console.log(`🏢 Empresa: ${company.name}`);
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed SINAPI:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
