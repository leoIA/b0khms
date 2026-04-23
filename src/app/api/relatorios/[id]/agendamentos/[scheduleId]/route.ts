import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/server/auth'
import { db } from '@/lib/db'
import { reportScheduleService } from '@/lib/services/reports'
import { updateReportScheduleSchema } from '@/validators/reports'
import { z } from 'zod'

// GET /api/relatorios/[id]/agendamentos/[scheduleId] - Obter agendamento
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult
  const { id, scheduleId } = await params

  try {
    // Verificar se o relatório pertence à empresa
    const report = await db.custom_reports.findFirst({
      where: { id, companyId: context!.companyId },
    })

    if (!report) {
      return errorResponse('Relatório não encontrado', 404)
    }

    const schedule = await db.report_schedules.findFirst({
      where: { id: scheduleId, reportId: id, companyId: context!.companyId },
      include: {
        custom_reports: { select: { id: true, name: true } },
      },
    })

    if (!schedule) {
      return errorResponse('Agendamento não encontrado', 404)
    }

    return NextResponse.json({
      ...schedule,
      recipients: JSON.parse(schedule.recipients),
      daysOfWeek: schedule.daysOfWeek ? JSON.parse(schedule.daysOfWeek) : null,
      filters: schedule.filters ? JSON.parse(schedule.filters) : null,
    })
  } catch (error) {
    console.error('Erro ao buscar agendamento:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}

// PUT /api/relatorios/[id]/agendamentos/[scheduleId] - Atualizar agendamento
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult

  // Verificar permissão - apenas admin e manager podem editar
  if (!context?.isCompanyAdmin && !context?.canManageCompany) {
    return errorResponse('Sem permissão para editar agendamentos', 403)
  }

  const { id, scheduleId } = await params

  try {
    // Verificar se o relatório pertence à empresa
    const report = await db.custom_reports.findFirst({
      where: { id, companyId: context!.companyId },
    })

    if (!report) {
      return errorResponse('Relatório não encontrado', 404)
    }

    const body = await request.json()
    const validatedData = updateReportScheduleSchema.parse(body)

    const schedule = await reportScheduleService.update(
      scheduleId,
      context!.companyId,
      validatedData
    )

    // Registrar atividade
    await db.activities.create({
      data: {
        companyId: context!.companyId,
        userId: context!.user.id,
        userName: context!.user.name,
        action: 'update',
        entityType: 'report_schedule',
        entityId: scheduleId,
        entityName: schedule.name,
        details: `Agendamento "${schedule.name}" atualizado`,
      },
    })

    return NextResponse.json(schedule)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Dados inválidos', 400, error.issues.reduce((acc, err) => {
        acc[err.path.join('.')] = [err.message]
        return acc
      }, {} as Record<string, string[]>))
    }
    console.error('Erro ao atualizar agendamento:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}

// DELETE /api/relatorios/[id]/agendamentos/[scheduleId] - Excluir agendamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; scheduleId: string }> }
) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult

  // Verificar permissão - apenas admin pode excluir
  if (!context?.isCompanyAdmin) {
    return errorResponse('Sem permissão para excluir agendamentos', 403)
  }

  const { id, scheduleId } = await params

  try {
    // Verificar se o relatório pertence à empresa
    const report = await db.custom_reports.findFirst({
      where: { id, companyId: context!.companyId },
    })

    if (!report) {
      return errorResponse('Relatório não encontrado', 404)
    }

    // Buscar agendamento para registrar atividade
    const schedule = await db.report_schedules.findFirst({
      where: { id: scheduleId, reportId: id, companyId: context!.companyId },
    })

    if (!schedule) {
      return errorResponse('Agendamento não encontrado', 404)
    }

    await reportScheduleService.delete(scheduleId, context!.companyId)

    // Registrar atividade
    await db.activities.create({
      data: {
        companyId: context!.companyId,
        userId: context!.user.id,
        userName: context!.user.name,
        action: 'delete',
        entityType: 'report_schedule',
        entityId: scheduleId,
        entityName: schedule.name,
        details: `Agendamento "${schedule.name}" excluído`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir agendamento:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}
