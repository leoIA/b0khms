// =============================================================================
// ConstrutorPro - Página de Status do Sistema
// Visível apenas para master_admin
// =============================================================================

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Database,
  Server,
  Key,
  CreditCard,
  Mail,
  Settings,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Play,
  Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SystemStatus {
  database: {
    connected: boolean;
    type: string;
    message?: string;
  };
  auth: {
    configured: boolean;
    hasSecret: boolean;
    hasUrl: boolean;
  };
  mercadopago: {
    configured: boolean;
    hasAccessToken: boolean;
    hasPublicKey: boolean;
    hasWebhookSecret: boolean;
    sandbox: boolean;
  };
  email: {
    configured: boolean;
    host?: string;
  };
  app: {
    url: string;
    nodeEnv: string;
    version: string;
  };
}

interface MigrationStatus {
  hasSchema: boolean;
  migrationsCount: number;
  lastMigration: string | null;
  commands: {
    migrate: string;
    generate: string;
    seed: string;
    push: string;
    studio: string;
  };
}

export default function AdminSistemaPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [runningMigration, setRunningMigration] = useState<string | null>(null);
  const [migrationOutput, setMigrationOutput] = useState<{ type: 'success' | 'error'; message: string; output?: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchStatus();
    fetchMigrationStatus();
  }, []);

  const fetchMigrationStatus = async () => {
    try {
      const response = await fetch('/api/admin/sistema/migracoes');
      if (response.ok) {
        const data = await response.json();
        setMigrationStatus(data);
      }
    } catch (error) {
      console.error('Erro ao buscar status de migrações:', error);
    }
  };

  const runMigration = async (action: 'migrate' | 'generate' | 'seed' | 'push') => {
    setRunningMigration(action);
    setMigrationOutput(null);
    try {
      const response = await fetch('/api/admin/sistema/migracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      
      if (data.success) {
        setMigrationOutput({ type: 'success', message: data.message, output: data.output });
        toast({ title: 'Sucesso', description: data.message });
      } else {
        setMigrationOutput({ type: 'error', message: data.message, output: data.error });
        toast({ title: 'Erro', description: data.message, variant: 'destructive' });
      }
      
      // Atualizar status após ação
      fetchMigrationStatus();
    } catch (error) {
      setMigrationOutput({ type: 'error', message: 'Erro de conexão' });
      toast({ title: 'Erro', description: 'Não foi possível executar a ação', variant: 'destructive' });
    } finally {
      setRunningMigration(null);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/sistema/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async (type: 'database' | 'email' | 'mercadopago') => {
    setTesting(type);
    try {
      const response = await fetch(`/api/admin/sistema/test?type=${type}`);
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Conexão bem-sucedida',
          description: data.message,
        });
      } else {
        toast({
          title: 'Erro na conexão',
          description: data.error,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível testar a conexão',
        variant: 'destructive',
      });
    } finally {
      setTesting(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: 'URL copiada para a área de transferência',
    });
  };

  if (loading) {
    return <StatusSkeleton />;
  }

  if (!status) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>
          Não foi possível carregar o status do sistema.
        </AlertDescription>
      </Alert>
    );
  }

  const webhookUrl = `${status.app.url}/api/webhooks/mercadopago`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuração do Sistema</h1>
        <p className="text-muted-foreground">
          Verifique o status das integrações e configurações necessárias
        </p>
      </div>

      {/* Quick Status */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatusCard
          title="Banco de Dados"
          icon={<Database className="h-4 w-4" />}
          isOk={status.database.connected}
        />
        <StatusCard
          title="Autenticação"
          icon={<Key className="h-4 w-4" />}
          isOk={status.auth.configured}
        />
        <StatusCard
          title="MercadoPago"
          icon={<CreditCard className="h-4 w-4" />}
          isOk={status.mercadopago.configured}
        />
        <StatusCard
          title="Email"
          icon={<Mail className="h-4 w-4" />}
          isOk={status.email.configured}
          optional
        />
      </div>

      {/* Detailed Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Database */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Banco de Dados
              </CardTitle>
              <CardDescription>
                Conexão com o PostgreSQL
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => testConnection('database')}
              disabled={testing === 'database'}
            >
              {testing === 'database' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Testar</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              {status.database.connected ? (
                <Badge className="bg-green-500">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Desconectado
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tipo</span>
              <Badge variant="outline">{status.database.type}</Badge>
            </div>
            {status.database.message && (
              <Alert variant={status.database.connected ? 'default' : 'destructive'}>
                <AlertDescription className="text-xs">
                  {status.database.message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Autenticação
            </CardTitle>
            <CardDescription>
              Configuração do NextAuth.js
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">NEXTAUTH_SECRET</span>
              {status.auth.hasSecret ? (
                <Badge className="bg-green-500">Configurado</Badge>
              ) : (
                <Badge variant="destructive">Não configurado</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">NEXTAUTH_URL</span>
              {status.auth.hasUrl ? (
                <Badge className="bg-green-500">Configurado</Badge>
              ) : (
                <Badge variant="destructive">Não configurado</Badge>
              )}
            </div>
            {!status.auth.configured && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  Configure as variáveis de ambiente para autenticação.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* MercadoPago */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                MercadoPago
              </CardTitle>
              <CardDescription>
                Gateway de pagamentos
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => testConnection('mercadopago')}
              disabled={testing === 'mercadopago'}
            >
              {testing === 'mercadopago' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Testar</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Access Token</span>
              {status.mercadopago.hasAccessToken ? (
                <Badge className="bg-green-500">Configurado</Badge>
              ) : (
                <Badge variant="destructive">Não configurado</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Public Key</span>
              {status.mercadopago.hasPublicKey ? (
                <Badge className="bg-green-500">Configurado</Badge>
              ) : (
                <Badge variant="destructive">Não configurado</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Webhook Secret</span>
              {status.mercadopago.hasWebhookSecret ? (
                <Badge className="bg-green-500">Configurado</Badge>
              ) : (
                <Badge variant="secondary">Opcional</Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Modo</span>
              <Badge variant={status.mercadopago.sandbox ? 'secondary' : 'default'}>
                {status.mercadopago.sandbox ? 'Sandbox (Teste)' : 'Produção'}
              </Badge>
            </div>
            
            {/* Webhook URL */}
            <div className="pt-4 border-t">
              <span className="text-sm text-muted-foreground block mb-2">
                URL do Webhook:
              </span>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                  {webhookUrl}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(webhookUrl)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Configure esta URL no painel do MercadoPago para receber notificações de pagamento.
              </p>
            </div>
            
            {!status.mercadopago.configured && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Configuração Necessária</AlertTitle>
                <AlertDescription>
                  Configure o MercadoPago para receber pagamentos.
                  <a
                    href="https://www.mercadopago.com.br/developers/panel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center ml-1 text-primary hover:underline"
                  >
                    Acessar painel
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Email */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email (SMTP)
              </CardTitle>
              <CardDescription>
                Servidor de email para notificações
              </CardDescription>
            </div>
            {status.email.configured && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnection('email')}
                disabled={testing === 'email'}
              >
                {testing === 'email' ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Testar</span>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              {status.email.configured ? (
                <Badge className="bg-green-500">Configurado</Badge>
              ) : (
                <Badge variant="secondary">Não configurado (opcional)</Badge>
              )}
            </div>
            {status.email.host && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Servidor</span>
                <Badge variant="outline">{status.email.host}</Badge>
              </div>
            )}
            <Alert>
              <AlertDescription className="text-xs">
                A configuração de email é opcional. O sistema funcionará sem ela,
                mas não enviará notificações por email.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Informações da Aplicação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Ambiente</span>
              <p className="font-medium capitalize">{status.app.nodeEnv}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Versão</span>
              <p className="font-medium">{status.app.version}</p>
            </div>
            <div className="col-span-2">
              <span className="text-sm text-muted-foreground">URL da Aplicação</span>
              <div className="flex items-center gap-2">
                <p className="font-medium">{status.app.url}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(status.app.url)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Migrações do Banco de Dados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            Migrações do Banco de Dados
          </CardTitle>
          <CardDescription>
            Execute e gerencie as migrações do Prisma
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status das migrações */}
          {migrationStatus && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Schema</span>
                <Badge variant={migrationStatus.hasSchema ? 'default' : 'destructive'}>
                  {migrationStatus.hasSchema ? 'Presente' : 'Não encontrado'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Migrações</span>
                <Badge variant="outline">{migrationStatus.migrationsCount}</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg col-span-2 md:col-span-1">
                <span className="text-sm">Última</span>
                <Badge variant="secondary" className="truncate max-w-[150px]">
                  {migrationStatus.lastMigration || 'Nenhuma'}
                </Badge>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => runMigration('generate')}
              disabled={runningMigration !== null}
            >
              {runningMigration === 'generate' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Gerar Cliente
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => runMigration('migrate')}
              disabled={runningMigration !== null}
            >
              {runningMigration === 'migrate' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Migrar DB
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => runMigration('seed')}
              disabled={runningMigration !== null}
            >
              {runningMigration === 'seed' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Seed
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => runMigration('push')}
              disabled={runningMigration !== null}
            >
              {runningMigration === 'push' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Push Schema
            </Button>
          </div>

          {/* Output da execução */}
          {migrationOutput && (
            <Alert variant={migrationOutput.type === 'error' ? 'destructive' : 'default'}>
              <AlertTitle>{migrationOutput.type === 'error' ? 'Erro' : 'Sucesso'}</AlertTitle>
              <AlertDescription>{migrationOutput.message}</AlertDescription>
              {migrationOutput.output && (
                <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto max-h-40">
                  {migrationOutput.output}
                </pre>
              )}
            </Alert>
          )}

          {/* Comandos CLI */}
          <div className="pt-4 border-t">
            <span className="text-sm font-medium mb-2 block">Comandos via Terminal:</span>
            <div className="space-y-2">
              {migrationStatus?.commands && Object.entries(migrationStatus.commands).map(([key, cmd]) => (
                <div key={key} className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted p-2 rounded font-mono">
                    {cmd}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(cmd)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Alert>
            <AlertDescription className="text-xs">
              <strong>Gerar Cliente:</strong> Gera o cliente Prisma. Use após alterar o schema.<br/>
              <strong>Migrar DB:</strong> Aplica migrações pendentes. Use em produção.<br/>
              <strong>Seed:</strong> Popula o banco com dados iniciais.<br/>
              <strong>Push Schema:</strong> Sincroniza schema com DB (desenvolvimento).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Help */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Precisa de ajuda?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Consulte o arquivo <code className="bg-muted px-1 rounded">DEPLOY.md</code> na raiz do projeto
            para instruções completas de configuração e deploy.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href="/api/admin/sistema/status" target="_blank">
                Ver JSON completo
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Componente de Status Card
function StatusCard({ title, icon, isOk, optional }: {
  title: string;
  icon: React.ReactNode;
  isOk: boolean;
  optional?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={isOk ? 'text-green-500' : optional ? 'text-yellow-500' : 'text-red-500'}>
              {icon}
            </div>
            <span className="text-sm font-medium">{title}</span>
          </div>
          {isOk ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : optional ? (
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          ) : (
            <XCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton
function StatusSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-64 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-6 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
