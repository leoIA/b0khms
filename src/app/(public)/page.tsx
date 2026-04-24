// =============================================================================
// ConstrutorPro - Landing Page
// Página inicial pública para atrair clientes
// =============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ConstrutorPro - Gestão Completa para Construtoras',
  description: 'Plataforma premium de gestão para o mercado de construção brasileiro. Controle projetos, orçamentos, cronogramas e muito mais.',
};
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  HardHat,
  Building2,
  Calculator,
  Calendar,
  FileText,
  Bot,
  BarChart3,
  ShieldCheck,
  Smartphone,
  Zap,
  Users,
  TrendingUp,
  ArrowRight,
  Check,
  Star,
} from 'lucide-react';
import { COMPANY_PLANS } from '@/lib/constants';

// Static arrays defined outside component to prevent recreation on each render
const FEATURES = [
  {
    icon: Building2,
    title: 'Gestão de Projetos',
    description: 'Controle completo de suas obras, desde o planejamento até a entrega. Acompanhe progresso físico e financeiro em tempo real.',
  },
  {
    icon: Calculator,
    title: 'Orçamentos Precisos',
    description: 'Crie orçamentos detalhados com composições de preços atualizadas. Sinapi, TCPO e tabelas personalizadas.',
  },
  {
    icon: Calendar,
    title: 'Cronograma Físico-Financeiro',
    description: 'Planeje e acompanhe o cronograma de obras com gráficos de Gantt integrados ao financeiro.',
  },
  {
    icon: FileText,
    title: 'Diário de Obra Digital',
    description: 'Registre ocorrências, fotos e atividades diárias. Histórico completo para auditoria e documentação.',
  },
  {
    icon: Bot,
    title: 'Assistente IA',
    description: 'Tire dúvidas sobre normas técnicas, calcule quantidades e otimize seus orçamentos com inteligência artificial.',
  },
  {
    icon: BarChart3,
    title: 'Relatórios Gerenciais',
    description: 'Dashboards executivos com métricas de desempenho. Exporte relatórios para reuniões e prestação de contas.',
  },
];

const BENEFITS = [
  { icon: Zap, text: 'Reduza em 40% o tempo de elaboração de orçamentos' },
  { icon: ShieldCheck, text: 'Conformidade com normas técnicas brasileiras' },
  { icon: Smartphone, text: 'Acesse de qualquer lugar, no celular ou computador' },
  { icon: Users, text: 'Colaboração em tempo real com toda a equipe' },
];

const TESTIMONIALS = [
  {
    quote: 'O ConstrutorPro revolucionou a forma como gerenciamos nossas obras. O controle financeiro agora é preciso e confiável.',
    author: 'Carlos Silva',
    role: 'Diretor',
    company: 'Construtora Alpha',
  },
  {
    quote: 'O assistente de IA é impressionante! Ajuda a resolver dúvidas técnicas rapidamente e sugere otimizações nos orçamentos.',
    author: 'Maria Santos',
    role: 'Engenheira Civil',
    company: 'MR Engenharia',
  },
  {
    quote: 'Finalmente um software feito para a realidade brasileira. SINAPI, TCPO, tudo integrado de forma intuitiva.',
    author: 'João Oliveira',
    role: 'Orçamentista',
    company: 'Obras & Projetos',
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container relative py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Star className="h-3 w-3 mr-1 fill-current" />
              Plataforma Líder em Gestão de Obras
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Gerencie suas obras com{' '}
              <span className="text-primary">precisão e controle total</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              O software de gestão de obras mais completo do Brasil. Orçamentos, cronogramas,
              diário de obra e inteligência artificial em uma única plataforma.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="w-full sm:w-auto">
                  Começar Grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/precos">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Ver Planos
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Teste gratuito por 14 dias. Sem cartão de crédito.
            </p>
          </div>
        </div>
      </section>

      {/* Logos Section */}
      <section className="border-y bg-muted/30 py-8">
        <div className="container">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Empresas que confiam no ConstrutorPro
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {['Construtora Alpha', 'MR Engenharia', 'Obras & Projetos', 'BuildTech', 'Constrular'].map((company) => (
              <div key={company} className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-6 w-6" />
                <span className="font-semibold">{company}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight mb-6">
                Por que escolher o ConstrutorPro?
              </h2>
              <div className="space-y-4">
                {BENEFITS.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <p className="pt-2 text-muted-foreground">{benefit.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl" />
              <div className="relative bg-card border rounded-3xl p-8 shadow-xl">
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">500+</div>
                    <div className="text-sm text-muted-foreground">Empresas Ativas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">10k+</div>
                    <div className="text-sm text-muted-foreground">Projetos Gerenciados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">R$2bi+</div>
                    <div className="text-sm text-muted-foreground">Em Orçamentos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary">98%</div>
                    <div className="text-sm text-muted-foreground">Satisfação</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="recursos" className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Ferramentas poderosas para cada etapa da sua obra, do planejamento à entrega.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <Card key={index} className="bg-background">
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              O que nossos clientes dizem
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4">&quot;{testimonial.quote}&quot;</p>
                  <div>
                    <p className="font-semibold">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role}, {testimonial.company}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              Planos que cabem no seu orçamento
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Escolha o plano ideal para o tamanho da sua operação
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {Object.entries(COMPANY_PLANS).map(([key, plan]) => (
              <Card key={key} className={key === 'professional' ? 'border-primary' : ''}>
                {key === 'professional' && (
                  <div className="bg-primary text-primary-foreground text-center py-1 text-sm font-medium">
                    Mais Popular
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{plan.label}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/precos" className="block">
                    <Button
                      variant={key === 'professional' ? 'default' : 'outline'}
                      className="w-full"
                    >
                      Saiba Mais
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="bg-primary rounded-3xl p-8 md:p-12 text-center text-primary-foreground">
            <h2 className="text-3xl font-bold tracking-tight mb-4">
              Pronto para transformar sua gestão de obras?
            </h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
              Junte-se a mais de 500 construtoras que já estão economizando tempo
              e aumentando a lucratividade com o ConstrutorPro.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" variant="secondary">
                  Começar Teste Grátis
                </Button>
              </Link>
              <Link href="/contato">
                <Button size="lg" variant="outline" className="bg-transparent border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                  Falar com Especialista
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
