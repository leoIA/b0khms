// =============================================================================
// ConstrutorPro - Serviço de Preferências de Notificação
// =============================================================================

import { db } from '@/lib/db';
import { auditLogger } from '@/lib/audit-logger';

// =============================================================================
// Types
// =============================================================================

export type NotificationChannel = 'email' | 'push' | 'in_app' | 'sms';
export type NotificationFrequency = 'instant' | 'hourly' | 'daily' | 'weekly';
export type NotificationType = 
  | 'project' 
  | 'financial' 
  | 'schedule' 
  | 'stock' 
  | 'system' 
  | 'daily_log';
export type NotificationCategory = 'info' | 'success' | 'warning' | 'error';

export interface NotificationPreferences {
  id: string;
  userId: string;
  companyId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
  frequency: NotificationFrequency;
  projectNotifications: boolean;
  financialNotifications: boolean;
  scheduleNotifications: boolean;
  stockNotifications: boolean;
  systemNotifications: boolean;
  dailyLogNotifications: boolean;
  digestTime: string;
  digestTimezone: string;
  digestDays: number[];
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNotificationPreferencesInput {
  userId: string;
  companyId: string;
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  smsEnabled?: boolean;
  frequency?: NotificationFrequency;
  projectNotifications?: boolean;
  financialNotifications?: boolean;
  scheduleNotifications?: boolean;
  stockNotifications?: boolean;
  systemNotifications?: boolean;
  dailyLogNotifications?: boolean;
  digestTime?: string;
  digestTimezone?: string;
  digestDays?: number[];
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface UpdateNotificationPreferencesInput {
  emailEnabled?: boolean;
  pushEnabled?: boolean;
  inAppEnabled?: boolean;
  smsEnabled?: boolean;
  frequency?: NotificationFrequency;
  projectNotifications?: boolean;
  financialNotifications?: boolean;
  scheduleNotifications?: boolean;
  stockNotifications?: boolean;
  systemNotifications?: boolean;
  dailyLogNotifications?: boolean;
  digestTime?: string;
  digestTimezone?: string;
  digestDays?: number[];
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface QueuedNotification {
  id: string;
  companyId: string;
  userId: string | null;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  entityType: string | null;
  entityId: string | null;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  channels: NotificationChannel[];
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  scheduledFor: Date | null;
  sentAt: Date | null;
  createdAt: Date;
}

export interface CreateNotificationInput {
  companyId: string;
  userId?: string;
  type: NotificationType;
  category?: NotificationCategory;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  channels?: NotificationChannel[];
  scheduledFor?: Date;
}

// =============================================================================
// Default Preferences
// =============================================================================

const DEFAULT_PREFERENCES: Omit<CreateNotificationPreferencesInput, 'userId' | 'companyId'> = {
  emailEnabled: true,
  pushEnabled: false,
  inAppEnabled: true,
  smsEnabled: false,
  frequency: 'instant',
  projectNotifications: true,
  financialNotifications: true,
  scheduleNotifications: true,
  stockNotifications: true,
  systemNotifications: true,
  dailyLogNotifications: true,
  digestTime: '09:00',
  digestTimezone: 'America/Sao_Paulo',
  digestDays: [1, 2, 3, 4, 5], // Seg-Sex
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
};

// =============================================================================
// Notification Preferences Service
// =============================================================================

export const notificationPreferencesService = {
  // ---------------------------------------------------------------------------
  // Get or Create Preferences
  // ---------------------------------------------------------------------------

  /**
   * Busca as preferências de notificação do usuário.
   * Se não existirem, cria com valores padrão.
   */
  async getOrCreate(userId: string, companyId: string): Promise<NotificationPreferences> {
    let preferences = await db.notification_preferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await db.notification_preferences.create({
        data: {
          userId,
          companyId,
          ...DEFAULT_PREFERENCES,
          digestDays: JSON.stringify(DEFAULT_PREFERENCES.digestDays),
        },
      });

      // Log de criação (removido temporariamente)
    }

    return {
      ...preferences,
      frequency: preferences.frequency as NotificationFrequency,
      digestDays: JSON.parse(preferences.digestDays || '[]'),
    };
  },

  /**
   * Busca as preferências de notificação do usuário.
   */
  async getByUserId(userId: string): Promise<NotificationPreferences | null> {
    const preferences = await db.notification_preferences.findUnique({
      where: { userId },
    });

    if (!preferences) return null;

    return {
      ...preferences,
      frequency: preferences.frequency as NotificationFrequency,
      digestDays: JSON.parse(preferences.digestDays || '[]'),
    };
  },

  // ---------------------------------------------------------------------------
  // Update Preferences
  // ---------------------------------------------------------------------------

  /**
   * Atualiza as preferências de notificação do usuário.
   */
  async update(
    userId: string,
    data: UpdateNotificationPreferencesInput
  ): Promise<NotificationPreferences> {
    const updateData: Record<string, unknown> = { ...data };

    // Converter digestDays para JSON string
    if (data.digestDays) {
      updateData.digestDays = JSON.stringify(data.digestDays);
    }

    const preferences = await db.notification_preferences.update({
      where: { userId },
      data: updateData,
    });

    // Log de atualização (removido temporariamente)

    return {
      ...preferences,
      frequency: preferences.frequency as NotificationFrequency,
      digestDays: JSON.parse(preferences.digestDays || '[]'),
    };
  },

  // ---------------------------------------------------------------------------
  // Check Notification Enabled
  // ---------------------------------------------------------------------------

  /**
   * Verifica se um tipo de notificação está habilitado para o usuário.
   */
  async isNotificationEnabled(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel
  ): Promise<boolean> {
    const preferences = await this.getByUserId(userId);

    if (!preferences) return true; // Default: habilitado

    // Verificar canal
    const channelMap: Record<NotificationChannel, boolean> = {
      email: preferences.emailEnabled,
      push: preferences.pushEnabled,
      in_app: preferences.inAppEnabled,
      sms: preferences.smsEnabled,
    };

    if (!channelMap[channel]) return false;

    // Verificar tipo
    const typeMap: Record<NotificationType, boolean> = {
      project: preferences.projectNotifications,
      financial: preferences.financialNotifications,
      schedule: preferences.scheduleNotifications,
      stock: preferences.stockNotifications,
      system: preferences.systemNotifications,
      daily_log: preferences.dailyLogNotifications,
    };

    return typeMap[type] ?? true;
  },

  /**
   * Verifica se está no período de "quiet hours" para o usuário.
   */
  isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHoursEnabled) return false;

    const now = new Date();
    const timezone = preferences.digestTimezone || 'America/Sao_Paulo';
    
    // Obter hora atual no timezone do usuário
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const currentTimeStr = formatter.format(now);
    const [currentHour, currentMinute] = currentTimeStr.split(':').map(Number);
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // Parse quiet hours
    const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
    const startTimeMinutes = startHour * 60 + startMinute;
    const endTimeMinutes = endHour * 60 + endMinute;

    // Verificar se está no período (considerando cruzamento de meia-noite)
    if (startTimeMinutes > endTimeMinutes) {
      // Período cruza meia-noite (ex: 22:00 - 07:00)
      return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes < endTimeMinutes;
    } else {
      // Período normal (ex: 12:00 - 14:00)
      return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
    }
  },

  // ---------------------------------------------------------------------------
  // Bulk Operations
  // ---------------------------------------------------------------------------

  /**
   * Reseta as preferências para os valores padrão.
   */
  async reset(userId: string): Promise<NotificationPreferences> {
    const preferences = await db.notification_preferences.update({
      where: { userId },
      data: {
        ...DEFAULT_PREFERENCES,
        digestDays: JSON.stringify(DEFAULT_PREFERENCES.digestDays),
      },
    });

    // Log removido temporariamente

    return {
      ...preferences,
      frequency: preferences.frequency as NotificationFrequency,
      digestDays: JSON.parse(preferences.digestDays || '[]'),
    };
  },

  /**
   * Habilita/desabilita todas as notificações.
   */
  async setAllEnabled(
    userId: string,
    enabled: boolean
  ): Promise<NotificationPreferences> {
    return this.update(userId, {
      emailEnabled: enabled,
      pushEnabled: enabled,
      inAppEnabled: enabled,
      smsEnabled: enabled,
      projectNotifications: enabled,
      financialNotifications: enabled,
      scheduleNotifications: enabled,
      stockNotifications: enabled,
      systemNotifications: enabled,
      dailyLogNotifications: enabled,
    });
  },
};

// =============================================================================
// Notification Queue Service
// =============================================================================

export const notificationQueueService = {
  // ---------------------------------------------------------------------------
  // Queue Operations
  // ---------------------------------------------------------------------------

  /**
   * Adiciona uma notificação à fila.
   */
  async queue(input: CreateNotificationInput): Promise<QueuedNotification> {
    const channels = input.channels || ['in_app'];
    
    const notification = await db.notification_queue.create({
      data: {
        companyId: input.companyId,
        userId: input.userId || null,
        type: input.type,
        category: input.category || 'info',
        title: input.title,
        message: input.message,
        data: input.data ? JSON.stringify(input.data) : null,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
        channels: JSON.stringify(channels),
        scheduledFor: input.scheduledFor || null,
      },
    });

    return {
      ...notification,
      type: notification.type as NotificationType,
      category: notification.category as NotificationCategory,
      status: notification.status as 'pending' | 'sent' | 'failed' | 'cancelled',
      data: notification.data ? JSON.parse(notification.data) : null,
      channels: JSON.parse(notification.channels || '[]') as NotificationChannel[],
    };
  },

  /**
   * Busca notificações pendentes para processamento.
   */
  async getPending(limit: number = 100): Promise<QueuedNotification[]> {
    const now = new Date();

    const notifications = await db.notification_queue.findMany({
      where: {
        status: 'pending',
        OR: [
          { scheduledFor: null },
          { scheduledFor: { lte: now } },
        ],
        attempts: { lt: 3 },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return notifications.map((n) => ({
      ...n,
      type: n.type as NotificationType,
      category: n.category as NotificationCategory,
      status: n.status as 'pending' | 'sent' | 'failed' | 'cancelled',
      data: n.data ? JSON.parse(n.data) : null,
      channels: JSON.parse(n.channels || '[]') as NotificationChannel[],
    }));
  },

  /**
   * Marca uma notificação como enviada.
   */
  async markSent(id: string): Promise<void> {
    await db.notification_queue.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
      },
    });
  },

  /**
   * Marca uma notificação como falha.
   */
  async markFailed(id: string, error: string): Promise<void> {
    const notification = await db.notification_queue.findUnique({
      where: { id },
      select: { attempts: true },
    });

    const attempts = (notification?.attempts || 0) + 1;
    const status = attempts >= 3 ? 'failed' : 'pending';

    await db.notification_queue.update({
      where: { id },
      data: {
        status,
        attempts,
        lastError: error,
      },
    });
  },

  /**
   * Cancela notificações pendentes para uma entidade.
   */
  async cancelForEntity(
    entityType: string,
    entityId: string
  ): Promise<number> {
    const result = await db.notification_queue.updateMany({
      where: {
        entityType,
        entityId,
        status: 'pending',
      },
      data: {
        status: 'cancelled',
      },
    });

    return result.count;
  },

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /**
   * Remove notificações antigas (mais de 30 dias).
   */
  async cleanup(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db.notification_queue.deleteMany({
      where: {
        status: { in: ['sent', 'failed', 'cancelled'] },
        createdAt: { lt: thirtyDaysAgo },
      },
    });

    return result.count;
  },
};

// =============================================================================
// Notification History Service
// =============================================================================

export const notificationHistoryService = {
  /**
   * Registra uma notificação enviada.
   */
  async record(input: {
    companyId: string;
    userId: string;
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    entityType?: string;
    entityId?: string;
    channel: NotificationChannel;
    success?: boolean;
    errorMessage?: string;
  }): Promise<void> {
    await db.notification_history.create({
      data: {
        companyId: input.companyId,
        userId: input.userId,
        type: input.type,
        category: input.category,
        title: input.title,
        message: input.message,
        data: input.data ? JSON.stringify(input.data) : null,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
        channel: input.channel,
        success: input.success ?? true,
        errorMessage: input.errorMessage || null,
      },
    });
  },

  /**
   * Marca uma notificação como lida.
   */
  async markAsRead(id: string): Promise<void> {
    await db.notification_history.update({
      where: { id },
      data: { readAt: new Date() },
    });
  },

  /**
   * Busca notificações do usuário.
   */
  async getByUserId(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    }
  ): Promise<{ data: unknown[]; total: number }> {
    const where = {
      userId,
      ...(options?.unreadOnly ? { readAt: null } : {}),
    };

    const [data, total] = await Promise.all([
      db.notification_history.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      db.notification_history.count({ where }),
    ]);

    return {
      data: data.map((n) => ({
        ...n,
        data: n.data ? JSON.parse(n.data) : null,
      })),
      total,
    };
  },

  /**
   * Conta notificações não lidas do usuário.
   */
  async countUnread(userId: string): Promise<number> {
    return db.notification_history.count({
      where: {
        userId,
        readAt: null,
      },
    });
  },

  /**
   * Marca todas as notificações do usuário como lidas.
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await db.notification_history.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return result.count;
  },
};
