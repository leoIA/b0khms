import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/server/auth'
import { db } from '@/lib/db'
import { dashboardWidgetService, reportExecutionService } from '@/lib/services/reports'
import { updateDashboardWidgetSchema } from '@/validators/reports'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

// =============================================================================
// GET /api/dashboard/widgets/[id] - Get widget details with data
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult
  const { id } = await params

  try {
    // Get widget
    const widget = await db.dashboard_widgets.findFirst({
      where: { id, companyId: context!.companyId },
    })

    if (!widget) {
      return errorResponse('Widget não encontrado', 404)
    }

    // Parse widget data
    const parsedWidget = {
      ...widget,
      queryConfig: JSON.parse(widget.queryConfig),
      displayConfig: widget.displayConfig ? JSON.parse(widget.displayConfig) : null,
      position: JSON.parse(widget.position),
    }

    // Get widget data
    const data = await reportExecutionService.executeQuery(
      widget.dataSource as 'projects' | 'budgets' | 'transactions' | 'daily_logs' | 'clients' | 'suppliers' | 'materials',
      parsedWidget.queryConfig,
      context!.companyId
    )

    return NextResponse.json({
      widget: parsedWidget,
      data,
    })
  } catch (error) {
    console.error('Erro ao buscar widget:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}

// =============================================================================
// PUT /api/dashboard/widgets/[id] - Update widget
// =============================================================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult
  const { id } = await params

  try {
    const body = await request.json()
    const validatedData = updateDashboardWidgetSchema.parse(body)

    const widget = await dashboardWidgetService.update(
      id,
      context!.companyId,
      validatedData
    )

    return NextResponse.json(widget)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Dados inválidos', 400, error.issues.reduce((acc, err) => {
        acc[err.path.join('.')] = [err.message]
        return acc
      }, {} as Record<string, string[]>))
    }
    console.error('Erro ao atualizar widget:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}

// =============================================================================
// DELETE /api/dashboard/widgets/[id] - Delete widget
// =============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult
  const { id } = await params

  try {
    await dashboardWidgetService.delete(id, context!.companyId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao excluir widget:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}
