// =============================================================================
// ConstrutorPro - Single Alert API
// DELETE - Delete a single alert
// =============================================================================

import { requireAuth, errorResponse, successResponse } from '@/server/auth';
import { db } from '@/lib/db';

// -----------------------------------------------------------------------------
// DELETE - Delete Alert
// -----------------------------------------------------------------------------
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin } = authResult.context!;
  const { id } = await params;

  try {
    // Find the alert and validate ownership
    const alert = await db.alerts.findUnique({
      where: { id },
      select: { companyId: true },
    });

    if (!alert) {
      return errorResponse('Alerta não encontrado', 404);
    }

    // Validate ownership (master admin can delete any alert)
    if (!isMasterAdmin && alert.companyId !== companyId) {
      return errorResponse('Alerta não encontrado', 404);
    }

    // Delete the alert
    await db.alerts.delete({
      where: { id },
    });

    return successResponse(null, 'Alerta excluído com sucesso');
  } catch (error) {
    console.error('Erro ao excluir alerta:', error);
    return errorResponse('Erro ao excluir alerta', 500);
  }
}

// -----------------------------------------------------------------------------
// GET - Get single alert details
// -----------------------------------------------------------------------------
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { companyId, isMasterAdmin } = authResult.context!;
  const { id } = await params;

  try {
    const alert = await db.alerts.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        entityType: true,
        entityId: true,
        isRead: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!alert) {
      return errorResponse('Alerta não encontrado', 404);
    }

    // Validate ownership (master admin can view any alert)
    // We need to fetch companyId separately
    const alertWithCompany = await db.alerts.findUnique({
      where: { id },
      select: { companyId: true },
    });

    if (!isMasterAdmin && alertWithCompany?.companyId !== companyId) {
      return errorResponse('Alerta não encontrado', 404);
    }

    return successResponse(alert);
  } catch (error) {
    console.error('Erro ao carregar alerta:', error);
    return errorResponse('Erro ao carregar alerta', 500);
  }
}
