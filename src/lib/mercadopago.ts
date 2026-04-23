// =============================================================================
// ConstrutorPro - Mercado Pago Integration
// =============================================================================

import type { CompanyPlan } from '@/types';
import { PLAN_PRICES } from './plans';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MercadoPagoConfig {
  accessToken: string;
  publicKey: string;
  webhookSecret: string;
  baseUrl: string;
}

export interface CreatePreferencePayload {
  plan: CompanyPlan;
  billingCycle: 'monthly' | 'annual';
  companyId: string;
  companyName: string;
  companyEmail: string;
}

export interface MercadoPagoPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  external_reference: string;
}

export interface WebhookData {
  type: string;
  data: {
    id: string;
  };
}

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

export function getMercadoPagoConfig(): MercadoPagoConfig {
  const isProduction = String(process.env.NODE_ENV) === 'production';
  
  return {
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
    publicKey: process.env.MERCADO_PAGO_PUBLIC_KEY || '',
    webhookSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET || '',
    baseUrl: isProduction 
      ? 'https://api.mercadopago.com'
      : 'https://api.mercadopago.com', // Sandbox uses same URL with different tokens
  };
}

// -----------------------------------------------------------------------------
// API Client
// -----------------------------------------------------------------------------

async function mpFetch(
  path: string, 
  options: RequestInit = {}
): Promise<Response> {
  const config = getMercadoPagoConfig();
  
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  return response;
}

// -----------------------------------------------------------------------------
// Preference Creation (for one-time payment / checkout)
// -----------------------------------------------------------------------------

export async function createCheckoutPreference(
  payload: CreatePreferencePayload
): Promise<MercadoPagoPreference> {
  const config = getMercadoPagoConfig();
  const price = PLAN_PRICES[payload.plan][payload.billingCycle];
  const planName = payload.plan.charAt(0).toUpperCase() + payload.plan.slice(1);
  const billingName = payload.billingCycle === 'annual' ? 'Anual' : 'Mensal';
  
  const preferenceData = {
    items: [
      {
        id: `plan-${payload.plan}-${payload.billingCycle}`,
        title: `ConstrutorPro - Plano ${planName} (${billingName})`,
        description: `Assinatura do plano ${planName} - Ciclo ${billingName}`,
        category_id: 'services',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: price,
      },
    ],
    payer: {
      name: payload.companyName,
      email: payload.companyEmail,
    },
    external_reference: `company-${payload.companyId}-plan-${payload.plan}`,
    back_urls: {
      success: `${process.env.NEXT_PUBLIC_APP_URL}/assinatura/sucesso`,
      failure: `${process.env.NEXT_PUBLIC_APP_URL}/assinatura/erro`,
      pending: `${process.env.NEXT_PUBLIC_APP_URL}/assinatura/pendente`,
    },
    auto_return: 'approved',
    notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
    statement_descriptor: 'CONSTRUTORPRO',
    expires: true,
    expiration_date_from: new Date().toISOString(),
    expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
    metadata: {
      company_id: payload.companyId,
      plan: payload.plan,
      billing_cycle: payload.billingCycle,
    },
  };

  const response = await mpFetch('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(preferenceData),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[MercadoPago] Create preference error:', error);
    throw new Error('Erro ao criar preferência de pagamento');
  }

  return response.json();
}

// -----------------------------------------------------------------------------
// Subscription Creation (Recurring Payments)
// -----------------------------------------------------------------------------

export async function createSubscription(
  payload: CreatePreferencePayload
): Promise<{ id: string; init_point: string }> {
  const config = getMercadoPagoConfig();
  const price = PLAN_PRICES[payload.plan][payload.billingCycle];
  const planName = payload.plan.charAt(0).toUpperCase() + payload.plan.slice(1);
  
  // Create preapproval plan
  const preapprovalData = {
    reason: `ConstrutorPro - Plano ${planName}`,
    external_reference: `company-${payload.companyId}`,
    payer_email: payload.companyEmail,
    auto_recurring: {
      frequency: payload.billingCycle === 'annual' ? 12 : 1,
      frequency_type: 'months',
      transaction_amount: price,
      currency_id: 'BRL',
    },
    back_url: `${process.env.NEXT_PUBLIC_APP_URL}/assinatura/retorno`,
    notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
  };

  const response = await mpFetch('/preapproval', {
    method: 'POST',
    body: JSON.stringify(preapprovalData),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('[MercadoPago] Create subscription error:', error);
    throw new Error('Erro ao criar assinatura');
  }

  return response.json();
}

// -----------------------------------------------------------------------------
// Payment Info Retrieval
// -----------------------------------------------------------------------------

export async function getPaymentInfo(paymentId: string): Promise<{
  id: string;
  status: string;
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  payment_method_id: string;
  payment_type_id: string;
  external_reference: string;
  date_created: string;
  date_approved?: string;
  payer: {
    email: string;
    id: number;
  };
  metadata: {
    company_id?: string;
    plan?: string;
    billing_cycle?: string;
  };
}> {
  const response = await mpFetch(`/v1/payments/${paymentId}`);

  if (!response.ok) {
    const error = await response.json();
    console.error('[MercadoPago] Get payment error:', error);
    throw new Error('Erro ao obter informações do pagamento');
  }

  return response.json();
}

// -----------------------------------------------------------------------------
// Customer Management
// -----------------------------------------------------------------------------

export async function createOrUpdateCustomer(
  companyId: string,
  email: string,
  name: string
): Promise<{ id: string }> {
  const response = await mpFetch('/v1/customers', {
    method: 'POST',
    body: JSON.stringify({
      email,
      first_name: name,
      description: `Cliente ConstrutorPro - ${companyId}`,
      metadata: {
        company_id: companyId,
      },
    }),
  });

  // If customer already exists, try to get it
  if (!response.ok) {
    const searchResponse = await mpFetch(`/v1/customers/search?email=${email}`);
    if (searchResponse.ok) {
      const data = await searchResponse.json();
      if (data.results && data.results.length > 0) {
        return { id: data.results[0].id };
      }
    }
    throw new Error('Erro ao criar/atualizar cliente');
  }

  return response.json();
}

// -----------------------------------------------------------------------------
// Webhook Signature Verification
// -----------------------------------------------------------------------------

export function verifyWebhookSignature(
  signature: string,
  payload: string
): boolean {
  // In production, implement proper signature verification
  // Mercado Pago sends x-signature header
  // For now, return true for development
  if (String(process.env.NODE_ENV) !== 'production') {
    return true;
  }
  
  // TODO: Implement proper HMAC verification
  const config = getMercadoPagoConfig();
  return signature === config.webhookSecret;
}

// -----------------------------------------------------------------------------
// Plan Mapping
// -----------------------------------------------------------------------------

export function mapPlanFromExternalReference(
  externalReference: string
): { companyId: string; plan: CompanyPlan } | null {
  // Parse external reference: "company-{id}-plan-{plan}"
  const match = externalReference.match(/company-([a-z0-9]+)-plan-(\w+)/);
  if (!match) return null;
  
  return {
    companyId: match[1],
    plan: match[2] as CompanyPlan,
  };
}
