// =============================================================================
// ConstrutorPro - Bulk Delete Alerts API
// POST - Delete multiple alerts at once
// =============================================================================

import { requireAuth, errorResponse, successResponse } from '@/server/auth';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// -----------------------------------------------------------------------------
// POST - Bulk Delete Alerts
// -----------------------------------------------------------------------------
export async function POST(request: Request) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin } = authResult.context!;

  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse('Lista de IDs é obrigatória', 400);
    }

    // Limit bulk delete to 100 items at once
    if (ids.length > 100) {
      return errorResponse('Máximo de 100 alertas pode ser excluído por vez', 400);
    }

    // Build where clause with ownership validation
    const where: Prisma.alertsWhereInput = {
      id: { in: ids },
    };

    // Non-master admin can only delete their company's alerts
    if (!isMasterAdmin) {
      where.companyId = companyId;
    }

    // Delete the alerts
    const result = await db.alerts.deleteMany({
      where,
    });

    if (result.count === 0) {
      return errorResponse('Nenhum alerta foi encontrado para exclusão', 404);
    }

    return successResponse(
      { deletedCount: result.count },
      `${result.count} alerta(s) excluído(s) com sucesso`
    );
  } catch (error) {
    console.error('Erro ao excluir alertas:', error);
    return errorResponse('Erro ao excluir alertas', 500);
  }
}
