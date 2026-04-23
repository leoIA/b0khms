// =============================================================================
// ConstrutorPro - Tipos Globais
// =============================================================================

// -----------------------------------------------------------------------------
// Enums
// -----------------------------------------------------------------------------

export type UserRole =
  | 'master_admin'
  | 'company_admin'
  | 'manager'
  | 'engineer'
  | 'finance'
  | 'procurement'
  | 'operations'
  | 'viewer';

export type CompanyPlan = 'trial' | 'starter' | 'professional' | 'enterprise';

export type ProjectStatus = 'planning' | 'active' | 'paused' | 'completed' | 'cancelled';

export type BudgetStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'revision';

export type SupplierStatus = 'active' | 'inactive' | 'blocked';

export type ClientStatus = 'active' | 'inactive' | 'blocked';

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';

export type DailyLogWeather = 'sunny' | 'cloudy' | 'rainy' | 'stormy';

export type ScheduleStatus = 'pending' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';

export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
  | 'material'
  | 'labor'
  | 'equipment'
  | 'service'
  | 'tax'
  | 'administrative'
  | 'other';

// -----------------------------------------------------------------------------
// Interfaces Base
// -----------------------------------------------------------------------------

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

// -----------------------------------------------------------------------------
// Filtros e Busca
// -----------------------------------------------------------------------------

export interface BaseFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

// -----------------------------------------------------------------------------
// Usuário e Autenticação
// -----------------------------------------------------------------------------

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  companyName?: string;
  companyPlan?: CompanyPlan;
  avatar?: string;
}

export interface AuthState {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// -----------------------------------------------------------------------------
// Dashboard
// -----------------------------------------------------------------------------

export interface DashboardStats {
  projects: {
    total: number;
    active: number;
    completed: number;
    delayed: number;
    paused: number;
  };
  budgets: {
    total: number;
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  financial: {
    projectedRevenue: number;
    actualRevenue: number;
    projectedCosts: number;
    actualCosts: number;
    profitMargin: number;
  };
  clients: {
    total: number;
    active: number;
  };
  suppliers: {
    total: number;
    active: number;
  };
  progress: {
    averagePhysicalProgress: number;
    averageFinancialProgress: number;
  };
}

export interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface ProjectProgress {
  projectId: string;
  projectName: string;
  physicalProgress: number;
  financialProgress: number;
  status: ProjectStatus;
  deadline: Date;
}

// -----------------------------------------------------------------------------
// Empresa
// -----------------------------------------------------------------------------

export interface Company {
  id: string;
  name: string;
  tradingName?: string;
  cnpj: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  logo?: string;
  plan: CompanyPlan;
  planExpiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------------
// Cliente
// -----------------------------------------------------------------------------

export interface Client {
  id: string;
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  cpfCnpj?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
  status: ClientStatus;
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------------
// Fornecedor
// -----------------------------------------------------------------------------

export interface Supplier {
  id: string;
  companyId: string;
  name: string;
  tradeName?: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  contactPerson?: string;
  category?: string;
  notes?: string;
  status: SupplierStatus;
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------------
// Projeto
// -----------------------------------------------------------------------------

export interface Project {
  id: string;
  companyId: string;
  clientId?: string;
  name: string;
  code?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  estimatedValue: number;
  actualValue: number;
  physicalProgress: number;
  financialProgress: number;
  managerId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------------
// Orçamento
// -----------------------------------------------------------------------------

export interface Budget {
  id: string;
  companyId: string;
  projectId?: string;
  name: string;
  code?: string;
  description?: string;
  status: BudgetStatus;
  totalValue: number;
  discount?: number;
  validUntil?: Date;
  approvedAt?: Date;
  approvedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  items?: BudgetItem[];
}

export interface BudgetItem {
  id: string;
  budgetId: string;
  compositionId?: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  order: number;
}

// -----------------------------------------------------------------------------
// Composição (Composição de Preços)
// -----------------------------------------------------------------------------

export interface Composition {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  unit: string;
  totalCost: number;
  totalPrice: number;
  profitMargin: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  items?: CompositionItem[];
}

export interface CompositionItem {
  id: string;
  compositionId: string;
  materialId?: string;
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  coefficient?: number;
  itemType: 'material' | 'labor' | 'equipment' | 'service' | 'other';
  order: number;
}

// -----------------------------------------------------------------------------
// Material
// -----------------------------------------------------------------------------

export interface Material {
  id: string;
  companyId: string;
  code: string;
  name: string;
  description?: string;
  unit: string;
  unitCost: number;
  unitPrice?: number;
  supplierId?: string;
  stockQuantity?: number;
  minStock?: number;
  category?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------------
// Cronograma
// -----------------------------------------------------------------------------

export interface Schedule {
  id: string;
  companyId: string;
  projectId: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: ScheduleStatus;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  tasks?: ScheduleTask[];
}

export interface ScheduleTask {
  id: string;
  scheduleId: string;
  parentId?: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  progress: number;
  status: ScheduleStatus;
  responsible?: string;
  order: number;
  dependencies?: string[];
}

// -----------------------------------------------------------------------------
// Diário de Obra
// -----------------------------------------------------------------------------

export interface DailyLog {
  id: string;
  companyId: string;
  projectId: string;
  date: Date;
  weather: DailyLogWeather;
  temperatureMin?: number;
  temperatureMax?: number;
  workStartTime?: string;
  workEndTime?: string;
  workersCount?: number;
  summary: string;
  observations?: string;
  incidents?: string;
  visitors?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  activities?: DailyLogActivity[];
  photos?: DailyLogPhoto[];
}

export interface DailyLogActivity {
  id: string;
  dailyLogId: string;
  description: string;
  location?: string;
  workersCount?: number;
  startTime?: string;
  endTime?: string;
  observations?: string;
}

export interface DailyLogPhoto {
  id: string;
  dailyLogId: string;
  url: string;
  description?: string;
  order: number;
}

// -----------------------------------------------------------------------------
// Financeiro
// -----------------------------------------------------------------------------

export interface Transaction {
  id: string;
  companyId: string;
  projectId?: string;
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  value: number;
  date: Date;
  dueDate?: Date;
  paymentDate?: Date;
  status: PaymentStatus;
  documentNumber?: string;
  notes?: string;
  supplierId?: string;
  clientId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------------
// IA - Conversas
// -----------------------------------------------------------------------------

export interface AIConversation {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  context?: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: AIMessage[];
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tokens?: number;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Alertas e Notificações
// -----------------------------------------------------------------------------

export interface Alert {
  id: string;
  companyId: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: Date;
}

// -----------------------------------------------------------------------------
// Atividade Recente
// -----------------------------------------------------------------------------

export interface Activity {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  details?: string;
  createdAt: Date;
}
