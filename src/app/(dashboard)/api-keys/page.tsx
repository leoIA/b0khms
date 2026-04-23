'use client';

// =============================================================================
// ConstrutorPro - API Keys Management Page
// =============================================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  Clock,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  permissions: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
  key?: string; // Only present on creation
}

const PERMISSION_GROUPS = [
  {
    name: 'Projetos',
    permissions: [
      { id: 'projects:read', label: 'Visualizar projetos' },
      { id: 'projects:write', label: 'Criar/editar projetos' },
    ],
  },
  {
    name: 'Orçamentos',
    permissions: [
      { id: 'budgets:read', label: 'Visualizar orçamentos' },
      { id: 'budgets:write', label: 'Criar/editar orçamentos' },
    ],
  },
  {
    name: 'Composições',
    permissions: [
      { id: 'compositions:read', label: 'Visualizar composições' },
      { id: 'compositions:write', label: 'Criar/editar composições' },
    ],
  },
  {
    name: 'Materiais',
    permissions: [
      { id: 'materials:read', label: 'Visualizar materiais' },
      { id: 'materials:write', label: 'Criar/editar materiais' },
    ],
  },
  {
    name: 'Clientes',
    permissions: [
      { id: 'clients:read', label: 'Visualizar clientes' },
      { id: 'clients:write', label: 'Criar/editar clientes' },
    ],
  },
  {
    name: 'Fornecedores',
    permissions: [
      { id: 'suppliers:read', label: 'Visualizar fornecedores' },
      { id: 'suppliers:write', label: 'Criar/editar fornecedores' },
    ],
  },
  {
    name: 'Diário de Obra',
    permissions: [
      { id: 'daily_logs:read', label: 'Visualizar diários' },
      { id: 'daily_logs:write', label: 'Criar/editar diários' },
    ],
  },
  {
    name: 'Cronograma',
    permissions: [
      { id: 'schedule:read', label: 'Visualizar cronogramas' },
      { id: 'schedule:write', label: 'Criar/editar cronogramas' },
    ],
  },
  {
    name: 'Financeiro',
    permissions: [
      { id: 'financial:read', label: 'Visualizar transações' },
      { id: 'financial:write', label: 'Criar/editar transações' },
    ],
  },
  {
    name: 'Dashboard e IA',
    permissions: [
      { id: 'dashboard:read', label: 'Visualizar dashboard' },
      { id: 'ai:read', label: 'Usar recursos de IA' },
    ],
  },
];

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ApiKeysPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState<ApiKey | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [keyName, setKeyName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expirationDays, setExpirationDays] = useState<string>('365');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchApiKeys();
    }
  }, [isAuthenticated]);

  const fetchApiKeys = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/api-keys');
      const data = await response.json();

      if (data.success) {
        setApiKeys(data.data);
      } else {
        toast.error(data.error || 'Erro ao carregar API Keys');
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast.error('Erro ao carregar API Keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!keyName.trim()) {
      toast.error('Digite um nome para a API Key');
      return;
    }

    if (selectedPermissions.length === 0) {
      toast.error('Selecione pelo menos uma permissão');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName,
          permissions: selectedPermissions,
          expiresInDays: expirationDays ? parseInt(expirationDays) : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewKeyData(data.data);
        setApiKeys((prev) => [
          { ...data.data, key: undefined }, // Don't store the key in the list
          ...prev,
        ]);
        setKeyName('');
        setSelectedPermissions([]);
        setExpirationDays('365');
        toast.success(data.message);
      } else {
        toast.error(data.error || 'Erro ao criar API Key');
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      toast.error('Erro ao criar API Key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const response = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setApiKeys((prev) => prev.filter((key) => key.id !== id));
        toast.success('API Key revogada com sucesso');
      } else {
        toast.error(data.error || 'Erro ao revogar API Key');
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      toast.error('Erro ao revogar API Key');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado para a área de transferência');
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((p) => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const selectAllPermissions = () => {
    const allPermissions = PERMISSION_GROUPS.flatMap((group) =>
      group.permissions.map((p) => p.id)
    );
    setSelectedPermissions(allPermissions);
  };

  const clearAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">API Keys</h1>
          <p className="text-gray-500 mt-1">
            Gerencie chaves de API para integrações externas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push('/api-docs')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Ver Documentação
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova API Key</DialogTitle>
                <DialogDescription>
                  Configure as permissões e validade da sua chave de API
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da API Key</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Integração ERP, App Mobile..."
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                  />
                </div>

                {/* Expiration */}
                <div className="space-y-2">
                  <Label>Validade</Label>
                  <Select value={expirationDays} onValueChange={setExpirationDays}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                      <SelectItem value="180">180 dias</SelectItem>
                      <SelectItem value="365">1 ano</SelectItem>
                      <SelectItem value="730">2 anos</SelectItem>
                      <SelectItem value="never">Sem expiração</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Permissions */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Permissões</Label>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={selectAllPermissions}
                      >
                        Selecionar todas
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllPermissions}
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PERMISSION_GROUPS.map((group) => (
                      <Card key={group.name}>
                        <CardHeader className="py-3 px-4">
                          <CardTitle className="text-sm font-medium">
                            {group.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="py-2 px-4 space-y-2">
                          {group.permissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={permission.id}
                                checked={selectedPermissions.includes(permission.id)}
                                onCheckedChange={() => togglePermission(permission.id)}
                              />
                              <label
                                htmlFor={permission.id}
                                className="text-sm text-gray-600 cursor-pointer"
                              >
                                {permission.label}
                              </label>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateKey}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar API Key'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* New Key Display */}
      {newKeyData && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center gap-2">
              <Check className="h-5 w-5" />
              API Key Criada com Sucesso
            </CardTitle>
            <CardDescription className="text-green-700">
              Copie esta chave agora - ela não será exibida novamente!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-3 bg-white rounded-lg border border-green-200 text-sm font-mono break-all">
                {newKeyData.key}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(newKeyData.key!)}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              variant="link"
              className="mt-2 p-0 text-green-700"
              onClick={() => setNewKeyData(null)}
            >
              Fechar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle>Suas API Keys</CardTitle>
          <CardDescription>
            Chaves ativas para acesso à API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Key className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma API Key criada</p>
              <p className="text-sm mt-1">
                Crie uma API Key para começar a integrar
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{apiKey.name}</p>
                        <p className="text-sm text-gray-500">
                          por {apiKey.user?.name || 'Usuário'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {apiKey.prefix}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3 text-gray-400" />
                        {formatDate(apiKey.lastUsedAt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {apiKey.expiresAt ? (
                        <div
                          className={`flex items-center gap-1 text-sm ${
                            isExpired(apiKey.expiresAt)
                              ? 'text-red-600'
                              : ''
                          }`}
                        >
                          {isExpired(apiKey.expiresAt) && (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          {formatDate(apiKey.expiresAt)}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Nunca expira</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isExpired(apiKey.expiresAt) ? (
                        <Badge variant="destructive">Expirada</Badge>
                      ) : apiKey.isActive ? (
                        <Badge variant="outline" className="bg-green-100 text-green-800">
                          Ativa
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Revogada</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revogar API Key</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja revogar a API Key "{apiKey.name}"?
                              Esta ação não pode ser desfeita e todas as integrações
                              que usam esta chave deixarão de funcionar.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => handleDeleteKey(apiKey.id)}
                            >
                              Revogar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Usage Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Autenticação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Use o header <code className="bg-gray-100 px-1">Authorization: Bearer {'{key}'}</code> para autenticar suas requisições.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Segurança</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Nunca compartilhe suas API Keys. Trate-as como senhas e armazene-as de forma segura.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Rate Limits</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Consulte a documentação para os limites de requisições do seu plano.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
