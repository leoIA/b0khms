// =============================================================================
// ConstrutorPro - Query Key Factory
// Centralized query key management for React Query
// =============================================================================

/**
 * Query key factory for consistent and type-safe query keys across the application.
 * Follows the recommended pattern from TanStack Query documentation.
 */
export const queryKeys = {
  // Projects
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
  },

  // Clients (Clientes)
  clients: {
    all: ['clients'] as const,
    lists: () => [...queryKeys.clients.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.clients.lists(), filters] as const,
    details: () => [...queryKeys.clients.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.clients.details(), id] as const,
  },

  // Suppliers (Fornecedores)
  suppliers: {
    all: ['suppliers'] as const,
    lists: () => [...queryKeys.suppliers.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.suppliers.lists(), filters] as const,
    details: () => [...queryKeys.suppliers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.suppliers.details(), id] as const,
  },

  // Schedules (Cronogramas)
  schedules: {
    all: ['schedules'] as const,
    lists: () => [...queryKeys.schedules.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.schedules.lists(), filters] as const,
    details: () => [...queryKeys.schedules.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.schedules.details(), id] as const,
  },

  // Budgets (Orcamentos)
  budgets: {
    all: ['budgets'] as const,
    lists: () => [...queryKeys.budgets.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.budgets.lists(), filters] as const,
    details: () => [...queryKeys.budgets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.budgets.details(), id] as const,
  },

  // Work Diary (Diario de Obra)
  workDiaries: {
    all: ['workDiaries'] as const,
    lists: () => [...queryKeys.workDiaries.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.workDiaries.lists(), filters] as const,
    details: () => [...queryKeys.workDiaries.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.workDiaries.details(), id] as const,
  },

  // Financial (Financeiro)
  financial: {
    all: ['financial'] as const,
    transactions: () => [...queryKeys.financial.all, 'transactions'] as const,
    transactionList: (filters: Record<string, unknown>) => [...queryKeys.financial.transactions(), filters] as const,
    summary: () => [...queryKeys.financial.all, 'summary'] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
  },

  // AI Chat
  ai: {
    all: ['ai'] as const,
    chat: (sessionId: string) => [...queryKeys.ai.all, 'chat', sessionId] as const,
  },

  // Alerts
  alerts: {
    all: ['alerts'] as const,
    lists: () => [...queryKeys.alerts.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.alerts.lists(), filters] as const,
  },
} as const;
