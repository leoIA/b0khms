// =============================================================================
// ConstrutorPro - Plan Limits and Pricing Configuration
// =============================================================================

import type { CompanyPlan } from '@/types';

// Re-export CompanyPlan type for convenience
export type { CompanyPlan } from '@/types';

// -----------------------------------------------------------------------------
// Plan Prices (in BRL)
// -----------------------------------------------------------------------------

export const PLAN_PRICES: Record<CompanyPlan | 'trial', { monthly: number; annual: number }> = {
  trial: { monthly: 0, annual: 0 },
  starter: { monthly: 299, annual: 249 },
  professional: { monthly: 799, annual: 649 },
  enterprise: { monthly: 1999, annual: 1599 },
};

// -----------------------------------------------------------------------------
// Plan Limits
// -----------------------------------------------------------------------------

export interface PlanLimits {
  maxUsers: number | null; // null = unlimited
  maxProjects: number | null;
  maxBudgets: number | null;
  maxClients: number | null;
  maxSuppliers: number | null;
  maxMaterials: number | null;
  maxCompositions: number | null;
  hasSchedule: boolean;
  hasFinance: boolean;
  hasAI: boolean;
  hasAdvancedReports: boolean;
  hasAPI: boolean;
  hasDailyLog: boolean;
  hasMedicoes: boolean;
  hasCotacoes: boolean;
  hasCompras: boolean;
  trialDays: number;
}

export const PLAN_LIMITS: Record<CompanyPlan | 'trial', PlanLimits> = {
  trial: {
    maxUsers: 5,
    maxProjects: 5,
    maxBudgets: 10,
    maxClients: 20,
    maxSuppliers: 20,
    maxMaterials: 50,
    maxCompositions: 50,
    hasSchedule: true,
    hasFinance: true,
    hasAI: true,
    hasAdvancedReports: true,
    hasAPI: false,
    hasDailyLog: true,
    hasMedicoes: true,
    hasCotacoes: true,
    hasCompras: true,
    trialDays: 14,
  },
  starter: {
    maxUsers: 5,
    maxProjects: 10,
    maxBudgets: 20,
    maxClients: 50,
    maxSuppliers: 50,
    maxMaterials: 100,
    maxCompositions: 100,
    hasSchedule: false,
    hasFinance: false,
    hasAI: false,
    hasAdvancedReports: false,
    hasAPI: false,
    hasDailyLog: true,
    hasMedicoes: false,
    hasCotacoes: false,
    hasCompras: false,
    trialDays: 0,
  },
  professional: {
    maxUsers: 20,
    maxProjects: null, // unlimited
    maxBudgets: null,
    maxClients: null,
    maxSuppliers: null,
    maxMaterials: null,
    maxCompositions: null,
    hasSchedule: true,
    hasFinance: true,
    hasAI: true,
    hasAdvancedReports: true,
    hasAPI: false,
    hasDailyLog: true,
    hasMedicoes: true,
    hasCotacoes: true,
    hasCompras: true,
    trialDays: 0,
  },
  enterprise: {
    maxUsers: null, // unlimited
    maxProjects: null,
    maxBudgets: null,
    maxClients: null,
    maxSuppliers: null,
    maxMaterials: null,
    maxCompositions: null,
    hasSchedule: true,
    hasFinance: true,
    hasAI: true,
    hasAdvancedReports: true,
    hasAPI: true,
    hasDailyLog: true,
    hasMedicoes: true,
    hasCotacoes: true,
    hasCompras: true,
    trialDays: 0,
  },
};

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Get plan limits for a company
 */
export function getPlanLimits(plan: CompanyPlan): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
}

/**
 * Check if company can add more of a specific resource
 */
export async function checkPlanLimit(
  companyId: string,
  resource: keyof Pick<PlanLimits, 'maxUsers' | 'maxProjects' | 'maxBudgets' | 'maxClients' | 'maxSuppliers' | 'maxMaterials' | 'maxCompositions'>,
  currentCount: number,
  plan: CompanyPlan
): Promise<{ allowed: boolean; limit: number | null; remaining: number | null }> {
  const limits = getPlanLimits(plan);
  const limit = limits[resource];
  
  if (limit === null) {
    return { allowed: true, limit: null, remaining: null };
  }
  
  return {
    allowed: currentCount < limit,
    limit,
    remaining: Math.max(0, limit - currentCount),
  };
}

/**
 * Check if a feature is available for the plan
 */
export function hasFeature(plan: CompanyPlan, feature: keyof Pick<PlanLimits, 'hasSchedule' | 'hasFinance' | 'hasAI' | 'hasAdvancedReports' | 'hasAPI' | 'hasDailyLog' | 'hasMedicoes' | 'hasCotacoes' | 'hasCompras'>): boolean {
  const limits = getPlanLimits(plan);
  return limits[feature] === true;
}

/**
 * Check if company is in trial period
 */
export function isInTrial(trialEndsAt: Date | null): boolean {
  if (!trialEndsAt) return false;
  return new Date() < new Date(trialEndsAt);
}

/**
 * Check if company subscription is active
 */
export function isSubscriptionActive(
  plan: CompanyPlan,
  planExpiresAt: Date | null,
  subscriptionStatus: string | null
): boolean {
  // Trial is always active during trial period
  if (plan === 'trial') return true;
  
  // Check subscription status
  if (subscriptionStatus === 'active') return true;
  if (subscriptionStatus === 'past_due') return true; // Give grace period
  
  // Check if plan hasn't expired
  if (planExpiresAt && new Date() < new Date(planExpiresAt)) return true;
  
  return false;
}

/**
 * Get remaining trial days
 */
export function getRemainingTrialDays(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  const now = new Date();
  const trialEnd = new Date(trialEndsAt);
  const diff = trialEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Get plan display name
 */
export function getPlanDisplayName(plan: CompanyPlan): string {
  const names: Record<CompanyPlan, string> = {
    trial: 'Teste Gratuito',
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
  };
  return names[plan] || plan;
}

/**
 * Get plan features list for display
 */
export function getPlanFeatures(plan: CompanyPlan): string[] {
  const limits = getPlanLimits(plan);
  const features: string[] = [];
  
  features.push(limits.maxUsers ? `Até ${limits.maxUsers} usuários` : 'Usuários ilimitados');
  features.push(limits.maxProjects ? `Até ${limits.maxProjects} projetos ativos` : 'Projetos ilimitados');
  features.push('Módulo de orçamentos');
  
  if (limits.hasDailyLog) features.push('Diário de obra');
  if (limits.hasSchedule) features.push('Cronograma físico-financeiro');
  if (limits.hasFinance) features.push('Gestão financeira');
  if (limits.hasAI) features.push('Assistente IA');
  if (limits.hasMedicoes) features.push('Medições');
  if (limits.hasCotacoes) features.push('Cotações');
  if (limits.hasCompras) features.push('Ordens de compra');
  if (limits.hasAdvancedReports) features.push('Relatórios avançados');
  if (limits.hasAPI) features.push('API de integração');
  
  return features;
}
