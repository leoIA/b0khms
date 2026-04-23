// =============================================================================
// ConstrutorPro - OpenAPI Paths Definition
// =============================================================================

export const openapiPaths = {
  // ---------------------------------------------------------------------------
  // Health Check
  // ---------------------------------------------------------------------------
  '/api/health': {
    get: {
      tags: ['System'],
      summary: 'Health check endpoint',
      description: 'Verifica o status de saúde da aplicação, banco de dados e cache. Usado por load balancers e monitoramento.',
      operationId: 'getHealth',
      responses: {
        '200': {
          description: 'Sistema saudável',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/HealthCheck' },
            },
          },
        },
        '503': {
          description: 'Sistema indisponível',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Authentication
  // ---------------------------------------------------------------------------
  '/api/auth/register': {
    post: {
      tags: ['Authentication'],
      summary: 'Registrar nova empresa',
      description: 'Cria uma nova conta de usuário e empresa. O usuário criado será automaticamente o administrador da empresa.',
      operationId: 'register',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RegisterRequest' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Empresa e usuário criados com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/UserSession' },
                  message: { type: 'string', example: 'Cadastro realizado com sucesso!' },
                },
              },
            },
          },
        },
        '400': {
          description: 'Dados inválidos ou empresa já existe',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Clients
  // ---------------------------------------------------------------------------
  '/api/clientes': {
    get: {
      tags: ['Clients'],
      summary: 'Listar clientes',
      description: 'Retorna lista paginada de clientes da empresa. Suporta filtros, busca e ordenação.',
      operationId: 'listClients',
      security: [{ sessionAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
        {
          name: 'status',
          in: 'query',
          description: 'Filtrar por status do cliente',
          schema: {
            type: 'string',
            enum: ['active', 'inactive', 'blocked', 'all'],
          },
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
        '401': {
          description: 'Não autenticado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
    post: {
      tags: ['Clients'],
      summary: 'Criar cliente',
      description: 'Cria um novo cliente para a empresa.',
      operationId: 'createClient',
      security: [{ sessionAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateClientRequest' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Cliente criado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Client' },
                  message: { type: 'string', example: 'Cliente criado com sucesso.' },
                },
              },
            },
          },
        },
        '400': {
          description: 'Dados inválidos ou CPF/CNPJ duplicado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
  },

  '/api/clientes/{id}': {
    get: {
      tags: ['Clients'],
      summary: 'Obter cliente por ID',
      description: 'Retorna os detalhes de um cliente específico.',
      operationId: 'getClient',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Detalhes do cliente',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Client' },
                },
              },
            },
          },
        },
        '404': {
          description: 'Cliente não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
    put: {
      tags: ['Clients'],
      summary: 'Atualizar cliente',
      description: 'Atualiza os dados de um cliente existente.',
      operationId: 'updateClient',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateClientRequest' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Cliente atualizado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Client' },
                  message: { type: 'string', example: 'Cliente atualizado com sucesso.' },
                },
              },
            },
          },
        },
        '404': {
          description: 'Cliente não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
    delete: {
      tags: ['Clients'],
      summary: 'Excluir cliente',
      description: 'Remove um cliente do sistema.',
      operationId: 'deleteClient',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Cliente excluído com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Cliente excluído com sucesso.' },
                },
              },
            },
          },
        },
        '404': {
          description: 'Cliente não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------
  '/api/projetos': {
    get: {
      tags: ['Projects'],
      summary: 'Listar projetos',
      description: 'Retorna lista paginada de projetos da empresa. Inclui contagem de orçamentos e diários de obra.',
      operationId: 'listProjects',
      security: [{ sessionAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
        {
          name: 'status',
          in: 'query',
          description: 'Filtrar por status do projeto',
          schema: {
            type: 'string',
            enum: ['planning', 'active', 'paused', 'completed', 'cancelled'],
          },
        },
        {
          name: 'clientId',
          in: 'query',
          description: 'Filtrar por cliente',
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'checkAlerts',
          in: 'query',
          description: 'Executar verificação de alertas',
          schema: { type: 'boolean' },
        },
        {
          name: 'checkDeadlines',
          in: 'query',
          description: 'Verificar prazos próximos',
          schema: { type: 'boolean' },
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
                  success: { type: 'boolean', example: true },
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
        '401': {
          description: 'Não autenticado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
    post: {
      tags: ['Projects'],
      summary: 'Criar projeto',
      description: 'Cria um novo projeto para a empresa.',
      operationId: 'createProject',
      security: [{ sessionAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateProjectRequest' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Projeto criado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Project' },
                  message: { type: 'string', example: 'Projeto criado com sucesso.' },
                },
              },
            },
          },
        },
        '400': {
          description: 'Dados inválidos',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
  },

  '/api/projetos/{id}': {
    get: {
      tags: ['Projects'],
      summary: 'Obter projeto por ID',
      description: 'Retorna os detalhes completos de um projeto específico.',
      operationId: 'getProject',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Detalhes do projeto',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Project' },
                },
              },
            },
          },
        },
        '404': {
          description: 'Projeto não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
    put: {
      tags: ['Projects'],
      summary: 'Atualizar projeto',
      description: 'Atualiza os dados de um projeto existente, incluindo progresso físico e financeiro.',
      operationId: 'updateProject',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateProjectRequest' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Projeto atualizado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Project' },
                  message: { type: 'string', example: 'Projeto atualizado com sucesso.' },
                },
              },
            },
          },
        },
        '404': {
          description: 'Projeto não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
    delete: {
      tags: ['Projects'],
      summary: 'Excluir projeto',
      description: 'Remove um projeto e todos os dados relacionados.',
      operationId: 'deleteProject',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Projeto excluído com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Projeto excluído com sucesso.' },
                },
              },
            },
          },
        },
        '404': {
          description: 'Projeto não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
  },

  '/api/projetos/{id}/budget-vs-actual': {
    get: {
      tags: ['Projects'],
      summary: 'Comparativo orçado vs realizado',
      description: 'Retorna análise comparativa entre valores orçados e realizados do projeto.',
      operationId: 'getProjectBudgetVsActual',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Dados do comparativo',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      budgeted: { type: 'number', example: 5000000 },
                      actual: { type: 'number', example: 3500000 },
                      variance: { type: 'number', example: 1500000 },
                      variancePercentage: { type: 'number', example: 30 },
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

  // ---------------------------------------------------------------------------
  // Suppliers
  // ---------------------------------------------------------------------------
  '/api/fornecedores': {
    get: {
      tags: ['Suppliers'],
      summary: 'Listar fornecedores',
      description: 'Retorna lista paginada de fornecedores da empresa.',
      operationId: 'listSuppliers',
      security: [{ sessionAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        { $ref: '#/components/parameters/SortByParam' },
        { $ref: '#/components/parameters/SortOrderParam' },
        {
          name: 'status',
          in: 'query',
          description: 'Filtrar por status do fornecedor',
          schema: {
            type: 'string',
            enum: ['active', 'inactive', 'blocked'],
          },
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
                  success: { type: 'boolean', example: true },
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
      },
    },
    post: {
      tags: ['Suppliers'],
      summary: 'Criar fornecedor',
      description: 'Cria um novo fornecedor para a empresa.',
      operationId: 'createSupplier',
      security: [{ sessionAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateSupplierRequest' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Fornecedor criado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Supplier' },
                  message: { type: 'string', example: 'Fornecedor criado com sucesso.' },
                },
              },
            },
          },
        },
      },
    },
  },

  '/api/fornecedores/{id}': {
    get: {
      tags: ['Suppliers'],
      summary: 'Obter fornecedor por ID',
      operationId: 'getSupplier',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Detalhes do fornecedor',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Supplier' },
                },
              },
            },
          },
        },
        '404': {
          description: 'Fornecedor não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
    put: {
      tags: ['Suppliers'],
      summary: 'Atualizar fornecedor',
      operationId: 'updateSupplier',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateSupplierRequest' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Fornecedor atualizado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Supplier' },
                  message: { type: 'string', example: 'Fornecedor atualizado com sucesso.' },
                },
              },
            },
          },
        },
      },
    },
    delete: {
      tags: ['Suppliers'],
      summary: 'Excluir fornecedor',
      operationId: 'deleteSupplier',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Fornecedor excluído com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Fornecedor excluído com sucesso.' },
                },
              },
            },
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Budgets
  // ---------------------------------------------------------------------------
  '/api/orcamentos': {
    get: {
      tags: ['Budgets'],
      summary: 'Listar orçamentos',
      description: 'Retorna lista paginada de orçamentos da empresa.',
      operationId: 'listBudgets',
      security: [{ sessionAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['draft', 'pending', 'approved', 'rejected', 'revision'],
          },
        },
        {
          name: 'projectId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
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
                  success: { type: 'boolean', example: true },
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
      },
    },
    post: {
      tags: ['Budgets'],
      summary: 'Criar orçamento',
      operationId: 'createBudget',
      security: [{ sessionAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateBudgetRequest' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Orçamento criado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Budget' },
                  message: { type: 'string', example: 'Orçamento criado com sucesso.' },
                },
              },
            },
          },
        },
      },
    },
  },

  '/api/orcamentos/{id}': {
    get: {
      tags: ['Budgets'],
      summary: 'Obter orçamento por ID',
      operationId: 'getBudget',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Detalhes do orçamento com itens',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    allOf: [
                      { $ref: '#/components/schemas/Budget' },
                      {
                        type: 'object',
                        properties: {
                          items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/BudgetItem' },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
    put: {
      tags: ['Budgets'],
      summary: 'Atualizar orçamento',
      operationId: 'updateBudget',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateBudgetRequest' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Orçamento atualizado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Budget' },
                },
              },
            },
          },
        },
      },
    },
    delete: {
      tags: ['Budgets'],
      summary: 'Excluir orçamento',
      operationId: 'deleteBudget',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Orçamento excluído com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Orçamento excluído com sucesso.' },
                },
              },
            },
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Materials
  // ---------------------------------------------------------------------------
  '/api/materiais': {
    get: {
      tags: ['Materials'],
      summary: 'Listar materiais',
      description: 'Retorna lista paginada de materiais da empresa.',
      operationId: 'listMaterials',
      security: [{ sessionAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
        {
          name: 'category',
          in: 'query',
          schema: { type: 'string' },
        },
        {
          name: 'isActive',
          in: 'query',
          schema: { type: 'boolean' },
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
                  success: { type: 'boolean', example: true },
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
      },
    },
    post: {
      tags: ['Materials'],
      summary: 'Criar material',
      operationId: 'createMaterial',
      security: [{ sessionAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateMaterialRequest' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Material criado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Material' },
                },
              },
            },
          },
        },
      },
    },
  },

  '/api/materiais/{id}': {
    get: {
      tags: ['Materials'],
      summary: 'Obter material por ID',
      operationId: 'getMaterial',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Detalhes do material',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Material' },
                },
              },
            },
          },
        },
      },
    },
    put: {
      tags: ['Materials'],
      summary: 'Atualizar material',
      operationId: 'updateMaterial',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateMaterialRequest' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Material atualizado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Material' },
                },
              },
            },
          },
        },
      },
    },
    delete: {
      tags: ['Materials'],
      summary: 'Excluir material',
      operationId: 'deleteMaterial',
      security: [{ sessionAuth: [] }],
      parameters: [{ $ref: '#/components/parameters/IdParam' }],
      responses: {
        '200': {
          description: 'Material excluído com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: 'Material excluído com sucesso.' },
                },
              },
            },
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Compositions
  // ---------------------------------------------------------------------------
  '/api/composicoes': {
    get: {
      tags: ['Compositions'],
      summary: 'Listar composições',
      description: 'Retorna lista paginada de composições de preços da empresa.',
      operationId: 'listCompositions',
      security: [{ sessionAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        { $ref: '#/components/parameters/SearchParam' },
      ],
      responses: {
        '200': {
          description: 'Lista de composições',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
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
      },
    },
    post: {
      tags: ['Compositions'],
      summary: 'Criar composição',
      operationId: 'createComposition',
      security: [{ sessionAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateCompositionRequest' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Composição criada com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Composition' },
                },
              },
            },
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Financial Transactions
  // ---------------------------------------------------------------------------
  '/api/financeiro': {
    get: {
      tags: ['Financial'],
      summary: 'Listar transações financeiras',
      description: 'Retorna lista paginada de transações (receitas e despesas) da empresa.',
      operationId: 'listTransactions',
      security: [{ sessionAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        {
          name: 'type',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['income', 'expense'],
          },
        },
        {
          name: 'category',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['material', 'labor', 'equipment', 'service', 'tax', 'administrative', 'other'],
          },
        },
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
          },
        },
        {
          name: 'projectId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
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
                  success: { type: 'boolean', example: true },
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
      },
    },
    post: {
      tags: ['Financial'],
      summary: 'Criar transação',
      operationId: 'createTransaction',
      security: [{ sessionAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateTransactionRequest' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Transação criada com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Transaction' },
                },
              },
            },
          },
        },
      },
    },
  },

  '/api/financeiro/dashboard': {
    get: {
      tags: ['Financial'],
      summary: 'Dashboard financeiro',
      description: 'Retorna resumo financeiro com totais de receitas, despesas e saldo.',
      operationId: 'getFinancialDashboard',
      security: [{ sessionAuth: [] }],
      parameters: [
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
          description: 'Dados do dashboard financeiro',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      totalIncome: { type: 'number', example: 1500000 },
                      totalExpense: { type: 'number', example: 1200000 },
                      balance: { type: 'number', example: 300000 },
                      pendingIncome: { type: 'number', example: 500000 },
                      pendingExpense: { type: 'number', example: 200000 },
                      overduePayments: { type: 'number', example: 50000 },
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

  // ---------------------------------------------------------------------------
  // Daily Logs
  // ---------------------------------------------------------------------------
  '/api/diario-obra': {
    get: {
      tags: ['Daily Logs'],
      summary: 'Listar diários de obra',
      description: 'Retorna lista paginada de diários de obra da empresa.',
      operationId: 'listDailyLogs',
      security: [{ sessionAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        {
          name: 'projectId',
          in: 'query',
          required: true,
          schema: { type: 'string', format: 'uuid' },
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
          description: 'Lista de diários de obra',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
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
      },
    },
    post: {
      tags: ['Daily Logs'],
      summary: 'Criar diário de obra',
      operationId: 'createDailyLog',
      security: [{ sessionAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateDailyLogRequest' },
          },
        },
      },
      responses: {
        '201': {
          description: 'Diário de obra criado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/DailyLog' },
                },
              },
            },
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Schedules
  // ---------------------------------------------------------------------------
  '/api/cronograma': {
    get: {
      tags: ['Schedules'],
      summary: 'Listar cronogramas',
      description: 'Retorna lista paginada de cronogramas da empresa.',
      operationId: 'listSchedules',
      security: [{ sessionAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/PageParam' },
        { $ref: '#/components/parameters/LimitParam' },
        {
          name: 'projectId',
          in: 'query',
          schema: { type: 'string', format: 'uuid' },
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
                  success: { type: 'boolean', example: true },
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
      },
    },
    post: {
      tags: ['Schedules'],
      summary: 'Criar cronograma',
      operationId: 'createSchedule',
      security: [{ sessionAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['projectId', 'name', 'startDate', 'endDate'],
              properties: {
                projectId: { type: 'string', format: 'uuid' },
                name: { type: 'string', example: 'Cronograma Físico-Financeiro' },
                description: { type: 'string' },
                startDate: { type: 'string', format: 'date' },
                endDate: { type: 'string', format: 'date' },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Cronograma criado com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/Schedule' },
                },
              },
            },
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Dashboard
  // ---------------------------------------------------------------------------
  '/api/dashboard': {
    get: {
      tags: ['Dashboard'],
      summary: 'Estatísticas do dashboard',
      description: 'Retorna estatísticas consolidadas para o dashboard principal.',
      operationId: 'getDashboardStats',
      security: [{ sessionAuth: [] }],
      responses: {
        '200': {
          description: 'Estatísticas do dashboard',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: { $ref: '#/components/schemas/DashboardStats' },
                },
              },
            },
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // SINAPI
  // ---------------------------------------------------------------------------
  '/api/sinapi': {
    get: {
      tags: ['SINAPI'],
      summary: 'Buscar composições SINAPI',
      description: 'Busca composições de preços da base SINAPI (Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil).',
      operationId: 'searchSinapi',
      security: [{ sessionAuth: [] }],
      parameters: [
        { $ref: '#/components/parameters/SearchParam' },
        {
          name: 'state',
          in: 'query',
          description: 'Estado para precificação',
          schema: { type: 'string', example: 'SP' },
        },
        {
          name: 'month',
          in: 'query',
          description: 'Mês de referência (MM/YYYY)',
          schema: { type: 'string', example: '01/2024' },
        },
      ],
      responses: {
        '200': {
          description: 'Composições SINAPI encontradas',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Composition' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // AI Chat
  // ---------------------------------------------------------------------------
  '/api/ia/chat': {
    post: {
      tags: ['AI'],
      summary: 'Chat com IA',
      description: 'Envia mensagem para o assistente de IA e recebe resposta.',
      operationId: 'aiChat',
      security: [{ sessionAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['message'],
              properties: {
                message: { type: 'string', example: 'Como calcular a quantidade de cimento para uma fundação?' },
                conversationId: { type: 'string', format: 'uuid' },
                context: { type: 'string' },
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
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                      conversationId: { type: 'string', format: 'uuid' },
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

  // ---------------------------------------------------------------------------
  // Realtime Events (SSE)
  // ---------------------------------------------------------------------------
  '/api/realtime/events': {
    get: {
      tags: ['Realtime'],
      summary: 'Stream de eventos em tempo real (SSE)',
      description: 'Endpoint Server-Sent Events para receber atualizações em tempo real. Retorna um stream de eventos com tipagem específica.',
      operationId: 'realtimeEvents',
      security: [{ sessionAuth: [] }],
      parameters: [
        {
          name: 'companyId',
          in: 'query',
          required: true,
          description: 'ID da empresa para filtrar eventos',
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'userId',
          in: 'query',
          description: 'ID do usuário para eventos privados',
          schema: { type: 'string', format: 'uuid' },
        },
        {
          name: 'filters',
          in: 'query',
          description: 'Tipos de eventos para filtrar (separados por vírgula)',
          schema: {
            type: 'string',
            example: 'project:created,project:updated,notification:new',
          },
        },
      ],
      responses: {
        '200': {
          description: 'Stream SSE de eventos',
          content: {
            'text/event-stream': {
              schema: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'evt_1234567890_abc123' },
                  event: { type: 'string', example: 'project:created' },
                  data: { type: 'object' },
                  retry: { type: 'integer', example: 3000 },
                },
              },
            },
          },
        },
        '401': {
          description: 'Não autenticado',
        },
        '403': {
          description: 'Sem permissão para acessar eventos desta empresa',
        },
      },
    },
  },

  '/api/realtime/presence': {
    get: {
      tags: ['Realtime'],
      summary: 'Listar usuários online',
      description: 'Retorna lista de usuários online da empresa com seus status de presença.',
      operationId: 'getPresence',
      security: [{ sessionAuth: [] }],
      parameters: [
        {
          name: 'companyId',
          in: 'query',
          description: 'ID da empresa',
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        '200': {
          description: 'Lista de usuários online',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  users: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        userId: { type: 'string' },
                        userName: { type: 'string' },
                        userEmail: { type: 'string' },
                        userAvatar: { type: 'string' },
                        status: { type: 'string', enum: ['online', 'away', 'busy', 'offline'] },
                        currentPage: { type: 'string' },
                        lastSeen: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                  onlineCount: { type: 'integer', example: 5 },
                  stats: {
                    type: 'object',
                    properties: {
                      totalOnline: { type: 'integer' },
                      byStatus: {
                        type: 'object',
                        properties: {
                          online: { type: 'integer' },
                          away: { type: 'integer' },
                          busy: { type: 'integer' },
                          offline: { type: 'integer' },
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
    },
    post: {
      tags: ['Realtime'],
      summary: 'Atualizar presença',
      description: 'Atualiza o status de presença do usuário atual.',
      operationId: 'updatePresence',
      security: [{ sessionAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                companyId: { type: 'string', format: 'uuid' },
                userId: { type: 'string', format: 'uuid' },
                userName: { type: 'string' },
                userEmail: { type: 'string', format: 'email' },
                userAvatar: { type: 'string' },
                status: {
                  type: 'string',
                  enum: ['online', 'away', 'busy', 'offline'],
                },
                device: {
                  type: 'string',
                  enum: ['desktop', 'mobile', 'tablet'],
                },
                currentPage: { type: 'string' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Presença atualizada com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
      },
    },
    delete: {
      tags: ['Realtime'],
      summary: 'Remover presença',
      description: 'Remove a presença do usuário (marca como offline).',
      operationId: 'removePresence',
      security: [{ sessionAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['companyId', 'userId'],
              properties: {
                companyId: { type: 'string', format: 'uuid' },
                userId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Presença removida com sucesso',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
      },
    },
  },

  '/api/realtime/heartbeat': {
    post: {
      tags: ['Realtime'],
      summary: 'Heartbeat de conexão',
      description: 'Envia um sinal de heartbeat para manter a conexão SSE ativa e atualizar presença.',
      operationId: 'realtimeHeartbeat',
      security: [{ sessionAuth: [] }],
      responses: {
        '200': {
          description: 'Heartbeat recebido',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  timestamp: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // WebSocket
  // ---------------------------------------------------------------------------
  '/api/websocket/info': {
    get: {
      tags: ['WebSocket'],
      summary: 'Informações de conexão WebSocket',
      description: 'Retorna informações necessárias para estabelecer conexão WebSocket, incluindo URL, porta e dados de autenticação.',
      operationId: 'getWebSocketInfo',
      security: [{ sessionAuth: [] }],
      responses: {
        '200': {
          description: 'Informações de conexão WebSocket',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WebSocketInfo' },
            },
          },
        },
        '401': {
          description: 'Não autenticado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // External APIs - Integrações com APIs Externas
  // ---------------------------------------------------------------------------
  '/api/externo/cnpj': {
    get: {
      tags: ['External APIs'],
      summary: 'Consultar CNPJ na Receita Federal',
      description: 'Consulta dados de CNPJ diretamente na base pública da Receita Federal. Útil para preenchimento automático de cadastros de empresas e fornecedores.',
      operationId: 'consultarCNPJ',
      security: [{ sessionAuth: [] }],
      parameters: [
        {
          name: 'cnpj',
          in: 'query',
          required: true,
          description: 'CNPJ a consultar (com ou sem formatação)',
          schema: { type: 'string', example: '11.222.333/0001-81' },
        },
      ],
      responses: {
        '200': {
          description: 'Dados do CNPJ encontrados',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      cnpj: { type: 'string', example: '11.222.333/0001-81' },
                      razaoSocial: { type: 'string', example: 'EMPRESA EXEMPLO LTDA' },
                      nomeFantasia: { type: 'string', example: 'Empresa Exemplo' },
                      situacao: { type: 'string', example: 'ATIVA' },
                      porte: { type: 'string', example: 'MICRO EMPRESA' },
                      endereco: {
                        type: 'object',
                        properties: {
                          logradouro: { type: 'string' },
                          numero: { type: 'string' },
                          bairro: { type: 'string' },
                          municipio: { type: 'string' },
                          uf: { type: 'string' },
                          cep: { type: 'string' },
                        },
                      },
                      contato: {
                        type: 'object',
                        properties: {
                          email: { type: 'string' },
                          telefone: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'CNPJ inválido ou não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
  },

  '/api/externo/cep': {
    get: {
      tags: ['External APIs'],
      summary: 'Consultar CEP via ViaCEP',
      description: 'Consulta endereço pelo CEP usando a API do ViaCEP. Útil para preenchimento automático de endereços em formulários.',
      operationId: 'consultarCEP',
      security: [{ sessionAuth: [] }],
      parameters: [
        {
          name: 'cep',
          in: 'query',
          required: true,
          description: 'CEP a consultar (com ou sem formatação)',
          schema: { type: 'string', example: '01310-100' },
        },
      ],
      responses: {
        '200': {
          description: 'Endereço encontrado',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      cep: { type: 'string', example: '01310-100' },
                      logradouro: { type: 'string', example: 'Avenida Paulista' },
                      bairro: { type: 'string', example: 'Bela Vista' },
                      localidade: { type: 'string', example: 'São Paulo' },
                      uf: { type: 'string', example: 'SP' },
                      ibge: { type: 'string', example: '3550308' },
                    },
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'CEP inválido ou não encontrado',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
  },

  '/api/externo/estados': {
    get: {
      tags: ['External APIs'],
      summary: 'Listar estados do Brasil',
      description: 'Retorna lista de todos os estados brasileiros com dados do IBGE.',
      operationId: 'listarEstados',
      security: [{ sessionAuth: [] }],
      responses: {
        '200': {
          description: 'Lista de estados',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer', example: 35 },
                        sigla: { type: 'string', example: 'SP' },
                        nome: { type: 'string', example: 'São Paulo' },
                        regiao: { type: 'string', example: 'Sudeste' },
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
  },

  '/api/externo/municipios': {
    get: {
      tags: ['External APIs'],
      summary: 'Listar municípios por UF',
      description: 'Retorna lista de municípios de um estado específico usando dados do IBGE.',
      operationId: 'listarMunicipios',
      security: [{ sessionAuth: [] }],
      parameters: [
        {
          name: 'uf',
          in: 'query',
          required: true,
          description: 'Sigla do estado (UF)',
          schema: { type: 'string', example: 'SP' },
        },
      ],
      responses: {
        '200': {
          description: 'Lista de municípios',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer', example: 3550308 },
                        nome: { type: 'string', example: 'São Paulo' },
                        microrregiao: { type: 'string', example: 'São Paulo' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        '400': {
          description: 'UF inválida',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
      },
    },
  },

  '/api/externo/validar': {
    get: {
      tags: ['External APIs'],
      summary: 'Validar documento (CPF ou CNPJ)',
      description: 'Valida dígitos verificadores de CPF ou CNPJ. Útil para validação em formulários.',
      operationId: 'validarDocumento',
      security: [{ sessionAuth: [] }],
      parameters: [
        {
          name: 'documento',
          in: 'query',
          required: true,
          description: 'Documento a validar (CPF ou CNPJ)',
          schema: { type: 'string', example: '123.456.789-09' },
        },
        {
          name: 'tipo',
          in: 'query',
          required: false,
          description: 'Tipo do documento (cpf ou cnpj). Se não informado, detecta automaticamente pelo tamanho.',
          schema: { type: 'string', enum: ['cpf', 'cnpj'] },
        },
      ],
      responses: {
        '200': {
          description: 'Resultado da validação',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  data: {
                    type: 'object',
                    properties: {
                      valido: { type: 'boolean', example: true },
                      tipo: { type: 'string', enum: ['cpf', 'cnpj'] },
                      documento: { type: 'string', example: '123.456.789-09' },
                      documentoLimpo: { type: 'string', example: '12345678909' },
                      mensagem: { type: 'string', example: 'CPF válido' },
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
};
