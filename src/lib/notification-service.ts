// =============================================================================
// ConstrutorPro - Notification Service
// Serviço para criar e gerenciar notificações com persistência e realtime
// =============================================================================

import { db } from '@/lib/db';
import { emitNotificationEvent } from '@/lib/realtime';
import { emailService } from '@/lib/email';
import {
  notificationPreferencesService,
  notificationQueueService,
  notificationHistoryService,
  type NotificationType as PrefNotificationType,
  type NotificationCategory,
} from '@/lib/notification-preferences';

// Tipos de notificação
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// Mapeamento de tipos de notificação para categorias de preferência
const NOTIFICATION_TYPE_TO_CATEGORY: Record<string, PrefNotificationType> = {
  project: 'project',
  budget: 'financial',
  transaction: 'financial',
  material: 'stock',
  task: 'schedule',
  schedule: 'schedule',
  daily_log: 'daily_log',
  system: 'system',
  security: 'system',
};

// Interface para notificação
export interface CreateNotificationParams {
  companyId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  userId?: string; // Para notificações privadas
}

// Interface de notificação retornada
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: Date;
}

/**
 * Cria uma nova notificação com persistência e evento realtime
 */
export async function createNotification(params: CreateNotificationParams): Promise<Notification> {
  const { companyId, type, title, message, entityType, entityId, userId } = params;

  // Salvar no banco de dados
  const alert = await db.alerts.create({
    data: {
      companyId,
      type,
      title,
      message,
      entityType,
      entityId,
      isRead: false,
    },
  });

  const notification: Notification = {
    id: alert.id,
    type: alert.type as NotificationType,
    title: alert.title,
    message: alert.message,
    entityType: alert.entityType,
    entityId: alert.entityId,
    isRead: alert.isRead,
    createdAt: alert.createdAt,
  };

  // Emitir evento de realtime
  emitNotificationEvent.new(companyId, notification, userId);

  return notification;
}

/**
 * Cria múltiplas notificações de uma vez
 */
export async function createNotifications(
  notifications: CreateNotificationParams[]
): Promise<Notification[]> {
  const results: Notification[] = [];

  for (const params of notifications) {
    const notification = await createNotification(params);
    results.push(notification);
  }

  return results;
}

/**
 * Marca uma notificação como lida
 */
export async function markNotificationAsRead(
  notificationId: string,
  companyId: string
): Promise<boolean> {
  const result = await db.alerts.updateMany({
    where: {
      id: notificationId,
      companyId,
    },
    data: {
      isRead: true,
      updatedAt: new Date(),
    },
  });

  // Emitir evento de realtime
  if (result.count > 0) {
    emitNotificationEvent.read(companyId, notificationId);
    return true;
  }

  return false;
}

/**
 * Marca todas as notificações como lidas
 */
export async function markAllNotificationsAsRead(companyId: string): Promise<number> {
  const result = await db.alerts.updateMany({
    where: {
      companyId,
      isRead: false,
    },
    data: {
      isRead: true,
      updatedAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Obtém notificações não lidas
 */
export async function getUnreadNotifications(companyId: string): Promise<Notification[]> {
  const alerts = await db.alerts.findMany({
    where: {
      companyId,
      isRead: false,
    },
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      entityType: true,
      entityId: true,
      isRead: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  });

  return alerts.map((alert) => ({
    id: alert.id,
    type: alert.type as NotificationType,
    title: alert.title,
    message: alert.message,
    entityType: alert.entityType,
    entityId: alert.entityId,
    isRead: alert.isRead,
    createdAt: alert.createdAt,
  }));
}

/**
 * Conta notificações não lidas
 */
export async function getUnreadNotificationCount(companyId: string): Promise<number> {
  return db.alerts.count({
    where: {
      companyId,
      isRead: false,
    },
  });
}

/**
 * Obtém todas as notificações com paginação
 */
export async function getNotifications(
  companyId: string,
  options?: {
    page?: number;
    limit?: number;
    includeRead?: boolean;
  }
): Promise<{ notifications: Notification[]; total: number; unreadCount: number }> {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const includeRead = options?.includeRead ?? true;

  const where = {
    companyId,
    ...(includeRead ? {} : { isRead: false }),
  };

  const [alerts, total, unreadCount] = await Promise.all([
    db.alerts.findMany({
      where,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        entityType: true,
        entityId: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.alerts.count({ where }),
    db.alerts.count({
      where: {
        companyId,
        isRead: false,
      },
    }),
  ]);

  const notifications: Notification[] = alerts.map((alert) => ({
    id: alert.id,
    type: alert.type as NotificationType,
    title: alert.title,
    message: alert.message,
    entityType: alert.entityType,
    entityId: alert.entityId,
    isRead: alert.isRead,
    createdAt: alert.createdAt,
  }));

  return { notifications, total, unreadCount };
}

/**
 * Deleta notificações antigas (mais de 30 dias)
 */
export async function cleanupOldNotifications(): Promise<number> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await db.alerts.deleteMany({
    where: {
      createdAt: {
        lt: thirtyDaysAgo,
      },
      isRead: true,
    },
  });

  return result.count;
}

// =============================================================================
// Helper functions para notificações comuns
// =============================================================================

export const notificationHelpers = {
  projectCreated: (companyId: string, projectId: string, projectName: string, userId?: string) =>
    createNotification({
      companyId,
      type: 'info',
      title: 'Novo Projeto',
      message: `Projeto "${projectName}" foi criado.`,
      entityType: 'project',
      entityId: projectId,
      userId,
    }),

  projectCompleted: (companyId: string, projectId: string, projectName: string) =>
    createNotification({
      companyId,
      type: 'success',
      title: 'Projeto Concluído',
      message: `Projeto "${projectName}" foi marcado como concluído.`,
      entityType: 'project',
      entityId: projectId,
    }),

  budgetApproved: (companyId: string, budgetId: string, budgetName: string) =>
    createNotification({
      companyId,
      type: 'success',
      title: 'Orçamento Aprovado',
      message: `Orçamento "${budgetName}" foi aprovado.`,
      entityType: 'budget',
      entityId: budgetId,
    }),

  budgetRejected: (companyId: string, budgetId: string, budgetName: string) =>
    createNotification({
      companyId,
      type: 'warning',
      title: 'Orçamento Rejeitado',
      message: `Orçamento "${budgetName}" foi rejeitado.`,
      entityType: 'budget',
      entityId: budgetId,
    }),

  paymentOverdue: (companyId: string, transactionId: string, description: string) =>
    createNotification({
      companyId,
      type: 'error',
      title: 'Pagamento Vencido',
      message: `O pagamento "${description}" está vencido.`,
      entityType: 'transaction',
      entityId: transactionId,
    }),

  lowStock: (companyId: string, materialId: string, materialName: string, quantity: number) =>
    createNotification({
      companyId,
      type: 'warning',
      title: 'Estoque Baixo',
      message: `Material "${materialName}" está com estoque baixo (${quantity} unidades).`,
      entityType: 'material',
      entityId: materialId,
    }),

  taskDelayed: (companyId: string, taskId: string, taskName: string) =>
    createNotification({
      companyId,
      type: 'warning',
      title: 'Tarefa Atrasada',
      message: `A tarefa "${taskName}" está atrasada.`,
      entityType: 'task',
      entityId: taskId,
    }),

  deadlineApproaching: (companyId: string, projectId: string, projectName: string, daysLeft: number) =>
    createNotification({
      companyId,
      type: 'warning',
      title: 'Prazo Próximo',
      message: `Projeto "${projectName}" vence em ${daysLeft} dias.`,
      entityType: 'project',
      entityId: projectId,
    }),
};

// =============================================================================
// Advanced Notification with Preferences
// =============================================================================

/**
 * Cria uma notificação avançada respeitando as preferências do usuário
 */
export async function createNotificationWithPreferences(params: {
  companyId: string;
  userId: string;
  userEmail: string;
  userName: string;
  type: NotificationType;
  notificationType: PrefNotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  data?: Record<string, unknown>;
}): Promise<{
  inApp: boolean;
  email: boolean;
  queued: boolean;
}> {
  const {
    companyId,
    userId,
    userEmail,
    userName,
    type,
    notificationType,
    title,
    message,
    entityType,
    entityId,
    data,
  } = params;

  const result = {
    inApp: false,
    email: false,
    queued: false,
  };

  try {
    // Buscar preferências do usuário
    const preferences = await notificationPreferencesService.getByUserId(userId);

    // Verificar se está em quiet hours
    const inQuietHours = preferences
      ? notificationPreferencesService.isInQuietHours(preferences)
      : false;

    // Verificar se a notificação está habilitada para este tipo
    const typeEnabled = preferences
      ? await notificationPreferencesService.isNotificationEnabled(userId, notificationType, 'in_app')
      : true;

    // 1. Notificação in-app (sempre criada se habilitada)
    if (typeEnabled && !inQuietHours) {
      await createNotification({
        companyId,
        type,
        title,
        message,
        entityType,
        entityId,
        userId,
      });
      result.inApp = true;

      // Registrar no histórico
      await notificationHistoryService.record({
        companyId,
        userId,
        type: notificationType,
        category: type as NotificationCategory,
        title,
        message,
        data,
        entityType,
        entityId,
        channel: 'in_app',
        success: true,
      });
    }

    // 2. Enviar email (se habilitado e não em quiet hours)
    if (preferences?.emailEnabled && typeEnabled && !inQuietHours) {
      try {
        await emailService.sendNotification(userEmail, {
          type: type as 'info' | 'success' | 'warning' | 'error',
          title,
          message,
          userName,
          actionUrl: entityType && entityId
            ? `/app/${entityType}s/${entityId}`
            : undefined,
          actionText: entityType ? `Ver ${entityType}` : undefined,
        });
        result.email = true;

        // Registrar no histórico
        await notificationHistoryService.record({
          companyId,
          userId,
          type: notificationType,
          category: type as NotificationCategory,
          title,
          message,
          data,
          entityType,
          entityId,
          channel: 'email',
          success: true,
        });
      } catch (error) {
        console.error('Erro ao enviar email de notificação:', error);

        // Registrar falha
        await notificationHistoryService.record({
          companyId,
          userId,
          type: notificationType,
          category: type as NotificationCategory,
          title,
          message,
          data,
          entityType,
          entityId,
          channel: 'email',
          success: false,
          errorMessage: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    // 3. Adicionar à fila para processamento posterior (se frequência não é instantânea)
    if (preferences && preferences.frequency !== 'instant') {
      await notificationQueueService.queue({
        companyId,
        userId,
        type: notificationType,
        category: type as NotificationCategory,
        title,
        message,
        data,
        entityType,
        entityId,
        channels: preferences.emailEnabled ? ['email'] : ['in_app'],
      });
      result.queued = true;
    }

    return result;
  } catch (error) {
    console.error('Erro ao criar notificação com preferências:', error);
    return result;
  }
}

/**
 * Envia notificação para múltiplos usuários da empresa
 */
export async function broadcastNotificationToCompany(params: {
  companyId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  notificationType?: PrefNotificationType;
  excludeUserId?: string;
}): Promise<{ sent: number; failed: number }> {
  const {
    companyId,
    type,
    title,
    message,
    entityType,
    entityId,
    notificationType = 'system',
    excludeUserId,
  } = params;

  // Buscar todos os usuários ativos da empresa
  const users = await db.users.findMany({
    where: {
      companyId,
      isActive: true,
      id: excludeUserId ? { not: excludeUserId } : undefined,
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  let sent = 0;
  let failed = 0;

  // Enviar para cada usuário
  for (const user of users) {
    try {
      await createNotificationWithPreferences({
        companyId,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        type,
        notificationType,
        title,
        message,
        entityType,
        entityId,
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}
