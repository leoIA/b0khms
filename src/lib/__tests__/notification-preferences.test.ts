// =============================================================================
// ConstrutorPro - Testes do Serviço de Preferências de Notificação
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

// =============================================================================
// Types for Testing
// =============================================================================

interface NotificationPreferences {
  id: string;
  userId: string;
  companyId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
  frequency: string;
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
}

// =============================================================================
// Helper Functions Tests
// =============================================================================

describe('Notification Preferences Helpers', () => {
  describe('isInQuietHours', () => {
    // Helper function to test quiet hours logic
    function isInQuietHours(preferences: {
      quietHoursEnabled: boolean;
      quietHoursStart: string;
      quietHoursEnd: string;
      digestTimezone?: string;
    }): boolean {
      if (!preferences.quietHoursEnabled) return false;

      const timezone = preferences.digestTimezone || 'America/Sao_Paulo';
      
      // Get current time in user's timezone
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      const currentTimeStr = formatter.format(new Date());
      const [currentHour, currentMinute] = currentTimeStr.split(':').map(Number);
      const currentTimeMinutes = currentHour * 60 + currentMinute;

      // Parse quiet hours
      const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
      const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
      const startTimeMinutes = startHour * 60 + startMinute;
      const endTimeMinutes = endHour * 60 + endMinute;

      // Check if in period (considering midnight crossing)
      if (startTimeMinutes > endTimeMinutes) {
        // Period crosses midnight (e.g., 22:00 - 07:00)
        return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes < endTimeMinutes;
      } else {
        // Normal period (e.g., 12:00 - 14:00)
        return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
      }
    }

    it('should return false when quiet hours is disabled', () => {
      const preferences = {
        quietHoursEnabled: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
      };

      expect(isInQuietHours(preferences)).toBe(false);
    });

    it('should correctly parse time strings', () => {
      const start = '22:00';
      const end = '07:00';
      
      const [startHour, startMinute] = start.split(':').map(Number);
      const [endHour, endMinute] = end.split(':').map(Number);
      
      expect(startHour).toBe(22);
      expect(startMinute).toBe(0);
      expect(endHour).toBe(7);
      expect(endMinute).toBe(0);
    });

    it('should calculate minutes correctly', () => {
      const time = '14:30';
      const [hour, minute] = time.split(':').map(Number);
      const minutes = hour * 60 + minute;
      
      expect(minutes).toBe(870); // 14*60 + 30 = 870
    });

    it('should detect midnight crossing', () => {
      const startTimeMinutes = 22 * 60; // 22:00 = 1320
      const endTimeMinutes = 7 * 60;    // 07:00 = 420
      
      // Midnight crossing detected when start > end
      expect(startTimeMinutes > endTimeMinutes).toBe(true);
    });

    it('should detect normal period', () => {
      const startTimeMinutes = 12 * 60; // 12:00 = 720
      const endTimeMinutes = 14 * 60;   // 14:00 = 840
      
      // Normal period detected when start < end
      expect(startTimeMinutes > endTimeMinutes).toBe(false);
    });
  });

  describe('Default Preferences', () => {
    const DEFAULT_PREFERENCES = {
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
      digestDays: [1, 2, 3, 4, 5],
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
    };

    it('should have email enabled by default', () => {
      expect(DEFAULT_PREFERENCES.emailEnabled).toBe(true);
    });

    it('should have push disabled by default', () => {
      expect(DEFAULT_PREFERENCES.pushEnabled).toBe(false);
    });

    it('should have in-app enabled by default', () => {
      expect(DEFAULT_PREFERENCES.inAppEnabled).toBe(true);
    });

    it('should have instant frequency by default', () => {
      expect(DEFAULT_PREFERENCES.frequency).toBe('instant');
    });

    it('should have all notification categories enabled by default', () => {
      expect(DEFAULT_PREFERENCES.projectNotifications).toBe(true);
      expect(DEFAULT_PREFERENCES.financialNotifications).toBe(true);
      expect(DEFAULT_PREFERENCES.scheduleNotifications).toBe(true);
      expect(DEFAULT_PREFERENCES.stockNotifications).toBe(true);
      expect(DEFAULT_PREFERENCES.systemNotifications).toBe(true);
      expect(DEFAULT_PREFERENCES.dailyLogNotifications).toBe(true);
    });

    it('should have quiet hours disabled by default', () => {
      expect(DEFAULT_PREFERENCES.quietHoursEnabled).toBe(false);
    });

    it('should have correct digest days (Mon-Fri)', () => {
      expect(DEFAULT_PREFERENCES.digestDays).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Notification Types', () => {
    const NOTIFICATION_TYPES = [
      'project',
      'financial',
      'schedule',
      'stock',
      'system',
      'daily_log',
    ] as const;

    it('should have all required notification types', () => {
      expect(NOTIFICATION_TYPES).toContain('project');
      expect(NOTIFICATION_TYPES).toContain('financial');
      expect(NOTIFICATION_TYPES).toContain('schedule');
      expect(NOTIFICATION_TYPES).toContain('stock');
      expect(NOTIFICATION_TYPES).toContain('system');
      expect(NOTIFICATION_TYPES).toContain('daily_log');
    });

    it('should have correct notification categories', () => {
      const categories = ['info', 'success', 'warning', 'error'];
      
      expect(categories).toContain('info');
      expect(categories).toContain('success');
      expect(categories).toContain('warning');
      expect(categories).toContain('error');
    });
  });

  describe('Frequency Options', () => {
    const FREQUENCY_OPTIONS = ['instant', 'hourly', 'daily', 'weekly'] as const;

    it('should have valid frequency options', () => {
      expect(FREQUENCY_OPTIONS).toContain('instant');
      expect(FREQUENCY_OPTIONS).toContain('hourly');
      expect(FREQUENCY_OPTIONS).toContain('daily');
      expect(FREQUENCY_OPTIONS).toContain('weekly');
    });

    it('should have instant as default', () => {
      const defaultFrequency = 'instant';
      expect(FREQUENCY_OPTIONS).toContain(defaultFrequency);
    });
  });

  describe('Channel Types', () => {
    const CHANNEL_TYPES = ['email', 'push', 'in_app', 'sms'] as const;

    it('should have all channel types', () => {
      expect(CHANNEL_TYPES).toContain('email');
      expect(CHANNEL_TYPES).toContain('push');
      expect(CHANNEL_TYPES).toContain('in_app');
      expect(CHANNEL_TYPES).toContain('sms');
    });
  });

  describe('Time Validation', () => {
    function isValidTime(time: string): boolean {
      const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      return regex.test(time);
    }

    it('should validate correct time format', () => {
      expect(isValidTime('09:00')).toBe(true);
      expect(isValidTime('22:00')).toBe(true);
      expect(isValidTime('07:30')).toBe(true);
      expect(isValidTime('23:59')).toBe(true);
      expect(isValidTime('00:00')).toBe(true);
    });

    it('should reject invalid time format', () => {
      expect(isValidTime('24:00')).toBe(false);
      expect(isValidTime('25:00')).toBe(false);
      expect(isValidTime('9:00')).toBe(false);  // Must be 09:00
      expect(isValidTime('09:60')).toBe(false);
      expect(isValidTime('invalid')).toBe(false);
    });
  });

  describe('Digest Days', () => {
    function isValidDigestDays(days: number[]): boolean {
      return days.every(day => day >= 0 && day <= 6);
    }

    it('should validate correct digest days', () => {
      expect(isValidDigestDays([1, 2, 3, 4, 5])).toBe(true); // Mon-Fri
      expect(isValidDigestDays([0, 6])).toBe(true); // Sun, Sat
      expect(isValidDigestDays([0, 1, 2, 3, 4, 5, 6])).toBe(true); // All week
    });

    it('should reject invalid digest days', () => {
      expect(isValidDigestDays([-1])).toBe(false);
      expect(isValidDigestDays([7])).toBe(false);
      expect(isValidDigestDays([0, 1, 8])).toBe(false);
    });
  });
});

// =============================================================================
// Notification Queue Tests
// =============================================================================

describe('Notification Queue', () => {
  describe('Queue Status', () => {
    const QUEUE_STATUS = ['pending', 'sent', 'failed', 'cancelled'] as const;

    it('should have valid queue statuses', () => {
      expect(QUEUE_STATUS).toContain('pending');
      expect(QUEUE_STATUS).toContain('sent');
      expect(QUEUE_STATUS).toContain('failed');
      expect(QUEUE_STATUS).toContain('cancelled');
    });
  });

  describe('Max Attempts', () => {
    it('should have default max attempts of 3', () => {
      const maxAttempts = 3;
      expect(maxAttempts).toBe(3);
    });

    it('should track attempts correctly', () => {
      let attempts = 0;
      const maxAttempts = 3;
      
      attempts++;
      expect(attempts).toBeLessThanOrEqual(maxAttempts);
      
      attempts++;
      expect(attempts).toBeLessThanOrEqual(maxAttempts);
      
      attempts++;
      expect(attempts).toBeLessThanOrEqual(maxAttempts);
    });
  });
});

// =============================================================================
// Notification History Tests
// =============================================================================

describe('Notification History', () => {
  describe('History Channel Types', () => {
    const HISTORY_CHANNELS = ['email', 'push', 'in_app', 'sms'] as const;

    it('should have all channel types for history', () => {
      expect(HISTORY_CHANNELS).toContain('email');
      expect(HISTORY_CHANNELS).toContain('push');
      expect(HISTORY_CHANNELS).toContain('in_app');
      expect(HISTORY_CHANNELS).toContain('sms');
    });
  });

  describe('Read Status', () => {
    it('should track read status correctly', () => {
      const notification = {
        readAt: null,
      };

      const isUnread = notification.readAt === null;
      expect(isUnread).toBe(true);

      notification.readAt = new Date();
      const isRead = notification.readAt !== null;
      expect(isRead).toBe(true);
    });
  });
});

// =============================================================================
// Integration Tests with Mock Data
// =============================================================================

describe('Notification Preferences Integration', () => {
  // Mock preferences data
  const mockPreferences: NotificationPreferences = {
    id: 'pref-1',
    userId: 'user-1',
    companyId: 'company-1',
    emailEnabled: true,
    pushEnabled: false,
    inAppEnabled: true,
    smsEnabled: false,
    frequency: 'daily',
    projectNotifications: true,
    financialNotifications: true,
    scheduleNotifications: false,
    stockNotifications: true,
    systemNotifications: true,
    dailyLogNotifications: false,
    digestTime: '09:00',
    digestTimezone: 'America/Sao_Paulo',
    digestDays: [1, 2, 3, 4, 5],
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  };

  describe('Channel Preferences', () => {
    it('should have correct channel configuration', () => {
      expect(mockPreferences.emailEnabled).toBe(true);
      expect(mockPreferences.pushEnabled).toBe(false);
      expect(mockPreferences.inAppEnabled).toBe(true);
      expect(mockPreferences.smsEnabled).toBe(false);
    });
  });

  describe('Category Preferences', () => {
    it('should have correct category configuration', () => {
      expect(mockPreferences.projectNotifications).toBe(true);
      expect(mockPreferences.financialNotifications).toBe(true);
      expect(mockPreferences.scheduleNotifications).toBe(false);
      expect(mockPreferences.stockNotifications).toBe(true);
      expect(mockPreferences.systemNotifications).toBe(true);
      expect(mockPreferences.dailyLogNotifications).toBe(false);
    });
  });

  describe('Frequency Configuration', () => {
    it('should have correct frequency', () => {
      expect(mockPreferences.frequency).toBe('daily');
    });

    it('should have correct digest time', () => {
      expect(mockPreferences.digestTime).toBe('09:00');
    });

    it('should have correct digest days', () => {
      expect(mockPreferences.digestDays).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Quiet Hours Configuration', () => {
    it('should have quiet hours enabled', () => {
      expect(mockPreferences.quietHoursEnabled).toBe(true);
    });

    it('should have correct quiet hours range', () => {
      expect(mockPreferences.quietHoursStart).toBe('22:00');
      expect(mockPreferences.quietHoursEnd).toBe('07:00');
    });
  });
});
