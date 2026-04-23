'use client';

// =============================================================================
// ConstrutorPro - Página de Assinatura (Client)
// =============================================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle2,
  CreditCard,
  Calendar,
  AlertTriangle,
  Loader2,
  Crown,
  Building2,
  Users,
  FolderKanban,
  ArrowRight,
} from 'lucide-react';
import { PLAN_PRICES, getPlanLimits, getRemainingTrialDays, getPlanFeatures, type CompanyPlan } from '@/lib/plans';

interface SubscriptionData {
  plan: CompanyPlan;
  planExpiresAt: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  isActive: boolean;
}

export default function AssinaturaClient() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

  useEffect(() => {
    fetchSubscription();
  }, []);

  async function fetchSubscription() {
    try {
      const response = await fetch('/api/subscription/status');
      const data = await response.json();
      if (data.success) {
        setSubscription(data.data);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCheckout(plan: CompanyPlan, billingCycle: 'monthly' | 'annual') {
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billingCycle }),
      });

      const data = await response.json();
      
      if (data.success && data.data.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      } else {
        alert('Erro ao processar checkout. Tente novamente.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Erro ao processar checkout. Tente novamente.');
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isTrial = subscription?.subscriptionStatus === 'trial' || subscription?.plan === 'trial';
  const trialDaysLeft = subscription?.trialEndsAt ? getRemainingTrialDays(new Date(subscription.trialEndsAt)) : 0;
  const currentPlan = subscription?.plan || 'trial';
  const limits = getPlanLimits(currentPlan);

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Assinatura</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie seu plano e assinatura
        </p>
      </div>

      {/* Trial Alert */}
      {isTrial && trialDaysLeft > 0 && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50">
          <Calendar className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Período de Teste</AlertTitle>
          <AlertDescription className="text-yellow-700">
            Você tem <strong>{trialDaysLeft} dias</strong> restantes do seu período de teste.
            Escolha um plano para continuar usando todas as funcionalidades.
          </AlertDescription>
        </Alert>
      )}

      {/* Trial Expired Alert */}
      {isTrial && trialDaysLeft <= 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Teste Expirado</AlertTitle>
          <AlertDescription>
            Seu período de teste expirou. Escolha um plano para continuar usando o ConstrutorPro.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Plano Atual: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
              </CardTitle>
              <CardDescription>
                {subscription?.subscriptionStatus === 'active' && 'Assinatura ativa'}
                {subscription?.subscriptionStatus === 'trial' && 'Em período de teste'}
                {subscription?.subscriptionStatus === 'past_due' && 'Pagamento pendente'}
                {subscription?.subscriptionStatus === 'canceled' && 'Assinatura cancelada'}
              </CardDescription>
            </div>
            {subscription?.subscriptionStatus === 'active' && (
              <Badge className="bg-green-500">Ativo</Badge>
            )}
            {subscription?.subscriptionStatus === 'trial' && (
              <Badge variant="secondary">Teste</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Usuários</p>
                <p className="font-semibold">
                  {limits.maxUsers || 'Ilimitado'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Projetos</p>
                <p className="font-semibold">
                  {limits.maxProjects || 'Ilimitado'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              <Building2 className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Clientes</p>
                <p className="font-semibold">
                  {limits.maxClients || 'Ilimitado'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg bg-muted">
              <Calendar className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Renovação</p>
                <p className="font-semibold">
                  {subscription?.planExpiresAt 
                    ? new Date(subscription.planExpiresAt).toLocaleDateString('pt-BR')
                    : '—'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Current Features */}
          <div className="mt-6">
            <h4 className="font-medium mb-3">Recursos inclusos:</h4>
            <div className="flex flex-wrap gap-2">
              {getPlanFeatures(currentPlan).map((feature, i) => (
                <Badge key={i} variant="secondary" className="bg-green-100 text-green-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {feature}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Selection */}
      <h2 className="text-2xl font-bold mb-4">Escolha seu Plano</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {(['starter', 'professional', 'enterprise'] as const).map((plan) => {
          const planLimits = getPlanLimits(plan);
          const isCurrentPlan = currentPlan === plan;
          const isPopular = plan === 'professional';
          
          return (
            <Card
              key={plan}
              className={`relative ${isPopular ? 'border-primary shadow-lg' : ''} ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">Mais Popular</Badge>
                </div>
              )}
              {isCurrentPlan && (
                <div className="absolute -top-3 right-4">
                  <Badge variant="outline" className="bg-background">Plano Atual</Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl capitalize">{plan}</CardTitle>
                <CardDescription>
                  {plan === 'starter' && 'Ideal para pequenas construtoras'}
                  {plan === 'professional' && 'Para construtoras em crescimento'}
                  {plan === 'enterprise' && 'Para grandes construtoras'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Price */}
                <div className="text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      R$ {PLAN_PRICES[plan].monthly}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    ou R$ {PLAN_PRICES[plan].annual}/mês (anual)
                  </p>
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {getPlanFeatures(plan).map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA Buttons */}
                <div className="space-y-2">
                  {!isCurrentPlan ? (
                    <>
                      <Button
                        className="w-full"
                        variant={isPopular ? 'default' : 'outline'}
                        onClick={() => handleCheckout(plan, 'monthly')}
                        disabled={checkoutLoading}
                      >
                        {checkoutLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            Assinar Mensal
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                      <Button
                        className="w-full"
                        variant="secondary"
                        onClick={() => handleCheckout(plan, 'annual')}
                        disabled={checkoutLoading}
                      >
                        Assinar Anual
                        <Badge variant="secondary" className="ml-2">-17%</Badge>
                      </Button>
                    </>
                  ) : (
                    <Button className="w-full" disabled>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Plano Atual
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Perguntas Frequentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium">Posso mudar de plano a qualquer momento?</h4>
            <p className="text-muted-foreground text-sm">
              Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. 
              O valor será calculado proporcionalmente.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Quais formas de pagamento são aceitas?</h4>
            <p className="text-muted-foreground text-sm">
              Aceitamos cartão de crédito (Visa, Mastercard, Elo, Amex), PIX e boleto bancário.
            </p>
          </div>
          <div>
            <h4 className="font-medium">Posso cancelar minha assinatura?</h4>
            <p className="text-muted-foreground text-sm">
              Sim, você pode cancelar a qualquer momento. Você continuará tendo acesso até o 
              final do período já pago.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
