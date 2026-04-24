import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/server/auth'
import { dashboardWidgetService } from '@/lib/services/reports'

interface RouteParams {
  params: Promise<{ id: string }>
}

// =============================================================================
// POST /api/dashboard/widgets/[id]/refresh - Refresh widget data
// =============================================================================

export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult
  const { id } = await params

  try {
    const result = await dashboardWidgetService.refresh(id, context!.companyId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao atualizar widget:', error)
    
    if (error instanceof Error && error.message === 'Widget não encontrado') {
      return errorResponse('Widget não encontrado', 404)
    }
    
    return errorResponse('Erro interno do servidor', 500)
  }
}
