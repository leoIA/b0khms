// =============================================================================
// ConstrutorPro - OpenAPI Specification Generator
// API Pública documentada com Swagger/OpenAPI 3.0
// =============================================================================

import type { OpenAPIV3 } from 'openapi-types';

// -----------------------------------------------------------------------------
// OpenAPI Base Configuration
// -----------------------------------------------------------------------------

export const OPENAPI_VERSION = '3.0.3';
export const API_VERSION = '1.0.0';
export const API_TITLE = 'ConstrutorPro API';
export const API_DESCRIPTION = `
# ConstrutorPro - Sistema de Gestão para Construtoras

API RESTful completa para gestão de obras, projetos, orçamentos e financeiro.

## Autenticação

A API utiliza dois métodos de autenticação:

### 1. Session-based (Browser)
Para aplicações web que rodam no navegador, a autenticação é feita via sessão NextAuth.

### 2. API Key (Integrações)
Para integrações externas, utilize API Keys no header:

\`\`\`
Authorization: Bearer <sua-api-key>
\`\`\`

## Rate Limiting

- **Plano Starter**: 100 requisições/minuto
- **Plano Professional**: 500 requisições/minuto
- **Plano Enterprise**: 2000 requisições/minuto

## Paginação

Todos os endpoints de lista suportam paginação:

- \`page\`: Número da página (default: 1)
- \`limit\`: Itens por página (default: 10, max: 100)

## Filtros e Busca

- \`search\`: Busca textual
- \`status\`: Filtro por status
- \`sortBy\`: Campo para ordenação
- \`sortOrder\`: Direção (asc/desc)
`;

// -----------------------------------------------------------------------------
// Common Schemas
// -----------------------------------------------------------------------------

const paginationSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    page: { type: 'integer', example: 1, description: 'Página atual' },
    limit: { type: 'integer', example: 10, description: 'Itens por página' },
    total: { type: 'integer', example: 100, description: 'Total de itens' },
    totalPages: { type: 'integer', example: 10, description: 'Total de páginas' },
  },
};

const errorSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: { type: 'string', example: 'Recurso não encontrado' },
    details: {
      type: 'object',
      additionalProperties: {
        type: 'array',
        items: { type: 'string' },
      },
    },
  },
};

const successSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: true },
    data: { type: 'object' },
    message: { type: 'string', example: 'Operação realizada com sucesso' },
  },
};

// -----------------------------------------------------------------------------
// Entity Schemas
// -----------------------------------------------------------------------------

const clientSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'cuid', example: 'clx123abc' },
    name: { type: 'string', example: 'João Silva' },
    email: { type: 'string', format: 'email', example: 'joao@email.com' },
    phone: { type: 'string', example: '11999999999' },
    mobile: { type: 'string', example: '11988888888' },
    cpfCnpj: { type: 'string', example: '123.456.789-00' },
    address: { type: 'string', example: 'Rua das Flores, 123' },
    city: { type: 'string', example: 'São Paulo' },
    state: { type: 'string', example: 'SP' },
    zipCode: { type: 'string', example: '01234-567' },
    notes: { type: 'string', example: 'Cliente preferencial' },
    status: { type: 'string', enum: ['active', 'inactive', 'blocked'], example: 'active' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const supplierSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'cuid' },
    name: { type: 'string', example: 'Construtora ABC Ltda' },
    tradeName: { type: 'string', example: 'ABC Construtora' },
    cnpj: { type: 'string', example: '12.345.678/0001-90' },
    email: { type: 'string', format: 'email', example: 'contato@abc.com.br' },
    phone: { type: 'string', example: '1133334444' },
    mobile: { type: 'string', example: '11999998888' },
    address: { type: 'string', example: 'Av. Industrial, 500' },
    city: { type: 'string', example: 'São Paulo' },
    state: { type: 'string', example: 'SP' },
    zipCode: { type: 'string', example: '01000-000' },
    contactPerson: { type: 'string', example: 'Maria Santos' },
    category: { type: 'string', example: 'Materiais de Construção' },
    notes: { type: 'string' },
    status: { type: 'string', enum: ['active', 'inactive', 'blocked'], example: 'active' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const projectSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'cuid' },
    name: { type: 'string', example: 'Residencial Jardim das Flores' },
    code: { type: 'string', example: 'PROJ-2024-001' },
    description: { type: 'string', example: 'Construção de edifício residencial com 20 andares' },
    clientId: { type: 'string', format: 'cuid' },
    client: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
    },
    address: { type: 'string', example: 'Av. Brasil, 1000' },
    city: { type: 'string', example: 'São Paulo' },
    state: { type: 'string', example: 'SP' },
    status: {
      type: 'string',
      enum: ['planning', 'active', 'paused', 'completed', 'cancelled'],
      example: 'active',
    },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    estimatedValue: { type: 'number', example: 5000000.00 },
    actualValue: { type: 'number', example: 3500000.00 },
    physicalProgress: { type: 'number', minimum: 0, maximum: 100, example: 65 },
    financialProgress: { type: 'number', minimum: 0, maximum: 100, example: 70 },
    managerId: { type: 'string', format: 'cuid' },
    notes: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const budgetSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'cuid' },
    name: { type: 'string', example: 'Orçamento Estrutural' },
    code: { type: 'string', example: 'ORC-2024-001' },
    description: { type: 'string' },
    projectId: { type: 'string', format: 'cuid' },
    status: {
      type: 'string',
      enum: ['draft', 'pending', 'approved', 'rejected', 'revision'],
      example: 'approved',
    },
    totalValue: { type: 'number', example: 1500000.00 },
    discount: { type: 'number', example: 5 },
    validUntil: { type: 'string', format: 'date' },
    approvedAt: { type: 'string', format: 'date-time' },
    approvedBy: { type: 'string', format: 'cuid' },
    notes: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'cuid' },
          description: { type: 'string', example: 'Concreto estrutural fck 30MPa' },
          unit: { type: 'string', example: 'm³' },
          quantity: { type: 'number', example: 500 },
          unitPrice: { type: 'number', example: 850.00 },
          totalPrice: { type: 'number', example: 425000.00 },
          compositionId: { type: 'string', format: 'cuid' },
          notes: { type: 'string' },
          order: { type: 'integer', example: 1 },
        },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const compositionSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'cuid' },
    code: { type: 'string', example: 'SINAPI-12345' },
    name: { type: 'string', example: 'Concreto armado - laje' },
    description: { type: 'string' },
    unit: { type: 'string', example: 'm³' },
    totalCost: { type: 'number', example: 650.00 },
    totalPrice: { type: 'number', example: 850.00 },
    profitMargin: { type: 'number', example: 30 },
    isActive: { type: 'boolean', example: true },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'cuid' },
          description: { type: 'string', example: 'Cimento CP-V ARI' },
          unit: { type: 'string', example: 'kg' },
          quantity: { type: 'number', example: 350 },
          unitCost: { type: 'number', example: 0.85 },
          totalCost: { type: 'number', example: 297.50 },
          itemType: { type: 'string', enum: ['material', 'labor', 'equipment', 'service', 'other'] },
          coefficient: { type: 'number', example: 1.05 },
          order: { type: 'integer', example: 1 },
        },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const materialSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'cuid' },
    code: { type: 'string', example: 'MAT-001' },
    name: { type: 'string', example: 'Cimento CP-V ARI' },
    description: { type: 'string', example: 'Cimento Portland de alta resistência inicial' },
    unit: { type: 'string', example: 'saco 50kg' },
    unitCost: { type: 'number', example: 42.50 },
    unitPrice: { type: 'number', example: 48.90 },
    supplierId: { type: 'string', format: 'cuid' },
    stockQuantity: { type: 'number', example: 500 },
    minStock: { type: 'number', example: 100 },
    category: { type: 'string', example: 'Aglosantes' },
    isActive: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const dailyLogSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'cuid' },
    projectId: { type: 'string', format: 'cuid' },
    date: { type: 'string', format: 'date' },
    weather: { type: 'string', enum: ['sunny', 'cloudy', 'rainy', 'stormy'], example: 'sunny' },
    temperatureMin: { type: 'number', example: 18 },
    temperatureMax: { type: 'number', example: 28 },
    workStartTime: { type: 'string', example: '07:00' },
    workEndTime: { type: 'string', example: '17:00' },
    workersCount: { type: 'integer', example: 45 },
    summary: { type: 'string', example: 'Concretagem do 10º andar concluída' },
    observations: { type: 'string' },
    incidents: { type: 'string' },
    visitors: { type: 'string' },
    createdBy: { type: 'string', format: 'cuid' },
    activities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'cuid' },
          description: { type: 'string', example: 'Montagem de fôrmas' },
          location: { type: 'string', example: 'Pavimento 10' },
          workersCount: { type: 'integer', example: 12 },
          startTime: { type: 'string', example: '07:30' },
          endTime: { type: 'string', example: '11:30' },
          observations: { type: 'string' },
        },
      },
    },
    photos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'cuid' },
          url: { type: 'string', format: 'uri' },
          description: { type: 'string' },
          order: { type: 'integer' },
        },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const transactionSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'cuid' },
    projectId: { type: 'string', format: 'cuid' },
    type: { type: 'string', enum: ['income', 'expense'], example: 'expense' },
    category: {
      type: 'string',
      enum: ['material', 'labor', 'equipment', 'service', 'tax', 'administrative', 'other'],
      example: 'material',
    },
    description: { type: 'string', example: 'Compra de cimento' },
    value: { type: 'number', example: 12500.00 },
    date: { type: 'string', format: 'date' },
    dueDate: { type: 'string', format: 'date' },
    paymentDate: { type: 'string', format: 'date' },
    status: { type: 'string', enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'], example: 'pending' },
    documentNumber: { type: 'string', example: 'NF-e 123456' },
    notes: { type: 'string' },
    supplierId: { type: 'string', format: 'cuid' },
    clientId: { type: 'string', format: 'cuid' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const scheduleSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'cuid' },
    projectId: { type: 'string', format: 'cuid' },
    name: { type: 'string', example: 'Cronograma Físico-Financeiro' },
    description: { type: 'string' },
    startDate: { type: 'string', format: 'date' },
    endDate: { type: 'string', format: 'date' },
    status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'delayed', 'cancelled'], example: 'in_progress' },
    progress: { type: 'number', minimum: 0, maximum: 100, example: 45 },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'cuid' },
          parentId: { type: 'string', format: 'cuid' },
          name: { type: 'string', example: 'Fundações' },
          description: { type: 'string' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' },
          duration: { type: 'integer', example: 30 },
          progress: { type: 'number', example: 80 },
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'delayed', 'cancelled'] },
          responsible: { type: 'string', example: 'Eng. Carlos Silva' },
          order: { type: 'integer', example: 1 },
          dependencies: {
            type: 'array',
            items: { type: 'string', format: 'cuid' },
          },
        },
      },
    },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
};

const dashboardStatsSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    projects: {
      type: 'object',
      properties: {
        total: { type: 'integer', example: 25 },
        active: { type: 'integer', example: 15 },
        completed: { type: 'integer', example: 8 },
        delayed: { type: 'integer', example: 2 },
        paused: { type: 'integer', example: 3 },
      },
    },
    budgets: {
      type: 'object',
      properties: {
        total: { type: 'integer', example: 50 },
        draft: { type: 'integer', example: 10 },
        pending: { type: 'integer', example: 5 },
        approved: { type: 'integer', example: 30 },
        rejected: { type: 'integer', example: 5 },
      },
    },
    financial: {
      type: 'object',
      properties: {
        projectedRevenue: { type: 'number', example: 15000000 },
        actualRevenue: { type: 'number', example: 8500000 },
        projectedCosts: { type: 'number', example: 12000000 },
        actualCosts: { type: 'number', example: 6500000 },
        profitMargin: { type: 'number', example: 23.5 },
      },
    },
    clients: {
      type: 'object',
      properties: {
        total: { type: 'integer', example: 120 },
        active: { type: 'integer', example: 95 },
      },
    },
    suppliers: {
      type: 'object',
      properties: {
        total: { type: 'integer', example: 85 },
        active: { type: 'integer', example: 70 },
      },
    },
    progress: {
      type: 'object',
      properties: {
        averagePhysicalProgress: { type: 'number', example: 52.3 },
        averageFinancialProgress: { type: 'number', example: 48.7 },
      },
    },
  },
};

const apiKeySchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'cuid' },
    name: { type: 'string', example: 'Integração ERP' },
    key: { type: 'string', example: 'cp_live_xxxxxxxxxxxxx' },
    prefix: { type: 'string', example: 'cp_live' },
    permissions: {
      type: 'array',
      items: { type: 'string' },
      example: ['projects:read', 'budgets:read', 'budgets:write'],
    },
    lastUsedAt: { type: 'string', format: 'date-time' },
    expiresAt: { type: 'string', format: 'date-time' },
    isActive: { type: 'boolean', example: true },
    createdAt: { type: 'string', format: 'date-time' },
  },
};

// -----------------------------------------------------------------------------
// Security Schemes
// -----------------------------------------------------------------------------

const securitySchemes: Record<string, OpenAPIV3.SecuritySchemeObject> = {
  BearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'API Key',
    description: 'API Key para autenticação de integrações externas',
  },
  SessionAuth: {
    type: 'apiKey',
    in: 'cookie',
    name: 'next-auth.session-token',
    description: 'Autenticação via sessão NextAuth (browser)',
  },
};

// -----------------------------------------------------------------------------
// Common Parameters
// -----------------------------------------------------------------------------

const paginationParams: OpenAPIV3.ParameterObject[] = [
  {
    name: 'page',
    in: 'query',
    description: 'Número da página',
    schema: { type: 'integer', minimum: 1, default: 1 },
  },
  {
    name: 'limit',
    in: 'query',
    description: 'Itens por página (máx: 100)',
    schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
  },
  {
    name: 'search',
    in: 'query',
    description: 'Busca textual',
    schema: { type: 'string' },
  },
  {
    name: 'sortBy',
    in: 'query',
    description: 'Campo para ordenação',
    schema: { type: 'string' },
  },
  {
    name: 'sortOrder',
    in: 'query',
    description: 'Direção da ordenação',
    schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
  },
];

const idParam: OpenAPIV3.ParameterObject = {
  name: 'id',
  in: 'path',
  required: true,
  description: 'ID do recurso (CUID)',
  schema: { type: 'string', format: 'cuid' },
};

// -----------------------------------------------------------------------------
// Build OpenAPI Spec
// -----------------------------------------------------------------------------

export function buildOpenAPISpec(baseUrl: string): OpenAPIV3.Document {
  return {
    openapi: OPENAPI_VERSION,
    info: {
      title: API_TITLE,
      version: API_VERSION,
      description: API_DESCRIPTION,
      contact: {
        name: 'ConstrutorPro Suporte',
        email: 'api@construtorpro.com.br',
        url: 'https://construtorpro.com.br/docs',
      },
      license: {
        name: 'Proprietary',
        url: 'https://construtorpro.com.br/licenca',
      },
    },
    servers: [
      {
        url: baseUrl,
        description: 'Servidor de produção',
      },
      {
        url: 'http://localhost:3000',
        description: 'Servidor de desenvolvimento',
      },
    ],
    security: [{ BearerAuth: [] }, { SessionAuth: [] }],
    components: {
      securitySchemes,
      schemas: {
        // Common
        Pagination: paginationSchema,
        Error: errorSchema,
        Success: successSchema,
        // Entities
        Client: clientSchema,
        Supplier: supplierSchema,
        Project: projectSchema,
        Budget: budgetSchema,
        Composition: compositionSchema,
        Material: materialSchema,
        DailyLog: dailyLogSchema,
        Transaction: transactionSchema,
        Schedule: scheduleSchema,
        DashboardStats: dashboardStatsSchema,
        ApiKey: apiKeySchema,
      },
      parameters: {
        Page: paginationParams[0],
        Limit: paginationParams[1],
        Search: paginationParams[2],
        SortBy: paginationParams[3],
        SortOrder: paginationParams[4],
        ResourceId: idParam,
      },
      responses: {
        Unauthorized: {
          description: 'Não autorizado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Não autorizado. Token inválido ou expirado.',
              },
            },
          },
        },
        Forbidden: {
          description: 'Acesso negado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Acesso negado. Você não tem permissão para este recurso.',
              },
            },
          },
        },
        NotFound: {
          description: 'Recurso não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Recurso não encontrado.',
              },
            },
          },
        },
        ValidationError: {
          description: 'Erro de validação',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Dados inválidos. Por favor, verifique os campos.',
                details: {
                  email: ['Email inválido'],
                  password: ['A senha deve ter pelo menos 8 caracteres'],
                },
              },
            },
          },
        },
        RateLimitExceeded: {
          description: 'Limite de requisições excedido',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
              example: {
                success: false,
                error: 'Limite de requisições excedido. Tente novamente em alguns segundos.',
              },
            },
          },
        },
      },
    },
    paths: {
      // -----------------------------------------------------------------------
      // Authentication
      // -----------------------------------------------------------------------
      '/api/auth/register': {
        post: {
          tags: ['Autenticação'],
          summary: 'Registrar nova empresa',
          description: 'Cria uma nova conta de empresa e usuário administrador',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'email', 'password', 'companyName', 'companyCnpj', 'companyEmail'],
                  properties: {
                    name: { type: 'string', example: 'João Silva' },
                    email: { type: 'string', format: 'email', example: 'joao@email.com' },
                    password: { type: 'string', format: 'password', example: 'Senha@123' },
                    confirmPassword: { type: 'string', format: 'password', example: 'Senha@123' },
                    companyName: { type: 'string', example: 'Construtora ABC Ltda' },
                    companyCnpj: { type: 'string', example: '12.345.678/0001-90' },
                    companyEmail: { type: 'string', format: 'email', example: 'contato@abc.com.br' },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Empresa criada com sucesso',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Success' },
                },
              },
            },
            '400': { $ref: '#/components/responses/ValidationError' },
          },
        },
      },

      // -----------------------------------------------------------------------
      // Clients
      // -----------------------------------------------------------------------
      '/api/clientes': {
        get: {
          tags: ['Clientes'],
          summary: 'Listar clientes',
          description: 'Retorna lista paginada de clientes da empresa',
          parameters: [
            { $ref: '#/components/parameters/Page' },
            { $ref: '#/components/parameters/Limit' },
            { $ref: '#/components/parameters/Search' },
            { $ref: '#/components/parameters/SortBy' },
            { $ref: '#/components/parameters/SortOrder' },
            {
              name: 'status',
              in: 'query',
              description: 'Filtrar por status',
              schema: { type: 'string', enum: ['active', 'inactive', 'blocked', 'all'] },
            },
          ],
          responses: {
            '200': {
              description: 'Lista de clientes',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Client' },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Clientes'],
          summary: 'Criar cliente',
          description: 'Cria um novo cliente',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Client' },
                example: {
                  name: 'Maria Santos',
                  email: 'maria@email.com',
                  phone: '11999999999',
                  cpfCnpj: '123.456.789-00',
                  address: 'Rua das Palmeiras, 100',
                  city: 'São Paulo',
                  state: 'SP',
                  zipCode: '01234-567',
                  status: 'active',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Cliente criado',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Client' },
                },
              },
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/clientes/{id}': {
        get: {
          tags: ['Clientes'],
          summary: 'Obter cliente',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': {
              description: 'Detalhes do cliente',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Client' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        put: {
          tags: ['Clientes'],
          summary: 'Atualizar cliente',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Client' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Cliente atualizado',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Client' },
                },
              },
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Clientes'],
          summary: 'Excluir cliente',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': {
              description: 'Cliente excluído',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Success' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // -----------------------------------------------------------------------
      // Suppliers
      // -----------------------------------------------------------------------
      '/api/fornecedores': {
        get: {
          tags: ['Fornecedores'],
          summary: 'Listar fornecedores',
          parameters: [
            { $ref: '#/components/parameters/Page' },
            { $ref: '#/components/parameters/Limit' },
            { $ref: '#/components/parameters/Search' },
            { $ref: '#/components/parameters/SortBy' },
            { $ref: '#/components/parameters/SortOrder' },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['active', 'inactive', 'blocked', 'all'] },
            },
          ],
          responses: {
            '200': {
              description: 'Lista de fornecedores',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Supplier' },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Fornecedores'],
          summary: 'Criar fornecedor',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Supplier' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Fornecedor criado',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Supplier' },
                },
              },
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/fornecedores/{id}': {
        get: {
          tags: ['Fornecedores'],
          summary: 'Obter fornecedor',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': {
              description: 'Detalhes do fornecedor',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Supplier' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        put: {
          tags: ['Fornecedores'],
          summary: 'Atualizar fornecedor',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Supplier' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Fornecedor atualizado',
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Fornecedores'],
          summary: 'Excluir fornecedor',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': { description: 'Fornecedor excluído' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // -----------------------------------------------------------------------
      // Projects
      // -----------------------------------------------------------------------
      '/api/projetos': {
        get: {
          tags: ['Projetos'],
          summary: 'Listar projetos',
          parameters: [
            { $ref: '#/components/parameters/Page' },
            { $ref: '#/components/parameters/Limit' },
            { $ref: '#/components/parameters/Search' },
            { $ref: '#/components/parameters/SortBy' },
            { $ref: '#/components/parameters/SortOrder' },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['planning', 'active', 'paused', 'completed', 'cancelled'] },
            },
            {
              name: 'clientId',
              in: 'query',
              description: 'Filtrar por cliente',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Lista de projetos',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Project' },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Projetos'],
          summary: 'Criar projeto',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Project' },
                example: {
                  name: 'Residencial Jardim das Flores',
                  code: 'PROJ-2024-001',
                  description: 'Edifício residencial com 20 andares',
                  clientId: 'clx123abc',
                  address: 'Av. Brasil, 1000',
                  city: 'São Paulo',
                  state: 'SP',
                  status: 'planning',
                  startDate: '2024-01-15',
                  endDate: '2025-12-15',
                  estimatedValue: 5000000,
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Projeto criado',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Project' },
                },
              },
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/projetos/{id}': {
        get: {
          tags: ['Projetos'],
          summary: 'Obter projeto',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': {
              description: 'Detalhes do projeto',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Project' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        put: {
          tags: ['Projetos'],
          summary: 'Atualizar projeto',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Project' },
              },
            },
          },
          responses: {
            '200': {
              description: 'Projeto atualizado',
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Projetos'],
          summary: 'Excluir projeto',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': { description: 'Projeto excluído' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/projetos/{id}/budget-vs-actual': {
        get: {
          tags: ['Projetos'],
          summary: 'Comparativo orçado vs realizado',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': {
              description: 'Dados comparativos',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            category: { type: 'string' },
                            budgeted: { type: 'number' },
                            actual: { type: 'number' },
                            variance: { type: 'number' },
                            variancePercent: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // -----------------------------------------------------------------------
      // Budgets
      // -----------------------------------------------------------------------
      '/api/orcamentos': {
        get: {
          tags: ['Orçamentos'],
          summary: 'Listar orçamentos',
          parameters: [
            { $ref: '#/components/parameters/Page' },
            { $ref: '#/components/parameters/Limit' },
            { $ref: '#/components/parameters/Search' },
            { $ref: '#/components/parameters/SortBy' },
            { $ref: '#/components/parameters/SortOrder' },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['draft', 'pending', 'approved', 'rejected', 'revision'] },
            },
            {
              name: 'projectId',
              in: 'query',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Lista de orçamentos',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Budget' },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Orçamentos'],
          summary: 'Criar orçamento',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Budget' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Orçamento criado',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Budget' },
                },
              },
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/orcamentos/{id}': {
        get: {
          tags: ['Orçamentos'],
          summary: 'Obter orçamento',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': {
              description: 'Detalhes do orçamento',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Budget' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        put: {
          tags: ['Orçamentos'],
          summary: 'Atualizar orçamento',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Budget' },
              },
            },
          },
          responses: {
            '200': { description: 'Orçamento atualizado' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Orçamentos'],
          summary: 'Excluir orçamento',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': { description: 'Orçamento excluído' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // -----------------------------------------------------------------------
      // Compositions
      // -----------------------------------------------------------------------
      '/api/composicoes': {
        get: {
          tags: ['Composições'],
          summary: 'Listar composições de preços',
          parameters: [
            { $ref: '#/components/parameters/Page' },
            { $ref: '#/components/parameters/Limit' },
            { $ref: '#/components/parameters/Search' },
            { $ref: '#/components/parameters/SortBy' },
            { $ref: '#/components/parameters/SortOrder' },
          ],
          responses: {
            '200': {
              description: 'Lista de composições',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Composition' },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Composições'],
          summary: 'Criar composição',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Composition' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Composição criada',
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/composicoes/{id}': {
        get: {
          tags: ['Composições'],
          summary: 'Obter composição',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': {
              description: 'Detalhes da composição',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Composition' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        put: {
          tags: ['Composições'],
          summary: 'Atualizar composição',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Composition' },
              },
            },
          },
          responses: {
            '200': { description: 'Composição atualizada' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Composições'],
          summary: 'Excluir composição',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': { description: 'Composição excluída' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // -----------------------------------------------------------------------
      // Materials
      // -----------------------------------------------------------------------
      '/api/materiais': {
        get: {
          tags: ['Materiais'],
          summary: 'Listar materiais',
          parameters: [
            { $ref: '#/components/parameters/Page' },
            { $ref: '#/components/parameters/Limit' },
            { $ref: '#/components/parameters/Search' },
            { $ref: '#/components/parameters/SortBy' },
            { $ref: '#/components/parameters/SortOrder' },
            {
              name: 'category',
              in: 'query',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Lista de materiais',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Material' },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Materiais'],
          summary: 'Criar material',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Material' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Material criado',
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/materiais/{id}': {
        get: {
          tags: ['Materiais'],
          summary: 'Obter material',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': {
              description: 'Detalhes do material',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Material' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        put: {
          tags: ['Materiais'],
          summary: 'Atualizar material',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Material' },
              },
            },
          },
          responses: {
            '200': { description: 'Material atualizado' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Materiais'],
          summary: 'Excluir material',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': { description: 'Material excluído' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // -----------------------------------------------------------------------
      // Daily Logs
      // -----------------------------------------------------------------------
      '/api/diario-obra': {
        get: {
          tags: ['Diário de Obra'],
          summary: 'Listar diários de obra',
          parameters: [
            { $ref: '#/components/parameters/Page' },
            { $ref: '#/components/parameters/Limit' },
            { $ref: '#/components/parameters/Search' },
            { $ref: '#/components/parameters/SortBy' },
            { $ref: '#/components/parameters/SortOrder' },
            {
              name: 'projectId',
              in: 'query',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Lista de diários',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/DailyLog' },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Diário de Obra'],
          summary: 'Criar diário de obra',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DailyLog' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Diário criado',
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/diario-obra/{id}': {
        get: {
          tags: ['Diário de Obra'],
          summary: 'Obter diário de obra',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': {
              description: 'Detalhes do diário',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/DailyLog' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        put: {
          tags: ['Diário de Obra'],
          summary: 'Atualizar diário de obra',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DailyLog' },
              },
            },
          },
          responses: {
            '200': { description: 'Diário atualizado' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Diário de Obra'],
          summary: 'Excluir diário de obra',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': { description: 'Diário excluído' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // -----------------------------------------------------------------------
      // Schedule
      // -----------------------------------------------------------------------
      '/api/cronograma': {
        get: {
          tags: ['Cronograma'],
          summary: 'Listar cronogramas',
          parameters: [
            { $ref: '#/components/parameters/Page' },
            { $ref: '#/components/parameters/Limit' },
            { $ref: '#/components/parameters/SortBy' },
            { $ref: '#/components/parameters/SortOrder' },
            {
              name: 'projectId',
              in: 'query',
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Lista de cronogramas',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Schedule' },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Cronograma'],
          summary: 'Criar cronograma',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Schedule' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Cronograma criado',
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/cronograma/{id}': {
        get: {
          tags: ['Cronograma'],
          summary: 'Obter cronograma',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': {
              description: 'Detalhes do cronograma',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Schedule' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        put: {
          tags: ['Cronograma'],
          summary: 'Atualizar cronograma',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Schedule' },
              },
            },
          },
          responses: {
            '200': { description: 'Cronograma atualizado' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Cronograma'],
          summary: 'Excluir cronograma',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': { description: 'Cronograma excluído' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // -----------------------------------------------------------------------
      // Financial
      // -----------------------------------------------------------------------
      '/api/financeiro': {
        get: {
          tags: ['Financeiro'],
          summary: 'Listar transações',
          parameters: [
            { $ref: '#/components/parameters/Page' },
            { $ref: '#/components/parameters/Limit' },
            { $ref: '#/components/parameters/Search' },
            { $ref: '#/components/parameters/SortBy' },
            { $ref: '#/components/parameters/SortOrder' },
            {
              name: 'type',
              in: 'query',
              schema: { type: 'string', enum: ['income', 'expense'] },
            },
            {
              name: 'category',
              in: 'query',
              schema: { type: 'string', enum: ['material', 'labor', 'equipment', 'service', 'tax', 'administrative', 'other'] },
            },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'] },
            },
            {
              name: 'projectId',
              in: 'query',
              schema: { type: 'string' },
            },
            {
              name: 'startDate',
              in: 'query',
              schema: { type: 'string', format: 'date' },
            },
            {
              name: 'endDate',
              in: 'query',
              schema: { type: 'string', format: 'date' },
            },
          ],
          responses: {
            '200': {
              description: 'Lista de transações',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Transaction' },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Financeiro'],
          summary: 'Criar transação',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Transaction' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Transação criada',
            },
            '400': { $ref: '#/components/responses/ValidationError' },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/financeiro/{id}': {
        get: {
          tags: ['Financeiro'],
          summary: 'Obter transação',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': {
              description: 'Detalhes da transação',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Transaction' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        put: {
          tags: ['Financeiro'],
          summary: 'Atualizar transação',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Transaction' },
              },
            },
          },
          responses: {
            '200': { description: 'Transação atualizada' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
        delete: {
          tags: ['Financeiro'],
          summary: 'Excluir transação',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': { description: 'Transação excluída' },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },
      '/api/financeiro/dashboard': {
        get: {
          tags: ['Financeiro'],
          summary: 'Dashboard financeiro',
          responses: {
            '200': {
              description: 'Dados do dashboard',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          totalIncome: { type: 'number' },
                          totalExpense: { type: 'number' },
                          balance: { type: 'number' },
                          pendingPayments: { type: 'number' },
                          overduePayments: { type: 'number' },
                          monthlyData: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                month: { type: 'string' },
                                income: { type: 'number' },
                                expense: { type: 'number' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      // -----------------------------------------------------------------------
      // Dashboard
      // -----------------------------------------------------------------------
      '/api/dashboard': {
        get: {
          tags: ['Dashboard'],
          summary: 'Estatísticas do dashboard',
          responses: {
            '200': {
              description: 'Estatísticas gerais',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/DashboardStats' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      // -----------------------------------------------------------------------
      // AI
      // -----------------------------------------------------------------------
      '/api/ia/chat': {
        post: {
          tags: ['Inteligência Artificial'],
          summary: 'Chat com IA',
          description: 'Envia mensagem para o assistente de IA especializado em construção civil',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: {
                    conversationId: { type: 'string', description: 'ID da conversa existente (opcional)' },
                    message: { type: 'string', example: 'Qual o consumo de cimento para concreto fck 30MPa?' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Resposta da IA',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          conversationId: { type: 'string' },
                          message: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              role: { type: 'string', example: 'assistant' },
                              content: { type: 'string' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/api/ia/orcamento': {
        post: {
          tags: ['Inteligência Artificial'],
          summary: 'Gerar orçamento com IA',
          description: 'Gera orçamento automático baseado em descrição do projeto',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['description'],
                  properties: {
                    description: { type: 'string', example: 'Residência de 200m², 2 pavimentos, com piscina' },
                    projectId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Orçamento gerado',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'object',
                        properties: {
                          items: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                description: { type: 'string' },
                                unit: { type: 'string' },
                                quantity: { type: 'number' },
                                unitPrice: { type: 'number' },
                                totalPrice: { type: 'number' },
                              },
                            },
                          },
                          totalValue: { type: 'number' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },

      // -----------------------------------------------------------------------
      // API Keys
      // -----------------------------------------------------------------------
      '/api/api-keys': {
        get: {
          tags: ['API Keys'],
          summary: 'Listar API Keys',
          responses: {
            '200': {
              description: 'Lista de API Keys',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/ApiKey' },
                      },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
          },
        },
        post: {
          tags: ['API Keys'],
          summary: 'Criar API Key',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'permissions'],
                  properties: {
                    name: { type: 'string', example: 'Integração ERP' },
                    permissions: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['projects:read', 'budgets:read', 'budgets:write'],
                    },
                    expiresInDays: { type: 'integer', example: 365 },
                  },
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'API Key criada',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { $ref: '#/components/schemas/ApiKey' },
                      message: { type: 'string', example: 'Guarde esta chave em local seguro. Ela não será exibida novamente.' },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
          },
        },
      },
      '/api/api-keys/{id}': {
        delete: {
          tags: ['API Keys'],
          summary: 'Revogar API Key',
          parameters: [{ $ref: '#/components/parameters/ResourceId' }],
          responses: {
            '200': {
              description: 'API Key revogada',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Success' },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
            '403': { $ref: '#/components/responses/Forbidden' },
            '404': { $ref: '#/components/responses/NotFound' },
          },
        },
      },

      // -----------------------------------------------------------------------
      // SINAPI
      // -----------------------------------------------------------------------
      '/api/sinapi': {
        get: {
          tags: ['SINAPI'],
          summary: 'Buscar composições SINAPI',
          description: 'Busca composições de preços da base SINAPI/TCPO',
          parameters: [
            { $ref: '#/components/parameters/Search' },
            {
              name: 'code',
              in: 'query',
              description: 'Código SINAPI exato',
              schema: { type: 'string' },
            },
            {
              name: 'state',
              in: 'query',
              description: 'Estado para preços regionais',
              schema: { type: 'string', example: 'SP' },
            },
          ],
          responses: {
            '200': {
              description: 'Composições SINAPI',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            code: { type: 'string', example: '8785' },
                            name: { type: 'string', example: 'Concreto armado' },
                            unit: { type: 'string', example: 'm³' },
                            unitPrice: { type: 'number' },
                            source: { type: 'string', example: 'SINAPI' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
    },
    tags: [
      { name: 'Autenticação', description: 'Endpoints de autenticação e registro' },
      { name: 'Clientes', description: 'Gestão de clientes' },
      { name: 'Fornecedores', description: 'Gestão de fornecedores' },
      { name: 'Projetos', description: 'Gestão de projetos de construção' },
      { name: 'Orçamentos', description: 'Criação e gestão de orçamentos' },
      { name: 'Composições', description: 'Composições de preços' },
      { name: 'Materiais', description: 'Controle de materiais e estoque' },
      { name: 'Diário de Obra', description: 'Registro diário de atividades na obra' },
      { name: 'Cronograma', description: 'Cronograma físico-financeiro' },
      { name: 'Financeiro', description: 'Gestão financeira e transações' },
      { name: 'Dashboard', description: 'Estatísticas e indicadores' },
      { name: 'Inteligência Artificial', description: 'Recursos de IA' },
      { name: 'API Keys', description: 'Gestão de chaves de API' },
      { name: 'SINAPI', description: 'Integração com base SINAPI/TCPO' },
    ],
  };
}

// -----------------------------------------------------------------------------
// Helper Functions
// -----------------------------------------------------------------------------

/**
 * Get base URL from request headers
 */
export function getBaseUrl(request: Request): string {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  return `${protocol}://${host}`;
}

/**
 * Generate OpenAPI spec for current request
 */
export function generateOpenAPISpec(request: Request): OpenAPIV3.Document {
  const baseUrl = getBaseUrl(request);
  return buildOpenAPISpec(baseUrl);
}

/**
 * Default OpenAPI spec (for client-side usage)
 */
export const openApiSpec = buildOpenAPISpec(
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
);
