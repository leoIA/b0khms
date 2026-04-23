import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/server/auth'
import { reportExecutionService } from '@/lib/services/reports'

// POST /api/relatorios/[id]/executar - Executar relatório
export async function POST(
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
    // Execute report
    const result = await reportExecutionService.execute(id, {
      companyId: context!.companyId,
      userId: context!.user.id,
      executionType: 'manual',
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao executar relatório:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Erro interno do servidor',
      500
    )
  }
}
