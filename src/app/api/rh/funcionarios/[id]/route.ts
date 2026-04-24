// =============================================================================
// ConstrutorPro - Funcionário Individual API (RH)
// =============================================================================

import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { parseRequestBody } from '@/lib/api';
import { z } from 'zod';

const updateEmployeeSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').optional(),
  cpf: z.string().min(11, 'CPF inválido').optional(),
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
  admissionDate: z.string().optional(),
  terminationDate: z.string().nullable().optional(),
  status: z.enum(['active', 'terminated', 'suspended', 'vacation', 'leave']).optional(),
  employmentType: z.enum(['clt', 'pj', 'seasonal', 'intern', 'apprentice']).optional(),
  workRegime: z.string().optional(),
  weeklyHours: z.number().int().min(1).max(44).optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  projectId: z.string().nullable().optional(),
  salary: z.number().min(0).optional(),
  salaryType: z.enum(['monthly', 'hourly']).optional(),
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { id } = await params;
  const { context } = authResult;

  const employee = await db.employees.findFirst({
    where: {
      id,
      companyId: context!.companyId,
    },
    include: {
      employee_documents: {
        orderBy: { createdAt: 'desc' },
      },
      employee_vacations: {
        orderBy: { vacationStart: 'desc' },
        take: 5,
      },
      employee_leaves: {
        orderBy: { startDate: 'desc' },
        take: 5,
      },
      time_records: {
        orderBy: { date: 'desc' },
        take: 30,
      },
      payroll_items: {
        orderBy: { createdAt: 'desc' },
        take: 6,
      },
    },
  });

  if (!employee) {
    return errorResponse('Funcionário não encontrado.', 404);
  }

  return successResponse(employee);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { id } = await params;
  const bodyResult = await parseRequestBody(request, updateEmployeeSchema);

  if (!bodyResult.success) {
    return errorResponse(bodyResult.error, 400, bodyResult.details);
  }

  const data = bodyResult.data;
  const { context } = authResult;

  // Verificar se funcionário existe
  const existing = await db.employees.findFirst({
    where: { id, companyId: context!.companyId },
  });

  if (!existing) {
    return errorResponse('Funcionário não encontrado.', 404);
  }

  // Verificar CPF duplicado
  if (data.cpf && data.cpf.replace(/\D/g, '') !== existing.cpf) {
    const duplicateCpf = await db.employees.findFirst({
      where: {
        companyId: context!.companyId,
        cpf: data.cpf.replace(/\D/g, ''),
        id: { not: id },
      },
    });

    if (duplicateCpf) {
      return errorResponse('CPF já cadastrado para outro funcionário.', 400);
    }
  }

  // Verificar número de registro duplicado
  if (data.employeeNumber && data.employeeNumber !== existing.employeeNumber) {
    const duplicateNumber = await db.employees.findFirst({
      where: {
        companyId: context!.companyId,
        employeeNumber: data.employeeNumber,
        id: { not: id },
      },
    });

    if (duplicateNumber) {
      return errorResponse('Número de registro já cadastrado para outro funcionário.', 400);
    }
  }

  const employee = await db.employees.update({
    where: { id },
    data: {
      ...data,
      cpf: data.cpf ? data.cpf.replace(/\D/g, '') : undefined,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
      admissionDate: data.admissionDate ? new Date(data.admissionDate) : undefined,
      terminationDate: data.terminationDate ? new Date(data.terminationDate) : data.terminationDate === null ? null : undefined,
      salary: data.salary,
    },
  });

  return successResponse(employee, 'Funcionário atualizado com sucesso.');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { id } = await params;
  const { context } = authResult;

  const employee = await db.employees.findFirst({
    where: { id, companyId: context!.companyId },
  });

  if (!employee) {
    return errorResponse('Funcionário não encontrado.', 404);
  }

  // Verificar se há registros relacionados
  const [payrollCount, timeRecordsCount] = await Promise.all([
    db.payroll_items.count({ where: { employeeId: id } }),
    db.time_records.count({ where: { employeeId: id } }),
  ]);

  if (payrollCount > 0 || timeRecordsCount > 0) {
    // Em vez de excluir, marcar como demitido
    await db.employees.update({
      where: { id },
      data: {
        status: 'terminated',
        terminationDate: new Date(),
      },
    });
    return successResponse(null, 'Funcionário demitido (registros mantidos para fins legais).');
  }

  await db.employees.delete({ where: { id } });

  return successResponse(null, 'Funcionário excluído com sucesso.');
}
