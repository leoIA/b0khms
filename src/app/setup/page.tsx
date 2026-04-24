// =============================================================================
// ConstrutorPro - Setup Page
// =============================================================================

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  HardHat, 
  Loader2, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2, 
  Database,
  User,
  Building2,
  Key,
  RefreshCw,
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Shield,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Tipos
interface SetupStatus {
  configured: boolean;
  hasDatabaseUrl: boolean;
  databaseConnected: boolean;
  tablesExist: boolean;
  hasAdminUser: boolean;
  needsSetup: boolean;
  message: string;
  details?: {
    databaseType?: string;
    tableCount?: number;
    userCount?: number;
  };
}

interface SetupStep {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
}

interface VercelInstructions {
  title: string;
  description: string;
  variables: Array<{ name: string; value: string; masked?: boolean }>;
  optional: Array<{ name: string; value: string }>;
  steps: string[];
}

// Componente de Skeleton
function SetupSkeleton() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary animate-pulse" />
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-xl space-y-8">
          <div className="h-96 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Componente principal
export default function SetupPage() {
  return (
    <Suspense fallback={<SetupSkeleton />}>
      <SetupContent />
    </Suspense>
  );
}

function SetupContent() {
  const router = useRouter();
  
  // Estados
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [alreadyConfigured, setAlreadyConfigured] = useState(false);
  const [showVercelInstructions, setShowVercelInstructions] = useState(false);
  const [vercelInstructions, setVercelInstructions] = useState<VercelInstructions | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  
  // Estados de visibilidade de senhas
  const [showDatabaseUrl, setShowDatabaseUrl] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  
  // Estado do progresso
  const [currentStep, setCurrentStep] = useState(0);
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([]);
  
  // Estado do status
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  
  // Dados do formulário
  const [formData, setFormData] = useState({
    databaseUrl: '',
    nextauthSecret: '',
    nextauthUrl: typeof window !== 'undefined' ? window.location.origin : '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
    companyName: '',
    companyCnpj: '',
    companyEmail: '',
    mercadoPagoAccessToken: '',
    mercadoPagoPublicKey: '',
  });

  // Estado de erro/sucesso
  const [status, setStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });

  // Verificar status ao carregar
  useEffect(() => {
    async function checkSetup() {
      try {
        const response = await fetch('/api/setup/status');
        const data: SetupStatus = await response.json();
        
        setSetupStatus(data);
        
        if (data.configured && !data.needsSetup) {
          setAlreadyConfigured(true);
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      } finally {
        setCheckingStatus(false);
      }
    }
    
    checkSetup();
  }, [router]);

  // Gerar senha aleatória
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, adminPassword: password });
  };

  // Gerar secret aleatório
  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, nextauthSecret: secret });
  };

  // Copiar para clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ type: 'success', message: 'Copiado para a área de transferência!' });
      setTimeout(() => setStatus({ type: 'idle', message: '' }), 2000);
    } catch {
      setStatus({ type: 'error', message: 'Erro ao copiar' });
    }
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: 'idle', message: '' });
    setSetupSteps([]);
    setCurrentStep(0);

    // Validações
    if (!formData.databaseUrl) {
      setStatus({ type: 'error', message: 'URL do banco de dados é obrigatória' });
      setLoading(false);
      return;
    }

    if (!formData.adminName || !formData.adminEmail || !formData.adminPassword) {
      setStatus({ type: 'error', message: 'Dados do administrador são obrigatórios' });
      setLoading(false);
      return;
    }

    if (!formData.companyName || !formData.companyCnpj || !formData.companyEmail) {
      setStatus({ type: 'error', message: 'Dados da empresa são obrigatórios' });
      setLoading(false);
      return;
    }

    if (formData.adminPassword.length < 8) {
      setStatus({ type: 'error', message: 'A senha deve ter pelo menos 8 caracteres' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSetupSteps(data.steps || []);
        setCurrentStep(data.steps?.length || 0);
        setSetupComplete(true);
        
        if (data.vercelInstructions) {
          setVercelInstructions(data.vercelInstructions);
        }
        
        setStatus({ type: 'success', message: data.message });
      } else {
        setSetupSteps(data.steps || []);
        setStatus({ type: 'error', message: data.error || 'Erro ao realizar setup' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Erro de conexão. Verifique se o servidor está funcionando.' });
    } finally {
      setLoading(false);
    }
  };

  // Tela de carregamento inicial
  if (checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando configurações do sistema...</p>
        </div>
      </div>
    );
  }

  // Se já configurado
  if (alreadyConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Sistema Já Configurado</h2>
              <p className="text-muted-foreground">Redirecionando para o login...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela de setup completo com instruções Vercel
  if (setupComplete && vercelInstructions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold">Setup Concluído!</h1>
            <p className="text-muted-foreground mt-2">
              O sistema foi configurado com sucesso. Siga os passos abaixo para finalizar.
            </p>
          </div>

          {/* Instruções Vercel */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                {vercelInstructions.title}
              </CardTitle>
              <CardDescription>{vercelInstructions.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Variáveis obrigatórias */}
              <div className="space-y-3">
                <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                  Variáveis Obrigatórias
                </h3>
                {vercelInstructions.variables.map((variable, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <p className="font-mono text-sm font-medium">{variable.name}</p>
                      <p className="font-mono text-xs text-muted-foreground truncate">
                        {variable.masked ? '••••••••••••' : variable.value}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(variable.value)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Variáveis opcionais */}
              {vercelInstructions.optional.some(v => v.value) && (
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <span>Variáveis Opcionais</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    {vercelInstructions.optional.filter(v => v.value).map((variable, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                        <div className="flex-1">
                          <p className="font-mono text-sm font-medium">{variable.name}</p>
                          <p className="font-mono text-xs text-muted-foreground truncate">
                            {variable.value}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(variable.value)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Passos */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                  Passos no Vercel
                </h3>
                <ol className="space-y-2">
                  {vercelInstructions.steps.map((step, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open('https://vercel.com/dashboard', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Vercel
              </Button>
              <Button
                className="flex-1"
                onClick={() => router.push('/login')}
              >
                Ir para Login
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Formulário principal
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary text-primary-foreground flex-col justify-between p-12">
        <div>
          <Link href="/" className="flex items-center gap-3">
            <HardHat className="h-10 w-10" />
            <span className="text-2xl font-bold">ConstrutorPro</span>
          </Link>
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Configuração Inicial
          </h1>
          <p className="text-lg opacity-90">
            Configure seu sistema em poucos passos. Você precisará de:
          </p>
          <ul className="space-y-3">
            <li className="flex items-center gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary-foreground/20 text-sm">
                1
              </span>
              Um banco de dados PostgreSQL
            </li>
            <li className="flex items-center gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary-foreground/20 text-sm">
                2
              </span>
              Dados da sua empresa
            </li>
            <li className="flex items-center gap-3">
              <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary-foreground/20 text-sm">
                3
              </span>
              Dados do administrador
            </li>
          </ul>
        </div>

        <div className="text-sm opacity-70">
          © 2024 ConstrutorPro. Todos os direitos reservados.
        </div>
      </div>

      {/* Right Panel - Setup Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-slate-100 overflow-y-auto">
        <div className="w-full max-w-xl space-y-6">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2">
              <HardHat className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">ConstrutorPro</span>
            </Link>
          </div>

          {/* Progress indicator */}
          {loading && setupSteps.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progresso do Setup</span>
                    <span>{currentStep}/{setupSteps.length}</span>
                  </div>
                  <Progress value={(currentStep / setupSteps.length) * 100} />
                  <div className="space-y-1">
                    {setupSteps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        {step.status === 'running' && (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        )}
                        {step.status === 'success' && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        {step.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        )}
                        {step.status === 'pending' && (
                          <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                        )}
                        <span className={step.status === 'running' ? 'text-blue-600 font-medium' : ''}>
                          {step.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Configurar Sistema</CardTitle>
              <CardDescription>
                Preencha os dados abaixo para iniciar a configuração
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                {/* Status Message */}
                {status.type !== 'idle' && (
                  <Alert variant={status.type === 'error' ? 'destructive' : 'default'} className={status.type === 'success' ? 'border-green-200 bg-green-50' : ''}>
                    {status.type === 'error' ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    )}
                    <AlertTitle>{status.type === 'error' ? 'Erro' : 'Sucesso'}</AlertTitle>
                    <AlertDescription>{status.message}</AlertDescription>
                  </Alert>
                )}

                {/* Seção: Banco de Dados */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    <Database className="h-4 w-4" />
                    Banco de Dados
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="databaseUrl">
                      URL do Banco de Dados *
                    </Label>
                    <div className="relative">
                      <Input
                        id="databaseUrl"
                        type={showDatabaseUrl ? 'text' : 'password'}
                        placeholder="postgresql://usuario:senha@host:5432/banco"
                        value={formData.databaseUrl}
                        onChange={(e) => setFormData({ ...formData, databaseUrl: e.target.value })}
                        className="pr-10 font-mono text-sm"
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowDatabaseUrl(!showDatabaseUrl)}
                      >
                        {showDatabaseUrl ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PostgreSQL: <code className="bg-muted px-1 rounded">postgresql://usuario:senha@host:5432/banco</code>
                    </p>
                  </div>
                </div>

                {/* Seção: NextAuth */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    <Key className="h-4 w-4" />
                    Autenticação
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nextauthSecret">
                        Chave Secreta
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="nextauthSecret"
                          type="text"
                          placeholder="Gerado automaticamente"
                          value={formData.nextauthSecret}
                          onChange={(e) => setFormData({ ...formData, nextauthSecret: e.target.value })}
                          className="font-mono text-sm"
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={generateSecret}
                          title="Gerar aleatório"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nextauthUrl">
                        URL do Sistema
                      </Label>
                      <Input
                        id="nextauthUrl"
                        type="url"
                        placeholder="https://seusite.com"
                        value={formData.nextauthUrl}
                        onChange={(e) => setFormData({ ...formData, nextauthUrl: e.target.value })}
                        className="font-mono text-sm"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* Seção: Empresa */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    <Building2 className="h-4 w-4" />
                    Empresa
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="companyName">
                        Nome da Empresa *
                      </Label>
                      <Input
                        id="companyName"
                        type="text"
                        placeholder="Construtora Exemplo Ltda"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyCnpj">
                        CNPJ *
                      </Label>
                      <Input
                        id="companyCnpj"
                        type="text"
                        placeholder="00.000.000/0001-00"
                        value={formData.companyCnpj}
                        onChange={(e) => setFormData({ ...formData, companyCnpj: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyEmail">
                        Email da Empresa *
                      </Label>
                      <Input
                        id="companyEmail"
                        type="email"
                        placeholder="contato@empresa.com.br"
                        value={formData.companyEmail}
                        onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* Seção: Administrador */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    <Shield className="h-4 w-4" />
                    Administrador
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="adminName">
                        Nome Completo *
                      </Label>
                      <Input
                        id="adminName"
                        type="text"
                        placeholder="João Silva"
                        value={formData.adminName}
                        onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">
                        Email *
                      </Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        placeholder="admin@empresa.com.br"
                        value={formData.adminEmail}
                        onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                        disabled={loading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="adminPassword">
                        Senha *
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="adminPassword"
                            type={showAdminPassword ? 'text' : 'password'}
                            placeholder="Mínimo 8 caracteres"
                            value={formData.adminPassword}
                            onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                            className="pr-10"
                            disabled={loading}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                          >
                            {showAdminPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={generatePassword}
                          title="Gerar senha forte"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção: MercadoPago (Opcional) */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="mercadopago" className="border-none">
                    <AccordionTrigger className="text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline py-2">
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Integração MercadoPago (Opcional)
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4 md:grid-cols-2 pt-2">
                        <div className="space-y-2">
                          <Label htmlFor="mercadoPagoToken">Access Token</Label>
                          <Input
                            id="mercadoPagoToken"
                            type="text"
                            placeholder="TEST-xxxx-xxxx-xxxx"
                            value={formData.mercadoPagoAccessToken}
                            onChange={(e) => setFormData({ ...formData, mercadoPagoAccessToken: e.target.value })}
                            className="font-mono text-sm"
                            disabled={loading}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="mercadoPagoKey">Public Key</Label>
                          <Input
                            id="mercadoPagoKey"
                            type="text"
                            placeholder="TEST-xxxx-xxxx-xxxx"
                            value={formData.mercadoPagoPublicKey}
                            onChange={(e) => setFormData({ ...formData, mercadoPagoPublicKey: e.target.value })}
                            className="font-mono text-sm"
                            disabled={loading}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Configure depois em Configurações → Pagamentos se preferir.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Ajuda */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="help" className="border-none">
                    <AccordionTrigger className="text-sm text-muted-foreground hover:no-underline py-2">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Precisa de ajuda?
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm text-muted-foreground pt-2">
                        <div>
                          <h4 className="font-medium text-foreground">Bancos Gratuitos Recomendados</h4>
                          <ul className="list-disc list-inside space-y-1 mt-1">
                            <li><strong>Supabase</strong> - PostgreSQL gratuito (supabase.com)</li>
                            <li><strong>Neon</strong> - PostgreSQL serverless (neon.tech)</li>
                            <li><strong>Railway</strong> - PostgreSQL/MySQL (railway.app)</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">Formato da URL</h4>
                          <code className="block bg-muted p-2 rounded text-xs mt-1">
                            postgresql://usuario:senha@host:5432/nome_banco
                          </code>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>

              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Configurando Sistema...
                    </>
                  ) : (
                    <>
                      <Database className="mr-2 h-4 w-4" />
                      Iniciar Configuração
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            Ao continuar, você concorda com nossos{' '}
            <Link href="/termos" className="text-primary hover:underline">
              Termos de Uso
            </Link>{' '}
            e{' '}
            <Link href="/privacidade" className="text-primary hover:underline">
              Política de Privacidade
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
