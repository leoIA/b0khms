import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/server/auth'
import { db } from '@/lib/db'
import { reportScheduleService } from '@/lib/services/reports'
import { createReportScheduleSchema } from '@/validators/reports'
import { z } from 'zod'

// GET /api/relatorios/[id]/agendamentos - Listar agendamentos do relatório
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult
  const { id } = await params

  try {
    // Verificar se o relatório pertence à empresa
    const report = await db.custom_reports.findFirst({
      where: { id, companyId: context!.companyId },
    })

    if (!report) {
      return errorResponse('Relatório não encontrado', 404)
    }

    const result = await reportScheduleService.list(context!.companyId, {
      reportId: id,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao listar agendamentos:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}

// POST /api/relatorios/[id]/agendamentos - Criar agendamento
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult

  // Verificar permissão - apenas admin e manager podem criar agendamentos
  if (!context?.isCompanyAdmin && !context?.canManageCompany) {
    return errorResponse('Sem permissão para criar agendamentos', 403)
  }

  const { id } = await params

  try {
    // Verificar se o relatório pertence à empresa
    const report = await db.custom_reports.findFirst({
      where: { id, companyId: context!.companyId },
    })

    if (!report) {
      return errorResponse('Relatório não encontrado', 404)
    }

    const body = await request.json()
    const validatedData = createReportScheduleSchema.parse(body)

    const schedule = await reportScheduleService.create({
      ...validatedData,
      reportId: id,
      companyId: context!.companyId,
      createdBy: context!.user.id,
    })

    // Registrar atividade
    await db.activities.create({
      data: {
        companyId: context!.companyId,
        userId: context!.user.id,
        userName: context!.user.name,
        action: 'create',
        entityType: 'report_schedule',
        entityId: schedule.id,
        entityName: schedule.name,
        details: `Agendamento "${schedule.name}" criado para relatório "${report.name}"`,
      },
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Dados inválidos', 400, error.issues.reduce((acc, err) => {
        acc[err.path.join('.')] = [err.message]
        return acc
      }, {} as Record<string, string[]>))
    }
    console.error('Erro ao criar agendamento:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}
