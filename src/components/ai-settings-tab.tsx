// =============================================================================
// ConstrutorPro - Componente de Configurações de IA
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Loader2,
  Bot,
  Save,
  Eye,
  EyeOff,
  Sparkles,
  MessageSquare,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface AISettings {
  id: string;
  provider: string;
  apiKey: string | null;
  apiEndpoint: string | null;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string | null;
  enableAI: boolean;
  enableChat: boolean;
  enableOrcamento: boolean;
  monthlyLimit: number | null;
  currentUsage: number;
  lastUsedAt: string | null;
  error: string | null;
  hasApiKey: boolean;
}

interface ProviderInfo {
  name: string;
  description: string;
  models: string[];
  requiresApiKey: boolean;
}

interface Providers {
  [key: string]: ProviderInfo;
}

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente especializado em construção civil para o mercado brasileiro. 
Você ajuda engenheiros, arquitetos e profissionais da construção com:
- Composições de preços e orçamentos
- Análise de projetos
- Diário de obra e relatórios
- Planejamento e cronogramas
- Normas técnicas brasileiras (NBR)
- Cálculos de materiais e custos
- Boas práticas de construção

Responda de forma profissional, clara e em português brasileiro.
Quando relevante, cite normas técnicas e boas práticas do setor.`;

export function AISettingsTab() {
  const { user } = useSession();
  const { toast } = useToast();

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [providers, setProviders] = useState<Providers>({});

  // Form
  const [provider, setProvider] = useState('zai');
  const [apiKey, setApiKey] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [model, setModel] = useState('default');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [enableAI, setEnableAI] = useState(true);
  const [enableChat, setEnableChat] = useState(true);
  const [enableOrcamento, setEnableOrcamento] = useState(true);
  const [monthlyLimit, setMonthlyLimit] = useState('');

  // UI states
  const [showApiKey, setShowApiKey] = useState(false);

  // Check if user is admin
  const isAdmin = user?.role === 'company_admin' || user?.role === 'master_admin';

  // Fetch settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        const response = await fetch('/api/configuracoes/ia');
        const data = await response.json();

        if (data.success) {
          setSettings(data.data.settings);
          setProviders(data.data.providers);
          
          const s = data.data.settings;
          setProvider(s.provider);
          setModel(s.model);
          setTemperature(s.temperature);
          setMaxTokens(s.maxTokens);
          setSystemPrompt(s.systemPrompt || '');
          setEnableAI(s.enableAI);
          setEnableChat(s.enableChat);
          setEnableOrcamento(s.enableOrcamento);
          setMonthlyLimit(s.monthlyLimit?.toString() || '');
          setApiEndpoint(s.apiEndpoint || '');
          
          if (s.hasApiKey) {
            setApiKey(s.apiKey || '');
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
          description: 'Erro ao carregar configurações de IA',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, [toast]);

  // Update model when provider changes
  useEffect(() => {
    const providerConfig = providers[provider];
    if (providerConfig && providerConfig.models.length > 0) {
      if (!providerConfig.models.includes(model)) {
        setModel(providerConfig.models[0]);
      }
    }
  }, [provider, providers, model]);

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
      const response = await fetch('/api/configuracoes/ia', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: apiKey || null,
          apiEndpoint: apiEndpoint || null,
          model,
          temperature,
          maxTokens,
          systemPrompt: systemPrompt || null,
          enableAI,
          enableChat,
          enableOrcamento,
          monthlyLimit: monthlyLimit ? parseInt(monthlyLimit) : null,
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

  // Reset system prompt to default
  const resetSystemPrompt = () => {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    toast({
      title: 'Prompt restaurado',
      description: 'O prompt do sistema foi restaurado para o padrão',
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

  const currentProvider = providers[provider];
  const needsApiKey = currentProvider?.requiresApiKey && !settings?.hasApiKey && !apiKey;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Status da IA
              </CardTitle>
              <CardDescription>
                Configurações do assistente de inteligência artificial
              </CardDescription>
            </div>
            <Badge 
              variant={settings?.enableAI ? 'default' : 'secondary'}
              className={settings?.enableAI ? 'bg-green-600' : ''}
            >
              {settings?.enableAI ? 'Ativo' : 'Desativado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className={`p-2 rounded-lg ${settings?.enableChat ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'}`}>
                <MessageSquare className={`h-5 w-5 ${settings?.enableChat ? 'text-green-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="font-medium">Chat</p>
                <p className="text-sm text-muted-foreground">
                  {settings?.enableChat ? 'Ativo' : 'Desativado'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className={`p-2 rounded-lg ${settings?.enableOrcamento ? 'bg-green-100 dark:bg-green-900' : 'bg-muted'}`}>
                <FileText className={`h-5 w-5 ${settings?.enableOrcamento ? 'text-green-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="font-medium">Orçamentos</p>
                <p className="text-sm text-muted-foreground">
                  {settings?.enableOrcamento ? 'Ativo' : 'Desativado'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Provedor</p>
                <p className="text-sm text-muted-foreground">
                  {currentProvider?.name || provider}
                </p>
              </div>
            </div>
          </div>

          {/* Usage Info */}
          {settings?.monthlyLimit && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Uso mensal de tokens</span>
                <span className="text-sm text-muted-foreground">
                  {settings.currentUsage.toLocaleString()} / {settings.monthlyLimit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((settings.currentUsage / settings.monthlyLimit) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Provedor de IA</CardTitle>
          <CardDescription>
            Escolha o provedor de inteligência artificial
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

          {/* Enable AI Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div>
              <p className="font-medium">Habilitar IA</p>
              <p className="text-sm text-muted-foreground">
                Ativar ou desativar todas as funcionalidades de IA
              </p>
            </div>
            <Switch
              checked={enableAI}
              onCheckedChange={setEnableAI}
              disabled={!isAdmin}
            />
          </div>

          {/* Provider Select */}
          <div className="space-y-2">
            <Label htmlFor="provider">Provedor</Label>
            <Select
              value={provider}
              onValueChange={setProvider}
              disabled={!isAdmin}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o provedor" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(providers).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex flex-col">
                      <span>{info.name}</span>
                      <span className="text-xs text-muted-foreground">{info.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model Select */}
          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <Select
              value={model}
              onValueChange={setModel}
              disabled={!isAdmin}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o modelo" />
              </SelectTrigger>
              <SelectContent>
                {currentProvider?.models.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key (if required) */}
          {currentProvider?.requiresApiKey && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">
                API Key
                {settings?.hasApiKey && (
                  <Badge variant="outline" className="ml-2">Configurada</Badge>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  disabled={!isAdmin}
                  className="pr-20"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Obtida no painel do {currentProvider.name}
              </p>
            </div>
          )}

          {/* API Endpoint (optional) */}
          <div className="space-y-2">
            <Label htmlFor="apiEndpoint">API Endpoint (opcional)</Label>
            <Input
              id="apiEndpoint"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="https://api.example.com/v1"
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground">
              Para usar um endpoint customizado ou self-hosted
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Model Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Parâmetros do Modelo</CardTitle>
          <CardDescription>
            Ajuste o comportamento da IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Temperature */}
          <div className="space-y-4">
            <div className="flex justify-between">
              <Label>Temperatura: {temperature.toFixed(1)}</Label>
              <span className="text-sm text-muted-foreground">
                {temperature < 0.3 ? 'Mais preciso' : temperature > 1.5 ? 'Mais criativo' : 'Balanceado'}
              </span>
            </div>
            <Slider
              value={[temperature]}
              onValueChange={(v) => setTemperature(v[0])}
              min={0}
              max={2}
              step={0.1}
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground">
              Valores menores = respostas mais consistentes. Valores maiores = respostas mais criativas.
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <Label htmlFor="maxTokens">Máximo de Tokens: {maxTokens}</Label>
            <Input
              id="maxTokens"
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2000)}
              min={100}
              max={8000}
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground">
              Limite de tamanho das respostas (100-8000)
            </p>
          </div>

          {/* Monthly Limit */}
          <div className="space-y-2">
            <Label htmlFor="monthlyLimit">Limite Mensal de Tokens (opcional)</Label>
            <Input
              id="monthlyLimit"
              type="number"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder="Sem limite"
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground">
              Defina um limite mensal para controlar custos
            </p>
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Prompt do Sistema</CardTitle>
              <CardDescription>
                Personalize as instruções base para a IA
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={resetSystemPrompt} disabled={!isAdmin}>
              Restaurar Padrão
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder={DEFAULT_SYSTEM_PROMPT}
            rows={8}
            disabled={!isAdmin}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Este prompt define a personalidade e o comportamento base da IA.
          </p>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Funcionalidades</CardTitle>
          <CardDescription>
            Habilite ou desabilite funcionalidades específicas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Chat com IA</p>
                <p className="text-sm text-muted-foreground">
                  Assistente de conversação para dúvidas gerais
                </p>
              </div>
            </div>
            <Switch
              checked={enableChat}
              onCheckedChange={setEnableChat}
              disabled={!isAdmin || !enableAI}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Assistente de Orçamentos</p>
                <p className="text-sm text-muted-foreground">
                  Ajuda na criação e análise de orçamentos
                </p>
              </div>
            </div>
            <Switch
              checked={enableOrcamento}
              onCheckedChange={setEnableOrcamento}
              disabled={!isAdmin || !enableAI}
            />
          </div>
        </CardContent>
      </Card>

      {/* Warning if needs API key */}
      {needsApiKey && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>API Key Necessária</AlertTitle>
          <AlertDescription>
            O provedor {currentProvider?.name} requer uma API Key para funcionar.
            Configure a chave antes de salvar.
          </AlertDescription>
        </Alert>
      )}

      {/* Info about Z.AI */}
      {provider === 'zai' && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Provedor Padrão</AlertTitle>
          <AlertDescription>
            O provedor Z.AI já está configurado no sistema e não requer API Key.
            Basta habilitar as funcionalidades desejadas.
          </AlertDescription>
        </Alert>
      )}

      {/* Save Button */}
      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || needsApiKey}>
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
