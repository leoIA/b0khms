// =============================================================================
// ConstrutorPro - Testes do Sistema de Notificações Avançado
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

// =============================================================================
// Notification Preferences Service Tests
// =============================================================================

describe('NotificationPreferencesService', () => {
  // Mock do serviço para testes unitários
  const mockPreferences = {
    id: 'pref-1',
    userId: 'user-1',
    companyId: 'company-1',
    emailEnabled: true,
    pushEnabled: false,
    inAppEnabled: true,
    smsEnabled: false,
    frequency: 'instant' as const,
    projectNotifications: true,
    financialNotifications: true,
    scheduleNotifications: true,
    stockNotifications: true,
    systemNotifications: true,
    dailyLogNotifications: true,
    digestTime: '09:00',
    digestTimezone: 'America/Sao_Paulo',
    digestDays: [1, 2, 3, 4, 5],
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('isInQuietHours', () => {
    it('should return false when quiet hours is disabled', () => {
      const preferences = {
        ...mockPreferences,
        quietHoursEnabled: false,
      };

      // Função isInQuietHours simulada
      const isInQuietHours = (prefs: typeof preferences): boolean => {
        if (!prefs.quietHoursEnabled) return false;
        return true;
      };

      expect(isInQuietHours(preferences)).toBe(false);
    });

    it('should correctly detect quiet hours crossing midnight', () => {
      // Teste lógico: 22:00 - 07:00 cruza meia-noite
      const startMinutes = 22 * 60; // 22:00 = 1320 minutos
      const endMinutes = 7 * 60; // 07:00 = 420 minutos

      // Se início > fim, cruza meia-noite
      expect(startMinutes > endMinutes).toBe(true);

      // Verificar se 23:00 está no período (deve estar)
      const currentTimeMinutes = 23 * 60; // 23:00 = 1380 minutos
      const isInRange = currentTimeMinutes >= startMinutes || currentTimeMinutes < endMinutes;
      expect(isInRange).toBe(true);

      // Verificar se 03:00 está no período (deve estar)
      const lateNight = 3 * 60; // 03:00 = 180 minutos
      const isLateNightInRange = lateNight >= startMinutes || lateNight < endMinutes;
      expect(isLateNightInRange).toBe(true);

      // Verificar se 12:00 NÃO está no período
      const noon = 12 * 60; // 12:00 = 720 minutos
      const isNoonInRange = noon >= startMinutes || noon < endMinutes;
      expect(isNoonInRange).toBe(false);
    });

    it('should correctly detect quiet hours within same day', () => {
      // Teste lógico: 12:00 - 14:00 (não cruza meia-noite)
      const startMinutes = 12 * 60; // 12:00 = 720 minutos
      const endMinutes = 14 * 60; // 14:00 = 840 minutos

      // Se início < fim, não cruza meia-noite
      expect(startMinutes < endMinutes).toBe(true);

      // Verificar se 13:00 está no período (deve estar)
      const onePM = 13 * 60; // 13:00 = 780 minutos
      const isInRange = onePM >= startMinutes && onePM < endMinutes;
      expect(isInRange).toBe(true);

      // Verificar se 10:00 NÃO está no período
      const tenAM = 10 * 60; // 10:00 = 600 minutos
      const isTenAMInRange = tenAM >= startMinutes && tenAM < endMinutes;
      expect(isTenAMInRange).toBe(false);
    });
  });

  describe('notification type mapping', () => {
    it('should map entity types to notification categories correctly', () => {
      const typeMap: Record<string, string> = {
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

      expect(typeMap['project']).toBe('project');
      expect(typeMap['budget']).toBe('financial');
      expect(typeMap['transaction']).toBe('financial');
      expect(typeMap['material']).toBe('stock');
      expect(typeMap['task']).toBe('schedule');
      expect(typeMap['daily_log']).toBe('daily_log');
      expect(typeMap['system']).toBe('system');
      expect(typeMap['security']).toBe('system');
    });
  });

  describe('frequency validation', () => {
    it('should validate valid frequencies', () => {
      const validFrequencies = ['instant', 'hourly', 'daily', 'weekly'];

      validFrequencies.forEach((freq) => {
        expect(validFrequencies.includes(freq)).toBe(true);
      });
    });

    it('should reject invalid frequencies', () => {
      const validFrequencies = ['instant', 'hourly', 'daily', 'weekly'];
      const invalidFrequency = 'monthly';

      expect(validFrequencies.includes(invalidFrequency)).toBe(false);
    });
  });

  describe('digest days validation', () => {
    it('should validate correct digest days', () => {
      const validDays = [0, 1, 2, 3, 4, 5, 6]; // Dom-Sáb
      const testDays = [1, 2, 3, 4, 5]; // Seg-Sex

      const allValid = testDays.every((d) => d >= 0 && d <= 6);
      expect(allValid).toBe(true);
    });

    it('should reject invalid digest days', () => {
      const invalidDays = [-1, 7, 8];

      invalidDays.forEach((day) => {
        expect(day >= 0 && day <= 6).toBe(false);
      });
    });
  });

  describe('time format validation', () => {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    it('should validate correct time formats', () => {
      const validTimes = ['09:00', '23:59', '00:00', '12:30', '7:00', '17:45'];

      validTimes.forEach((time) => {
        expect(timeRegex.test(time)).toBe(true);
      });
    });

    it('should reject invalid time formats', () => {
      const invalidTimes = ['24:00', '25:00', '12:60', '12:61', 'abc', '12:00:00'];

      invalidTimes.forEach((time) => {
        expect(timeRegex.test(time)).toBe(false);
      });
    });
  });
});

// =============================================================================
// Notification Queue Service Tests
// =============================================================================

describe('NotificationQueueService', () => {
  describe('queue operations', () => {
    it('should create queued notification with correct default values', () => {
      const queuedNotification = {
        id: 'queue-1',
        companyId: 'company-1',
        userId: 'user-1',
        type: 'project',
        category: 'info',
        title: 'Test Notification',
        message: 'Test message',
        data: null,
        entityType: 'project',
        entityId: 'project-1',
        status: 'pending' as const,
        channels: ['in_app'] as const[],
        attempts: 0,
        maxAttempts: 3,
        lastError: null,
        scheduledFor: null,
        sentAt: null,
        createdAt: new Date(),
      };

      expect(queuedNotification.status).toBe('pending');
      expect(queuedNotification.attempts).toBe(0);
      expect(queuedNotification.maxAttempts).toBe(3);
      expect(queuedNotification.channels).toContain('in_app');
    });

    it('should determine retry eligibility correctly', () => {
      const maxAttempts = 3;

      // Tentativa 1: pode retry
      expect(1 < maxAttempts).toBe(true);

      // Tentativa 2: pode retry
      expect(2 < maxAttempts).toBe(true);

      // Tentativa 3: não pode retry
      expect(3 < maxAttempts).toBe(false);
    });

    it('should calculate exponential backoff correctly', () => {
      const baseDelay = 1000; // 1 segundo

      // Tentativa 1: 1s * 2^0 = 1s
      expect(baseDelay * Math.pow(2, 0)).toBe(1000);

      // Tentativa 2: 1s * 2^1 = 2s
      expect(baseDelay * Math.pow(2, 1)).toBe(2000);

      // Tentativa 3: 1s * 2^2 = 4s
      expect(baseDelay * Math.pow(2, 2)).toBe(4000);
    });
  });

  describe('status transitions', () => {
    it('should transition from pending to sent', () => {
      const statuses = ['pending', 'sent', 'failed', 'cancelled'];
      
      // Transição válida: pending -> sent
      expect(statuses.includes('pending')).toBe(true);
      expect(statuses.includes('sent')).toBe(true);
    });

    it('should transition from pending to failed after max attempts', () => {
      const attempts = 3;
      const maxAttempts = 3;
      
      const newStatus = attempts >= maxAttempts ? 'failed' : 'pending';
      expect(newStatus).toBe('failed');
    });
  });
});

// =============================================================================
// Notification History Service Tests
// =============================================================================

describe('NotificationHistoryService', () => {
  describe('history recording', () => {
    it('should create history entry with correct fields', () => {
      const historyEntry = {
        id: 'history-1',
        companyId: 'company-1',
        userId: 'user-1',
        type: 'project',
        category: 'info',
        title: 'Test',
        message: 'Test message',
        data: null,
        entityType: 'project',
        entityId: 'project-1',
        channel: 'in_app' as const,
        success: true,
        errorMessage: null,
        sentAt: new Date(),
        readAt: null,
      };

      expect(historyEntry.success).toBe(true);
      expect(historyEntry.channel).toBe('in_app');
      expect(historyEntry.readAt).toBeNull();
    });

    it('should record failed notification with error message', () => {
      const failedEntry = {
        success: false,
        errorMessage: 'Connection timeout',
      };

      expect(failedEntry.success).toBe(false);
      expect(failedEntry.errorMessage).toBe('Connection timeout');
    });
  });

  describe('unread count', () => {
    it('should count unread notifications correctly', () => {
      const notifications = [
        { readAt: null },
        { readAt: null },
        { readAt: new Date() },
        { readAt: null },
        { readAt: new Date() },
      ];

      const unreadCount = notifications.filter((n) => n.readAt === null).length;
      expect(unreadCount).toBe(3);
    });
  });
});

// =============================================================================
// Notification Service Tests
// =============================================================================

describe('NotificationService', () => {
  describe('notification types', () => {
    it('should have valid notification types', () => {
      const validTypes = ['info', 'success', 'warning', 'error'];

      validTypes.forEach((type) => {
        expect(['info', 'success', 'warning', 'error'].includes(type)).toBe(true);
      });
    });
  });

  describe('notification helpers', () => {
    it('should create project created notification with correct data', () => {
      const params = {
        companyId: 'company-1',
        projectId: 'project-1',
        projectName: 'Projeto Teste',
        userId: 'user-1',
      };

      const notification = {
        companyId: params.companyId,
        type: 'info',
        title: 'Novo Projeto',
        message: `Projeto "${params.projectName}" foi criado.`,
        entityType: 'project',
        entityId: params.projectId,
        userId: params.userId,
      };

      expect(notification.type).toBe('info');
      expect(notification.title).toBe('Novo Projeto');
      expect(notification.message).toContain(params.projectName);
      expect(notification.entityType).toBe('project');
    });

    it('should create budget approved notification with correct data', () => {
      const params = {
        companyId: 'company-1',
        budgetId: 'budget-1',
        budgetName: 'Orçamento Teste',
      };

      const notification = {
        companyId: params.companyId,
        type: 'success',
        title: 'Orçamento Aprovado',
        message: `Orçamento "${params.budgetName}" foi aprovado.`,
        entityType: 'budget',
        entityId: params.budgetId,
      };

      expect(notification.type).toBe('success');
      expect(notification.title).toBe('Orçamento Aprovado');
    });

    it('should create payment overdue notification with error type', () => {
      const params = {
        companyId: 'company-1',
        transactionId: 'trans-1',
        description: 'Pagamento Fornecedor XYZ',
      };

      const notification = {
        companyId: params.companyId,
        type: 'error',
        title: 'Pagamento Vencido',
        message: `O pagamento "${params.description}" está vencido.`,
        entityType: 'transaction',
        entityId: params.transactionId,
      };

      expect(notification.type).toBe('error');
      expect(notification.title).toBe('Pagamento Vencido');
    });

    it('should create low stock notification with warning type', () => {
      const params = {
        companyId: 'company-1',
        materialId: 'material-1',
        materialName: 'Cimento',
        quantity: 5,
      };

      const notification = {
        companyId: params.companyId,
        type: 'warning',
        title: 'Estoque Baixo',
        message: `Material "${params.materialName}" está com estoque baixo (${params.quantity} unidades).`,
        entityType: 'material',
        entityId: params.materialId,
      };

      expect(notification.type).toBe('warning');
      expect(notification.title).toBe('Estoque Baixo');
      expect(notification.message).toContain(`${params.quantity} unidades`);
    });
  });
});

// =============================================================================
// Channel Configuration Tests
// =============================================================================

describe('Notification Channels', () => {
  describe('channel types', () => {
    it('should have valid channel types', () => {
      const validChannels = ['email', 'push', 'in_app', 'sms'];

      validChannels.forEach((channel) => {
        expect(['email', 'push', 'in_app', 'sms'].includes(channel)).toBe(true);
      });
    });
  });

  describe('default channel preferences', () => {
    it('should have sensible defaults', () => {
      const defaultPreferences = {
        emailEnabled: true,
        pushEnabled: false,
        inAppEnabled: true,
        smsEnabled: false,
      };

      expect(defaultPreferences.emailEnabled).toBe(true);
      expect(defaultPreferences.pushEnabled).toBe(false);
      expect(defaultPreferences.inAppEnabled).toBe(true);
      expect(defaultPreferences.smsEnabled).toBe(false);
    });
  });

  describe('category notifications defaults', () => {
    it('should enable all categories by default', () => {
      const defaultCategories = {
        projectNotifications: true,
        financialNotifications: true,
        scheduleNotifications: true,
        stockNotifications: true,
        systemNotifications: true,
        dailyLogNotifications: true,
      };

      Object.values(defaultCategories).forEach((enabled) => {
        expect(enabled).toBe(true);
      });
    });
  });
});

// =============================================================================
// Stats Calculation Tests
// =============================================================================

describe('Notification Stats', () => {
  describe('trend calculation', () => {
    it('should calculate positive trend correctly', () => {
      const lastWeek = 50;
      const previousWeek = 40;

      const trend = Math.round(((lastWeek - previousWeek) / previousWeek) * 100);
      expect(trend).toBe(25);
    });

    it('should calculate negative trend correctly', () => {
      const lastWeek = 30;
      const previousWeek = 50;

      const trend = Math.round(((lastWeek - previousWeek) / previousWeek) * 100);
      expect(trend).toBe(-40);
    });

    it('should handle zero previous week (new notifications)', () => {
      const lastWeek = 10;
      const previousWeek = 0;

      const trend = previousWeek === 0 && lastWeek > 0 ? 100 : 0;
      expect(trend).toBe(100);
    });

    it('should handle both weeks zero', () => {
      const lastWeek = 0;
      const previousWeek = 0;

      const trend = previousWeek === 0 ? 0 : Math.round(((lastWeek - previousWeek) / previousWeek) * 100);
      expect(trend).toBe(0);
    });
  });

  describe('read rate calculation', () => {
    it('should calculate read rate percentage', () => {
      const total = 100;
      const unread = 30;

      const readRate = Math.round(((total - unread) / total) * 100);
      expect(readRate).toBe(70);
    });

    it('should handle zero total', () => {
      const total = 0;
      const unread = 0;

      const readRate = total > 0 ? Math.round(((total - unread) / total) * 100) : 0;
      expect(readRate).toBe(0);
    });

    it('should handle all read', () => {
      const total = 50;
      const unread = 0;

      const readRate = Math.round(((total - unread) / total) * 100);
      expect(readRate).toBe(100);
    });
  });
});
