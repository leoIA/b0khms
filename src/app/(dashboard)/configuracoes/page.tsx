// =============================================================================
// ConstrutorPro - Configurações
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/use-session';
import { useTheme } from 'next-themes';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2, User, Bell, Palette, Save } from 'lucide-react';
import { BRAZILIAN_STATES } from '@/lib/constants';

// Types
interface CompanyForm {
  name: string;
  tradingName: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface AccountForm {
  name: string;
  email: string;
  phone: string;
  position: string;
  avatar: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  projectUpdates: boolean;
  financialAlerts: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  marketingEmails: boolean;
}

interface Company {
  id: string;
  name: string;
  tradingName: string | null;
  cnpj: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  avatar: string | null;
}

export default function ConfiguracoesPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  // Loading states
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);

  // Data states
  const [company, setCompany] = useState<Company | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Form states
  const [companyForm, setCompanyForm] = useState<CompanyForm>({
    name: '',
    tradingName: '',
    cnpj: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const [accountForm, setAccountForm] = useState<AccountForm>({
    name: '',
    email: '',
    phone: '',
    position: '',
    avatar: '',
  });

  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: true,
    projectUpdates: true,
    financialAlerts: true,
    dailyDigest: false,
    weeklyReport: true,
    marketingEmails: false,
  });

  // Fetch company data
  useEffect(() => {
    async function fetchCompany() {
      if (sessionLoading || !user?.companyId) {
        setLoadingCompany(false);
        return;
      }

      try {
        const response = await fetch(`/api/empresas/${user.companyId}`);
        const data = await response.json();

        if (data.success) {
          setCompany(data.data);
          setCompanyForm({
            name: data.data.name || '',
            tradingName: data.data.tradingName || '',
            cnpj: data.data.cnpj || '',
            email: data.data.email || '',
            phone: data.data.phone || '',
            address: data.data.address || '',
            city: data.data.city || '',
            state: data.data.state || '',
            zipCode: data.data.zipCode || '',
          });
        } else {
          toast({
            title: 'Erro',
            description: data.error || 'Erro ao carregar dados da empresa.',
            variant: 'destructive',
          });
        }
      } catch {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar dados da empresa.',
          variant: 'destructive',
        });
      } finally {
        setLoadingCompany(false);
      }
    }

    fetchCompany();
  }, [sessionLoading, user?.companyId, toast]);

  // Fetch profile data
  useEffect(() => {
    async function fetchProfile() {
      if (sessionLoading) return;

      try {
        const response = await fetch('/api/usuarios/perfil');
        const data = await response.json();

        if (data.success) {
          setProfile(data.data);
          setAccountForm({
            name: data.data.name || '',
            email: data.data.email || '',
            phone: data.data.phone || '',
            position: data.data.position || '',
            avatar: data.data.avatar || '',
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

  const handleSaveCompany = async () => {
    if (!company?.id) return;

    setSavingCompany(true);
    try {
      const response = await fetch(`/api/empresas/${company.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: companyForm.name,
          tradingName: companyForm.tradingName || null,
          phone: companyForm.phone || null,
          address: companyForm.address || null,
          city: companyForm.city || null,
          state: companyForm.state || null,
          zipCode: companyForm.zipCode || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCompany(data.data);
        toast({
          title: 'Sucesso',
          description: 'Dados da empresa atualizados com sucesso.',
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao salvar dados da empresa.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar dados da empresa.',
        variant: 'destructive',
      });
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSaveAccount = async () => {
    setSavingAccount(true);
    try {
      const response = await fetch('/api/usuarios/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: accountForm.name,
          email: accountForm.email,
          phone: accountForm.phone || null,
          position: accountForm.position || null,
          avatar: accountForm.avatar || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProfile(data.data);
        toast({
          title: 'Sucesso',
          description: 'Dados da conta atualizados com sucesso.',
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao salvar dados da conta.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar dados da conta.',
        variant: 'destructive',
      });
    } finally {
      setSavingAccount(false);
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

  const handleSaveNotifications = async () => {
    setSavingNotifications(true);
    try {
      // Simulate API call - in a real app, this would save to the database
      await new Promise(resolve => setTimeout(resolve, 500));
      toast({
        title: 'Sucesso',
        description: 'Preferências de notificação atualizadas.',
      });
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar preferências.',
        variant: 'destructive',
      });
    } finally {
      setSavingNotifications(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const isCompanyAdmin = user?.role === 'company_admin' || user?.role === 'master_admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações da sua conta e empresa
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="empresa" className="space-y-6">
        <TabsList>
          <TabsTrigger value="empresa" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="conta" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Conta
          </TabsTrigger>
          <TabsTrigger value="notificacoes" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Aparência
          </TabsTrigger>
        </TabsList>

        {/* Empresa Tab */}
        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>
                Dados cadastrais da sua construtora
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loadingCompany ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : !company ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma empresa associada à sua conta</p>
                </div>
              ) : (
                <>
                  {!isCompanyAdmin && (
                    <div className="bg-muted p-4 rounded-lg text-sm text-muted-foreground">
                      Apenas administradores da empresa podem editar estas informações.
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Razão Social</Label>
                      <Input
                        id="companyName"
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                        disabled={!isCompanyAdmin}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tradingName">Nome Fantasia</Label>
                      <Input
                        id="tradingName"
                        value={companyForm.tradingName}
                        onChange={(e) => setCompanyForm({ ...companyForm, tradingName: e.target.value })}
                        disabled={!isCompanyAdmin}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={companyForm.cnpj}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">CNPJ não pode ser alterado</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyEmail">Email</Label>
                      <Input
                        id="companyEmail"
                        type="email"
                        value={companyForm.email}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">Email não pode ser alterado</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyPhone">Telefone</Label>
                      <Input
                        id="companyPhone"
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                        disabled={!isCompanyAdmin}
                        placeholder="(00) 0000-0000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="zipCode">CEP</Label>
                      <Input
                        id="zipCode"
                        value={companyForm.zipCode}
                        onChange={(e) => setCompanyForm({ ...companyForm, zipCode: e.target.value })}
                        disabled={!isCompanyAdmin}
                        placeholder="00000-000"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={companyForm.address}
                      onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                      disabled={!isCompanyAdmin}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        value={companyForm.city}
                        onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                        disabled={!isCompanyAdmin}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Select
                        value={companyForm.state}
                        onValueChange={(v) => setCompanyForm({ ...companyForm, state: v })}
                        disabled={!isCompanyAdmin}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {BRAZILIAN_STATES.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {isCompanyAdmin && (
                    <Button onClick={handleSaveCompany} disabled={savingCompany}>
                      {savingCompany ? (
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
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conta Tab */}
        <TabsContent value="conta">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Seus dados de perfil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingProfile ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="accountName">Nome</Label>
                        <Input
                          id="accountName"
                          value={accountForm.name}
                          onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accountEmail">Email</Label>
                        <Input
                          id="accountEmail"
                          type="email"
                          value={accountForm.email}
                          onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accountPhone">Telefone</Label>
                        <Input
                          id="accountPhone"
                          value={accountForm.phone}
                          onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accountPosition">Cargo</Label>
                        <Input
                          id="accountPosition"
                          value={accountForm.position}
                          onChange={(e) => setAccountForm({ ...accountForm, position: e.target.value })}
                          placeholder="Ex: Engenheiro Civil"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="avatar">URL do Avatar</Label>
                      <Input
                        id="avatar"
                        type="url"
                        value={accountForm.avatar}
                        onChange={(e) => setAccountForm({ ...accountForm, avatar: e.target.value })}
                        placeholder="https://exemplo.com/avatar.jpg"
                      />
                      <p className="text-xs text-muted-foreground">
                        Insira a URL de uma imagem para usar como foto de perfil
                      </p>
                    </div>

                    <Button onClick={handleSaveAccount} disabled={savingAccount}>
                      {savingAccount ? (
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
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>
                  Atualize sua senha de acesso
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
          </div>
        </TabsContent>

        {/* Notificações Tab */}
        <TabsContent value="notificacoes">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>
                Configure como você deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações por email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, emailNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Notificações Push</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações no navegador
                    </p>
                  </div>
                  <Switch
                    checked={notifications.pushNotifications}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, pushNotifications: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Atualizações de Projetos</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificações sobre mudanças em projetos
                    </p>
                  </div>
                  <Switch
                    checked={notifications.projectUpdates}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, projectUpdates: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alertas Financeiros</Label>
                    <p className="text-sm text-muted-foreground">
                      Notificações sobre contas a pagar e receber
                    </p>
                  </div>
                  <Switch
                    checked={notifications.financialAlerts}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, financialAlerts: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Resumo Diário</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba um resumo diário das atividades
                    </p>
                  </div>
                  <Switch
                    checked={notifications.dailyDigest}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, dailyDigest: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Relatório Semanal</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba um relatório semanal por email
                    </p>
                  </div>
                  <Switch
                    checked={notifications.weeklyReport}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, weeklyReport: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Emails de Marketing</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba novidades e ofertas
                    </p>
                  </div>
                  <Switch
                    checked={notifications.marketingEmails}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, marketingEmails: checked })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSaveNotifications} disabled={savingNotifications}>
                {savingNotifications ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Preferências
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aparência Tab */}
        <TabsContent value="aparencia">
          <Card>
            <CardHeader>
              <CardTitle>Tema</CardTitle>
              <CardDescription>
                Escolha o tema de aparência do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    theme === 'light' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setTheme('light')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white border shadow" />
                    <div>
                      <p className="font-medium">Claro</p>
                      <p className="text-sm text-muted-foreground">Tema claro</p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    theme === 'dark' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setTheme('dark')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-900 border shadow" />
                    <div>
                      <p className="font-medium">Escuro</p>
                      <p className="text-sm text-muted-foreground">Tema escuro</p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    theme === 'system' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                  }`}
                  onClick={() => setTheme('system')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-white to-gray-900 border shadow" />
                    <div>
                      <p className="font-medium">Sistema</p>
                      <p className="text-sm text-muted-foreground">Seguir o sistema</p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                O tema selecionado será aplicado imediatamente. A preferência será salva automaticamente.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
