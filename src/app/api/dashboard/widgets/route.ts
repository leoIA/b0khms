import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/server/auth'
import { db } from '@/lib/db'
import { dashboardWidgetService } from '@/lib/services/reports'
import { createDashboardWidgetSchema } from '@/validators/reports'
import { z } from 'zod'

// =============================================================================
// GET /api/dashboard/widgets - List dashboard widgets
// =============================================================================

export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult

  try {
    const widgets = await dashboardWidgetService.list(
      context!.companyId,
      context!.user.id
    )

    return NextResponse.json({ data: widgets })
  } catch (error) {
    console.error('Erro ao listar widgets:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}

// =============================================================================
// POST /api/dashboard/widgets - Create new widget
// =============================================================================

export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult

  try {
    const body = await request.json()
    const validatedData = createDashboardWidgetSchema.parse(body)

    const widget = await dashboardWidgetService.create({
      ...validatedData,
      companyId: context!.companyId,
      userId: context!.user.id,
    })

    // Register activity
    await db.activities.create({
      data: {
        companyId: context!.companyId,
        userId: context!.user.id,
        userName: context!.user.name,
        action: 'create',
        entityType: 'widget',
        entityId: widget.id,
        entityName: widget.name,
        details: `Widget "${widget.name}" criado`,
      },
    })

    return NextResponse.json(widget, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Dados inválidos', 400, error.issues.reduce((acc, err) => {
        acc[err.path.join('.')] = [err.message]
        return acc
      }, {} as Record<string, string[]>))
    }
    console.error('Erro ao criar widget:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}
