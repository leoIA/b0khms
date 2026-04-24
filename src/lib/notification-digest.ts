// =============================================================================
// ConstrutorPro - Notification Digest Scheduler
// Processa notificações pendentes e envia resumos periódicos
// =============================================================================

import { db } from '@/lib/db';
import { emailService } from '@/lib/email';
import {
  notificationPreferencesService,
  notificationQueueService,
  type NotificationFrequency,
} from '@/lib/notification-preferences';

// =============================================================================
// Types
// =============================================================================

interface DigestData {
  userName: string;
  userEmail: string;
  companyName: string;
  notifications: Array<{
    title: string;
    message: string;
    type: string;
    createdAt: Date;
  }>;
  total: number;
  period: string;
}

// =============================================================================
// Notification Digest Service
// =============================================================================

export const notificationDigestService = {
  // ---------------------------------------------------------------------------
  // Process Pending Notifications
  // ---------------------------------------------------------------------------

  /**
   * Processa todas as notificações pendentes na fila
   */
  async processPendingQueue(): Promise<{
    processed: number;
    sent: number;
    failed: number;
  }> {
    const pending = await notificationQueueService.getPending(100);

    if (pending.length === 0) {
      return { processed: 0, sent: 0, failed: 0 };
    }

    let processed = 0;
    let sent = 0;
    let failed = 0;

    for (const notification of pending) {
      try {
        // Processar notificação
        const success = await this.processQueuedNotification(notification);

        if (success) {
          await notificationQueueService.markSent(notification.id);
          sent++;
        } else {
          await notificationQueueService.markFailed(notification.id, 'Failed to send');
          failed++;
        }

        processed++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await notificationQueueService.markFailed(notification.id, errorMessage);
        failed++;
        processed++;
      }
    }

    return { processed, sent, failed };
  },

  /**
   * Processa uma notificação individual da fila
   */
  async processQueuedNotification(notification: {
    id: string;
    companyId: string;
    userId: string | null;
    type: string;
    category: string;
    title: string;
    message: string;
    data: Record<string, unknown> | null;
    channels: string[];
  }): Promise<boolean> {
    if (!notification.userId) {
      return false;
    }

    // Buscar preferências do usuário
    const preferences = await notificationPreferencesService.getByUserId(notification.userId);

    // Se não tem preferências ou está em quiet hours, pular
    if (!preferences) {
      return false;
    }

    if (preferences.quietHoursEnabled && notificationPreferencesService.isInQuietHours(preferences)) {
      return false;
    }

    // Processar cada canal
    for (const channel of notification.channels) {
      switch (channel) {
        case 'email':
          if (preferences.emailEnabled) {
            await this.sendEmailNotification({
              userId: notification.userId!, // Already checked for null above
              title: notification.title,
              message: notification.message,
              data: notification.data,
            }, preferences);
          }
          break;

        case 'in_app':
          if (preferences.inAppEnabled) {
            // Notificação in-app já foi criada, apenas marcar como enviado
            break;
          }
          break;

        case 'push':
          if (preferences.pushEnabled) {
            // TODO: Implementar push notification
          }
          break;

        case 'sms':
          if (preferences.smsEnabled) {
            // TODO: Implementar SMS notification
          }
          break;
      }
    }

    return true;
  },

  /**
   * Envia notificação por email
   */
  async sendEmailNotification(
    notification: {
      userId: string;
      title: string;
      message: string;
      data: Record<string, unknown> | null;
    },
    preferences: { digestTimezone: string }
  ): Promise<void> {
    // Buscar dados do usuário
    const user = await db.users.findUnique({
      where: { id: notification.userId },
      select: { email: true, name: true, companyId: true },
    });

    if (!user || !user.companyId) {
      return;
    }

    // Buscar dados da empresa
    const company = await db.companies.findUnique({
      where: { id: user.companyId },
      select: { name: true },
    });

    await emailService.sendNotification(user.email, {
      type: 'info',
      title: notification.title,
      message: notification.message,
      userName: user.name || 'Usuário',
    });
  },

  // ---------------------------------------------------------------------------
  // Digest Processing
  // ---------------------------------------------------------------------------

  /**
   * Envia digest diário para todos os usuários que configuraram
   */
  async sendDailyDigests(): Promise<{
    sent: number;
    failed: number;
  }> {
    // Buscar usuários com digest diário
    const usersWithDailyDigest = await db.notification_preferences.findMany({
      where: {
        frequency: 'daily',
        emailEnabled: true,
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            companyId: true,
          },
        },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const pref of usersWithDailyDigest) {
      if (!pref.users.companyId) continue;

      try {
        await this.sendDigestToUser(pref.users.id, 'daily');
        sent++;
      } catch (error) {
        console.error(`[Digest] Failed to send daily digest to user ${pref.users.id}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  },

  /**
   * Envia digest semanal para todos os usuários que configuraram
   */
  async sendWeeklyDigests(): Promise<{
    sent: number;
    failed: number;
  }> {
    // Buscar usuários com digest semanal
    const usersWithWeeklyDigest = await db.notification_preferences.findMany({
      where: {
        frequency: 'weekly',
        emailEnabled: true,
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            name: true,
            companyId: true,
          },
        },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const pref of usersWithWeeklyDigest) {
      if (!pref.users.companyId) continue;

      try {
        await this.sendDigestToUser(pref.users.id, 'weekly');
        sent++;
      } catch (error) {
        console.error(`[Digest] Failed to send weekly digest to user ${pref.users.id}:`, error);
        failed++;
      }
    }

    return { sent, failed };
  },

  /**
   * Envia digest para um usuário específico
   */
  async sendDigestToUser(
    userId: string,
    frequency: NotificationFrequency
  ): Promise<boolean> {
    // Buscar dados do usuário
    const user = await db.users.findUnique({
      where: { id: userId },
      select: {
        email: true,
        name: true,
        companyId: true,
        notification_preferences: true,
      },
    });

    if (!user || !user.companyId) {
      return false;
    }

    // Calcular período
    const now = new Date();
    let periodStart: Date;

    switch (frequency) {
      case 'hourly':
        periodStart = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'daily':
        periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        return false;
    }

    // Buscar notificações do período
    const notifications = await db.notification_history.findMany({
      where: {
        userId,
        sentAt: {
          gte: periodStart,
        },
      },
      orderBy: { sentAt: 'desc' },
      take: 50,
    });

    if (notifications.length === 0) {
      return false; // Não enviar digest vazio
    }

    // Buscar dados da empresa
    const company = await db.companies.findUnique({
      where: { id: user.companyId },
      select: { name: true },
    });

    // Formatar período para exibição
    const periodFormatter = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const period = `${periodFormatter.format(periodStart)} a ${periodFormatter.format(now)}`;

    // Enviar email de digest
    await emailService.sendNotification(user.email, {
      type: 'info',
      title: `Resumo de Notificações (${frequency === 'daily' ? 'Diário' : 'Semanal'})`,
      message: `Você tem ${notifications.length} notificação(ões) no período de ${period}.`,
      userName: user.name || 'Usuário',
      actionUrl: '/notificacoes',
      actionText: 'Ver todas as notificações',
    });

    return true;
  },

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /**
   * Limpa notificações antigas
   */
  async cleanupOldData(): Promise<{
    queueCleaned: number;
    historyCleaned: number;
  }> {
    // Limpar fila antiga
    const queueCleaned = await notificationQueueService.cleanup();

    // Limpar histórico antigo (mais de 90 dias)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const historyResult = await db.notification_history.deleteMany({
      where: {
        sentAt: {
          lt: ninetyDaysAgo,
        },
        readAt: { not: null }, // Apenas as que foram lidas
      },
    });

    return {
      queueCleaned,
      historyCleaned: historyResult.count,
    };
  },
};

// =============================================================================
// Scheduler Configuration
// =============================================================================

export const DIGEST_SCHEDULE = {
  hourly: { minute: 0 }, // No início de cada hora
  daily: { hour: 9, minute: 0 }, // 09:00
  weekly: { dayOfWeek: 1, hour: 9, minute: 0 }, // Segunda-feira 09:00
  cleanup: { hour: 3, minute: 0 }, // 03:00 (madrugada)
};
