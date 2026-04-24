// =============================================================================
// ConstrutorPro - Folha de Pagamento API (RH)
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody, parseQueryParams, calculatePagination, createPaginatedResponse, buildSortCondition } from '@/lib/api';
import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

// Schema para criar folha
const payrollSchema = z.object({
  referenceMonth: z.number().int().min(1).max(12),
  referenceYear: z.number().int().min(2020).max(2100),
  type: z.enum(['regular', '13th_first', '13th_second', 'vacation', 'rescission', 'complement']).default('regular'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

// Schema para calcular folha
const calculatePayrollSchema = z.object({
  employeeIds: z.array(z.string()).optional(), // Se vazio, calcula para todos ativos
});

// Funções auxiliares para cálculos de folha
function calculateINSS(salary: number): number {
  // Tabela INSS 2024
  const rates = [
    { limit: 1412.00, rate: 0.075 },
    { limit: 2666.68, rate: 0.09 },
    { limit: 4000.03, rate: 0.12 },
    { limit: 7786.02, rate: 0.14 },
  ];

  let inss = 0;
  let previousLimit = 0;

  for (const bracket of rates) {
    if (salary > previousLimit) {
      const taxableAmount = Math.min(salary, bracket.limit) - previousLimit;
      inss += taxableAmount * bracket.rate;
    }
    previousLimit = bracket.limit;
  }

  // Teto INSS
  return Math.min(inss, 908.85);
}

function calculateIRRF(baseSalary: number, inss: number, dependents: number = 0): number {
  // Base de cálculo
  const base = baseSalary - inss - (dependents * 189.59);

  // Tabela IRRF 2024
  const rates = [
    { limit: 2259.20, rate: 0, deduction: 0 },
    { limit: 2826.65, rate: 0.075, deduction: 169.44 },
    { limit: 3751.05, rate: 0.15, deduction: 381.44 },
    { limit: 4664.68, rate: 0.225, deduction: 662.77 },
    { limit: Infinity, rate: 0.275, deduction: 896.00 },
  ];

  for (const bracket of rates) {
    if (base <= bracket.limit) {
      return Math.max(0, (base * bracket.rate) - bracket.deduction);
    }
  }

  return 0;
}

function calculateFGTS(salary: number): number {
  return salary * 0.08;
}

function calculateEmployerINSS(salary: number): number {
  // INSS patronal - 20% sobre salário (construção civil pode ter alíquota diferente)
  return salary * 0.20;
}

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const queryResult = parseQueryParams(request, z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    referenceMonth: z.coerce.number().int().min(1).max(12).optional(),
    referenceYear: z.coerce.number().int().min(2020).max(2100).optional(),
    status: z.string().optional(),
    type: z.string().optional(),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }));

  if (!queryResult.success) {
    return errorResponse(queryResult.error, 400);
  }

  const { page, limit, referenceMonth, referenceYear, status, type, sortBy, sortOrder } = queryResult.data;
  const { skip } = calculatePagination(page, limit);

  const where = {
    companyId: context!.companyId,
    ...(referenceMonth ? { referenceMonth } : {}),
    ...(referenceYear ? { referenceYear } : {}),
    ...(status ? { status } : {}),
    ...(type ? { type } : {}),
  };

  const [payrolls, total] = await Promise.all([
    db.payrolls.findMany({
      where,
      skip,
      take: limit,
      orderBy: buildSortCondition(sortBy, sortOrder),
      include: {
        _count: {
          select: { payroll_items: true },
        },
      },
    }),
    db.payrolls.count({ where }),
  ]);

  return successResponse(createPaginatedResponse(payrolls, total, page, limit));
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, payrollSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;
  const { context } = authResult;

  // Verificar se já existe folha para este período
  const existing = await db.payrolls.findFirst({
    where: {
      companyId: context!.companyId,
      referenceMonth: data.referenceMonth,
      referenceYear: data.referenceYear,
      type: data.type,
    },
  });

  if (existing) {
    return errorResponse('Já existe uma folha de pagamento para este período.', 400);
  }

  // Gerar número sequencial
  const lastPayroll = await db.payrolls.findFirst({
    where: { companyId: context!.companyId },
    orderBy: { createdAt: 'desc' },
  });

  const number = lastPayroll
    ? `FOL-${String(parseInt(lastPayroll.number.split('-')[1]) + 1).padStart(6, '0')}`
    : 'FOL-000001';

  const payroll = await db.payrolls.create({
    data: {
      companyId: context!.companyId,
      referenceMonth: data.referenceMonth,
      referenceYear: data.referenceYear,
      type: data.type,
      number,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes,
      status: 'draft',
    },
  });

  return successResponse(payroll, 'Folha de pagamento criada com sucesso.');
}

// Endpoint para calcular folha
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, z.object({
    payrollId: z.string(),
    ...calculatePayrollSchema.shape,
  }));

  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const { payrollId, employeeIds } = bodyResult.data;
  const { context } = authResult;

  // Buscar folha
  const payroll = await db.payrolls.findFirst({
    where: {
      id: payrollId,
      companyId: context!.companyId,
    },
  });

  if (!payroll) {
    return errorResponse('Folha de pagamento não encontrada.', 404);
  }

  if (payroll.status !== 'draft') {
    return errorResponse('Folha já foi calculada ou processada.', 400);
  }

  // Buscar funcionários ativos
  const employees = await db.employees.findMany({
    where: {
      companyId: context!.companyId,
      status: 'active',
      ...(employeeIds && employeeIds.length > 0 ? { id: { in: employeeIds } } : {}),
    },
  });

  if (employees.length === 0) {
    return errorResponse('Nenhum funcionário ativo encontrado.', 400);
  }

  // Calcular folha para cada funcionário
  let totalGross = 0;
  let totalDeductions = 0;
  let totalNet = 0;
  let totalEmployer = 0;

  for (const employee of employees) {
    const salary = Number(employee.salary);
    const inssValue = calculateINSS(salary);
    const irrfValue = calculateIRRF(salary, inssValue);
    const fgtsValue = calculateFGTS(salary);
    const employerInss = calculateEmployerINSS(salary);

    const grossValue = salary;
    const deductionsValue = inssValue + irrfValue;
    const netValue = grossValue - deductionsValue;

    totalGross += grossValue;
    totalDeductions += deductionsValue;
    totalNet += netValue;
    totalEmployer += employerInss + fgtsValue;

    // Criar item da folha
    await db.payroll_items.create({
      data: {
        payrollId,
        employeeId: employee.id,
        companyId: context!.companyId,
        baseSalary: new Decimal(salary),
        workedDays: 30,
        grossValue: new Decimal(grossValue),
        inssValue: new Decimal(inssValue),
        irrfValue: new Decimal(irrfValue),
        fgtsValue: new Decimal(fgtsValue),
        deductionsValue: new Decimal(deductionsValue),
        netValue: new Decimal(netValue),
        inssBase: new Decimal(salary),
        irrfBase: new Decimal(salary - inssValue),
        fgtsBase: new Decimal(salary),
        employerInss: new Decimal(employerInss),
        employerFgts: new Decimal(fgtsValue),
        employerTotal: new Decimal(employerInss + fgtsValue),
      },
    });
  }

  // Atualizar totais da folha
  const updatedPayroll = await db.payrolls.update({
    where: { id: payrollId },
    data: {
      status: 'calculated',
      calculationDate: new Date(),
      calculatedBy: context!.user.id,
      totalGross: new Decimal(totalGross),
      totalDeductions: new Decimal(totalDeductions),
      totalNet: new Decimal(totalNet),
      totalEmployer: new Decimal(totalEmployer),
    },
    include: {
      payroll_items: {
        include: {
          employees: {
            select: {
              id: true,
              name: true,
              employeeNumber: true,
              jobTitle: true,
            },
          },
        },
      },
    },
  });

  return successResponse(updatedPayroll, 'Folha de pagamento calculada com sucesso.');
}
