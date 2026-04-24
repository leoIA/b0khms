import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/server/auth'
import { db } from '@/lib/db'
import { customReportsService } from '@/lib/services/reports'
import { updateCustomReportSchema } from '@/validators/reports'
import { z } from 'zod'

// GET /api/relatorios/[id] - Obter relatório por ID
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
    const report = await customReportsService.getById(id, context!.companyId)

    if (!report) {
      return errorResponse('Relatório não encontrado', 404)
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Erro ao buscar relatório:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}

// PUT /api/relatorios/[id] - Atualizar relatório
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult

  // Verificar permissão - apenas admin e manager podem editar
  if (!context?.isCompanyAdmin && !context?.canManageCompany) {
    return errorResponse('Sem permissão para editar relatórios', 403)
  }

  const { id } = await params

  try {
    const body = await request.json()
    const validatedData = updateCustomReportSchema.parse(body)

    const report = await customReportsService.update(id, context!.companyId, validatedData)

    // Registrar atividade
    await db.activities.create({
      data: {
        companyId: context!.companyId,
        userId: context!.user.id,
        userName: context!.user.name,
        action: 'update',
        entityType: 'report',
        entityId: report.id,
        entityName: report.name,
        details: `Relatório "${report.name}" atualizado`,
      },
    })

    return NextResponse.json(report)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Dados inválidos', 400, error.issues.reduce((acc, err) => {
        acc[err.path.join('.')] = [err.message]
        return acc
      }, {} as Record<string, string[]>))
    }
    console.error('Erro ao atualizar relatório:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}

// DELETE /api/relatorios/[id] - Excluir relatório
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult

  // Verificar permissão - apenas admin pode excluir
  if (!context?.isCompanyAdmin) {
    return errorResponse('Sem permissão para excluir relatórios', 403)
  }

  const { id } = await params

  try {
    // Buscar relatório para registrar atividade
    const report = await customReportsService.getById(id, context!.companyId)

    if (!report) {
      return errorResponse('Relatório não encontrado', 404)
    }

    await customReportsService.delete(id, context!.companyId)

    // Registrar atividade
    await db.activities.create({
      data: {
        companyId: context!.companyId,
        userId: context!.user.id,
        userName: context!.user.name,
        action: 'delete',
        entityType: 'report',
        entityId: id,
        entityName: report.name,
        details: `Relatório "${report.name}" excluído`,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir relatório:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}
