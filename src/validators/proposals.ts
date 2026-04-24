// =============================================================================
// ConstrutorPro - Validadores Zod para Propostas Comerciais
// =============================================================================

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Schemas de Status
// -----------------------------------------------------------------------------

export const proposalStatusSchema = z.enum([
  'draft',     // Rascunho
  'review',    // Em revisão interna
  'sent',      // Enviada ao cliente
  'viewed',    // Visualizada pelo cliente
  'accepted',  // Aceita pelo cliente
  'rejected',  // Rejeitada pelo cliente
  'expired',   // Expirada
  'cancelled', // Cancelada
]);

export const internalStatusSchema = z.enum([
  'internal_review',   // Revisão interna
  'pending_approval',  // Aguardando aprovação
  'approved',          // Aprovada internamente
  'rejected',          // Rejeitada internamente
]);

export const discountTypeSchema = z.enum(['percentage', 'fixed']);

// -----------------------------------------------------------------------------
// Item da Proposta
// -----------------------------------------------------------------------------

export const proposalItemSchema = z.object({
  id: z.string().cuid().optional(),
  code: z.string().trim().max(50).optional(),
  title: z.string().min(1, 'Título é obrigatório').trim().max(200),
  description: z.string().trim().max(1000).optional(),
  category: z.string().trim().max(100).optional(),
  subcategory: z.string().trim().max(100).optional(),
  unit: z.string().trim().max(20).default('un'),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  unitPrice: z.coerce.number().min(0, 'Preço unitário não pode ser negativo'),
  details: z.string().trim().max(2000).optional(),
  includes: z.string().trim().optional(), // JSON array
  excludes: z.string().trim().optional(), // JSON array
  notes: z.string().trim().max(500).optional(),
  order: z.coerce.number().int().min(0).default(0),
});

// -----------------------------------------------------------------------------
// Criar Proposta
// -----------------------------------------------------------------------------

export const createProposalSchema = z.object({
  // Identificação
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').trim().max(200),
  objective: z.string().trim().max(2000).optional(),
  clientId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  budgetId: z.string().cuid().optional(),

  // Valores
  discountType: discountTypeSchema.default('percentage'),
  discountValue: z.coerce.number().min(0).default(0),
  discountReason: z.string().trim().max(500).optional(),

  // Condições comerciais
  paymentTerms: z.string().trim().max(1000).optional(),
  deliveryTime: z.string().trim().max(200).optional(),
  warrantyTerms: z.string().trim().max(1000).optional(),
  validUntil: z.coerce.date().optional(),
  deliveryAddress: z.string().trim().max(500).optional(),

  // Termos e condições
  terms: z.string().trim().max(5000).optional(),
  notes: z.string().trim().max(2000).optional(),
  clientNotes: z.string().trim().max(2000).optional(),

  // Configurações de apresentação
  includeCover: z.boolean().default(true),
  includeSummary: z.boolean().default(true),
  includeTimeline: z.boolean().default(false),
  includeTeam: z.boolean().default(false),
  includePortfolio: z.boolean().default(false),
  customIntroduction: z.string().trim().max(2000).optional(),
  coverImage: z.string().url().optional(),

  // Assinatura
  requiresSignature: z.boolean().default(false),

  // Itens
  items: z.array(proposalItemSchema).min(1, 'A proposta deve ter pelo menos um item'),
});

// -----------------------------------------------------------------------------
// Atualizar Proposta
// -----------------------------------------------------------------------------

export const updateProposalSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres').trim().max(200).optional(),
  objective: z.string().trim().max(2000).optional(),
  clientId: z.string().cuid().optional().nullable(),
  projectId: z.string().cuid().optional().nullable(),
  budgetId: z.string().cuid().optional().nullable(),

  discountType: discountTypeSchema.optional(),
  discountValue: z.coerce.number().min(0).optional(),
  discountReason: z.string().trim().max(500).optional(),

  paymentTerms: z.string().trim().max(1000).optional(),
  deliveryTime: z.string().trim().max(200).optional(),
  warrantyTerms: z.string().trim().max(1000).optional(),
  validUntil: z.coerce.date().optional().nullable(),
  deliveryAddress: z.string().trim().max(500).optional(),

  terms: z.string().trim().max(5000).optional(),
  notes: z.string().trim().max(2000).optional(),
  clientNotes: z.string().trim().max(2000).optional(),

  includeCover: z.boolean().optional(),
  includeSummary: z.boolean().optional(),
  includeTimeline: z.boolean().optional(),
  includeTeam: z.boolean().optional(),
  includePortfolio: z.boolean().optional(),
  customIntroduction: z.string().trim().max(2000).optional(),
  coverImage: z.string().url().optional().nullable(),

  requiresSignature: z.boolean().optional(),

  items: z.array(proposalItemSchema).min(1, 'A proposta deve ter pelo menos um item').optional(),
});

// -----------------------------------------------------------------------------
// Ações da Proposta
// -----------------------------------------------------------------------------

export const sendProposalSchema = z.object({
  emailTo: z.string().email('Email inválido').optional(),
  message: z.string().trim().max(2000).optional(),
});

export const respondProposalSchema = z.object({
  action: z.enum(['accept', 'reject']),
  reason: z.string().trim().max(1000).optional(),
  acceptedBy: z.string().trim().max(200).optional(),
});

export const approveProposalSchema = z.object({
  approved: z.boolean(),
  notes: z.string().trim().max(1000).optional(),
});

// -----------------------------------------------------------------------------
// Criar Nova Versão
// -----------------------------------------------------------------------------

export const createProposalVersionSchema = z.object({
  changeReason: z.string().trim().max(500).optional(),
  items: z.array(proposalItemSchema).min(1, 'A proposta deve ter pelo menos um item').optional(),
});

// -----------------------------------------------------------------------------
// Filtros de Listagem
// -----------------------------------------------------------------------------

export const proposalFiltersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: proposalStatusSchema.optional(),
  clientId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  validFrom: z.coerce.date().optional(),
  validTo: z.coerce.date().optional(),
});

// -----------------------------------------------------------------------------
// Modelos de Proposta (Templates)
// -----------------------------------------------------------------------------

export const createProposalTemplateSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').trim().max(100),
  code: z.string().trim().max(20).optional(),
  description: z.string().trim().max(500).optional(),
  category: z.string().trim().max(100).optional(),

  defaultTerms: z.string().trim().max(5000).optional(),
  defaultPaymentTerms: z.string().trim().max(1000).optional(),
  defaultWarranty: z.string().trim().max(1000).optional(),
  defaultValidDays: z.coerce.number().int().min(1).max(365).default(30),

  includeCover: z.boolean().default(true),
  includeSummary: z.boolean().default(true),
  includeTimeline: z.boolean().default(false),
  includeTeam: z.boolean().default(false),
  includePortfolio: z.boolean().default(false),
  coverImage: z.string().url().optional(),
  customIntroduction: z.string().trim().max(2000).optional(),
  customStyles: z.string().trim().optional(),

  sectionsConfig: z.string().trim().optional(),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const updateProposalTemplateSchema = createProposalTemplateSchema.partial();

// -----------------------------------------------------------------------------
// Follow-ups
// -----------------------------------------------------------------------------

export const followupTypeSchema = z.enum(['reminder', 'call', 'email', 'meeting', 'note']);
export const followupStatusSchema = z.enum(['pending', 'completed', 'cancelled']);

export const createFollowupSchema = z.object({
  type: followupTypeSchema,
  title: z.string().min(1, 'Título é obrigatório').trim().max(200),
  content: z.string().trim().max(2000).optional(),
  scheduledAt: z.coerce.date().optional(),
});

export const updateFollowupSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').trim().max(200).optional(),
  content: z.string().trim().max(2000).optional(),
  scheduledAt: z.coerce.date().optional().nullable(),
  status: followupStatusSchema.optional(),
  outcome: z.string().trim().max(1000).optional(),
});

// -----------------------------------------------------------------------------
// Tipos Exportados
// -----------------------------------------------------------------------------

export type ProposalStatus = z.infer<typeof proposalStatusSchema>;
export type InternalStatus = z.infer<typeof internalStatusSchema>;
export type ProposalItem = z.infer<typeof proposalItemSchema>;
export type CreateProposal = z.infer<typeof createProposalSchema>;
export type UpdateProposal = z.infer<typeof updateProposalSchema>;
export type ProposalFilters = z.infer<typeof proposalFiltersSchema>;
export type CreateProposalTemplate = z.infer<typeof createProposalTemplateSchema>;
export type CreateFollowup = z.infer<typeof createFollowupSchema>;
