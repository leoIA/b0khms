// =============================================================================
// ConstrutorPro - Funcionários API (RH)
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody, parseQueryParams, calculatePagination, createPaginatedResponse, buildSearchCondition, buildSortCondition } from '@/lib/api';
import { z } from 'zod';

// Schema de validação para funcionário
const employeeSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z.string().min(11, 'CPF inválido'),
  rg: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.enum(['masculine', 'feminine', 'other']).optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
  nationality: z.string().optional(),
  educationLevel: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  employeeNumber: z.string().optional(),
  admissionDate: z.string(),
  terminationDate: z.string().optional(),
  status: z.enum(['active', 'terminated', 'suspended', 'vacation', 'leave']).default('active'),
  employmentType: z.enum(['clt', 'pj', 'seasonal', 'intern', 'apprentice']).default('clt'),
  workRegime: z.string().optional(),
  weeklyHours: z.number().int().min(1).max(44).default(44),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  projectId: z.string().optional(),
  salary: z.number().min(0).default(0),
  salaryType: z.enum(['monthly', 'hourly']).default('monthly'),
  cnpjCei: z.string().optional(),
  cbo: z.string().optional(),
  union: z.string().optional(),
  unionDuesPercent: z.number().min(0).max(100).optional(),
  bankName: z.string().optional(),
  bankCode: z.string().optional(),
  bankAgency: z.string().optional(),
  bankAccount: z.string().optional(),
  bankAccountType: z.enum(['checking', 'savings']).optional(),
  pixKey: z.string().optional(),
  notes: z.string().optional(),
});

const paginationEmployeeSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.string().default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  status: z.string().optional(),
  department: z.string().optional(),
  employmentType: z.string().optional(),
  projectId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;
  const queryResult = parseQueryParams(request, paginationEmployeeSchema);

  if (!queryResult.success) {
    return errorResponse(queryResult.error, 400);
  }

  const { page, limit, search, sortBy, sortOrder, status, department, employmentType, projectId } = queryResult.data;
  const { skip } = calculatePagination(page, limit);

  const where = {
    companyId: context!.companyId,
    ...(status && status !== 'all' ? { status } : {}),
    ...(department ? { department } : {}),
    ...(employmentType ? { employmentType } : {}),
    ...(projectId ? { projectId } : {}),
    ...buildSearchCondition(['name', 'cpf', 'email', 'jobTitle', 'department'], search),
  };

  const [employees, total] = await Promise.all([
    db.employees.findMany({
      where,
      skip,
      take: limit,
      orderBy: buildSortCondition(sortBy, sortOrder),
      include: {
        _count: {
          select: { time_records: true, employee_vacations: true, employee_leaves: true },
        },
      },
    }),
    db.employees.count({ where }),
  ]);

  return successResponse(createPaginatedResponse(employees, total, page, limit));
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const bodyResult = await parseRequestBody(request, employeeSchema);
  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;
  const { context } = authResult;

  // Verificar CPF duplicado
  const existing = await db.employees.findFirst({
    where: {
      companyId: context!.companyId,
      cpf: data.cpf.replace(/\D/g, ''),
    },
  });

  if (existing) {
    return errorResponse('CPF já cadastrado para outro funcionário.', 400);
  }

  // Verificar número de registro duplicado
  if (data.employeeNumber) {
    const existingNumber = await db.employees.findFirst({
      where: {
        companyId: context!.companyId,
        employeeNumber: data.employeeNumber,
      },
    });

    if (existingNumber) {
      return errorResponse('Número de registro já cadastrado para outro funcionário.', 400);
    }
  }

  const employee = await db.employees.create({
    data: {
      companyId: context!.companyId,
      name: data.name,
      cpf: data.cpf.replace(/\D/g, ''),
      rg: data.rg,
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      gender: data.gender,
      maritalStatus: data.maritalStatus,
      nationality: data.nationality,
      educationLevel: data.educationLevel,
      email: data.email || null,
      phone: data.phone,
      mobile: data.mobile,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      employeeNumber: data.employeeNumber,
      admissionDate: new Date(data.admissionDate),
      terminationDate: data.terminationDate ? new Date(data.terminationDate) : null,
      status: data.status,
      employmentType: data.employmentType,
      workRegime: data.workRegime,
      weeklyHours: data.weeklyHours,
      jobTitle: data.jobTitle,
      department: data.department,
      projectId: data.projectId,
      salary: data.salary,
      salaryType: data.salaryType,
      cnpjCei: data.cnpjCei,
      cbo: data.cbo,
      union: data.union,
      unionDuesPercent: data.unionDuesPercent,
      bankName: data.bankName,
      bankCode: data.bankCode,
      bankAgency: data.bankAgency,
      bankAccount: data.bankAccount,
      bankAccountType: data.bankAccountType,
      pixKey: data.pixKey,
      notes: data.notes,
    },
  });

  return successResponse(employee, 'Funcionário cadastrado com sucesso.');
}
