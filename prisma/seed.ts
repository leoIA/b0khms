// =============================================================================
// ConstrutorPro - Database Seed
// Professional seeding for development and demonstration
// =============================================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // ===========================================================================
  // Limpar dados existentes (ordem importante para respeitar foreign keys)
  // ===========================================================================
  console.log('🧹 Limpando dados existentes...');
  
  await prisma.activities.deleteMany();
  await prisma.alerts.deleteMany();
  await prisma.ai_messages.deleteMany();
  await prisma.ai_conversations.deleteMany();
  await prisma.transactions.deleteMany();
  await prisma.daily_log_photos.deleteMany();
  await prisma.daily_log_activities.deleteMany();
  await prisma.daily_logs.deleteMany();
  await prisma.schedules_task_dependencies.deleteMany();
  await prisma.schedules_tasks.deleteMany();
  await prisma.schedules.deleteMany();
  await prisma.materials.deleteMany();
  await prisma.compositions_items.deleteMany();
  await prisma.compositions.deleteMany();
  await prisma.budgets_items.deleteMany();
  await prisma.budgets.deleteMany();
  await prisma.projects.deleteMany();
  await prisma.suppliers.deleteMany();
  await prisma.clients.deleteMany();
  await prisma.password_reset_tokens.deleteMany();
  await prisma.sessions.deleteMany();
  await prisma.accounts.deleteMany();
  await prisma.users.deleteMany();
  await prisma.companies.deleteMany();

  // ===========================================================================
  // Criar Empresa Master (para administração do sistema)
  // ===========================================================================
  console.log('🏢 Criando empresas...');
  
  const masterCompany = await prisma.companies.create({
    data: {
      name: 'ConstrutorPro',
      tradingName: 'ConstrutorPro SaaS',
      cnpj: '00000000000191', // CNPJ base para empresa master
      email: 'contato@construtorpro.com.br',
      phone: '1133334444',
      address: 'Av. Paulista, 1000',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310100',
      plan: 'enterprise',
      isActive: true,
    },
  });

  // ===========================================================================
  // Criar Empresas Demo
  // ===========================================================================
  
  const demoCompany = await prisma.companies.create({
    data: {
      name: 'Construtora Demo Ltda',
      tradingName: 'Demo Construtora',
      cnpj: '12345678000190',
      email: 'contato@democonstrutora.com.br',
      phone: '11999998888',
      address: 'Rua das Construções, 100',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234000',
      plan: 'professional',
      isActive: true,
    },
  });

  const anotherCompany = await prisma.companies.create({
    data: {
      name: 'Edificações Silva S.A.',
      tradingName: 'Silva Construções',
      cnpj: '98765432000110',
      email: 'contato@silvaconstrucoes.com.br',
      phone: '21888887777',
      address: 'Av. Brasil, 500',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '20040020',
      plan: 'starter',
      isActive: true,
    },
  });

  // ===========================================================================
  // Criar Usuários
  // ===========================================================================
  console.log('👥 Criando usuários...');

  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Master Admin
  const masterAdmin = await prisma.users.create({
    data: {
      name: 'Administrador Master',
      email: 'admin@construtorpro.com',
      password: hashedPassword,
      role: 'master_admin',
      companyId: masterCompany.id,
      isActive: true,
    },
  });

  // Company Admin
  const companyAdmin = await prisma.users.create({
    data: {
      name: 'Carlos Silva',
      email: 'carlos@democonstrutora.com.br',
      password: hashedPassword,
      role: 'company_admin',
      companyId: demoCompany.id,
      isActive: true,
    },
  });

  // Manager
  const manager = await prisma.users.create({
    data: {
      name: 'Maria Santos',
      email: 'maria@democonstrutora.com.br',
      password: hashedPassword,
      role: 'manager',
      companyId: demoCompany.id,
      isActive: true,
    },
  });

  // Engineer
  const engineer = await prisma.users.create({
    data: {
      name: 'João Oliveira',
      email: 'joao@democonstrutora.com.br',
      password: hashedPassword,
      role: 'engineer',
      companyId: demoCompany.id,
      isActive: true,
    },
  });

  // Finance
  const finance = await prisma.users.create({
    data: {
      name: 'Ana Costa',
      email: 'ana@democonstrutora.com.br',
      password: hashedPassword,
      role: 'finance',
      companyId: demoCompany.id,
      isActive: true,
    },
  });

  // Procurement
  const procurement = await prisma.users.create({
    data: {
      name: 'Pedro Lima',
      email: 'pedro@democonstrutora.com.br',
      password: hashedPassword,
      role: 'procurement',
      companyId: demoCompany.id,
      isActive: true,
    },
  });

  // Operations
  const operations = await prisma.users.create({
    data: {
      name: 'Lucas Ferreira',
      email: 'lucas@democonstrutora.com.br',
      password: hashedPassword,
      role: 'operations',
      companyId: demoCompany.id,
      isActive: true,
    },
  });

  // Viewer
  const viewer = await prisma.users.create({
    data: {
      name: 'Julia Martins',
      email: 'julia@democonstrutora.com.br',
      password: hashedPassword,
      role: 'viewer',
      companyId: demoCompany.id,
      isActive: true,
    },
  });

  // ===========================================================================
  // Criar Clientes
  // ===========================================================================
  console.log('🏢 Criando clientes...');

  const clients = await Promise.all([
    prisma.clients.create({
      data: {
        companyId: demoCompany.id,
        name: 'João da Silva',
        email: 'joao.silva@email.com',
        phone: '11988887777',
        mobile: '119988887777',
        cpfCnpj: '12345678901',
        address: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234000',
        status: 'active',
      },
    }),
    prisma.clients.create({
      data: {
        companyId: demoCompany.id,
        name: 'Maria Construções Ltda',
        email: 'contato@mariaconstrucoes.com.br',
        phone: '1133332222',
        cpfCnpj: '12345678000199',
        address: 'Av. Industrial, 500',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234001',
        status: 'active',
      },
    }),
    prisma.clients.create({
      data: {
        companyId: demoCompany.id,
        name: 'Empresa ABC S.A.',
        email: 'construcao@abc.com.br',
        phone: '1122223333',
        cpfCnpj: '98765432000188',
        address: 'Rua Comercial, 1000',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234002',
        status: 'active',
      },
    }),
  ]);

  // ===========================================================================
  // Criar Fornecedores
  // ===========================================================================
  console.log('🚚 Criando fornecedores...');

  const suppliers = await Promise.all([
    prisma.suppliers.create({
      data: {
        companyId: demoCompany.id,
        name: 'Cimento Nacional S.A.',
        tradeName: 'Cimento Nacional',
        cnpj: '11222333000144',
        email: 'vendas@cementonacional.com.br',
        phone: '1133334444',
        contactPerson: 'Roberto Santos',
        category: 'Materiais de Construção',
        status: 'active',
      },
    }),
    prisma.suppliers.create({
      data: {
        companyId: demoCompany.id,
        name: 'Aços do Brasil Ltda',
        tradeName: 'Aços Brasil',
        cnpj: '22333444000155',
        email: 'comercial@acosbrasil.com.br',
        phone: '1144445555',
        contactPerson: 'Carlos Ferreira',
        category: 'Estrutura Metálica',
        status: 'active',
      },
    }),
    prisma.suppliers.create({
      data: {
        companyId: demoCompany.id,
        name: 'Tintas Color Ltda',
        tradeName: 'Tintas Color',
        cnpj: '33444555000166',
        email: 'vendas@tintacolor.com.br',
        phone: '1155556666',
        contactPerson: 'Mariana Lima',
        category: 'Acabamentos',
        status: 'active',
      },
    }),
    prisma.suppliers.create({
      data: {
        companyId: demoCompany.id,
        name: 'Eletrica Paulista',
        tradeName: 'Eletrica Paulista',
        cnpj: '44555666000177',
        email: 'contato@eletricapaulista.com.br',
        phone: '1166667777',
        contactPerson: 'Fernando Costa',
        category: 'Instalações Elétricas',
        status: 'active',
      },
    }),
  ]);

  // ===========================================================================
  // Criar Materiais
  // ===========================================================================
  console.log('📦 Criando materiais...');

  const materials = await Promise.all([
    prisma.materials.create({
      data: {
        companyId: demoCompany.id,
        code: 'MAT001',
        name: 'Cimento CP-II E-32',
        description: 'Cimento Portland composto com escória de alto-forno',
        unit: 'sc',
        unitCost: 32.50,
        unitPrice: 38.90,
        supplierId: suppliers[0].id,
        stockQuantity: 500,
        minStock: 100,
        category: 'Aglos',
        isActive: true,
      },
    }),
    prisma.materials.create({
      data: {
        companyId: demoCompany.id,
        code: 'MAT002',
        name: 'Areia Média',
        description: 'Areia média para concreto e argamassa',
        unit: 'm3',
        unitCost: 85.00,
        unitPrice: 110.00,
        stockQuantity: 50,
        minStock: 20,
        category: 'Aglos',
        isActive: true,
      },
    }),
    prisma.materials.create({
      data: {
        companyId: demoCompany.id,
        code: 'MAT003',
        name: 'Brita 19mm',
        description: 'Pedra britada 19mm para concreto',
        unit: 'm3',
        unitCost: 95.00,
        unitPrice: 125.00,
        stockQuantity: 40,
        minStock: 15,
        category: 'Aglos',
        isActive: true,
      },
    }),
    prisma.materials.create({
      data: {
        companyId: demoCompany.id,
        code: 'MAT004',
        name: 'Aço CA-50 8mm',
        description: 'Barra de aço CA-50 8mm para armaduras',
        unit: 'kg',
        unitCost: 5.80,
        unitPrice: 7.50,
        supplierId: suppliers[1].id,
        stockQuantity: 2000,
        minStock: 500,
        category: 'Estrutura',
        isActive: true,
      },
    }),
    prisma.materials.create({
      data: {
        companyId: demoCompany.id,
        code: 'MAT005',
        name: 'Aço CA-60 5mm',
        description: 'Arame de aço CA-60 5mm para estribos',
        unit: 'kg',
        unitCost: 6.20,
        unitPrice: 8.00,
        supplierId: suppliers[1].id,
        stockQuantity: 1500,
        minStock: 300,
        category: 'Estrutura',
        isActive: true,
      },
    }),
  ]);

  // ===========================================================================
  // Criar Projetos
  // ===========================================================================
  console.log('📁 Criando projetos...');

  const projects = await Promise.all([
    prisma.projects.create({
      data: {
        companyId: demoCompany.id,
        clientId: clients[0].id,
        name: 'Residencial Parque Verde',
        code: 'PRJ-001',
        description: 'Condomínio residencial com 3 torres de 15 andares',
        address: 'Av. das Árvores, 1000',
        city: 'São Paulo',
        state: 'SP',
        status: 'active',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2025-12-15'),
        estimatedValue: 12500000,
        actualValue: 4200000,
        physicalProgress: 35,
        financialProgress: 33.6,
        managerId: manager.id,
      },
    }),
    prisma.projects.create({
      data: {
        companyId: demoCompany.id,
        clientId: clients[1].id,
        name: 'Edifício Solar',
        code: 'PRJ-002',
        description: 'Edifício comercial de 20 andares',
        address: 'Rua do Comércio, 200',
        city: 'São Paulo',
        state: 'SP',
        status: 'active',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2025-06-30'),
        estimatedValue: 8500000,
        actualValue: 2100000,
        physicalProgress: 25,
        financialProgress: 24.7,
        managerId: manager.id,
      },
    }),
    prisma.projects.create({
      data: {
        companyId: demoCompany.id,
        clientId: clients[2].id,
        name: 'Galpão Industrial XYZ',
        code: 'PRJ-003',
        description: 'Galpão industrial de 5000m²',
        address: 'Distrito Industrial, Lote 10',
        city: 'São Paulo',
        state: 'SP',
        status: 'planning',
        startDate: new Date('2024-07-01'),
        endDate: new Date('2025-01-31'),
        estimatedValue: 3200000,
        actualValue: 0,
        physicalProgress: 0,
        financialProgress: 0,
        managerId: manager.id,
      },
    }),
    prisma.projects.create({
      data: {
        companyId: demoCompany.id,
        name: 'Condomínio Jardim das Flores',
        code: 'PRJ-004',
        description: 'Condomínio horizontal com 50 casas',
        address: 'Estrada das Flores, 500',
        city: 'São Paulo',
        state: 'SP',
        status: 'completed',
        startDate: new Date('2022-01-01'),
        endDate: new Date('2024-03-15'),
        estimatedValue: 15000000,
        actualValue: 14500000,
        physicalProgress: 100,
        financialProgress: 96.67,
        managerId: manager.id,
      },
    }),
  ]);

  // ===========================================================================
  // Criar Orçamentos
  // ===========================================================================
  console.log('📄 Criando orçamentos...');

  const budget = await prisma.budgets.create({
    data: {
      companyId: demoCompany.id,
      projectId: projects[0].id,
      name: 'Orçamento Executivo - Residencial Parque Verde',
      code: 'ORC-001',
      description: 'Orçamento executivo para construção do condomínio',
      status: 'approved',
      totalValue: 12500000,
      discount: 2,
      approvedAt: new Date('2024-01-10'),
      approvedBy: companyAdmin.id,
    },
  });

  // Budget Items
  await prisma.budgets_items.createMany({
    data: [
      {
        budgetId: budget.id,
        description: 'Fundações',
        unit: 'vb',
        quantity: 450,
        unitPrice: 2500,
        totalPrice: 1125000,
        order: 1,
      },
      {
        budgetId: budget.id,
        description: 'Estrutura de Concreto',
        unit: 'm3',
        quantity: 3200,
        unitPrice: 1800,
        totalPrice: 5760000,
        order: 2,
      },
      {
        budgetId: budget.id,
        description: 'Alvenaria',
        unit: 'm2',
        quantity: 15000,
        unitPrice: 85,
        totalPrice: 1275000,
        order: 3,
      },
      {
        budgetId: budget.id,
        description: 'Instalações Elétricas',
        unit: 'm2',
        quantity: 22500,
        unitPrice: 65,
        totalPrice: 1462500,
        order: 4,
      },
      {
        budgetId: budget.id,
        description: 'Instalações Hidráulicas',
        unit: 'm2',
        quantity: 22500,
        unitPrice: 45,
        totalPrice: 1012500,
        order: 5,
      },
      {
        budgetId: budget.id,
        description: 'Acabamentos',
        unit: 'm2',
        quantity: 20000,
        unitPrice: 120,
        totalPrice: 2400000,
        order: 6,
      },
    ],
  });

  // ===========================================================================
  // Criar Composições
  // ===========================================================================
  console.log('📐 Criando composições...');

  const compositions = await Promise.all([
    prisma.compositions.create({
      data: {
        companyId: demoCompany.id,
        code: 'COMP001',
        name: 'Concreto Estrutural fck 30MPa',
        description: 'Concreto estrutural para vigas e pilares',
        unit: 'm3',
        totalCost: 420,
        totalPrice: 588,
        profitMargin: 40,
        isActive: true,
      },
    }),
    prisma.compositions.create({
      data: {
        companyId: demoCompany.id,
        code: 'COMP002',
        name: 'Argamassa de Assentamento',
        description: 'Argamassa para assentamento de alvenaria',
        unit: 'm3',
        totalCost: 180,
        totalPrice: 252,
        profitMargin: 40,
        isActive: true,
      },
    }),
  ]);

  // ===========================================================================
  // Criar Cronogramas
  // ===========================================================================
  console.log('📅 Criando cronogramas...');

  const schedule = await prisma.schedules.create({
    data: {
      companyId: demoCompany.id,
      projectId: projects[0].id,
      name: 'Cronograma Físico - Residencial Parque Verde',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2025-12-15'),
      status: 'in_progress',
      progress: 35,
    },
  });

  // Schedule Tasks
  await prisma.schedules_tasks.createMany({
    data: [
      {
        scheduleId: schedule.id,
        name: 'Serviços Preliminares',
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-02-15'),
        duration: 31,
        progress: 100,
        status: 'completed',
        order: 1,
      },
      {
        scheduleId: schedule.id,
        name: 'Movimento de Terra',
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-03-15'),
        duration: 43,
        progress: 100,
        status: 'completed',
        order: 2,
      },
      {
        scheduleId: schedule.id,
        name: 'Fundações',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-05-31'),
        duration: 92,
        progress: 85,
        status: 'in_progress',
        order: 3,
      },
      {
        scheduleId: schedule.id,
        name: 'Estrutura',
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-12-31'),
        duration: 245,
        progress: 20,
        status: 'in_progress',
        order: 4,
      },
      {
        scheduleId: schedule.id,
        name: 'Alvenaria',
        startDate: new Date('2024-08-01'),
        endDate: new Date('2025-04-30'),
        duration: 273,
        progress: 5,
        status: 'pending',
        order: 5,
      },
      {
        scheduleId: schedule.id,
        name: 'Instalações',
        startDate: new Date('2024-10-01'),
        endDate: new Date('2025-08-31'),
        duration: 335,
        progress: 0,
        status: 'pending',
        order: 6,
      },
      {
        scheduleId: schedule.id,
        name: 'Acabamentos',
        startDate: new Date('2025-03-01'),
        endDate: new Date('2025-11-30'),
        duration: 275,
        progress: 0,
        status: 'pending',
        order: 7,
      },
    ],
  });

  // ===========================================================================
  // Criar Diários de Obra
  // ===========================================================================
  console.log('📝 Criando diários de obra...');

  const today = new Date();
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    return date;
  });

  for (const date of dates) {
    await prisma.daily_logs.create({
      data: {
        companyId: demoCompany.id,
        projectId: projects[0].id,
        date: date,
        weather: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)] as any,
        temperatureMin: 18 + Math.floor(Math.random() * 5),
        temperatureMax: 28 + Math.floor(Math.random() * 5),
        workStartTime: '07:00',
        workEndTime: '17:00',
        workersCount: 45 + Math.floor(Math.random() * 10),
        summary: `Atividades normais de execução. Concretagem de pilares do 5º pavimento da Torre A.`,
        observations: 'Sem ocorrências relevantes.',
        createdBy: engineer.id,
        activities: {
          create: [
            {
              description: 'Concretagem de pilares P1 a P8 - 5º pavimento Torre A',
              location: 'Torre A - 5º Pavimento',
              workersCount: 12,
              startTime: '08:00',
              endTime: '16:00',
            },
            {
              description: 'Montagem de fôrmas para vigas - 5º pavimento Torre A',
              location: 'Torre A - 5º Pavimento',
              workersCount: 8,
              startTime: '07:00',
              endTime: '17:00',
            },
            {
              description: 'Armação de pilares - 6º pavimento Torre A',
              location: 'Torre A - 6º Pavimento',
              workersCount: 6,
              startTime: '07:00',
              endTime: '17:00',
            },
          ],
        },
      },
    });
  }

  // ===========================================================================
  // Criar Transações
  // ===========================================================================
  console.log('💰 Criando transações...');

  // Receitas
  await prisma.transactions.createMany({
    data: [
      {
        companyId: demoCompany.id,
        projectId: projects[0].id,
        clientId: clients[0].id,
        type: 'income',
        category: 'service',
        description: 'Fatura #001 - Residencial Parque Verde',
        value: 450000,
        date: new Date('2024-01-20'),
        dueDate: new Date('2024-02-20'),
        status: 'paid',
        paymentDate: new Date('2024-02-18'),
      },
      {
        companyId: demoCompany.id,
        projectId: projects[0].id,
        clientId: clients[0].id,
        type: 'income',
        category: 'service',
        description: 'Fatura #002 - Residencial Parque Verde',
        value: 450000,
        date: new Date('2024-02-20'),
        dueDate: new Date('2024-03-20'),
        status: 'paid',
        paymentDate: new Date('2024-03-15'),
      },
      {
        companyId: demoCompany.id,
        projectId: projects[0].id,
        clientId: clients[0].id,
        type: 'income',
        category: 'service',
        description: 'Fatura #003 - Residencial Parque Verde',
        value: 450000,
        date: new Date('2024-03-20'),
        dueDate: new Date('2024-04-20'),
        status: 'paid',
        paymentDate: new Date('2024-04-18'),
      },
    ],
  });

  // Despesas
  await prisma.transactions.createMany({
    data: [
      {
        companyId: demoCompany.id,
        projectId: projects[0].id,
        supplierId: suppliers[0].id,
        type: 'expense',
        category: 'material',
        description: 'Compra de cimento - Lote 001',
        value: 65000,
        date: new Date('2024-01-25'),
        dueDate: new Date('2024-02-25'),
        status: 'paid',
        paymentDate: new Date('2024-02-20'),
        documentNumber: 'NF-e 12345',
      },
      {
        companyId: demoCompany.id,
        projectId: projects[0].id,
        supplierId: suppliers[1].id,
        type: 'expense',
        category: 'material',
        description: 'Compra de aço - Lote 001',
        value: 120000,
        date: new Date('2024-02-01'),
        dueDate: new Date('2024-03-01'),
        status: 'paid',
        paymentDate: new Date('2024-02-28'),
        documentNumber: 'NF-e 12346',
      },
      {
        companyId: demoCompany.id,
        projectId: projects[0].id,
        type: 'expense',
        category: 'labor',
        description: 'Folha de pagamento - Janeiro/2024',
        value: 185000,
        date: new Date('2024-01-31'),
        dueDate: new Date('2024-02-05'),
        status: 'paid',
        paymentDate: new Date('2024-02-05'),
      },
    ],
  });

  // ===========================================================================
  // Criar Alertas
  // ===========================================================================
  console.log('🔔 Criando alertas...');

  await prisma.alerts.createMany({
    data: [
      {
        companyId: demoCompany.id,
        type: 'warning',
        title: 'Estoque baixo',
        message: 'O material "Cimento CP-II E-32" está abaixo do estoque mínimo.',
        entityType: 'material',
        entityId: materials[0].id,
        isRead: false,
      },
      {
        companyId: demoCompany.id,
        type: 'error',
        title: 'Projeto atrasado',
        message: 'O projeto "Residencial Parque Verde" está 3 dias atrasado.',
        entityType: 'project',
        entityId: projects[0].id,
        isRead: false,
      },
    ],
  });

  // ===========================================================================
  // Criar Atividades Recentes
  // ===========================================================================
  console.log('📊 Criando atividades recentes...');

  await prisma.activities.createMany({
    data: [
      {
        companyId: demoCompany.id,
        userId: engineer.id,
        userName: engineer.name,
        action: 'criou',
        entityType: 'daily_log',
        entityId: '1',
        entityName: 'Diário de Obra - 15/01/2024',
        createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
      },
      {
        companyId: demoCompany.id,
        userId: companyAdmin.id,
        userName: companyAdmin.name,
        action: 'aprovou',
        entityType: 'budget',
        entityId: budget.id,
        entityName: budget.name,
        createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
      },
      {
        companyId: demoCompany.id,
        userId: procurement.id,
        userName: procurement.name,
        action: 'cadastrou',
        entityType: 'supplier',
        entityId: suppliers[0].id,
        entityName: suppliers[0].name,
        createdAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      },
      {
        companyId: demoCompany.id,
        userId: manager.id,
        userName: manager.name,
        action: 'atualizou',
        entityType: 'project',
        entityId: projects[0].id,
        entityName: projects[0].name,
        details: 'Progresso físico atualizado para 35%',
        createdAt: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
      },
    ],
  });

  console.log('✅ Seed concluído com sucesso!');
  console.log('\n📋 Credenciais de acesso:');
  console.log('   Master Admin: admin@construtorpro.com / admin123');
  console.log('   Company Admin: carlos@democonstrutora.com.br / admin123');
  console.log('   Manager: maria@democonstrutora.com.br / admin123');
  console.log('   Engineer: joao@democonstrutora.com.br / admin123');
  console.log('   Finance: ana@democonstrutora.com.br / admin123');
  console.log('   Procurement: pedro@democonstrutora.com.br / admin123');
  console.log('   Operations: lucas@democonstrutora.com.br / admin123');
  console.log('   Viewer: julia@democonstrutora.com.br / admin123');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
