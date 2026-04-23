// =============================================================================
// ConstrutorPro - Plan Limits Middleware
// Middleware para verificar limites do plano antes de operações
// =============================================================================

import { db } from '@/lib/db';
import { PLAN_LIMITS, type PlanLimits, type CompanyPlan } from '@/lib/plans';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ResourceType = 'users' | 'projects' | 'budgets' | 'clients' | 'suppliers' | 'materials' | 'compositions';

export interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number | null;
  remaining: number | null;
  message?: string;
}

// -----------------------------------------------------------------------------
// Plan Limits Checker
// -----------------------------------------------------------------------------

export class PlanLimitsChecker {
  private companyId: string;
  private plan: CompanyPlan;
  private limits: PlanLimits;

  constructor(companyId: string, plan: CompanyPlan) {
    this.companyId = companyId;
    this.plan = plan;
    this.limits = PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
  }

  /**
   * Check if company can add a new resource
   */
  async canAdd(resource: ResourceType): Promise<LimitCheckResult> {
    const limitKey = this.getLimitKey(resource);
    const limit = this.limits[limitKey];
    
    // If limit is null, it means unlimited
    if (limit === null) {
      return {
        allowed: true,
        current: await this.getCurrentCount(resource),
        limit: null,
        remaining: null,
      };
    }

    const current = await this.getCurrentCount(resource);
    const allowed = current < limit;
    
    return {
      allowed,
      current,
      limit,
      remaining: Math.max(0, limit - current),
      message: allowed ? undefined : `Limite de ${this.getResourceLabel(resource)} atingido (${limit}). Faça upgrade do seu plano.`,
    };
  }

  /**
   * Check if a feature is available
   */
  hasFeature(feature: keyof Pick<PlanLimits, 'hasSchedule' | 'hasFinance' | 'hasAI' | 'hasAdvancedReports' | 'hasAPI' | 'hasDailyLog' | 'hasMedicoes' | 'hasCotacoes' | 'hasCompras'>): boolean {
    return this.limits[feature] === true;
  }

  /**
   * Get current count of a resource
   */
  private async getCurrentCount(resource: ResourceType): Promise<number> {
    const models: Record<ResourceType, () => Promise<number>> = {
      users: () => db.users.count({ where: { companyId: this.companyId } }),
      projects: () => db.projects.count({ where: { companyId: this.companyId } }),
      budgets: () => db.budgets.count({ where: { companyId: this.companyId } }),
      clients: () => db.clients.count({ where: { companyId: this.companyId } }),
      suppliers: () => db.suppliers.count({ where: { companyId: this.companyId } }),
      materials: () => db.materials.count({ where: { companyId: this.companyId } }),
      compositions: () => db.compositions.count({ where: { companyId: this.companyId } }),
    };

    return models[resource]();
  }

  /**
   * Map resource to limit key
   */
  private getLimitKey(resource: ResourceType): keyof Pick<PlanLimits, 'maxUsers' | 'maxProjects' | 'maxBudgets' | 'maxClients' | 'maxSuppliers' | 'maxMaterials' | 'maxCompositions'> {
    const mapping: Record<ResourceType, keyof Pick<PlanLimits, 'maxUsers' | 'maxProjects' | 'maxBudgets' | 'maxClients' | 'maxSuppliers' | 'maxMaterials' | 'maxCompositions'>> = {
      users: 'maxUsers',
      projects: 'maxProjects',
      budgets: 'maxBudgets',
      clients: 'maxClients',
      suppliers: 'maxSuppliers',
      materials: 'maxMaterials',
      compositions: 'maxCompositions',
    };
    return mapping[resource];
  }

  /**
   * Get resource label in Portuguese
   */
  private getResourceLabel(resource: ResourceType): string {
    const labels: Record<ResourceType, string> = {
      users: 'usuários',
      projects: 'projetos',
      budgets: 'orçamentos',
      clients: 'clientes',
      suppliers: 'fornecedores',
      materials: 'materiais',
      compositions: 'composições',
    };
    return labels[resource];
  }
}

// -----------------------------------------------------------------------------
// Helper Function for API Routes
// -----------------------------------------------------------------------------

export async function checkCompanyPlanLimit(
  companyId: string,
  resource: ResourceType
): Promise<LimitCheckResult> {
  // Get company plan
  const company = await db.companies.findUnique({
    where: { id: companyId },
    select: { plan: true },
  });

  if (!company) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      remaining: 0,
      message: 'Empresa não encontrada',
    };
  }

  const checker = new PlanLimitsChecker(companyId, company.plan as CompanyPlan);
  return checker.canAdd(resource);
}

export async function checkCompanyFeature(
  companyId: string,
  feature: keyof Pick<PlanLimits, 'hasSchedule' | 'hasFinance' | 'hasAI' | 'hasAdvancedReports' | 'hasAPI' | 'hasDailyLog' | 'hasMedicoes' | 'hasCotacoes' | 'hasCompras'>
): Promise<{ hasAccess: boolean; message?: string }> {
  // Get company plan
  const company = await db.companies.findUnique({
    where: { id: companyId },
    select: { plan: true },
  });

  if (!company) {
    return { hasAccess: false, message: 'Empresa não encontrada' };
  }

  const checker = new PlanLimitsChecker(companyId, company.plan as CompanyPlan);
  const hasAccess = checker.hasFeature(feature);

  return {
    hasAccess,
    message: hasAccess ? undefined : 'Este recurso não está disponível no seu plano. Faça upgrade para acessar.',
  };
}
