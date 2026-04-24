// =============================================================================
// ConstrutorPro - Validadores Zod
// =============================================================================

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Validações Auxiliares
// -----------------------------------------------------------------------------

export const cnpjRegex = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/;
export const cpfRegex = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/;
export const phoneRegex = /^\(?[1-9]{2}\)?\s?(?:9\d{4}|[2-8]\d{3})-?\d{4}$/;
export const cepRegex = /^\d{5}-?\d{3}$/;

export const cleanCnpjCpf = (value: string) => value.replace(/\D/g, '');
export const cleanPhone = (value: string) => value.replace(/\D/g, '');
export const cleanCep = (value: string) => value.replace(/\D/g, '');

// -----------------------------------------------------------------------------
// Schemas Base
// -----------------------------------------------------------------------------

export const idSchema = z.string().cuid('ID inválido');

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.string().optional(),
});

export const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// -----------------------------------------------------------------------------
// Auth Schemas
// -----------------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
  password: z.string()
    .min(8, 'A senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim(),
  email: z.string().email('Email inválido').toLowerCase().trim(),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
  companyName: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres').trim(),
  companyCnpj: z
    .string()
    .regex(cnpjRegex, 'CNPJ inválido')
    .transform(cleanCnpjCpf)
    .refine((val) => val.length === 14, 'CNPJ deve ter 14 dígitos'),
  companyEmail: z.string().email('Email da empresa inválido').toLowerCase().trim(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
});

// -----------------------------------------------------------------------------
// User Schemas
// -----------------------------------------------------------------------------

export const userRoleSchema = z.enum([
  'master_admin',
  'company_admin',
  'manager',
  'engineer',
  'finance',
  'procurement',
  'operations',
  'viewer',
]);

export const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim(),
  email: z.string().email('Email inválido').toLowerCase().trim(),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres'),
  role: userRoleSchema,
  companyId: idSchema.optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim().optional(),
  email: z.string().email('Email inválido').toLowerCase().trim().optional(),
  role: userRoleSchema.optional(),
  avatar: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

// -----------------------------------------------------------------------------
// Company Schemas
// -----------------------------------------------------------------------------

export const companyPlanSchema = z.enum(['starter', 'professional', 'enterprise']);

export const createCompanySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim(),
  tradingName: z.string().trim().optional(),
  cnpj: z
    .string()
    .regex(cnpjRegex, 'CNPJ inválido')
    .transform(cleanCnpjCpf)
    .refine((val) => val.length === 14, 'CNPJ deve ter 14 dígitos'),
  email: z.string().email('Email inválido').toLowerCase().trim(),
  phone: z
    .string()
    .regex(phoneRegex, 'Telefone inválido')
    .transform(cleanPhone)
    .optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z
    .string()
    .length(2, 'Estado deve ter 2 caracteres')
    .toUpperCase()
    .optional(),
  zipCode: z
    .string()
    .regex(cepRegex, 'CEP inválido')
    .transform(cleanCep)
    .optional(),
  plan: companyPlanSchema.default('starter'),
});

export const updateCompanySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim().optional(),
  tradingName: z.string().trim().optional(),
  email: z.string().email('Email inválido').toLowerCase().trim().optional(),
  phone: z
    .string()
    .regex(phoneRegex, 'Telefone inválido')
    .transform(cleanPhone)
    .optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z
    .string()
    .length(2, 'Estado deve ter 2 caracteres')
    .toUpperCase()
    .optional(),
  zipCode: z
    .string()
    .regex(cepRegex, 'CEP inválido')
    .transform(cleanCep)
    .optional(),
  logo: z.string().url().optional(),
  plan: companyPlanSchema.optional(),
  isActive: z.boolean().optional(),
});

// -----------------------------------------------------------------------------
// Client Schemas
// -----------------------------------------------------------------------------

export const clientStatusSchema = z.enum(['active', 'inactive', 'blocked']);

export const createClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim(),
  email: z.string().email('Email inválido').toLowerCase().trim().optional(),
  phone: z
    .string()
    .regex(phoneRegex, 'Telefone inválido')
    .transform(cleanPhone)
    .optional(),
  mobile: z
    .string()
    .regex(phoneRegex, 'Celular inválido')
    .transform(cleanPhone)
    .optional(),
  cpfCnpj: z
    .string()
    .transform(cleanCnpjCpf)
    .refine(
      (val) => val.length === 0 || val.length === 11 || val.length === 14,
      'CPF ou CNPJ inválido'
    )
    .optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().length(2).toUpperCase().optional(),
  zipCode: z
    .string()
    .regex(cepRegex, 'CEP inválido')
    .transform(cleanCep)
    .optional(),
  notes: z.string().trim().optional(),
  status: clientStatusSchema.default('active'),
});

// Define update schema separately to avoid issues with .partial() and refinements
export const updateClientSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim().optional(),
  email: z.string().email('Email inválido').toLowerCase().trim().optional(),
  phone: z
    .string()
    .regex(phoneRegex, 'Telefone inválido')
    .transform(cleanPhone)
    .optional()
    .nullable(),
  mobile: z
    .string()
    .regex(phoneRegex, 'Celular inválido')
    .transform(cleanPhone)
    .optional()
    .nullable(),
  cpfCnpj: z
    .string()
    .transform(cleanCnpjCpf)
    .refine(
      (val) => val.length === 0 || val.length === 11 || val.length === 14,
      'CPF ou CNPJ inválido'
    )
    .optional()
    .nullable(),
  address: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().length(2).toUpperCase().optional().nullable(),
  zipCode: z
    .string()
    .regex(cepRegex, 'CEP inválido')
    .transform(cleanCep)
    .optional()
    .nullable(),
  notes: z.string().trim().optional().nullable(),
  status: clientStatusSchema.optional(),
});

// -----------------------------------------------------------------------------
// Supplier Schemas
// -----------------------------------------------------------------------------

export const supplierStatusSchema = z.enum(['active', 'inactive', 'blocked']);

export const createSupplierSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim(),
  tradeName: z.string().trim().optional(),
  cnpj: z
    .string()
    .regex(cnpjRegex, 'CNPJ inválido')
    .transform(cleanCnpjCpf)
    .optional(),
  email: z.string().email('Email inválido').toLowerCase().trim().optional(),
  phone: z
    .string()
    .regex(phoneRegex, 'Telefone inválido')
    .transform(cleanPhone)
    .optional(),
  mobile: z
    .string()
    .regex(phoneRegex, 'Celular inválido')
    .transform(cleanPhone)
    .optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().length(2).toUpperCase().optional(),
  zipCode: z
    .string()
    .regex(cepRegex, 'CEP inválido')
    .transform(cleanCep)
    .optional(),
  contactPerson: z.string().trim().optional(),
  category: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  status: supplierStatusSchema.default('active'),
});

export const updateSupplierSchema = createSupplierSchema.partial();

// -----------------------------------------------------------------------------
// Project Schemas
// -----------------------------------------------------------------------------

export const projectStatusSchema = z.enum(['planning', 'active', 'paused', 'completed', 'cancelled']);

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim(),
  code: z.string().trim().optional(),
  description: z.string().trim().optional(),
  clientId: idSchema.optional(),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().length(2).toUpperCase().optional(),
  status: projectStatusSchema.default('planning'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  estimatedValue: z.coerce.number().min(0).default(0),
  managerId: idSchema.optional(),
  notes: z.string().trim().optional(),
});

// Separate update schema to avoid refinement issues
export const updateProjectSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim().optional(),
  code: z.string().trim().optional().nullable(),
  description: z.string().trim().optional().nullable(),
  clientId: idSchema.optional().nullable(),
  address: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().length(2).toUpperCase().optional().nullable(),
  status: projectStatusSchema.optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  estimatedValue: z.coerce.number().min(0).optional(),
  actualValue: z.coerce.number().min(0).optional(),
  physicalProgress: z.coerce.number().min(0).max(100).optional(),
  financialProgress: z.coerce.number().min(0).max(100).optional(),
  managerId: idSchema.optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

// -----------------------------------------------------------------------------
// Budget Schemas
// -----------------------------------------------------------------------------

export const budgetStatusSchema = z.enum(['draft', 'pending', 'approved', 'rejected', 'revision']);

export const budgetItemSchema = z.object({
  compositionId: idSchema.optional(),
  description: z.string().min(1, 'Descrição é obrigatória').trim(),
  unit: z.string().min(1, 'Unidade é obrigatória').trim(),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  unitPrice: z.coerce.number().min(0, 'Preço unitário não pode ser negativo'),
  notes: z.string().trim().optional(),
  order: z.coerce.number().int().min(0).default(0),
});

export const createBudgetSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim(),
  code: z.string().trim().optional(),
  description: z.string().trim().optional(),
  projectId: idSchema.optional(),
  status: budgetStatusSchema.default('draft'),
  discount: z.coerce.number().min(0).max(100).optional(),
  validUntil: z.coerce.date().optional(),
  notes: z.string().trim().optional(),
  items: z.array(budgetItemSchema).default([]),
});

export const updateBudgetSchema = createBudgetSchema.partial();

// -----------------------------------------------------------------------------
// Composition Schemas
// -----------------------------------------------------------------------------

export const compositionItemSchema = z.object({
  materialId: idSchema.optional(),
  description: z.string().min(1, 'Descrição é obrigatória').trim(),
  unit: z.string().min(1, 'Unidade é obrigatória').trim(),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  unitCost: z.coerce.number().min(0, 'Custo unitário não pode ser negativo'),
  coefficient: z.coerce.number().optional(),
  itemType: z.enum(['material', 'labor', 'equipment', 'service', 'other']).default('material'),
  order: z.coerce.number().int().min(0).default(0),
});

export const createCompositionSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório').trim(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim(),
  description: z.string().trim().optional(),
  unit: z.string().min(1, 'Unidade é obrigatória').trim(),
  profitMargin: z.coerce.number().min(0).max(100).default(30),
  isActive: z.boolean().default(true),
  items: z.array(compositionItemSchema).default([]),
});

export const updateCompositionSchema = createCompositionSchema.partial();

// -----------------------------------------------------------------------------
// Material Schemas
// -----------------------------------------------------------------------------

export const createMaterialSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório').trim(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim(),
  description: z.string().trim().optional(),
  unit: z.string().min(1, 'Unidade é obrigatória').trim(),
  unitCost: z.coerce.number().min(0, 'Custo unitário não pode ser negativo'),
  unitPrice: z.coerce.number().min(0).optional(),
  supplierId: idSchema.optional(),
  stockQuantity: z.coerce.number().min(0).optional(),
  minStock: z.coerce.number().min(0).optional(),
  category: z.string().trim().optional(),
  isActive: z.boolean().default(true),
});

export const updateMaterialSchema = createMaterialSchema.partial();

// -----------------------------------------------------------------------------
// Schedule Schemas
// -----------------------------------------------------------------------------

export const scheduleStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'delayed', 'cancelled']);

export const scheduleTaskSchema = z.object({
  parentId: idSchema.optional(),
  name: z.string().min(1, 'Nome é obrigatório').trim(),
  description: z.string().trim().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  progress: z.coerce.number().min(0).max(100).default(0),
  status: scheduleStatusSchema.default('pending'),
  responsible: z.string().trim().optional(),
  order: z.coerce.number().int().min(0).default(0),
  dependencies: z.array(idSchema).optional(),
});

export const createScheduleSchema = z.object({
  projectId: idSchema,
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim(),
  description: z.string().trim().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: scheduleStatusSchema.default('pending'),
  tasks: z.array(scheduleTaskSchema).default([]),
});

// Separate update schema to avoid refinement issues
export const updateScheduleSchema = z.object({
  projectId: idSchema.optional(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim().optional(),
  description: z.string().trim().optional().nullable(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: scheduleStatusSchema.optional(),
  tasks: z.array(scheduleTaskSchema).optional(),
});

// -----------------------------------------------------------------------------
// Daily Log Schemas
// -----------------------------------------------------------------------------

export const weatherSchema = z.enum(['sunny', 'cloudy', 'rainy', 'stormy']);

export const dailyLogActivitySchema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória').trim(),
  location: z.string().trim().optional(),
  workersCount: z.coerce.number().int().min(0).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido').optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido').optional(),
  observations: z.string().trim().optional(),
});

export const createDailyLogSchema = z.object({
  projectId: idSchema,
  date: z.coerce.date(),
  weather: weatherSchema.default('sunny'),
  temperatureMin: z.coerce.number().optional(),
  temperatureMax: z.coerce.number().optional(),
  workStartTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido').optional(),
  workEndTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido').optional(),
  workersCount: z.coerce.number().int().min(0).optional(),
  summary: z.string().min(1, 'Resumo é obrigatório').trim(),
  observations: z.string().trim().optional(),
  incidents: z.string().trim().optional(),
  visitors: z.string().trim().optional(),
  activities: z.array(dailyLogActivitySchema).default([]),
});

export const updateDailyLogSchema = createDailyLogSchema.partial().omit({ projectId: true });

// -----------------------------------------------------------------------------
// Transaction Schemas
// -----------------------------------------------------------------------------

export const transactionTypeSchema = z.enum(['income', 'expense']);
export const transactionCategorySchema = z.enum([
  'material',
  'labor',
  'equipment',
  'service',
  'tax',
  'administrative',
  'other',
]);
export const paymentStatusSchema = z.enum(['pending', 'partial', 'paid', 'overdue', 'cancelled']);

export const createTransactionSchema = z.object({
  projectId: idSchema.optional(),
  type: transactionTypeSchema,
  category: transactionCategorySchema,
  description: z.string().min(1, 'Descrição é obrigatória').trim(),
  value: z.coerce.number().positive('Valor deve ser maior que zero'),
  date: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  documentNumber: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  supplierId: idSchema.optional(),
  clientId: idSchema.optional(),
  status: paymentStatusSchema.default('pending'),
});

export const updateTransactionSchema = createTransactionSchema.partial();

// -----------------------------------------------------------------------------
// AI Schemas
// -----------------------------------------------------------------------------

export const createConversationSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').trim(),
  context: z.string().trim().optional(),
});

export const sendMessageSchema = z.object({
  conversationId: idSchema.optional(),
  message: z.string().min(1, 'Mensagem é obrigatória').trim(),
});
