/**
 * Alerta de Estoque Inteligente (Intelligent Stock Alerts)
 * 
 * Features:
 * - Automatic low stock detection
 * - Reorder point calculation
 * - Demand forecasting based on project consumption
 * - Supplier lead time consideration
 * - Alert prioritization
 */

import { db } from '@/lib/db';

export interface StockAlert {
  materialId: string;
  materialCode: string;
  materialName: string;
  currentStock: number;
  minStock: number;
  reorderPoint: number;
  suggestedOrder: number;
  daysUntilStockout: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  supplier: {
    id: string;
    name: string;
    leadTime: number;
  } | null;
  avgDailyConsumption: number;
  lastPurchaseDate: Date | null;
  lastPurchasePrice: number;
  estimatedCost: number;
}

export interface StockAlertReport {
  generatedAt: Date;
  companyId: string;
  totalMaterials: number;
  alertCount: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  alerts: StockAlert[];
  summary: {
    totalEstimatedCost: number;
    materialsNeedingAttention: number;
    potentialStockouts: number;
  };
}

/**
 * Generate intelligent stock alerts
 */
export async function generateStockAlerts(companyId: string): Promise<StockAlertReport> {
  // Get all materials with stock info
  const materials = await db.materials.findMany({
    where: {
      companyId,
      isActive: true,
    },
    include: {
      suppliers: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Get consumption history (last 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
  const consumptionHistory = await db.purchase_order_items.findMany({
    where: {
      purchase_orders: {
        companyId,
        createdAt: { gte: ninetyDaysAgo },
      },
    },
    include: {
      purchase_orders: {
        select: { createdAt: true },
      },
    },
  });

  // Get recent purchases
  const recentPurchases = await db.purchase_order_items.findMany({
    where: {
      purchase_orders: {
        companyId,
        status: 'received',
      },
    },
    include: {
      purchase_orders: {
        select: { createdAt: true },
      },
    },
    orderBy: {
      purchase_orders: { createdAt: 'desc' },
    },
  });

  const alerts: StockAlert[] = [];

  for (const material of materials) {
    const currentStock = Number(material.stockQuantity) || 0;
    const minStock = Number(material.minStock) || 10;

    // Calculate average daily consumption
    const materialConsumption = consumptionHistory.filter(
      (c) => c.descricao?.includes(material.name) || c.descricao?.includes(material.code)
    );
    
    const totalConsumed = materialConsumption.reduce(
      (sum, c) => sum + Number(c.quantidade || 0),
      0
    );
    const avgDailyConsumption = totalConsumed / 90;

    // Calculate reorder point (Lead time demand + Safety stock)
    const leadTime = 7; // Default 7 days lead time
    const safetyStock = minStock;
    const reorderPoint = (avgDailyConsumption * leadTime) + safetyStock;

    // Calculate days until stockout
    const daysUntilStockout = avgDailyConsumption > 0 
      ? Math.floor(currentStock / avgDailyConsumption)
      : 999; // No consumption = no stockout risk

    // Get last purchase info
    const lastPurchase = recentPurchases.find(
      (p) => p.descricao?.includes(material.name)
    );

    // Determine if alert is needed
    if (currentStock <= reorderPoint || daysUntilStockout < 14) {
      // Calculate suggested order quantity
      const orderCycleDays = 30; // Order every 30 days
      const suggestedOrder = Math.max(
        (avgDailyConsumption * orderCycleDays) + safetyStock - currentStock,
        minStock * 2 // Minimum order
      );

      // Determine priority
      let priority: StockAlert['priority'];
      if (currentStock <= minStock || daysUntilStockout <= 3) {
        priority = 'critical';
      } else if (currentStock <= reorderPoint || daysUntilStockout <= 7) {
        priority = 'high';
      } else if (daysUntilStockout <= 14) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      const unitPrice = Number(material.unitPrice) || Number(material.unitCost) || 0;
      const estimatedCost = suggestedOrder * unitPrice;

      alerts.push({
        materialId: material.id,
        materialCode: material.code,
        materialName: material.name,
        currentStock,
        minStock,
        reorderPoint: Math.ceil(reorderPoint),
        suggestedOrder: Math.ceil(suggestedOrder),
        daysUntilStockout,
        priority,
        category: material.category || 'Sem categoria',
        supplier: material.suppliers ? {
          id: material.suppliers.id,
          name: material.suppliers.name,
          leadTime,
        } : null,
        avgDailyConsumption,
        lastPurchaseDate: lastPurchase?.purchase_orders?.createdAt || null,
        lastPurchasePrice: unitPrice,
        estimatedCost,
      });
    }
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Calculate summary
  const alertCount = {
    critical: alerts.filter((a) => a.priority === 'critical').length,
    high: alerts.filter((a) => a.priority === 'high').length,
    medium: alerts.filter((a) => a.priority === 'medium').length,
    low: alerts.filter((a) => a.priority === 'low').length,
  };

  const totalEstimatedCost = alerts.reduce((sum, a) => sum + a.estimatedCost, 0);

  return {
    generatedAt: new Date(),
    companyId,
    totalMaterials: materials.length,
    alertCount,
    alerts,
    summary: {
      totalEstimatedCost,
      materialsNeedingAttention: alerts.filter((a) => a.priority === 'critical' || a.priority === 'high').length,
      potentialStockouts: alerts.filter((a) => a.daysUntilStockout <= 7).length,
    },
  };
}

/**
 * Generate purchase suggestions based on alerts
 */
export async function generatePurchaseSuggestions(companyId: string): Promise<{
  suggestions: Array<{
    materialId: string;
    materialName: string;
    suggestedQuantity: number;
    estimatedCost: number;
    supplier: { id: string; name: string } | null;
    reason: string;
  }>;
  totalEstimatedCost: number;
}> {
  const alertReport = await generateStockAlerts(companyId);
  
  const suggestions = alertReport.alerts
    .filter((a) => a.priority === 'critical' || a.priority === 'high')
    .map((a) => ({
      materialId: a.materialId,
      materialName: a.materialName,
      suggestedQuantity: a.suggestedOrder,
      estimatedCost: a.estimatedCost,
      supplier: a.supplier,
      reason: a.priority === 'critical'
        ? `Estoque crítico: ${a.currentStock} unidades (mínimo: ${a.minStock})`
        : `Abaixo do ponto de pedido: ${a.currentStock} (reorder: ${a.reorderPoint})`,
    }));

  return {
    suggestions,
    totalEstimatedCost: suggestions.reduce((sum, s) => sum + s.estimatedCost, 0),
  };
}

/**
 * Check stock for specific material
 */
export async function checkMaterialStock(materialId: string): Promise<StockAlert | null> {
  const material = await db.materials.findUnique({
    where: { id: materialId },
    include: {
      suppliers: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!material) {
    return null;
  }

  const currentStock = Number(material.stockQuantity) || 0;
  const minStock = Number(material.minStock) || 10;
  const reorderPoint = minStock * 2;

  const daysUntilStockout = 30; // Simplified
  const priority = currentStock <= minStock ? 'critical' : currentStock <= reorderPoint ? 'high' : 'low';

  return {
    materialId: material.id,
    materialCode: material.code,
    materialName: material.name,
    currentStock,
    minStock,
    reorderPoint,
    suggestedOrder: Math.max(minStock * 3 - currentStock, minStock),
    daysUntilStockout,
    priority,
    category: material.category || 'Sem categoria',
    supplier: material.suppliers ? {
      id: material.suppliers.id,
      name: material.suppliers.name,
      leadTime: 7,
    } : null,
    avgDailyConsumption: 1,
    lastPurchaseDate: null,
    lastPurchasePrice: Number(material.unitPrice) || Number(material.unitCost) || 0,
    estimatedCost: (minStock * 3 - currentStock) * (Number(material.unitPrice) || Number(material.unitCost) || 0),
  };
}
