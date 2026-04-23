// =============================================================================
// ConstrutorPro - Webhook Service
// =============================================================================

import { db } from '@/lib/db';
import crypto from 'crypto';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type WebhookEvent =
  // Test event
  | 'test'
  // Project events
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'project.status_changed'
  // Budget events
  | 'budget.created'
  | 'budget.updated'
  | 'budget.deleted'
  | 'budget.approved'
  | 'budget.rejected'
  // Client events
  | 'client.created'
  | 'client.updated'
  | 'client.deleted'
  // Supplier events
  | 'supplier.created'
  | 'supplier.updated'
  | 'supplier.deleted'
  // Financial events
  | 'transaction.created'
  | 'transaction.updated'
  | 'transaction.paid'
  | 'transaction.overdue'
  // Daily log events
  | 'daily_log.created'
  | 'daily_log.updated'
  // Schedule events
  | 'schedule.created'
  | 'schedule.updated'
  | 'schedule.task_completed'
  // Quotation events
  | 'quotation.created'
  | 'quotation.sent'
  | 'quotation.responded'
  | 'quotation.approved'
  // Subscription events
  | 'subscription.created'
  | 'subscription.renewed'
  | 'subscription.canceled'
  | 'subscription.expired'
  // Alert events
  | 'alert.created'
  | 'alert.stock_low'
  | 'alert.payment_overdue'
  | 'alert.deadline_near';

export interface WebhookPayload {
  id: string;
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
  company: {
    id: string;
    name: string;
  };
}

export interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  isActive: boolean;
  headers?: Record<string, string>;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode?: number;
  response?: string;
  responseTime?: number;
  error?: string;
}

// -----------------------------------------------------------------------------
// Webhook Service
// -----------------------------------------------------------------------------

class WebhookService {
  private static instance: WebhookService;

  private constructor() {}

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  // ---------------------------------------------------------------------------
  // Webhook Management
  // ---------------------------------------------------------------------------

  /**
   * Create a new webhook for a company
   */
  async createWebhook(params: {
    companyId: string;
    name: string;
    url: string;
    events: WebhookEvent[];
    headers?: Record<string, string>;
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
  }): Promise<{ id: string; secret: string }> {
    const secret = this.generateSecret();

    const webhook = await db.webhooks.create({
      data: {
        companyId: params.companyId,
        name: params.name,
        url: params.url,
        secret,
        events: JSON.stringify(params.events),
        headers: params.headers ? JSON.stringify(params.headers) : null,
        timeout: params.timeout ?? 10000,
        retryCount: params.retryCount ?? 3,
        retryDelay: params.retryDelay ?? 1000,
      },
    });

    return { id: webhook.id, secret };
  }

  /**
   * Update a webhook
   */
  async updateWebhook(
    webhookId: string,
    companyId: string,
    params: {
      name?: string;
      url?: string;
      events?: WebhookEvent[];
      isActive?: boolean;
      headers?: Record<string, string>;
      timeout?: number;
      retryCount?: number;
      retryDelay?: number;
    }
  ): Promise<boolean> {
    const result = await db.webhooks.updateMany({
      where: { id: webhookId, companyId },
      data: {
        ...(params.name && { name: params.name }),
        ...(params.url && { url: params.url }),
        ...(params.events && { events: JSON.stringify(params.events) }),
        ...(params.isActive !== undefined && { isActive: params.isActive }),
        ...(params.headers && { headers: JSON.stringify(params.headers) }),
        ...(params.timeout !== undefined && { timeout: params.timeout }),
        ...(params.retryCount !== undefined && { retryCount: params.retryCount }),
        ...(params.retryDelay !== undefined && { retryDelay: params.retryDelay }),
      },
    });

    return result.count > 0;
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string, companyId: string): Promise<boolean> {
    const result = await db.webhooks.deleteMany({
      where: { id: webhookId, companyId },
    });

    return result.count > 0;
  }

  /**
   * Get webhooks for a company
   */
  async getWebhooks(companyId: string): Promise<WebhookConfig[]> {
    const webhooks = await db.webhooks.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map((w) => ({
      id: w.id,
      name: w.name,
      url: w.url,
      events: JSON.parse(w.events) as WebhookEvent[],
      isActive: w.isActive,
      headers: w.headers ? JSON.parse(w.headers) : undefined,
      timeout: w.timeout,
      retryCount: w.retryCount,
      retryDelay: w.retryDelay,
    }));
  }

  /**
   * Get a single webhook by ID
   */
  async getWebhook(webhookId: string, companyId: string): Promise<WebhookConfig | null> {
    const webhook = await db.webhooks.findFirst({
      where: { id: webhookId, companyId },
    });

    if (!webhook) return null;

    return {
      id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      events: JSON.parse(webhook.events) as WebhookEvent[],
      isActive: webhook.isActive,
      headers: webhook.headers ? JSON.parse(webhook.headers) : undefined,
      timeout: webhook.timeout,
      retryCount: webhook.retryCount,
      retryDelay: webhook.retryDelay,
    };
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(webhookId: string, companyId: string): Promise<string | null> {
    const secret = this.generateSecret();

    const result = await db.webhooks.updateMany({
      where: { id: webhookId, companyId },
      data: { secret },
    });

    return result.count > 0 ? secret : null;
  }

  // ---------------------------------------------------------------------------
  // Webhook Triggering
  // ---------------------------------------------------------------------------

  /**
   * Trigger webhooks for an event
   */
  async trigger(params: {
    companyId: string;
    event: WebhookEvent;
    data: Record<string, unknown>;
  }): Promise<void> {
    const { companyId, event, data } = params;

    // Find all active webhooks subscribed to this event
    const webhooks = await db.webhooks.findMany({
      where: {
        companyId,
        isActive: true,
        events: { contains: event },
      },
    });

    if (webhooks.length === 0) return;

    // Get company info
    const company = await db.companies.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });

    if (!company) return;

    // Create payload
    const payload: WebhookPayload = {
      id: crypto.randomUUID(),
      event,
      timestamp: new Date().toISOString(),
      data,
      company: {
        id: company.id,
        name: company.name,
      },
    };

    // Deliver to each webhook
    for (const webhook of webhooks) {
      // Fire and forget - don't wait for delivery
      this.deliverWebhook(webhook, payload).catch((error) => {
        console.error(`[Webhook] Error delivering to ${webhook.id}:`, error);
      });
    }
  }

  /**
   * Deliver a webhook with retry logic
   */
  private async deliverWebhook(
    webhook: {
      id: string;
      url: string;
      secret: string;
      headers: string | null;
      timeout: number;
      retryCount: number;
      retryDelay: number;
    },
    payload: WebhookPayload,
    attempt: number = 1
  ): Promise<void> {
    const startTime = Date.now();
    const payloadStr = JSON.stringify(payload);
    const signature = this.generateSignature(payloadStr, webhook.secret);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Id': webhook.id,
      'X-Webhook-Event': payload.event,
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': payload.timestamp,
      'User-Agent': 'ConstrutorPro-Webhook/1.0',
    };

    // Add custom headers
    if (webhook.headers) {
      try {
        const customHeaders = JSON.parse(webhook.headers);
        Object.assign(headers, customHeaders);
      } catch {
        // Ignore invalid headers
      }
    }

    let deliveryResult: WebhookDeliveryResult;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payloadStr,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const responseBody = await response.text();

      deliveryResult = {
        success: response.ok,
        statusCode: response.status,
        response: responseBody.substring(0, 1000), // Limit response size
        responseTime,
      };
    } catch (error) {
      deliveryResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      };
    }

    // Log delivery
    await this.logDelivery({
      webhookId: webhook.id,
      event: payload.event,
      payload: payloadStr,
      result: deliveryResult,
      attempt,
    });

    // Update webhook stats
    await this.updateWebhookStats(webhook.id, deliveryResult.success);

    // Retry if failed and attempts remaining
    if (!deliveryResult.success && attempt < webhook.retryCount) {
      const nextAttempt = attempt + 1;
      const delay = webhook.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff

      await new Promise((resolve) => setTimeout(resolve, delay));

      return this.deliverWebhook(webhook, payload, nextAttempt);
    }
  }

  /**
   * Log webhook delivery
   */
  private async logDelivery(params: {
    webhookId: string;
    event: string;
    payload: string;
    result: WebhookDeliveryResult;
    attempt: number;
  }): Promise<void> {
    await db.webhook_deliveries.create({
      data: {
        webhookId: params.webhookId,
        event: params.event,
        payload: params.payload,
        responseStatus: params.result.statusCode,
        responseBody: params.result.response,
        responseTime: params.result.responseTime,
        attempt: params.attempt,
        success: params.result.success,
        error: params.result.error,
        deliveredAt: params.result.success ? new Date() : null,
        nextRetryAt: !params.result.success
          ? new Date(Date.now() + 5000)
          : null,
      },
    });
  }

  /**
   * Update webhook statistics
   */
  private async updateWebhookStats(webhookId: string, success: boolean): Promise<void> {
    await db.webhooks.update({
      where: { id: webhookId },
      data: {
        lastTriggeredAt: new Date(),
        ...(success
          ? {
              lastSuccessAt: new Date(),
              failureCount: 0,
            }
          : {
              lastFailureAt: new Date(),
              failureCount: { increment: 1 },
            }),
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Utility Methods
  // ---------------------------------------------------------------------------

  /**
   * Generate a random secret for webhook signature
   */
  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate HMAC signature for payload
   */
  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Verify webhook signature (for incoming webhooks)
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // ---------------------------------------------------------------------------
  // Delivery Management
  // ---------------------------------------------------------------------------

  /**
   * Get delivery history for a webhook
   */
  async getDeliveryHistory(
    webhookId: string,
    companyId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{ deliveries: unknown[]; total: number }> {
    // Verify webhook belongs to company
    const webhook = await db.webhooks.findFirst({
      where: { id: webhookId, companyId },
    });

    if (!webhook) {
      return { deliveries: [], total: 0 };
    }

    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const [deliveries, total] = await Promise.all([
      db.webhook_deliveries.findMany({
        where: { webhookId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.webhook_deliveries.count({ where: { webhookId } }),
    ]);

    return { deliveries, total };
  }

  /**
   * Retry failed deliveries
   */
  async retryFailedDeliveries(): Promise<number> {
    const failedDeliveries = await db.webhook_deliveries.findMany({
      where: {
        success: false,
        nextRetryAt: { lte: new Date() },
        attempt: { lt: 3 }, // Max retries
      },
      include: {
        webhooks: true,
      },
      take: 100,
    });

    let retried = 0;

    for (const delivery of failedDeliveries) {
      try {
        const payload: WebhookPayload = JSON.parse(delivery.payload);

        await this.deliverWebhook(
          {
            id: delivery.webhooks.id,
            url: delivery.webhooks.url,
            secret: delivery.webhooks.secret,
            headers: delivery.webhooks.headers,
            timeout: delivery.webhooks.timeout,
            retryCount: delivery.webhooks.retryCount,
            retryDelay: delivery.webhooks.retryDelay,
          },
          payload,
          delivery.attempt + 1
        );

        retried++;
      } catch (error) {
        console.error(`[Webhook] Error retrying delivery ${delivery.id}:`, error);
      }
    }

    return retried;
  }

  // ---------------------------------------------------------------------------
  // Test Webhook
  // ---------------------------------------------------------------------------

  /**
   * Send a test webhook
   */
  async testWebhook(
    webhookId: string,
    companyId: string
  ): Promise<WebhookDeliveryResult> {
    const webhook = await db.webhooks.findFirst({
      where: { id: webhookId, companyId },
    });

    if (!webhook) {
      return { success: false, error: 'Webhook não encontrado' };
    }

    const payload: WebhookPayload = {
      id: crypto.randomUUID(),
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'Este é um webhook de teste do ConstrutorPro',
        test: true,
      },
      company: {
        id: companyId,
        name: 'Test Company',
      },
    };

    const startTime = Date.now();
    const payloadStr = JSON.stringify(payload);
    const signature = this.generateSignature(payloadStr, webhook.secret);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': 'test',
          'X-Webhook-Signature': signature,
          'User-Agent': 'ConstrutorPro-Webhook/1.0',
        },
        body: payloadStr,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      const responseBody = await response.text();

      return {
        success: response.ok,
        statusCode: response.status,
        response: responseBody.substring(0, 500),
        responseTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      };
    }
  }
}

// Export singleton instance
export const webhookService = WebhookService.getInstance();

// Export processRetryQueue as alias for retryFailedDeliveries
export async function processRetryQueue(): Promise<number> {
  return webhookService.retryFailedDeliveries();
}

// Export convenience functions for API routes
export async function createWebhook(companyId: string, params: {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}): Promise<{ id: string; secret: string }> {
  return webhookService.createWebhook({
    companyId,
    name: params.name,
    url: params.url,
    events: params.events as WebhookEvent[],
    headers: params.headers,
    timeout: params.timeout ? params.timeout * 1000 : undefined,
    retryCount: params.maxRetries,
    retryDelay: params.retryDelay ? params.retryDelay * 1000 : undefined,
  });
}

export async function listWebhooks(companyId: string): Promise<WebhookConfig[]> {
  return webhookService.getWebhooks(companyId);
}

export async function getWebhookLogs(webhookId: string, options?: { limit?: number; offset?: number; success?: boolean }): Promise<unknown[]> {
  const result = await webhookService.getDeliveryHistory(webhookId, '', options);
  return result.deliveries;
}

// -----------------------------------------------------------------------------
// Available Events Configuration
// -----------------------------------------------------------------------------

export const WEBHOOK_EVENTS: Record<string, { event: WebhookEvent; label: string; description: string }[]> = {
  Projetos: [
    { event: 'project.created', label: 'Projeto Criado', description: 'Quando um novo projeto é criado' },
    { event: 'project.updated', label: 'Projeto Atualizado', description: 'Quando um projeto é atualizado' },
    { event: 'project.deleted', label: 'Projeto Excluído', description: 'Quando um projeto é excluído' },
    { event: 'project.status_changed', label: 'Status Alterado', description: 'Quando o status do projeto muda' },
  ],
  Orçamentos: [
    { event: 'budget.created', label: 'Orçamento Criado', description: 'Quando um novo orçamento é criado' },
    { event: 'budget.updated', label: 'Orçamento Atualizado', description: 'Quando um orçamento é atualizado' },
    { event: 'budget.approved', label: 'Orçamento Aprovado', description: 'Quando um orçamento é aprovado' },
    { event: 'budget.rejected', label: 'Orçamento Rejeitado', description: 'Quando um orçamento é rejeitado' },
  ],
  Clientes: [
    { event: 'client.created', label: 'Cliente Criado', description: 'Quando um novo cliente é cadastrado' },
    { event: 'client.updated', label: 'Cliente Atualizado', description: 'Quando um cliente é atualizado' },
    { event: 'client.deleted', label: 'Cliente Excluído', description: 'Quando um cliente é excluído' },
  ],
  Fornecedores: [
    { event: 'supplier.created', label: 'Fornecedor Criado', description: 'Quando um novo fornecedor é cadastrado' },
    { event: 'supplier.updated', label: 'Fornecedor Atualizado', description: 'Quando um fornecedor é atualizado' },
    { event: 'supplier.deleted', label: 'Fornecedor Excluído', description: 'Quando um fornecedor é excluído' },
  ],
  Financeiro: [
    { event: 'transaction.created', label: 'Transação Criada', description: 'Quando uma nova transação é criada' },
    { event: 'transaction.paid', label: 'Transação Paga', description: 'Quando uma transação é paga' },
    { event: 'transaction.overdue', label: 'Transação Vencida', description: 'Quando uma transação vence' },
  ],
  Alertas: [
    { event: 'alert.created', label: 'Alerta Criado', description: 'Quando um novo alerta é gerado' },
    { event: 'alert.stock_low', label: 'Estoque Baixo', description: 'Quando o estoque está abaixo do mínimo' },
    { event: 'alert.payment_overdue', label: 'Pagamento Vencido', description: 'Quando há pagamentos vencidos' },
    { event: 'alert.deadline_near', label: 'Prazo Próximo', description: 'Quando um prazo está se aproximando' },
  ],
  Assinatura: [
    { event: 'subscription.created', label: 'Assinatura Criada', description: 'Quando uma nova assinatura é criada' },
    { event: 'subscription.renewed', label: 'Assinatura Renovada', description: 'Quando uma assinatura é renovada' },
    { event: 'subscription.canceled', label: 'Assinatura Cancelada', description: 'Quando uma assinatura é cancelada' },
  ],
};
