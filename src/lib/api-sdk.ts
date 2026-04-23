/**
 * ConstrutorPro API SDK
 * 
 * SDK oficial para integração com a API do ConstrutorPro
 * Suporta TypeScript com tipos completos
 * 
 * @example
 * ```typescript
 * import { ConstrutorProClient } from '@/lib/api-sdk';
 * 
 * const client = new ConstrutorProClient('your-api-key');
 * 
 * // Listar projetos
 * const projetos = await client.projetos.list({ status: 'in_progress' });
 * 
 * // Criar projeto
 * const novoProjeto = await client.projetos.create({
 *   name: 'Novo Projeto',
 *   estimatedValue: 500000
 * });
 * ```
 */

// ===== TYPES =====

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: PaginationMeta;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

// ===== PROJECT TYPES =====

export interface Project {
  id: string;
  name: string;
  code?: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  estimatedValue?: number;
  actualValue?: number;
  physicalProgress?: number;
  financialProgress?: number;
  address?: string;
  city?: string;
  state?: string;
  clientId?: string;
  client?: Client;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInput {
  name: string;
  code?: string;
  description?: string;
  status?: 'planning' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  startDate?: string;
  endDate?: string;
  estimatedValue?: number;
  address?: string;
  city?: string;
  state?: string;
  clientId?: string;
}

export interface ProjectFilters extends PaginationParams {
  status?: string;
  search?: string;
  clientId?: string;
}

// ===== CLIENT TYPES =====

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  document?: string;
  documentType?: 'cpf' | 'cnpj';
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  projectsCount?: number;
  createdAt: string;
}

export interface ClientInput {
  name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  document?: string;
  documentType?: 'cpf' | 'cnpj';
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  notes?: string;
}

export interface ClientFilters extends PaginationParams {
  search?: string;
  city?: string;
  state?: string;
}

// ===== SUPPLIER TYPES =====

export interface Supplier {
  id: string;
  name: string;
  tradeName?: string;
  email?: string;
  phone?: string;
  document?: string;
  category?: string;
  city?: string;
  state?: string;
  active?: boolean;
  ordersCount?: number;
  createdAt: string;
}

export interface SupplierInput {
  name: string;
  tradeName?: string;
  email?: string;
  phone?: string;
  document?: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  contactPerson?: string;
  notes?: string;
}

export interface SupplierFilters extends PaginationParams {
  search?: string;
  category?: string;
}

// ===== BUDGET TYPES =====

export interface Budget {
  id: string;
  name: string;
  code?: string;
  status: 'draft' | 'approved' | 'rejected' | 'archived';
  totalValue?: number;
  projectId?: string;
  project?: Project;
  items?: BudgetItem[];
  itemsCount?: number;
  createdAt: string;
}

export interface BudgetItem {
  id: string;
  description: string;
  unit?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  compositionId?: string;
}

export interface BudgetInput {
  name: string;
  code?: string;
  projectId?: string;
  description?: string;
  status?: 'draft' | 'approved' | 'rejected' | 'archived';
  items?: {
    description: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
    compositionId?: string;
  }[];
}

export interface BudgetFilters extends PaginationParams {
  status?: string;
  projectId?: string;
}

// ===== FINANCIAL TYPES =====

export interface Transaction {
  id: string;
  type: 'receita' | 'despesa';
  category: string;
  description: string;
  value: number;
  date: string;
  dueDate?: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paymentMethod?: string;
  documentNumber?: string;
  projectId?: string;
  project?: Project;
  supplierId?: string;
  supplier?: Supplier;
  clientId?: string;
  client?: Client;
  createdAt: string;
}

export interface TransactionInput {
  type: 'receita' | 'despesa';
  category: string;
  description: string;
  value: number;
  date: string;
  dueDate?: string;
  status?: 'pending' | 'paid' | 'overdue' | 'cancelled';
  projectId?: string;
  supplierId?: string;
  clientId?: string;
  paymentMethod?: string;
  documentNumber?: string;
  notes?: string;
  tags?: string[];
}

export interface TransactionFilters extends PaginationParams {
  type?: 'receita' | 'despesa';
  status?: string;
  projectId?: string;
  startDate?: string;
  endDate?: string;
}

// ===== MATERIAL TYPES =====

export interface Material {
  id: string;
  codigo?: string;
  nome: string;
  descricao?: string;
  unidade: string;
  categoria?: string;
  estoqueAtual?: number;
  estoqueMinimo?: number;
  precoMedio?: number;
  localizacao?: string;
  ativo?: boolean;
  createdAt: string;
}

export interface MaterialInput {
  nome: string;
  unidade: string;
  codigo?: string;
  descricao?: string;
  categoria?: string;
  estoqueMinimo?: number;
  precoUnitario?: number;
  localizacao?: string;
  fornecedorId?: string;
}

export interface MaterialFilters extends PaginationParams {
  search?: string;
  categoria?: string;
  estoqueBaixo?: boolean;
}

// ===== NFE TYPES =====

export interface NFe {
  id: string;
  numero: number;
  serie: number;
  chave: string;
  status: 'emitida' | 'autorizada' | 'cancelada' | 'rejeitada' | 'denegada';
  tipo: 'entrada' | 'saida';
  naturezaOperacao: string;
  dataEmissao: string;
  cliente?: Client;
  fornecedor?: Supplier;
  valorTotal: number;
  valorProdutos: number;
  valorICMS?: number;
  valorIPI?: number;
  valorPIS?: number;
  valorCOFINS?: number;
  itens: NFeItem[];
  xml?: string;
  protocolo?: string;
  createdAt: string;
}

export interface NFeItem {
  numero: number;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
}

export interface NFeInput {
  tipo: 'entrada' | 'saida';
  naturezaOperacao: string;
  destinatarioId: string;
  projectId?: string;
  itens: {
    codigo: string;
    descricao: string;
    ncm: string;
    cfop: string;
    unidade?: string;
    quantidade: number;
    valorUnitario: number;
  }[];
  informacoesComplementares?: string;
}

export interface NFeFilters extends PaginationParams {
  status?: string;
  numero?: string;
  dataInicio?: string;
  dataFim?: string;
}

// ===== WEBHOOK TYPES =====

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  successCount: number;
  failureCount: number;
  lastTriggeredAt?: string;
  createdAt: string;
}

export interface WebhookInput {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  active?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

// ===== API CLIENT =====

class ApiClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, baseUrl: string = '/api/v1') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiClientError(
        data.error || 'Request failed',
        response.status,
        data
      );
    }

    return data;
  }

  async get<T>(endpoint: string, params?: Record<string, unknown> | PaginationParams): Promise<T> {
    let url = endpoint;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    return this.request<T>(url);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// ===== RESOURCE CLIENTS =====

class ProjectsResource {
  constructor(private client: ApiClient) {}

  async list(filters?: ProjectFilters): Promise<ApiResponse<Project[]>> {
    return this.client.get<ApiResponse<Project[]>>('/projetos', filters as Record<string, unknown>);
  }

  async get(id: string): Promise<Project> {
    return this.client.get<Project>(`/projetos/${id}`);
  }

  async create(data: ProjectInput): Promise<Project> {
    return this.client.post<Project>('/projetos', data);
  }

  async update(id: string, data: Partial<ProjectInput>): Promise<Project> {
    return this.client.put<Project>(`/projetos/${id}`, data);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return this.client.delete(`/projetos/${id}`);
  }
}

class ClientsResource {
  constructor(private client: ApiClient) {}

  async list(filters?: ClientFilters): Promise<ApiResponse<Client[]>> {
    return this.client.get<ApiResponse<Client[]>>('/clientes', filters as Record<string, unknown>);
  }

  async get(id: string): Promise<Client> {
    return this.client.get<Client>(`/clientes/${id}`);
  }

  async create(data: ClientInput): Promise<Client> {
    return this.client.post<Client>('/clientes', data);
  }

  async update(id: string, data: Partial<ClientInput>): Promise<Client> {
    return this.client.put<Client>(`/clientes/${id}`, data);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return this.client.delete(`/clientes/${id}`);
  }
}

class SuppliersResource {
  constructor(private client: ApiClient) {}

  async list(filters?: SupplierFilters): Promise<ApiResponse<Supplier[]>> {
    return this.client.get<ApiResponse<Supplier[]>>('/fornecedores', filters as Record<string, unknown>);
  }

  async get(id: string): Promise<Supplier> {
    return this.client.get<Supplier>(`/fornecedores/${id}`);
  }

  async create(data: SupplierInput): Promise<Supplier> {
    return this.client.post<Supplier>('/fornecedores', data);
  }

  async update(id: string, data: Partial<SupplierInput>): Promise<Supplier> {
    return this.client.put<Supplier>(`/fornecedores/${id}`, data);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return this.client.delete(`/fornecedores/${id}`);
  }
}

class BudgetsResource {
  constructor(private client: ApiClient) {}

  async list(filters?: BudgetFilters): Promise<ApiResponse<Budget[]>> {
    return this.client.get<ApiResponse<Budget[]>>('/orcamentos', filters as Record<string, unknown>);
  }

  async get(id: string): Promise<Budget> {
    return this.client.get<Budget>(`/orcamentos/${id}`);
  }

  async create(data: BudgetInput): Promise<Budget> {
    return this.client.post<Budget>('/orcamentos', data);
  }

  async update(id: string, data: Partial<BudgetInput>): Promise<Budget> {
    return this.client.put<Budget>(`/orcamentos/${id}`, data);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return this.client.delete(`/orcamentos/${id}`);
  }
}

class FinancialResource {
  constructor(private client: ApiClient) {}

  async list(filters?: TransactionFilters): Promise<ApiResponse<Transaction[]>> {
    return this.client.get<ApiResponse<Transaction[]>>('/financeiro', filters as Record<string, unknown>);
  }

  async get(id: string): Promise<Transaction> {
    return this.client.get<Transaction>(`/financeiro/${id}`);
  }

  async create(data: TransactionInput): Promise<Transaction> {
    return this.client.post<Transaction>('/financeiro', data);
  }

  async update(id: string, data: Partial<TransactionInput>): Promise<Transaction> {
    return this.client.put<Transaction>(`/financeiro/${id}`, data);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return this.client.delete(`/financeiro/${id}`);
  }
}

class MaterialsResource {
  constructor(private client: ApiClient) {}

  async list(filters?: MaterialFilters): Promise<ApiResponse<Material[]>> {
    return this.client.get<ApiResponse<Material[]>>('/materiais', filters as Record<string, unknown>);
  }

  async get(id: string): Promise<Material> {
    return this.client.get<Material>(`/materiais/${id}`);
  }

  async create(data: MaterialInput): Promise<Material> {
    return this.client.post<Material>('/materiais', data);
  }

  async update(id: string, data: Partial<MaterialInput>): Promise<Material> {
    return this.client.put<Material>(`/materiais/${id}`, data);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return this.client.delete(`/materiais/${id}`);
  }

  async alerts(): Promise<{ estoqueBaixo: Material[]; proximoVencimento: Material[] }> {
    return this.client.get('/materiais/alertas');
  }
}

class NFeResource {
  constructor(private client: ApiClient) {}

  async list(filters?: NFeFilters): Promise<ApiResponse<NFe[]>> {
    return this.client.get<ApiResponse<NFe[]>>('/fiscal/nfe', filters as Record<string, unknown>);
  }

  async get(id: string): Promise<NFe> {
    return this.client.get<NFe>(`/fiscal/nfe/${id}`);
  }

  async create(data: NFeInput): Promise<NFe> {
    return this.client.post<NFe>('/fiscal/nfe', data);
  }

  async cancel(id: string, justificativa: string): Promise<{ success: boolean }> {
    return this.client.post(`/fiscal/nfe/${id}/cancelar`, { justificativa });
  }

  async xml(id: string): Promise<string> {
    return this.client.get(`/fiscal/nfe/${id}/xml`);
  }
}

class WebhooksResource {
  constructor(private client: ApiClient) {}

  async list(): Promise<ApiResponse<Webhook[]>> {
    return this.client.get<ApiResponse<Webhook[]>>('/webhooks');
  }

  async create(data: WebhookInput): Promise<Webhook> {
    return this.client.post<Webhook>('/webhooks', data);
  }

  async update(id: string, data: Partial<WebhookInput>): Promise<Webhook> {
    return this.client.put<Webhook>(`/webhooks/${id}`, data);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    return this.client.delete(`/webhooks/${id}`);
  }

  async test(id: string): Promise<{ success: boolean; response?: string; error?: string }> {
    return this.client.post(`/webhooks/${id}/test`);
  }
}

// ===== MAIN CLIENT =====

export class ConstrutorProClient {
  private client: ApiClient;

  public projetos: ProjectsResource;
  public clientes: ClientsResource;
  public fornecedores: SuppliersResource;
  public orcamentos: BudgetsResource;
  public financeiro: FinancialResource;
  public materiais: MaterialsResource;
  public nfe: NFeResource;
  public webhooks: WebhooksResource;

  constructor(apiKey: string, baseUrl?: string) {
    this.client = new ApiClient(apiKey, baseUrl);

    this.projetos = new ProjectsResource(this.client);
    this.clientes = new ClientsResource(this.client);
    this.fornecedores = new SuppliersResource(this.client);
    this.orcamentos = new BudgetsResource(this.client);
    this.financeiro = new FinancialResource(this.client);
    this.materiais = new MaterialsResource(this.client);
    this.nfe = new NFeResource(this.client);
    this.webhooks = new WebhooksResource(this.client);
  }

  /**
   * Testa a conexão com a API
   */
  async ping(): Promise<{ success: boolean; timestamp: string }> {
    return this.client.get('/health');
  }
}

export default ConstrutorProClient;
