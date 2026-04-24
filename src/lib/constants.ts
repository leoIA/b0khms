// =============================================================================
// ConstrutorPro - Constantes Globais
// =============================================================================

import type { UserRole, CompanyPlan, ProjectStatus, BudgetStatus, SupplierStatus, ClientStatus, PaymentStatus, DailyLogWeather, ScheduleStatus, TransactionType, TransactionCategory } from '@/types';

// -----------------------------------------------------------------------------
// Aplicação
// -----------------------------------------------------------------------------

export const APP_NAME = 'ConstrutorPro';
export const APP_DESCRIPTION = 'Plataforma premium de gestão de construção para o mercado brasileiro';
export const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
export const APP_VERSION = '1.0.0';

// -----------------------------------------------------------------------------
// Funções do Sistema
// -----------------------------------------------------------------------------

export const USER_ROLES: Record<UserRole, { label: string; description: string; level: number }> = {
  master_admin: {
    label: 'Administrador Master',
    description: 'Acesso total ao sistema, incluindo gestão de empresas',
    level: 100,
  },
  company_admin: {
    label: 'Administrador da Empresa',
    description: 'Administrador da empresa com acesso completo aos dados da empresa',
    level: 90,
  },
  manager: {
    label: 'Gerente',
    description: 'Gerenciamento de projetos, orçamentos e equipe',
    level: 70,
  },
  engineer: {
    label: 'Engenheiro',
    description: 'Acesso a projetos, cronogramas e diário de obra',
    level: 50,
  },
  finance: {
    label: 'Financeiro',
    description: 'Acesso ao módulo financeiro e relatórios',
    level: 50,
  },
  procurement: {
    label: 'Compras',
    description: 'Gestão de fornecedores, materiais e composições',
    level: 50,
  },
  operations: {
    label: 'Operações',
    description: 'Acesso operacional a projetos e diário de obra',
    level: 30,
  },
  viewer: {
    label: 'Visualizador',
    description: 'Apenas visualização de dados',
    level: 10,
  },
};

export const ROLE_HIERARCHY: UserRole[] = [
  'master_admin',
  'company_admin',
  'manager',
  'engineer',
  'finance',
  'procurement',
  'operations',
  'viewer',
];

// -----------------------------------------------------------------------------
// Planos da Empresa
// -----------------------------------------------------------------------------

export const COMPANY_PLANS: Record<CompanyPlan, { label: string; description: string; features: string[] }> = {
  trial: {
    label: 'Teste Gratuito',
    description: '14 dias de teste completo',
    features: [
      'Até 5 usuários',
      'Até 5 projetos ativos',
      'Todos os módulos liberados',
      'IA Assistente',
      'Suporte por email',
    ],
  },
  starter: {
    label: 'Starter',
    description: 'Ideal para pequenas construtoras',
    features: [
      'Até 5 usuários',
      'Até 10 projetos ativos',
      'Módulo básico de orçamentos',
      'Diário de obra',
      'Suporte por email',
    ],
  },
  professional: {
    label: 'Professional',
    description: 'Para construtoras em crescimento',
    features: [
      'Até 20 usuários',
      'Projetos ilimitados',
      'Módulo completo de orçamentos',
      'Cronograma físico-financeiro',
      'Financeiro completo',
      'Relatórios avançados',
      'IA Assistente',
      'Suporte prioritário',
    ],
  },
  enterprise: {
    label: 'Enterprise',
    description: 'Para grandes construtoras',
    features: [
      'Usuários ilimitados',
      'Projetos ilimitados',
      'Todos os módulos',
      'API de integração',
      'Multi-empresas',
      'Suporte 24/7',
      'Treinamento personalizado',
    ],
  },
};

// -----------------------------------------------------------------------------
// Status de Projeto
// -----------------------------------------------------------------------------

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; color: string; description: string }> = {
  planning: {
    label: 'Planejamento',
    color: 'bg-blue-500',
    description: 'Projeto em fase de planejamento',
  },
  active: {
    label: 'Em Andamento',
    color: 'bg-green-500',
    description: 'Projeto em execução',
  },
  paused: {
    label: 'Pausado',
    color: 'bg-yellow-500',
    description: 'Projeto temporariamente pausado',
  },
  completed: {
    label: 'Concluído',
    color: 'bg-emerald-600',
    description: 'Projeto finalizado',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-red-500',
    description: 'Projeto cancelado',
  },
};

// -----------------------------------------------------------------------------
// Status de Orçamento
// -----------------------------------------------------------------------------

export const BUDGET_STATUS: Record<BudgetStatus, { label: string; color: string; description: string }> = {
  draft: {
    label: 'Rascunho',
    color: 'bg-gray-500',
    description: 'Orçamento em elaboração',
  },
  pending: {
    label: 'Pendente',
    color: 'bg-yellow-500',
    description: 'Aguardando aprovação',
  },
  approved: {
    label: 'Aprovado',
    color: 'bg-green-500',
    description: 'Orçamento aprovado',
  },
  rejected: {
    label: 'Rejeitado',
    color: 'bg-red-500',
    description: 'Orçamento rejeitado',
  },
  revision: {
    label: 'Em Revisão',
    color: 'bg-orange-500',
    description: 'Orçamento em revisão',
  },
};

// -----------------------------------------------------------------------------
// Status de Fornecedor
// -----------------------------------------------------------------------------

export const SUPPLIER_STATUS: Record<SupplierStatus, { label: string; color: string }> = {
  active: {
    label: 'Ativo',
    color: 'bg-green-500',
  },
  inactive: {
    label: 'Inativo',
    color: 'bg-gray-500',
  },
  blocked: {
    label: 'Bloqueado',
    color: 'bg-red-500',
  },
};

// -----------------------------------------------------------------------------
// Status de Cliente
// -----------------------------------------------------------------------------

export const CLIENT_STATUS: Record<ClientStatus, { label: string; color: string }> = {
  active: {
    label: 'Ativo',
    color: 'bg-green-500',
  },
  inactive: {
    label: 'Inativo',
    color: 'bg-gray-500',
  },
  blocked: {
    label: 'Bloqueado',
    color: 'bg-red-500',
  },
};

// -----------------------------------------------------------------------------
// Status de Pagamento
// -----------------------------------------------------------------------------

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; color: string }> = {
  pending: {
    label: 'Pendente',
    color: 'bg-yellow-500',
  },
  partial: {
    label: 'Parcial',
    color: 'bg-blue-500',
  },
  paid: {
    label: 'Pago',
    color: 'bg-green-500',
  },
  overdue: {
    label: 'Vencido',
    color: 'bg-red-500',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-gray-500',
  },
};

// -----------------------------------------------------------------------------
// Clima (Diário de Obra)
// -----------------------------------------------------------------------------

export const WEATHER_CONDITIONS: Record<DailyLogWeather, { label: string; icon: string }> = {
  sunny: {
    label: 'Ensolarado',
    icon: '☀️',
  },
  cloudy: {
    label: 'Nublado',
    icon: '☁️',
  },
  rainy: {
    label: 'Chuvoso',
    icon: '🌧️',
  },
  stormy: {
    label: 'Tempestade',
    icon: '⛈️',
  },
};

// -----------------------------------------------------------------------------
// Status de Cronograma
// -----------------------------------------------------------------------------

export const SCHEDULE_STATUS: Record<ScheduleStatus, { label: string; color: string }> = {
  pending: {
    label: 'Pendente',
    color: 'bg-gray-500',
  },
  in_progress: {
    label: 'Em Andamento',
    color: 'bg-blue-500',
  },
  completed: {
    label: 'Concluído',
    color: 'bg-green-500',
  },
  delayed: {
    label: 'Atrasado',
    color: 'bg-red-500',
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-gray-500',
  },
};

// -----------------------------------------------------------------------------
// Tipos de Transação
// -----------------------------------------------------------------------------

export const TRANSACTION_TYPES: Record<TransactionType, { label: string; color: string }> = {
  income: {
    label: 'Receita',
    color: 'text-green-600',
  },
  expense: {
    label: 'Despesa',
    color: 'text-red-600',
  },
};

// -----------------------------------------------------------------------------
// Categorias de Transação
// -----------------------------------------------------------------------------

export const TRANSACTION_CATEGORIES: Record<TransactionCategory, { label: string }> = {
  material: { label: 'Material' },
  labor: { label: 'Mão de Obra' },
  equipment: { label: 'Equipamento' },
  service: { label: 'Serviço' },
  tax: { label: 'Imposto' },
  administrative: { label: 'Administrativo' },
  other: { label: 'Outros' },
};

// -----------------------------------------------------------------------------
// Unidades de Medida
// -----------------------------------------------------------------------------

export const MEASUREMENT_UNITS = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'm', label: 'Metro (m)' },
  { value: 'm2', label: 'Metro Quadrado (m²)' },
  { value: 'm3', label: 'Metro Cúbico (m³)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 't', label: 'Tonelada (t)' },
  { value: 'l', label: 'Litro (l)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'h', label: 'Hora (h)' },
  { value: 'dia', label: 'Dia' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mês' },
  { value: 'vb', label: 'Valor Base (VB)' },
  { value: 'cj', label: 'Conjunto (cj)' },
  { value: 'pç', label: 'Peça (pç)' },
  { value: 'vd', label: 'Viga (vd)' },
  { value: 'mt', label: 'Metro Linear (ml)' },
];

// -----------------------------------------------------------------------------
// Estados Brasileiros
// -----------------------------------------------------------------------------

export const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

// -----------------------------------------------------------------------------
// Paginação
// -----------------------------------------------------------------------------

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// -----------------------------------------------------------------------------
// Formatação
// -----------------------------------------------------------------------------

export const CURRENCY_LOCALE = 'pt-BR';
export const CURRENCY_CODE = 'BRL';

// -----------------------------------------------------------------------------
// Mensagens de Erro
// -----------------------------------------------------------------------------

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Você não está autorizado a acessar este recurso.',
  FORBIDDEN: 'Você não tem permissão para realizar esta ação.',
  NOT_FOUND: 'O recurso solicitado não foi encontrado.',
  VALIDATION_ERROR: 'Dados inválidos. Por favor, verifique os campos.',
  SERVER_ERROR: 'Erro interno do servidor. Tente novamente mais tarde.',
  COMPANY_REQUIRED: 'Empresa não encontrada. Faça login novamente.',
  INVALID_CREDENTIALS: 'Email ou senha inválidos.',
  EMAIL_IN_USE: 'Este email já está cadastrado.',
  CNPJ_IN_USE: 'Este CNPJ já está cadastrado.',
  SESSION_EXPIRED: 'Sua sessão expirou. Faça login novamente.',
};

// -----------------------------------------------------------------------------
// Mensagens de Sucesso
// -----------------------------------------------------------------------------

export const SUCCESS_MESSAGES = {
  CREATED: 'Registro criado com sucesso.',
  UPDATED: 'Registro atualizado com sucesso.',
  DELETED: 'Registro excluído com sucesso.',
  SAVED: 'Alterações salvas com sucesso.',
  SENT: 'Enviado com sucesso.',
};

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Format a number as Brazilian Real currency
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: 'currency',
    currency: CURRENCY_CODE,
  }).format(value);
}

/**
 * Format a date in Brazilian format
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(CURRENCY_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/**
 * Format a date with time in Brazilian format
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(CURRENCY_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
