// =============================================================================
// ConstrutorPro - Finance Dashboard API
// =============================================================================

import { requireAuth, successResponse, errorResponse } from '@/server/auth';
import { db } from '@/lib/db';

export async function GET() {
  const authResult = await requireAuth();
  if (!authResult.success) {
    return errorResponse(authResult.error!, authResult.status);
  }

  const { context } = authResult;

  // Get current month boundaries
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Aggregate data
  const [incomeResult, expensesResult, pendingIncome, pendingExpenses] = await Promise.all([
    db.transactions.aggregate({
      where: {
        companyId: context!.companyId,
        type: 'income',
        status: 'paid',
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { value: true },
    }),
    db.transactions.aggregate({
      where: {
        companyId: context!.companyId,
        type: 'expense',
        status: 'paid',
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      _sum: { value: true },
    }),
    db.transactions.aggregate({
      where: {
        companyId: context!.companyId,
        type: 'income',
        status: { in: ['pending', 'partial'] },
      },
      _sum: { value: true },
    }),
    db.transactions.aggregate({
      where: {
        companyId: context!.companyId,
        type: 'expense',
        status: { in: ['pending', 'partial'] },
      },
      _sum: { value: true },
    }),
  ]);

  const totalIncome = Number(incomeResult._sum.value || 0);
  const totalExpenses = Number(expensesResult._sum.value || 0);

  return successResponse({
    totalIncome,
    totalExpenses,
    balance: totalIncome - totalExpenses,
    pendingIncome: Number(pendingIncome._sum.value || 0),
    pendingExpenses: Number(pendingExpenses._sum.value || 0),
  });
}
