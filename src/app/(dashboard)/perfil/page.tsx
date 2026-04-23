// =============================================================================
// ConstrutorPro - Perfil
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Mail,
  Briefcase,
  Camera,
  Loader2,
  Save,
  Key,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Phone,
  Shield,
} from 'lucide-react';
import { USER_ROLES } from '@/lib/constants';
import { formatDateTime } from '@/lib/api';
import { SessionsManager } from '@/components/profile/sessions-manager';
import { TwoFactorSettings } from '@/components/profile/two-factor-settings';
import { NotificationPreferencesPanel } from '@/components/notifications/notification-preferences-panel';

// Types
interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  position: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  phone: string | null;
  position: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  company: {
    id: string;
    name: string;
    tradingName: string | null;
    plan: string;
  } | null;
}

interface Activity {
  id: string;
  action: string;
  description: string;
  date: string;
  type: 'success' | 'warning' | 'info';
}

export default function PerfilPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const { toast } = useToast();

  // Loading states
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(true);

  // Data states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Form states
  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: '',
    email: '',
    phone: '',
    position: '',
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Fetch profile data
  useEffect(() => {
    async function fetchProfile() {
      if (sessionLoading) return;

      try {
        const response = await fetch('/api/usuarios/perfil');
        const data = await response.json();

        if (data.success) {
          setProfile(data.data);
          setProfileForm({
            name: data.data.name || '',
            email: data.data.email || '',
            phone: data.data.phone || '',
            position: data.data.position || '',
          });
        } else {
          toast({
            title: 'Erro',
            description: data.error || 'Erro ao carregar perfil.',
            variant: 'destructive',
          });
        }
      } catch {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar perfil.',
          variant: 'destructive',
        });
      } finally {
        setLoadingProfile(false);
      }
    }

    fetchProfile();
  }, [sessionLoading, toast]);

  // Fetch activities
  useEffect(() => {
    async function fetchActivities() {
      if (sessionLoading || !user) return;

      try {
        // Fetch recent activities for the user
        const response = await fetch(`/api/atividades?userId=${user.id}&limit=5`);
        const data = await response.json();

        if (data.success) {
          // Transform activities to the format expected by the UI
          const transformedActivities: Activity[] = (data.data || []).map((activity: { id: string; action: string; details: string | null; createdAt: string }) => ({
            id: activity.id,
            action: activity.action,
            description: activity.details || '',
            date: activity.createdAt,
            type: getActivityType(activity.action),
          }));
          setActivities(transformedActivities);
        } else {
          // If no activities endpoint, use fallback mock data
          setActivities(getFallbackActivities());
        }
      } catch {
        // Use fallback data on error
        setActivities(getFallbackActivities());
      } finally {
        setLoadingActivities(false);
      }
    }

    fetchActivities();
  }, [sessionLoading, user]);

  function getActivityType(action: string): 'success' | 'warning' | 'info' {
    const successActions = ['login', 'criar', 'criado', 'atualizar', 'atualizado', 'aprovar', 'aprovado'];
    const warningActions = ['alerta', 'aviso', 'prazo', 'vencer'];

    const actionLower = action.toLowerCase();
    if (successActions.some(a => actionLower.includes(a))) return 'success';
    if (warningActions.some(a => actionLower.includes(a))) return 'warning';
    return 'info';
  }

  function getFallbackActivities(): Activity[] {
    return [
      {
        id: '1',
        action: 'Login',
        description: 'Login realizado com sucesso',
        date: new Date().toISOString(),
        type: 'success',
      },
      {
        id: '2',
        action: 'Perfil Visualizado',
        description: 'Página de perfil acessada',
        date: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        type: 'info',
      },
    ];
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const response = await fetch('/api/usuarios/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });

      const data = await response.json();

      if (data.success) {
        setProfile(data.data);
        toast({
          title: 'Sucesso',
          description: 'Perfil atualizado com sucesso.',
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao atualizar perfil.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar perfil.',
        variant: 'destructive',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword) {
      toast({
        title: 'Erro',
        description: 'Digite a senha atual.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Erro',
        description: 'As senhas não conferem.',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: 'Erro',
        description: 'A nova senha deve ter pelo menos 8 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    setSavingPassword(true);
    try {
      const response = await fetch('/api/usuarios/senha', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Senha alterada com sucesso.',
        });
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao alterar senha.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao alterar senha.',
        variant: 'destructive',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarUpload = () => {
    toast({
      title: 'Em desenvolvimento',
      description: 'O upload de avatar estará disponível em breve.',
    });
  };

  if (sessionLoading || loadingProfile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96" />
          <Skeleton className="lg:col-span-2 h-96" />
        </div>
      </div>
    );
  }

  const userRoleConfig = profile?.role ? USER_ROLES[profile.role as keyof typeof USER_ROLES] : null;
  const userInitials = profile?.name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile?.avatar || undefined} alt={profile?.name} />
                    <AvatarFallback className="text-2xl">{userInitials}</AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                    onClick={handleAvatarUpload}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <h2 className="mt-4 text-xl font-semibold">{profile?.name}</h2>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                {userRoleConfig && (
                  <Badge variant="secondary" className="mt-2">
                    {userRoleConfig.label}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{profile?.email}</span>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profile.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{userRoleConfig?.label || 'Não definido'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Membro desde {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
                    : new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              {profile?.company && (
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{profile.company.name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>
                Seus dados de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input
                    id="name"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Cargo</Label>
                  <Input
                    id="position"
                    value={profileForm.position}
                    onChange={(e) => setProfileForm({ ...profileForm, position: e.target.value })}
                    placeholder="Ex: Engenheiro Civil"
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Atualize sua senha de acesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Senha Atual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova Senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              <Button onClick={handleChangePassword} disabled={savingPassword} variant="outline">
                {savingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  'Alterar Senha'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Sessions Manager */}
          <SessionsManager />

          {/* Two-Factor Authentication */}
          <TwoFactorSettings />

          {/* Notification Preferences */}
          <NotificationPreferencesPanel />

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Atividade Recente
              </CardTitle>
              <CardDescription>
                Histórico das suas últimas ações
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingActivities ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma atividade recente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity, index) => (
                    <div key={activity.id} className="flex items-start gap-4">
                      <div className="relative">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          activity.type === 'success' ? 'bg-green-100 dark:bg-green-900' :
                          activity.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900' :
                          'bg-blue-100 dark:bg-blue-900'
                        }`}>
                          {activity.type === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : activity.type === 'warning' ? (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        {index < activities.length - 1 && (
                          <div className="absolute left-1/2 -translate-x-1/2 top-8 w-px h-8 bg-border" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{activity.action}</p>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(activity.date)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
