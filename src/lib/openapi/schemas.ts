// =============================================================================
// ConstrutorPro - OpenAPI Schemas
// =============================================================================

export const openapiSchemas = {
  // ---------------------------------------------------------------------------
  // Common Schemas
  // ---------------------------------------------------------------------------
  Pagination: {
    type: 'object',
    properties: {
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 10 },
      total: { type: 'integer', example: 100 },
      totalPages: { type: 'integer', example: 10 },
    },
  },

  ApiError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      error: { type: 'string', example: 'Erro ao processar requisição' },
      message: { type: 'string', example: 'Detalhes do erro' },
    },
  },

  // ---------------------------------------------------------------------------
  // Auth Schemas
  // ---------------------------------------------------------------------------
  UserSession: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      email: { type: 'string', format: 'email' },
      name: { type: 'string' },
      role: {
        type: 'string',
        enum: ['master_admin', 'company_admin', 'manager', 'engineer', 'finance', 'procurement', 'operations', 'viewer'],
      },
      companyId: { type: 'string', format: 'uuid', nullable: true },
      companyName: { type: 'string' },
      companyPlan: {
        type: 'string',
        enum: ['trial', 'starter', 'professional', 'enterprise'],
      },
      avatar: { type: 'string', nullable: true },
    },
  },

  LoginRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'usuario@empresa.com' },
      password: { type: 'string', format: 'password', example: 'senha123' },
    },
  },

  RegisterRequest: {
    type: 'object',
    required: ['name', 'email', 'password', 'companyName', 'cnpj'],
    properties: {
      name: { type: 'string', example: 'João Silva' },
      email: { type: 'string', format: 'email', example: 'joao@empresa.com' },
      password: { type: 'string', format: 'password', minLength: 8, example: 'senhaSegura123' },
      companyName: { type: 'string', example: 'Construtora ABC' },
      cnpj: { type: 'string', pattern: '^\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}$', example: '12.345.678/0001-90' },
      phone: { type: 'string', example: '(11) 99999-9999' },
    },
  },

  // ---------------------------------------------------------------------------
  // Client Schemas
  // ---------------------------------------------------------------------------
  Client: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      companyId: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'Maria Santos' },
      email: { type: 'string', format: 'email', example: 'maria@email.com' },
      phone: { type: 'string', example: '(11) 3333-3333' },
      mobile: { type: 'string', example: '(11) 99999-9999' },
      cpfCnpj: { type: 'string', example: '123.456.789-00' },
      address: { type: 'string', example: 'Rua das Flores, 123' },
      city: { type: 'string', example: 'São Paulo' },
      state: { type: 'string', example: 'SP' },
      zipCode: { type: 'string', example: '01234-567' },
      notes: { type: 'string' },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'blocked'],
        example: 'active',
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  CreateClientRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'Maria Santos' },
      email: { type: 'string', format: 'email', example: 'maria@email.com' },
      phone: { type: 'string', example: '(11) 3333-3333' },
      mobile: { type: 'string', example: '(11) 99999-9999' },
      cpfCnpj: { type: 'string', example: '123.456.789-00' },
      address: { type: 'string', example: 'Rua das Flores, 123' },
      city: { type: 'string', example: 'São Paulo' },
      state: { type: 'string', example: 'SP' },
      zipCode: { type: 'string', example: '01234-567' },
      notes: { type: 'string' },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'blocked'],
        default: 'active',
      },
    },
  },

  UpdateClientRequest: {
    type: 'object',
    properties: {
      name: { type: 'string', example: 'Maria Santos Silva' },
      email: { type: 'string', format: 'email', example: 'maria.silva@email.com' },
      phone: { type: 'string', example: '(11) 3333-4444' },
      mobile: { type: 'string', example: '(11) 99999-8888' },
      cpfCnpj: { type: 'string', example: '123.456.789-00' },
      address: { type: 'string', example: 'Rua das Palmeiras, 456' },
      city: { type: 'string', example: 'Rio de Janeiro' },
      state: { type: 'string', example: 'RJ' },
      zipCode: { type: 'string', example: '20000-000' },
      notes: { type: 'string' },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'blocked'],
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Project Schemas
  // ---------------------------------------------------------------------------
  Project: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      companyId: { type: 'string', format: 'uuid' },
      clientId: { type: 'string', format: 'uuid', nullable: true },
      name: { type: 'string', example: 'Residencial Primavera' },
      code: { type: 'string', example: 'PROJ-2024-001' },
      description: { type: 'string', example: 'Construção de edifício residencial com 20 andares' },
      address: { type: 'string', example: 'Av. Paulista, 1000' },
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
      physicalProgress: { type: 'number', minimum: 0, maximum: 100, example: 70 },
      financialProgress: { type: 'number', minimum: 0, maximum: 100, example: 65 },
      managerId: { type: 'string', format: 'uuid', nullable: true },
      notes: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  CreateProjectRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'Residencial Primavera' },
      code: { type: 'string', example: 'PROJ-2024-001' },
      clientId: { type: 'string', format: 'uuid' },
      description: { type: 'string', example: 'Construção de edifício residencial com 20 andares' },
      address: { type: 'string', example: 'Av. Paulista, 1000' },
      city: { type: 'string', example: 'São Paulo' },
      state: { type: 'string', example: 'SP' },
      status: {
        type: 'string',
        enum: ['planning', 'active', 'paused', 'completed', 'cancelled'],
        default: 'planning',
      },
      startDate: { type: 'string', format: 'date' },
      endDate: { type: 'string', format: 'date' },
      estimatedValue: { type: 'number', example: 5000000.00 },
      managerId: { type: 'string', format: 'uuid' },
      notes: { type: 'string' },
    },
  },

  UpdateProjectRequest: {
    type: 'object',
    properties: {
      name: { type: 'string', example: 'Residencial Primavera II' },
      code: { type: 'string', example: 'PROJ-2024-001-A' },
      clientId: { type: 'string', format: 'uuid' },
      description: { type: 'string' },
      address: { type: 'string' },
      city: { type: 'string' },
      state: { type: 'string' },
      status: {
        type: 'string',
        enum: ['planning', 'active', 'paused', 'completed', 'cancelled'],
      },
      startDate: { type: 'string', format: 'date' },
      endDate: { type: 'string', format: 'date' },
      estimatedValue: { type: 'number' },
      actualValue: { type: 'number' },
      physicalProgress: { type: 'number', minimum: 0, maximum: 100 },
      financialProgress: { type: 'number', minimum: 0, maximum: 100 },
      managerId: { type: 'string', format: 'uuid' },
      notes: { type: 'string' },
    },
  },

  // ---------------------------------------------------------------------------
  // Supplier Schemas
  // ---------------------------------------------------------------------------
  Supplier: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      companyId: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'Cimento Brasil Ltda' },
      tradeName: { type: 'string', example: 'Cimento Brasil' },
      cnpj: { type: 'string', example: '12.345.678/0001-90' },
      email: { type: 'string', format: 'email', example: 'contato@cimentobrasil.com' },
      phone: { type: 'string', example: '(11) 3333-3333' },
      mobile: { type: 'string', example: '(11) 99999-9999' },
      address: { type: 'string', example: 'Rua Industrial, 500' },
      city: { type: 'string', example: 'São Paulo' },
      state: { type: 'string', example: 'SP' },
      zipCode: { type: 'string', example: '01234-567' },
      contactPerson: { type: 'string', example: 'Carlos Silva' },
      category: { type: 'string', example: 'Materiais de Construção' },
      notes: { type: 'string' },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'blocked'],
        example: 'active',
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  CreateSupplierRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'Cimento Brasil Ltda' },
      tradeName: { type: 'string', example: 'Cimento Brasil' },
      cnpj: { type: 'string', example: '12.345.678/0001-90' },
      email: { type: 'string', format: 'email', example: 'contato@cimentobrasil.com' },
      phone: { type: 'string', example: '(11) 3333-3333' },
      mobile: { type: 'string', example: '(11) 99999-9999' },
      address: { type: 'string', example: 'Rua Industrial, 500' },
      city: { type: 'string', example: 'São Paulo' },
      state: { type: 'string', example: 'SP' },
      zipCode: { type: 'string', example: '01234-567' },
      contactPerson: { type: 'string', example: 'Carlos Silva' },
      category: { type: 'string', example: 'Materiais de Construção' },
      notes: { type: 'string' },
      status: {
        type: 'string',
        enum: ['active', 'inactive', 'blocked'],
        default: 'active',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Budget Schemas
  // ---------------------------------------------------------------------------
  Budget: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      companyId: { type: 'string', format: 'uuid' },
      projectId: { type: 'string', format: 'uuid', nullable: true },
      name: { type: 'string', example: 'Orçamento Residencial Primavera' },
      code: { type: 'string', example: 'ORC-2024-001' },
      description: { type: 'string' },
      status: {
        type: 'string',
        enum: ['draft', 'pending', 'approved', 'rejected', 'revision'],
        example: 'draft',
      },
      totalValue: { type: 'number', example: 4500000.00 },
      discount: { type: 'number', example: 50000.00 },
      validUntil: { type: 'string', format: 'date' },
      approvedAt: { type: 'string', format: 'date-time', nullable: true },
      approvedBy: { type: 'string', format: 'uuid', nullable: true },
      notes: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  BudgetItem: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      budgetId: { type: 'string', format: 'uuid' },
      compositionId: { type: 'string', format: 'uuid', nullable: true },
      description: { type: 'string', example: 'Fundação em estacas helicoidais' },
      unit: { type: 'string', example: 'm³' },
      quantity: { type: 'number', example: 150 },
      unitPrice: { type: 'number', example: 850.00 },
      totalPrice: { type: 'number', example: 127500.00 },
      notes: { type: 'string' },
      order: { type: 'integer', example: 1 },
    },
  },

  CreateBudgetRequest: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', example: 'Orçamento Residencial Primavera' },
      code: { type: 'string', example: 'ORC-2024-001' },
      projectId: { type: 'string', format: 'uuid' },
      description: { type: 'string' },
      status: {
        type: 'string',
        enum: ['draft', 'pending', 'approved', 'rejected', 'revision'],
        default: 'draft',
      },
      totalValue: { type: 'number', example: 4500000.00 },
      discount: { type: 'number', example: 50000.00 },
      validUntil: { type: 'string', format: 'date' },
      notes: { type: 'string' },
    },
  },

  // ---------------------------------------------------------------------------
  // Material Schemas
  // ---------------------------------------------------------------------------
  Material: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      companyId: { type: 'string', format: 'uuid' },
      code: { type: 'string', example: 'MAT-001' },
      name: { type: 'string', example: 'Cimento CP-II-E-32' },
      description: { type: 'string', example: 'Cimento Portland 50kg' },
      unit: { type: 'string', example: 'saco' },
      unitCost: { type: 'number', example: 32.50 },
      unitPrice: { type: 'number', example: 38.90 },
      supplierId: { type: 'string', format: 'uuid', nullable: true },
      stockQuantity: { type: 'number', example: 500 },
      minStock: { type: 'number', example: 100 },
      category: { type: 'string', example: 'Materiais Básicos' },
      isActive: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  CreateMaterialRequest: {
    type: 'object',
    required: ['code', 'name', 'unit', 'unitCost'],
    properties: {
      code: { type: 'string', example: 'MAT-001' },
      name: { type: 'string', example: 'Cimento CP-II-E-32' },
      description: { type: 'string', example: 'Cimento Portland 50kg' },
      unit: { type: 'string', example: 'saco' },
      unitCost: { type: 'number', example: 32.50 },
      unitPrice: { type: 'number', example: 38.90 },
      supplierId: { type: 'string', format: 'uuid' },
      stockQuantity: { type: 'number', example: 500 },
      minStock: { type: 'number', example: 100 },
      category: { type: 'string', example: 'Materiais Básicos' },
      isActive: { type: 'boolean', default: true },
    },
  },

  // ---------------------------------------------------------------------------
  // Composition Schemas
  // ---------------------------------------------------------------------------
  Composition: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      companyId: { type: 'string', format: 'uuid' },
      code: { type: 'string', example: 'SINAPI-12345' },
      name: { type: 'string', example: 'Alvenaria de blocos cerâmicos' },
      description: { type: 'string' },
      unit: { type: 'string', example: 'm²' },
      totalCost: { type: 'number', example: 85.50 },
      totalPrice: { type: 'number', example: 120.00 },
      profitMargin: { type: 'number', example: 40 },
      isActive: { type: 'boolean', example: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  CreateCompositionRequest: {
    type: 'object',
    required: ['code', 'name', 'unit'],
    properties: {
      code: { type: 'string', example: 'COMP-001' },
      name: { type: 'string', example: 'Alvenaria de blocos cerâmicos' },
      description: { type: 'string' },
      unit: { type: 'string', example: 'm²' },
      totalCost: { type: 'number', example: 85.50 },
      totalPrice: { type: 'number', example: 120.00 },
      profitMargin: { type: 'number', example: 40 },
      isActive: { type: 'boolean', default: true },
    },
  },

  // ---------------------------------------------------------------------------
  // Transaction Schemas
  // ---------------------------------------------------------------------------
  Transaction: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      companyId: { type: 'string', format: 'uuid' },
      projectId: { type: 'string', format: 'uuid', nullable: true },
      type: {
        type: 'string',
        enum: ['income', 'expense'],
        example: 'expense',
      },
      category: {
        type: 'string',
        enum: ['material', 'labor', 'equipment', 'service', 'tax', 'administrative', 'other'],
        example: 'material',
      },
      description: { type: 'string', example: 'Compra de cimento' },
      value: { type: 'number', example: 5000.00 },
      date: { type: 'string', format: 'date' },
      dueDate: { type: 'string', format: 'date' },
      paymentDate: { type: 'string', format: 'date', nullable: true },
      status: {
        type: 'string',
        enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
        example: 'pending',
      },
      documentNumber: { type: 'string', example: 'NF-12345' },
      notes: { type: 'string' },
      supplierId: { type: 'string', format: 'uuid', nullable: true },
      clientId: { type: 'string', format: 'uuid', nullable: true },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  CreateTransactionRequest: {
    type: 'object',
    required: ['type', 'category', 'description', 'value', 'date'],
    properties: {
      projectId: { type: 'string', format: 'uuid' },
      type: {
        type: 'string',
        enum: ['income', 'expense'],
      },
      category: {
        type: 'string',
        enum: ['material', 'labor', 'equipment', 'service', 'tax', 'administrative', 'other'],
      },
      description: { type: 'string', example: 'Compra de cimento' },
      value: { type: 'number', example: 5000.00 },
      date: { type: 'string', format: 'date' },
      dueDate: { type: 'string', format: 'date' },
      status: {
        type: 'string',
        enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'],
        default: 'pending',
      },
      documentNumber: { type: 'string', example: 'NF-12345' },
      notes: { type: 'string' },
      supplierId: { type: 'string', format: 'uuid' },
      clientId: { type: 'string', format: 'uuid' },
    },
  },

  // ---------------------------------------------------------------------------
  // Daily Log Schemas
  // ---------------------------------------------------------------------------
  DailyLog: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      companyId: { type: 'string', format: 'uuid' },
      projectId: { type: 'string', format: 'uuid' },
      date: { type: 'string', format: 'date' },
      weather: {
        type: 'string',
        enum: ['sunny', 'cloudy', 'rainy', 'stormy'],
        example: 'sunny',
      },
      temperatureMin: { type: 'number', example: 18 },
      temperatureMax: { type: 'number', example: 28 },
      workStartTime: { type: 'string', example: '07:00' },
      workEndTime: { type: 'string', example: '17:00' },
      workersCount: { type: 'integer', example: 25 },
      summary: { type: 'string', example: 'Conclusão da fundação do bloco A' },
      observations: { type: 'string' },
      incidents: { type: 'string' },
      visitors: { type: 'string' },
      createdBy: { type: 'string', format: 'uuid' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  CreateDailyLogRequest: {
    type: 'object',
    required: ['projectId', 'date', 'weather', 'summary'],
    properties: {
      projectId: { type: 'string', format: 'uuid' },
      date: { type: 'string', format: 'date' },
      weather: {
        type: 'string',
        enum: ['sunny', 'cloudy', 'rainy', 'stormy'],
      },
      temperatureMin: { type: 'number', example: 18 },
      temperatureMax: { type: 'number', example: 28 },
      workStartTime: { type: 'string', example: '07:00' },
      workEndTime: { type: 'string', example: '17:00' },
      workersCount: { type: 'integer', example: 25 },
      summary: { type: 'string', example: 'Conclusão da fundação do bloco A' },
      observations: { type: 'string' },
      incidents: { type: 'string' },
      visitors: { type: 'string' },
    },
  },

  // ---------------------------------------------------------------------------
  // Schedule Schemas
  // ---------------------------------------------------------------------------
  Schedule: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      companyId: { type: 'string', format: 'uuid' },
      projectId: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'Cronograma Físico-Financeiro' },
      description: { type: 'string' },
      startDate: { type: 'string', format: 'date' },
      endDate: { type: 'string', format: 'date' },
      status: {
        type: 'string',
        enum: ['pending', 'in_progress', 'completed', 'delayed', 'cancelled'],
        example: 'in_progress',
      },
      progress: { type: 'number', minimum: 0, maximum: 100, example: 45 },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  ScheduleTask: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      scheduleId: { type: 'string', format: 'uuid' },
      parentId: { type: 'string', format: 'uuid', nullable: true },
      name: { type: 'string', example: 'Fundação' },
      description: { type: 'string' },
      startDate: { type: 'string', format: 'date' },
      endDate: { type: 'string', format: 'date' },
      duration: { type: 'integer', example: 30 },
      progress: { type: 'number', minimum: 0, maximum: 100, example: 80 },
      status: {
        type: 'string',
        enum: ['pending', 'in_progress', 'completed', 'delayed', 'cancelled'],
      },
      responsible: { type: 'string', example: 'Eng. João Silva' },
      order: { type: 'integer', example: 1 },
    },
  },

  // ---------------------------------------------------------------------------
  // Dashboard Schemas
  // ---------------------------------------------------------------------------
  DashboardStats: {
    type: 'object',
    properties: {
      projects: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 15 },
          active: { type: 'integer', example: 8 },
          completed: { type: 'integer', example: 5 },
          delayed: { type: 'integer', example: 2 },
          paused: { type: 'integer', example: 2 },
        },
      },
      budgets: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 25 },
          draft: { type: 'integer', example: 5 },
          pending: { type: 'integer', example: 3 },
          approved: { type: 'integer', example: 15 },
          rejected: { type: 'integer', example: 2 },
        },
      },
      financial: {
        type: 'object',
        properties: {
          projectedRevenue: { type: 'number', example: 15000000 },
          actualRevenue: { type: 'number', example: 8500000 },
          projectedCosts: { type: 'number', example: 12000000 },
          actualCosts: { type: 'number', example: 6800000 },
          profitMargin: { type: 'number', example: 20 },
        },
      },
      clients: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 50 },
          active: { type: 'integer', example: 35 },
        },
      },
      suppliers: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 80 },
          active: { type: 'integer', example: 65 },
        },
      },
      progress: {
        type: 'object',
        properties: {
          averagePhysicalProgress: { type: 'number', example: 45 },
          averageFinancialProgress: { type: 'number', example: 42 },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // Health Check Schema
  // ---------------------------------------------------------------------------
  HealthCheck: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['healthy', 'unhealthy'], example: 'healthy' },
      timestamp: { type: 'string', format: 'date-time' },
      version: { type: 'string', example: '1.0.0' },
      uptime: { type: 'number', example: 3600 },
      database: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['connected', 'disconnected'] },
          latency: { type: 'number', example: 5 },
        },
      },
      cache: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['connected', 'disconnected', 'disabled'] },
          keys: { type: 'integer', example: 150 },
        },
      },
    },
  },

  // ---------------------------------------------------------------------------
  // WebSocket Schemas
  // ---------------------------------------------------------------------------
  WebSocketInfo: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          url: { type: 'string', example: 'ws://localhost:3001' },
          port: { type: 'integer', example: 3001 },
          serverRunning: { type: 'boolean', example: true },
          auth: {
            type: 'object',
            properties: {
              companyId: { type: 'string', format: 'uuid' },
              userId: { type: 'string', format: 'uuid' },
              userName: { type: 'string' },
              userEmail: { type: 'string', format: 'email' },
              userRole: { type: 'string' },
            },
          },
          config: {
            type: 'object',
            properties: {
              heartbeatInterval: { type: 'integer', example: 30000 },
              pingInterval: { type: 'integer', example: 25000 },
            },
          },
        },
      },
    },
  },

  WebSocketStats: {
    type: 'object',
    properties: {
      totalConnections: { type: 'integer', example: 15 },
      authenticatedConnections: { type: 'integer', example: 12 },
      companies: { type: 'integer', example: 3 },
      connectionsByCompany: {
        type: 'object',
        additionalProperties: { type: 'integer' },
        example: { 'company-1': 5, 'company-2': 7 },
      },
      activeProgressOperations: { type: 'integer', example: 2 },
    },
  },

  WebSocketMessage: {
    type: 'object',
    required: ['id', 'type', 'payload', 'timestamp'],
    properties: {
      id: { type: 'string', example: 'msg_1234567890_abc123' },
      type: {
        type: 'string',
        enum: [
          'auth:authenticate',
          'auth:authenticated',
          'auth:unauthorized',
          'ping',
          'pong',
          'subscribe',
          'unsubscribe',
          'subscribed',
          'unsubscribed',
          'event:broadcast',
          'event:received',
          'progress:start',
          'progress:update',
          'progress:complete',
          'progress:error',
          'notification:push',
          'notification:read',
          'presence:update',
          'presence:join',
          'presence:leave',
          'system:info',
          'system:error',
        ],
      },
      payload: { type: 'object' },
      timestamp: { type: 'string', format: 'date-time' },
    },
  },

  ProgressPayload: {
    type: 'object',
    required: ['progressId', 'operation', 'status', 'progress'],
    properties: {
      progressId: { type: 'string', example: 'prog_1234567890_abc123' },
      operation: { type: 'string', example: 'file_upload' },
      status: {
        type: 'string',
        enum: ['started', 'in_progress', 'completed', 'error'],
      },
      progress: { type: 'integer', minimum: 0, maximum: 100, example: 50 },
      message: { type: 'string', example: 'Processando arquivo...' },
      data: { type: 'object' },
      error: { type: 'string', example: 'Falha ao processar arquivo' },
    },
  },

  NotificationPayload: {
    type: 'object',
    required: ['id', 'type', 'title', 'message'],
    properties: {
      id: { type: 'string', example: 'notif_1234567890' },
      type: {
        type: 'string',
        enum: ['info', 'success', 'warning', 'error'],
      },
      title: { type: 'string', example: 'Projeto Atualizado' },
      message: { type: 'string', example: 'O projeto foi atualizado com sucesso.' },
      entityType: { type: 'string', example: 'project' },
      entityId: { type: 'string', format: 'uuid' },
      actionUrl: { type: 'string', example: '/projetos/123' },
    },
  },

  PresenceUpdate: {
    type: 'object',
    properties: {
      userId: { type: 'string', format: 'uuid' },
      userName: { type: 'string' },
      userEmail: { type: 'string', format: 'email' },
      status: {
        type: 'string',
        enum: ['online', 'away', 'busy', 'offline'],
      },
      currentPage: { type: 'string', example: '/projetos/123' },
      timestamp: { type: 'string', format: 'date-time' },
    },
  },
};
