'use client';

// =============================================================================
// ConstrutorPro - Formulário de Registro
// =============================================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  Loader2, 
  CheckCircle2,
  ArrowLeft 
} from 'lucide-react';
import { PLAN_PRICES, getPlanFeatures } from '@/lib/plans';

// -----------------------------------------------------------------------------
// Validation Schema
// -----------------------------------------------------------------------------

const registroSchema = z.object({
  // Dados da Empresa
  companyName: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  cnpj: z.string()
    .min(14, 'CNPJ inválido')
    .max(18, 'CNPJ inválido')
    .refine((val) => {
      const numbers = val.replace(/\D/g, '');
      return numbers.length === 14;
    }, 'CNPJ deve conter 14 dígitos'),
  companyEmail: z.string().email('Email inválido'),
  phone: z.string().optional(),
  
  // Dados do Administrador
  adminName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  adminEmail: z.string().email('Email inválido'),
  password: z.string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  confirmPassword: z.string(),
  
  // Plano
  plan: z.enum(['starter', 'professional', 'enterprise']),
  billingCycle: z.enum(['monthly', 'annual']),
  
  // Termos
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'Você deve aceitar os termos de uso',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
});

type RegistroFormData = z.infer<typeof registroSchema>;

// -----------------------------------------------------------------------------
// Format Functions
// -----------------------------------------------------------------------------

function formatCNPJ(value: string): string {
  const numbers = value.replace(/\D/g, '');
  return numbers
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
}

function formatPhone(value: string): string {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 14);
  }
  return numbers
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function RegistroForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegistroFormData>({
    resolver: zodResolver(registroSchema),
    defaultValues: {
      plan: 'professional',
      billingCycle: 'monthly',
      acceptTerms: false,
    },
  });

  const selectedPlan = watch('plan');
  const billingCycle = watch('billingCycle');
  const cnpjValue = watch('cnpj') || '';
  const phoneValue = watch('phone') || '';

  const onSubmit = async (data: RegistroFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: {
            name: data.companyName,
            cnpj: data.cnpj.replace(/\D/g, ''),
            email: data.companyEmail,
            phone: data.phone?.replace(/\D/g, '') || null,
          },
          admin: {
            name: data.adminName,
            email: data.adminEmail,
            password: data.password,
          },
          plan: data.plan,
          billingCycle: data.billingCycle,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar conta');
      }

      setSuccess(true);
      
      // Redirecionar para login após 3 segundos
      setTimeout(() => {
        router.push('/login?registered=true');
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">Conta Criada!</h2>
          <p className="text-green-700 mb-4">
            Sua empresa foi cadastrada com sucesso. Você receberá um email para confirmar sua conta.
          </p>
          <p className="text-sm text-green-600">
            Redirecionando para o login...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar para início
        </Link>
        <h1 className="text-2xl font-bold">Criar Conta</h1>
        <p className="text-muted-foreground">
          Teste grátis por 14 dias, sem cartão de crédito
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s < step
                  ? 'bg-primary text-primary-foreground'
                  : s === step
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {s < step ? <CheckCircle2 className="h-4 w-4" /> : s}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Dados da Empresa'}
              {step === 2 && 'Dados do Administrador'}
              {step === 3 && 'Escolha seu Plano'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Informe os dados básicos da sua empresa'}
              {step === 2 && 'Crie o usuário administrador da conta'}
              {step === 3 && 'Selecione o plano que melhor atende suas necessidades'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Company Data */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nome da Empresa *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyName"
                      placeholder="Sua Construtora Ltda"
                      className="pl-10"
                      {...register('companyName')}
                    />
                  </div>
                  {errors.companyName && (
                    <p className="text-sm text-destructive">{errors.companyName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={cnpjValue}
                    onChange={(e) => setValue('cnpj', formatCNPJ(e.target.value))}
                    maxLength={18}
                  />
                  {errors.cnpj && (
                    <p className="text-sm text-destructive">{errors.cnpj.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyEmail">Email da Empresa *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="companyEmail"
                      type="email"
                      placeholder="contato@suaempresa.com.br"
                      className="pl-10"
                      {...register('companyEmail')}
                    />
                  </div>
                  {errors.companyEmail && (
                    <p className="text-sm text-destructive">{errors.companyEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="(11) 99999-9999"
                      className="pl-10"
                      value={phoneValue}
                      onChange={(e) => setValue('phone', formatPhone(e.target.value))}
                      maxLength={15}
                    />
                  </div>
                </div>

                <Button type="button" className="w-full" onClick={() => setStep(2)}>
                  Continuar
                </Button>
              </>
            )}

            {/* Step 2: Admin Data */}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="adminName">Seu Nome *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="adminName"
                      placeholder="João Silva"
                      className="pl-10"
                      {...register('adminName')}
                    />
                  </div>
                  {errors.adminName && (
                    <p className="text-sm text-destructive">{errors.adminName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Seu Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="joao@suaempresa.com.br"
                      className="pl-10"
                      {...register('adminEmail')}
                    />
                  </div>
                  {errors.adminEmail && (
                    <p className="text-sm text-destructive">{errors.adminEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      {...register('password')}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Mínimo 8 caracteres, 1 letra maiúscula e 1 número
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      {...register('confirmPassword')}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                  <Button type="button" className="flex-1" onClick={() => setStep(3)}>
                    Continuar
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Plan Selection */}
            {step === 3 && (
              <>
                {/* Billing Cycle Toggle */}
                <div className="flex gap-2 p-1 bg-muted rounded-lg mb-4">
                  <Button
                    type="button"
                    variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setValue('billingCycle', 'monthly')}
                  >
                    Mensal
                  </Button>
                  <Button
                    type="button"
                    variant={billingCycle === 'annual' ? 'default' : 'ghost'}
                    size="sm"
                    className="flex-1"
                    onClick={() => setValue('billingCycle', 'annual')}
                  >
                    Anual <Badge variant="secondary" className="ml-1">-17%</Badge>
                  </Button>
                </div>

                {/* Plan Options */}
                <div className="space-y-3">
                  {(['starter', 'professional', 'enterprise'] as const).map((plan) => {
                    const price = PLAN_PRICES[plan][billingCycle];
                    const features = getPlanFeatures(plan);
                    const isPopular = plan === 'professional';
                    
                    return (
                      <div
                        key={plan}
                        className={`relative border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedPlan === plan
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-primary/50'
                        }`}
                        onClick={() => setValue('plan', plan)}
                      >
                        {isPopular && (
                          <Badge className="absolute -top-2 right-4">Mais Popular</Badge>
                        )}
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold capitalize">{plan}</h4>
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold">
                                R$ {price}
                              </span>
                              <span className="text-muted-foreground">/mês</span>
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 ${
                            selectedPlan === plan
                              ? 'border-primary bg-primary'
                              : 'border-muted'
                          }`}>
                            {selectedPlan === plan && (
                              <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                            )}
                          </div>
                        </div>
                        <ul className="mt-3 space-y-1">
                          {features.slice(0, 4).map((feature, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                              {feature}
                            </li>
                          ))}
                          {features.length > 4 && (
                            <li className="text-sm text-primary">+{features.length - 4} recursos</li>
                          )}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                {/* Terms */}
                <div className="flex items-start gap-2 mt-4">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    className="mt-1"
                    {...register('acceptTerms')}
                  />
                  <Label htmlFor="acceptTerms" className="text-sm font-normal">
                    Li e aceito os{' '}
                    <Link href="/termos" className="text-primary hover:underline">
                      Termos de Uso
                    </Link>{' '}
                    e{' '}
                    <Link href="/privacidade" className="text-primary hover:underline">
                      Política de Privacidade
                    </Link>
                  </Label>
                </div>
                {errors.acceptTerms && (
                  <p className="text-sm text-destructive">{errors.acceptTerms.message}</p>
                )}

                {/* Trial Notice */}
                <Alert>
                  <AlertDescription className="text-center">
                    <strong>Teste grátis por 14 dias!</strong><br />
                    Não é necessário cartão de crédito para começar.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep(2)}>
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar Conta'
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </form>

      {/* Login Link */}
      <p className="text-center mt-4 text-sm text-muted-foreground">
        Já tem uma conta?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Fazer login
        </Link>
      </p>
    </>
  );
}
