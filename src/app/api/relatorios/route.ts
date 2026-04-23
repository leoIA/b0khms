import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, errorResponse } from '@/server/auth'
import { db } from '@/lib/db'
import { customReportsService } from '@/lib/services/reports'
import { createCustomReportSchema } from '@/validators/reports'
import { z } from 'zod'

// GET /api/relatorios - Listar relatórios customizados
export async function GET(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult
  const { searchParams } = new URL(request.url)

  try {
    const category = searchParams.get('category') ?? undefined
    const type = searchParams.get('type') ?? undefined
    const dataSource = searchParams.get('dataSource') ?? undefined
    const search = searchParams.get('search') ?? undefined
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')

    const result = await customReportsService.list(context!.companyId, {
      category,
      type,
      dataSource,
      search,
      page,
      limit,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao listar relatórios:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}

// POST /api/relatorios - Criar novo relatório customizado
export async function POST(request: NextRequest) {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status)
  }

  const { context } = authResult

  // Verificar permissão - apenas admin e manager podem criar relatórios
  if (!context?.isCompanyAdmin && !context?.canManageCompany) {
    return errorResponse('Sem permissão para criar relatórios', 403)
  }

  try {
    const body = await request.json()
    const validatedData = createCustomReportSchema.parse(body)

    const report = await customReportsService.create({
      ...validatedData,
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
        entityType: 'report',
        entityId: report.id,
        entityName: report.name,
        details: `Relatório "${report.name}" criado`,
      },
    })

    return NextResponse.json(report, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse('Dados inválidos', 400, error.issues.reduce((acc, err) => {
        acc[err.path.join('.')] = [err.message]
        return acc
      }, {} as Record<string, string[]>))
    }
    console.error('Erro ao criar relatório:', error)
    return errorResponse('Erro interno do servidor', 500)
  }
}
