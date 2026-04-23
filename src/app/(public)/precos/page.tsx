// =============================================================================
// ConstrutorPro - Página de Preços
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Preços | ConstrutorPro',
  description: 'Planos flexíveis que crescem com sua construtora. Todos com teste gratuito de 14 dias. Escolha o plano ideal para sua empresa.',
  keywords: ['preços', 'planos', 'construção', 'gestão', 'projetos', 'Brasil'],
};
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, HelpCircle, ArrowRight } from 'lucide-react';
import { COMPANY_PLANS } from '@/lib/constants';

const PLAN_PRICES = {
  trial: { monthly: 0, annual: 0 },
  starter: { monthly: 299, annual: 249 },
  professional: { monthly: 799, annual: 649 },
  enterprise: { monthly: 1999, annual: 1599 },
};

// Planos que devem ser exibidos na página de preços (exclui trial)
const DISPLAY_PLANS = ['starter', 'professional', 'enterprise'] as const;

const faqItems = [
  {
    question: 'Posso trocar de plano a qualquer momento?',
    answer: 'Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. O valor será calculado proporcionalmente.',
  },
  {
    question: 'O teste gratuito tem alguma limitação?',
    answer: 'Durante os 14 dias de teste gratuito, você terá acesso a todas as funcionalidades do plano Professional, sem limitações.',
  },
  {
    question: 'Quais formas de pagamento são aceitas?',
    answer: 'Aceitamos cartão de crédito (Visa, Mastercard, Elo, Amex), PIX, boleto bancário e transferência para planos anuais.',
  },
  {
    question: 'Os dados da minha empresa estão seguros?',
    answer: 'Sim! Utilizamos criptografia de ponta a ponta, backups automáticos diários e nossa infraestrutura está em datacenters certificados no Brasil.',
  },
  {
    question: 'Tenho suporte durante o teste gratuito?',
    answer: 'Sim! Durante o período de teste você tem acesso ao nosso suporte por email e chat para tirar todas as suas dúvidas.',
  },
  {
    question: 'Posso cancelar a qualquer momento?',
    answer: 'Sim, não há multa ou período de fidelidade. Você pode cancelar sua assinatura quando quiser diretamente pela plataforma.',
  },
];

export default function PrecosPage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            Preços Transparentes
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Escolha o plano ideal para sua empresa
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Planos flexíveis que crescem com sua construtora. Todos com teste gratuito de 14 dias.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-16">
          {DISPLAY_PLANS.map((key) => {
            const plan = COMPANY_PLANS[key];
            const prices = PLAN_PRICES[key];
            const isPopular = key === 'professional';

            return (
              <Card
                key={key}
                className={`relative ${isPopular ? 'border-primary shadow-lg scale-105' : ''}`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Mais Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">{plan.label}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Price */}
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">
                        R$ {prices.monthly}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      ou R$ {prices.annual}/mês (anual)
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link href="/login" className="block">
                    <Button
                      className="w-full"
                      variant={isPopular ? 'default' : 'outline'}
                    >
                      Começar Teste Grátis
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features Comparison */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            Compare os Recursos
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Recurso</th>
                      <th className="text-center p-4 font-medium">Starter</th>
                      <th className="text-center p-4 font-medium bg-muted/50">Professional</th>
                      <th className="text-center p-4 font-medium">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Usuários', starter: '5', professional: '20', enterprise: 'Ilimitado' },
                      { name: 'Projetos Ativos', starter: '10', professional: 'Ilimitado', enterprise: 'Ilimitado' },
                      { name: 'Orçamentos', starter: 'Básico', professional: 'Completo', enterprise: 'Completo' },
                      { name: 'Cronograma', starter: '—', professional: '✓', enterprise: '✓' },
                      { name: 'Diário de Obra', starter: '✓', professional: '✓', enterprise: '✓' },
                      { name: 'Financeiro', starter: '—', professional: '✓', enterprise: '✓' },
                      { name: 'Assistente IA', starter: '—', professional: '✓', enterprise: '✓' },
                      { name: 'Relatórios', starter: 'Básico', professional: 'Avançado', enterprise: 'Personalizado' },
                      { name: 'API de Integração', starter: '—', professional: '—', enterprise: '✓' },
                      { name: 'Suporte', starter: 'Email', professional: 'Prioritário', enterprise: '24/7' },
                    ].map((row, index) => (
                      <tr key={index} className="border-b last:border-0">
                        <td className="p-4 text-muted-foreground">{row.name}</td>
                        <td className="text-center p-4">
                          {row.starter === '—' ? (
                            <span className="text-muted-foreground">—</span>
                          ) : row.starter === '✓' ? (
                            <Check className="h-4 w-4 mx-auto text-primary" />
                          ) : (
                            row.starter
                          )}
                        </td>
                        <td className="text-center p-4 bg-muted/50">
                          {row.professional === '—' ? (
                            <span className="text-muted-foreground">—</span>
                          ) : row.professional === '✓' ? (
                            <Check className="h-4 w-4 mx-auto text-primary" />
                          ) : (
                            row.professional
                          )}
                        </td>
                        <td className="text-center p-4">
                          {row.enterprise === '—' ? (
                            <span className="text-muted-foreground">—</span>
                          ) : row.enterprise === '✓' ? (
                            <Check className="h-4 w-4 mx-auto text-primary" />
                          ) : (
                            row.enterprise
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">
            Perguntas Frequentes
          </h2>
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-base flex items-start gap-2">
                    <HelpCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    {item.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{item.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <p className="text-lg text-muted-foreground mb-4">
            Ainda tem dúvidas? Nossa equipe está pronta para ajudar.
          </p>
          <Link href="/contato">
            <Button size="lg">
              Falar com Especialista
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
