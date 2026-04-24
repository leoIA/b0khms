// =============================================================================
// ConstrutorPro - Painel de Preferências de Notificação
// =============================================================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Bell,
  Mail,
  Smartphone,
  MessageSquare,
  Building2,
  DollarSign,
  Calendar,
  Package,
  Settings,
  ClipboardList,
  Moon,
  RefreshCw,
  Save,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// =============================================================================
// Types
// =============================================================================

interface NotificationPreferences {
  id: string;
  userId: string;
  companyId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
  frequency: 'instant' | 'hourly' | 'daily' | 'weekly';
  projectNotifications: boolean;
  financialNotifications: boolean;
  scheduleNotifications: boolean;
  stockNotifications: boolean;
  systemNotifications: boolean;
  dailyLogNotifications: boolean;
  digestTime: string;
  digestTimezone: string;
  digestDays: number[];
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

// =============================================================================
// Fetch Functions
// =============================================================================

async function fetchPreferences(): Promise<{ data: NotificationPreferences }> {
  const response = await fetch('/api/notificacoes/preferencias');
  if (!response.ok) throw new Error('Erro ao carregar preferências');
  return response.json();
}

async function updatePreferences(
  data: Partial<NotificationPreferences>
): Promise<{ data: NotificationPreferences }> {
  const response = await fetch('/api/notificacoes/preferencias', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Erro ao atualizar preferências');
  return response.json();
}

async function resetPreferences(): Promise<{ data: NotificationPreferences }> {
  const response = await fetch('/api/notificacoes/preferencias/reset', {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Erro ao resetar preferências');
  return response.json();
}

// =============================================================================
// Component
// =============================================================================

export function NotificationPreferencesPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<Partial<NotificationPreferences>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch preferences
  const { data, isLoading, error } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: fetchPreferences,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      setHasChanges(false);
      toast({
        title: 'Preferências salvas',
        description: 'Suas preferências de notificação foram atualizadas.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar suas preferências.',
        variant: 'destructive',
      });
    },
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: resetPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      setHasChanges(false);
      toast({
        title: 'Preferências resetadas',
        description: 'Suas preferências foram restauradas para os valores padrão.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível resetar suas preferências.',
        variant: 'destructive',
      });
    },
  });

  // Track if initial data has been set
  const initialDataRef = useRef(false);

  // Initialize form data when data loads
  useEffect(() => {
    if (data?.data && !initialDataRef.current) {
      initialDataRef.current = true;
      // Use setTimeout to defer setState outside the effect
      const timer = setTimeout(() => {
        setFormData(data.data);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [data]);

  // Handle switch change
  const handleSwitchChange = (key: keyof NotificationPreferences, value: boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Handle select change
  const handleSelectChange = (key: keyof NotificationPreferences, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Handle input change
  const handleInputChange = (key: keyof NotificationPreferences, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Handle save
  const handleSave = () => {
    if (hasChanges) {
      updateMutation.mutate(formData);
    }
  };

  // Handle reset
  const handleReset = () => {
    resetMutation.mutate();
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            <p>Erro ao carregar preferências. Tente novamente.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const preferences = formData;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>
                  Configure como e quando você deseja receber notificações
                </CardDescription>
              </div>
            </div>
            {hasChanges && (
              <Badge variant="secondary" className="gap-1">
                <RefreshCw className="h-3 w-3" />
                Alterações não salvas
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Channels Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Canais de Notificação
          </CardTitle>
          <CardDescription>
            Escolha os canais pelos quais deseja receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="emailEnabled" className="cursor-pointer">
                E-mail
              </Label>
            </div>
            <Switch
              id="emailEnabled"
              checked={preferences.emailEnabled ?? true}
              onCheckedChange={(checked) => handleSwitchChange('emailEnabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="pushEnabled" className="cursor-pointer">
                Push (Navegador)
              </Label>
            </div>
            <Switch
              id="pushEnabled"
              checked={preferences.pushEnabled ?? false}
              onCheckedChange={(checked) => handleSwitchChange('pushEnabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="inAppEnabled" className="cursor-pointer">
                No Aplicativo
              </Label>
            </div>
            <Switch
              id="inAppEnabled"
              checked={preferences.inAppEnabled ?? true}
              onCheckedChange={(checked) => handleSwitchChange('inAppEnabled', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="smsEnabled" className="cursor-pointer">
                SMS
              </Label>
            </div>
            <Switch
              id="smsEnabled"
              checked={preferences.smsEnabled ?? false}
              onCheckedChange={(checked) => handleSwitchChange('smsEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Categorias de Notificação
          </CardTitle>
          <CardDescription>
            Escolha quais tipos de notificação deseja receber
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="projectNotifications" className="cursor-pointer">
                Projetos
                <span className="text-muted-foreground text-sm ml-2">
                  (Criação, atualizações, status)
                </span>
              </Label>
            </div>
            <Switch
              id="projectNotifications"
              checked={preferences.projectNotifications ?? true}
              onCheckedChange={(checked) => handleSwitchChange('projectNotifications', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="financialNotifications" className="cursor-pointer">
                Financeiro
                <span className="text-muted-foreground text-sm ml-2">
                  (Pagamentos, cobranças, orçamentos)
                </span>
              </Label>
            </div>
            <Switch
              id="financialNotifications"
              checked={preferences.financialNotifications ?? true}
              onCheckedChange={(checked) => handleSwitchChange('financialNotifications', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="scheduleNotifications" className="cursor-pointer">
                Cronograma
                <span className="text-muted-foreground text-sm ml-2">
                  (Tarefas, prazos, entregas)
                </span>
              </Label>
            </div>
            <Switch
              id="scheduleNotifications"
              checked={preferences.scheduleNotifications ?? true}
              onCheckedChange={(checked) => handleSwitchChange('scheduleNotifications', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="stockNotifications" className="cursor-pointer">
                Estoque
                <span className="text-muted-foreground text-sm ml-2">
                  (Estoque baixo, reposição)
                </span>
              </Label>
            </div>
            <Switch
              id="stockNotifications"
              checked={preferences.stockNotifications ?? true}
              onCheckedChange={(checked) => handleSwitchChange('stockNotifications', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="dailyLogNotifications" className="cursor-pointer">
                Diário de Obra
                <span className="text-muted-foreground text-sm ml-2">
                  (Registros, ocorrências)
                </span>
              </Label>
            </div>
            <Switch
              id="dailyLogNotifications"
              checked={preferences.dailyLogNotifications ?? true}
              onCheckedChange={(checked) => handleSwitchChange('dailyLogNotifications', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="systemNotifications" className="cursor-pointer">
                Sistema
                <span className="text-muted-foreground text-sm ml-2">
                  (Segurança, atualizações, manutenção)
                </span>
              </Label>
            </div>
            <Switch
              id="systemNotifications"
              checked={preferences.systemNotifications ?? true}
              onCheckedChange={(checked) => handleSwitchChange('systemNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Frequency Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Frequência de Notificações
          </CardTitle>
          <CardDescription>
            Configure a frequência com que deseja receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={preferences.frequency || 'instant'}
                onValueChange={(value) => handleSelectChange('frequency', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a frequência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="instant">Instantâneo</SelectItem>
                  <SelectItem value="hourly">A cada hora</SelectItem>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define com que frequência você recebe as notificações
              </p>
            </div>

            <div className="space-y-2">
              <Label>Horário do Resumo</Label>
              <Input
                type="time"
                value={preferences.digestTime || '09:00'}
                onChange={(e) => handleInputChange('digestTime', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Horário para envio do resumo diário
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Horário de Silêncio
          </CardTitle>
          <CardDescription>
            Configure um período sem notificações para não ser incomodado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quietHoursEnabled" className="cursor-pointer">
              Ativar horário de silêncio
            </Label>
            <Switch
              id="quietHoursEnabled"
              checked={preferences.quietHoursEnabled ?? false}
              onCheckedChange={(checked) => handleSwitchChange('quietHoursEnabled', checked)}
            />
          </div>

          {preferences.quietHoursEnabled && (
            <>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input
                    type="time"
                    value={preferences.quietHoursStart || '22:00'}
                    onChange={(e) => handleInputChange('quietHoursStart', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Input
                    type="time"
                    value={preferences.quietHoursEnd || '07:00'}
                    onChange={(e) => handleInputChange('quietHoursEnd', e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Durante este período, você não receberá notificações (exceto alertas críticos do sistema)
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={resetMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${resetMutation.isPending ? 'animate-spin' : ''}`} />
              Restaurar Padrões
            </Button>

            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Preferências
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Success indicator */}
      {!hasChanges && data?.data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          Preferências sincronizadas
        </div>
      )}
    </div>
  );
}
