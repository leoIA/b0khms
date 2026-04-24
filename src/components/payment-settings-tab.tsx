// =============================================================================
// ConstrutorPro - Componente de Configurações de Pagamento (MercadoPago)
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/use-session';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  CreditCard,
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Eye,
  EyeOff,
  Copy,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PaymentSettings {
  id: string;
  mpAccessToken: string | null;
  mpPublicKey: string | null;
  mpClientId: string | null;
  mpClientSecret: string | null;
  mpSandbox: boolean;
  mpWebhookUrl: string | null;
  mpWebhookSecret: string | null;
  mpConnected: boolean;
  mpLastConnectionAt: string | null;
  mpError: string | null;
  hasAccessToken: boolean;
  hasPublicKey: boolean;
}

interface TestResult {
  connected: boolean;
  user: {
    id: number;
    nickname: string;
    email: string;
    country_id: string;
  };
  environment: string;
  paymentMethods: Array<{ id: string; name: string }>;
}

export function PaymentSettingsTab() {
  const { user } = useSession();
  const { toast } = useToast();

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Data
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Form
  const [accessToken, setAccessToken] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [sandbox, setSandbox] = useState(true);

  // UI states
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showPublicKey, setShowPublicKey] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === 'company_admin' || user?.role === 'master_admin';

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/configuracoes/pagamentos');
        const data = await response.json();

        if (data.success) {
          setSettings(data.data);
          setSandbox(data.data.mpSandbox);
          setWebhookUrl(data.data.mpWebhookUrl || '');
          setClientId(data.data.mpClientId || '');
          
          // Se tem token, mostrar o valor mascarado
          if (data.data.hasAccessToken) {
            setAccessToken(data.data.mpAccessToken || '');
          }
          if (data.data.hasPublicKey) {
            setPublicKey(data.data.mpPublicKey || '');
          }
          if (data.data.mpClientSecret) {
            setClientSecret('••••••••');
          }
        } else {
          toast({
            title: 'Erro',
            description: data.error || 'Erro ao carregar configurações',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar configurações de pagamento',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [toast]);

  // Save settings
  const handleSave = async () => {
    if (!isAdmin) {
      toast({
        title: 'Acesso negado',
        description: 'Apenas administradores podem alterar estas configurações',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/configuracoes/pagamentos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mpAccessToken: accessToken || null,
          mpPublicKey: publicKey || null,
          mpClientId: clientId || null,
          mpClientSecret: clientSecret || null,
          mpSandbox: sandbox,
          mpWebhookUrl: webhookUrl || null,
          mpWebhookSecret: webhookSecret || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
        toast({
          title: 'Sucesso',
          description: data.message || 'Configurações salvas com sucesso',
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao salvar configurações',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configurações',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Test connection
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch('/api/configuracoes/pagamentos/testar', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setTestResult(data.data);
        toast({
          title: 'Sucesso',
          description: 'Conexão estabelecida com MercadoPago!',
        });
        // Refresh settings
        const settingsResponse = await fetch('/api/configuracoes/pagamentos');
        const settingsData = await settingsResponse.json();
        if (settingsData.success) {
          setSettings(settingsData.data);
        }
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Falha ao testar conexão',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao testar conexão',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  // Delete settings
  const handleDelete = async () => {
    try {
      const response = await fetch('/api/configuracoes/pagamentos', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setSettings(null);
        setAccessToken('');
        setPublicKey('');
        setClientId('');
        setClientSecret('');
        setWebhookUrl('');
        setWebhookSecret('');
        setTestResult(null);
        setShowDeleteDialog(false);
        toast({
          title: 'Sucesso',
          description: 'Configurações removidas com sucesso',
        });
        // Re-fetch to create new default settings
        const settingsResponse = await fetch('/api/configuracoes/pagamentos');
        const settingsData = await settingsResponse.json();
        if (settingsData.success) {
          setSettings(settingsData.data);
        }
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao remover configurações',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao remover configurações',
        variant: 'destructive',
      });
    }
  };

  // Copy webhook URL
  const copyWebhookUrl = () => {
    const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/mercadopago`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copiado',
      description: 'URL do webhook copiada para a área de transferência',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Status da Integração
              </CardTitle>
              <CardDescription>
                Status da conexão com MercadoPago
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={testing || !settings?.hasAccessToken}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Testar Conexão
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {settings?.mpConnected ? (
              <>
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-green-600">Conectado</p>
                  <p className="text-sm text-muted-foreground">
                    {settings.mpLastConnectionAt 
                      ? `Última verificação: ${new Date(settings.mpLastConnectionAt).toLocaleString('pt-BR')}`
                      : 'Conexão ativa'}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
                  <XCircle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-red-600">Não Conectado</p>
                  <p className="text-sm text-muted-foreground">
                    {settings?.mpError || 'Configure suas credenciais para ativar os pagamentos'}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Test Result */}
          {testResult && (
            <div className="mt-4 p-4 rounded-lg border bg-muted/50">
              <p className="font-medium mb-2">Detalhes da Conexão:</p>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conta:</span>
                  <span>{testResult.user.nickname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span>{testResult.user.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ambiente:</span>
                  <Badge variant={testResult.environment === 'sandbox' ? 'secondary' : 'default'}>
                    {testResult.environment === 'sandbox' ? 'Teste' : 'Produção'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Métodos de Pagamento:</span>
                  <span>{testResult.paymentMethods.length} disponíveis</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Environment Alert */}
      {sandbox && settings?.hasAccessToken && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Modo de Teste Ativo</AlertTitle>
          <AlertDescription>
            Você está usando o ambiente de sandbox do MercadoPago. Os pagamentos serão simulados.
            Desative o modo sandbox para receber pagamentos reais.
          </AlertDescription>
        </Alert>
      )}

      {/* Credentials Card */}
      <Card>
        <CardHeader>
          <CardTitle>Credenciais do MercadoPago</CardTitle>
          <CardDescription>
            Configure suas credenciais de acesso ao MercadoPago. 
            Você pode obtê-las em{' '}
            <a
              href="https://www.mercadopago.com.br/developers/panel"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Developers Panel
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isAdmin && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Acesso Restrito</AlertTitle>
              <AlertDescription>
                Apenas administradores podem alterar estas configurações.
              </AlertDescription>
            </Alert>
          )}

          {/* Environment Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">Modo de Teste (Sandbox)</p>
              <p className="text-sm text-muted-foreground">
                Use credenciais de teste para simular pagamentos
              </p>
            </div>
            <Switch
              checked={sandbox}
              onCheckedChange={setSandbox}
              disabled={!isAdmin}
            />
          </div>

          {/* Access Token */}
          <div className="space-y-2">
            <Label htmlFor="accessToken">
              Access Token
              {settings?.hasAccessToken && (
                <Badge variant="outline" className="ml-2">Configurado</Badge>
              )}
            </Label>
            <div className="relative">
              <Input
                id="accessToken"
                type={showAccessToken ? 'text' : 'password'}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={sandbox ? 'TEST-xxxx-xxxx-xxxx' : 'APP_USR-xxxx-xxxx-xxxx'}
                disabled={!isAdmin}
                className="pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowAccessToken(!showAccessToken)}
                >
                  {showAccessToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Token de acesso para a API do MercadoPago. Encontre em: Credenciais &gt; Access Token
            </p>
          </div>

          {/* Public Key */}
          <div className="space-y-2">
            <Label htmlFor="publicKey">
              Public Key
              {settings?.hasPublicKey && (
                <Badge variant="outline" className="ml-2">Configurado</Badge>
              )}
            </Label>
            <div className="relative">
              <Input
                id="publicKey"
                type={showPublicKey ? 'text' : 'password'}
                value={publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                placeholder={sandbox ? 'TEST-xxxx-xxxx-xxxx' : 'APP_USR-xxxx-xxxx-xxxx'}
                disabled={!isAdmin}
                className="pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowPublicKey(!showPublicKey)}
                >
                  {showPublicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Chave pública para integrar com o frontend. Encontre em: Credenciais &gt; Public Key
            </p>
          </div>

          {/* Client ID & Secret (Optional) */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID (opcional)</Label>
              <Input
                id="clientId"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="123456789"
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret (opcional)</Label>
              <div className="relative">
                <Input
                  id="clientSecret"
                  type={showClientSecret ? 'text' : 'password'}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="xxxx-xxxx-xxxx"
                  disabled={!isAdmin}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowClientSecret(!showClientSecret)}
                >
                  {showClientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Card */}
      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            Configure o webhook para receber notificações de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>URL do Webhook</Label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/mercadopago`}
                disabled={!isAdmin}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyWebhookUrl}
                title="Copiar URL padrão"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure esta URL no painel do MercadoPago em: Webhooks &gt; Criar Webhook
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookSecret">Webhook Secret (opcional)</Label>
            <Input
              id="webhookSecret"
              type="password"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="Secret para validar webhooks"
              disabled={!isAdmin}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {isAdmin && (
        <div className="flex justify-between">
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive" disabled={!settings?.hasAccessToken}>
                <Trash2 className="h-4 w-4 mr-2" />
                Remover Configurações
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remover Configurações de Pagamento</DialogTitle>
                <DialogDescription>
                  Tem certeza que deseja remover todas as configurações de pagamento?
                  Esta ação não pode ser desfeita e você precisará configurar suas
                  credenciais novamente.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Remover
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        </div>
      )}
    </div>
  );
}
