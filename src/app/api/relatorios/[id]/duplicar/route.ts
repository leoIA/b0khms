import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/server/auth'
import { db } from '@/lib/db'
import { customReportsService } from '@/lib/services/reports'

// POST /api/relatorios/[id]/duplicar - Duplicar relatório
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult

  // Verificar permissão - apenas admin e manager podem duplicar
  if (!context?.isCompanyAdmin && !context?.canManageCompany) {
    return errorResponse('Sem permissão para duplicar relatórios', 403)
  }

  const { id } = await params

  try {
    const report = await customReportsService.duplicate(
      id,
      context!.companyId,
      context!.user.id
    )

    // Registrar atividade
    await db.activities.create({
      data: {
        companyId: context!.companyId,
        userId: context!.user.id,
        userName: context!.user.name,
        action: 'create',
        entityType: 'report',
        entityId: report.id,
        entityName: report.name,
        details: `Relatório "${report.name}" criado por duplicação`,
      },
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    console.error('Erro ao duplicar relatório:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Erro interno do servidor',
      500
    )
  }
}
