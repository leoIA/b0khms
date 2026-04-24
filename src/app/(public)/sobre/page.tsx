// =============================================================================
// ConstrutorPro - Página Sobre
// =============================================================================

import type { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Sobre Nós | ConstrutorPro',
  description: 'Conheça a história do ConstrutorPro. Somos uma empresa brasileira dedicada a transformar a gestão de obras com tecnologia e inovação.',
  keywords: ['construção', 'gestão', 'projetos', 'Brasil', 'sobre nós'],
};
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Target,
  Heart,
  Lightbulb,
  Users,
  Award,
  Globe,
  Rocket,
} from 'lucide-react';

const values = [
  {
    icon: Target,
    title: 'Precisão',
    description: 'Cada detalhe importa na construção civil. Nossos ferramentas são desenvolvidas para garantir exatidão em todos os processos.',
  },
  {
    icon: Heart,
    title: 'Compromisso',
    description: 'Estamos comprometidos com o sucesso dos nossos clientes. Cada funcionalidade é pensada para resolver problemas reais.',
  },
  {
    icon: Lightbulb,
    title: 'Inovação',
    description: 'Utilizamos as mais modernas tecnologias, incluindo inteligência artificial, para tornar a gestão de obras mais eficiente.',
  },
  {
    icon: Users,
    title: 'Colaboração',
    description: 'Acreditamos que grandes obras são construídas por grandes equipes. Facilitamos a comunicação e o trabalho em conjunto.',
  },
];

const team = [
  {
    name: 'Ricardo Mendes',
    role: 'CEO & Fundador',
    bio: 'Engenheiro Civil com 20 anos de experiência em grandes obras. Fundou a ConstrutorPro para resolver os problemas que vivenciou em campo.',
  },
  {
    name: 'Ana Paula Costa',
    role: 'CTO',
    bio: 'Desenvolvedora com background em sistemas empresariais. Lidera a equipe técnica com foco em performance e usabilidade.',
  },
  {
    name: 'Fernando Lima',
    role: 'Head de Produto',
    bio: 'Especialista em UX com experiência em SaaS B2B. Garante que cada funcionalidade atenda às necessidades dos usuários.',
  },
  {
    name: 'Carla Rodrigues',
    role: 'Head de Customer Success',
    bio: 'Focada em garantir que cada cliente extraia o máximo valor da plataforma, desde o onboarding até o sucesso contínuo.',
  },
];

const milestones = [
  { year: '2020', event: 'Fundação da ConstrutorPro' },
  { year: '2021', event: 'Primeiro cliente pago' },
  { year: '2022', event: 'Lançamento do módulo de IA' },
  { year: '2023', event: '500+ empresas ativas' },
  { year: '2024', event: 'Expansão para todos os estados do Brasil' },
];

export default function SobrePage() {
  return (
    <div className="py-16 md:py-24">
      <div className="container">
        {/* Hero */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Nossa História
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Construindo o futuro da construção civil
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Somos uma empresa brasileira, criada por engenheiros e desenvolvedores
            que entendem os desafios do dia a dia das obras.
          </p>
        </div>

        {/* Mission */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <h2 className="text-3xl font-bold mb-4">Nossa Missão</h2>
            <p className="text-muted-foreground mb-4">
              Democratizar o acesso a ferramentas de gestão profissional para construtoras
              de todos os tamanhos. Acreditamos que a tecnologia pode transformar a forma
              como obras são planejadas, executadas e entregues.
            </p>
            <p className="text-muted-foreground">
              O ConstrutorPro nasceu da frustração de ver construtoras perdendo dinheiro
              por falta de controle adequado. Nosso objetivo é simples: ajudar construtoras
              brasileiras a serem mais lucrativas, eficientes e competitivas.
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent rounded-3xl" />
            <div className="relative bg-card border rounded-3xl p-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <Building2 className="h-8 w-8 mx-auto text-primary mb-2" />
                  <div className="text-2xl font-bold">500+</div>
                  <div className="text-sm text-muted-foreground">Empresas</div>
                </div>
                <div className="text-center">
                  <Globe className="h-8 w-8 mx-auto text-primary mb-2" />
                  <div className="text-2xl font-bold">27</div>
                  <div className="text-sm text-muted-foreground">Estados</div>
                </div>
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto text-primary mb-2" />
                  <div className="text-2xl font-bold">5.000+</div>
                  <div className="text-sm text-muted-foreground">Usuários</div>
                </div>
                <div className="text-center">
                  <Award className="h-8 w-8 mx-auto text-primary mb-2" />
                  <div className="text-2xl font-bold">98%</div>
                  <div className="text-sm text-muted-foreground">Satisfação</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Nossos Valores</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Nossa Trajetória</h2>
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className={`relative flex items-center gap-8 mb-8 ${
                  index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                }`}
              >
                <div className={`flex-1 ${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                  <div className="inline-block bg-card border rounded-lg p-4">
                    <div className="text-primary font-bold">{milestone.year}</div>
                    <div className="text-sm text-muted-foreground">{milestone.event}</div>
                  </div>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary" />
                <div className="flex-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div>
          <h2 className="text-3xl font-bold text-center mb-4">Liderança</h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Uma equipe de especialistas comprometidos em transformar a gestão de obras no Brasil.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, index) => (
              <Card key={index}>
                <CardContent className="pt-6 text-center">
                  <div className="w-20 h-20 rounded-full bg-primary/10 mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                      {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <h3 className="font-semibold">{member.name}</h3>
                  <p className="text-sm text-primary mb-2">{member.role}</p>
                  <p className="text-xs text-muted-foreground">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
