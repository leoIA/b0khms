'use client';

/**
 * API Keys Management Component
 * 
 * Features:
 * - Create/manage API keys
 * - Scope selection
 * - Usage statistics
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Key,
  Plus,
  MoreVertical,
  Copy,
  RotateCw,
  Trash2,
  Eye,
  EyeOff,
  Check,
  Clock,
  Activity,
  AlertCircle,
  Shield,
} from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  expiresAt: string | null;
  lastUsedAt: string | null;
  requestCount: number;
  active: boolean;
  createdAt: string;
}

const SCOPE_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  'projects:read': { label: 'Projetos (Leitura)', description: 'Listar e visualizar projetos' },
  'projects:write': { label: 'Projetos (Escrita)', description: 'Criar, editar e excluir projetos' },
  'budgets:read': { label: 'Orçamentos (Leitura)', description: 'Listar e visualizar orçamentos' },
  'budgets:write': { label: 'Orçamentos (Escrita)', description: 'Criar, editar e excluir orçamentos' },
  'schedule:read': { label: 'Cronograma (Leitura)', description: 'Listar e visualizar tarefas' },
  'schedule:write': { label: 'Cronograma (Escrita)', description: 'Criar, editar e excluir tarefas' },
  'purchases:read': { label: 'Compras (Leitura)', description: 'Listar pedidos de compra' },
  'purchases:write': { label: 'Compras (Escrita)', description: 'Criar e editar pedidos de compra' },
  'finance:read': { label: 'Financeiro (Leitura)', description: 'Listar transações' },
  'finance:write': { label: 'Financeiro (Escrita)', description: 'Criar e editar transações' },
  'assets:read': { label: 'Patrimônio (Leitura)', description: 'Listar ativos' },
  'assets:write': { label: 'Patrimônio (Escrita)', description: 'Criar e editar ativos' },
  'webhooks:manage': { label: 'Webhooks', description: 'Gerenciar webhooks' },
  'nfe:read': { label: 'NF-e (Leitura)', description: 'Listar notas fiscais' },
  'nfe:write': { label: 'NF-e (Escrita)', description: 'Emitir notas fiscais' },
};

const SCOPE_GROUPS = [
  {
    name: 'Somente Leitura',
    scopes: ['projects:read', 'budgets:read', 'schedule:read', 'purchases:read', 'finance:read', 'assets:read'],
  },
  {
    name: 'Projetos Completo',
    scopes: ['projects:read', 'projects:write', 'budgets:read', 'budgets:write', 'schedule:read', 'schedule:write'],
  },
  {
    name: 'Financeiro Completo',
    scopes: ['finance:read', 'finance:write', 'purchases:read', 'purchases:write', 'nfe:read', 'nfe:write'],
  },
];

export function ApiKeysManagement() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyData, setNewKeyData] = useState({
    name: '',
    scopes: [] as string[],
    rateLimit: 100,
    expiresInDays: 0,
  });
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/admin/api-keys');
      const data = await response.json();
      setApiKeys(data.data || []);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const createApiKey = async () => {
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKeyData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCreatedKey(data.rawKey);
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const revokeApiKey = async (id: string) => {
    try {
      await fetch(`/api/admin/api-keys/${id}`, { method: 'DELETE' });
      fetchApiKeys();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  };

  const regenerateApiKey = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/api-keys/${id}/regenerate`, { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setCreatedKey(data.rawKey);
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Failed to regenerate API key:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const toggleScope = (scope: string) => {
    setNewKeyData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope],
    }));
  };

  const applyScopeGroup = (groupName: string) => {
    const group = SCOPE_GROUPS.find(g => g.name === groupName);
    if (group) {
      setNewKeyData(prev => ({ ...prev, scopes: [...group.scopes] }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Chaves de API</h2>
          <p className="text-muted-foreground">
            Gerencie as chaves de acesso para integrações externas
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Chave
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Chave de API</DialogTitle>
              <DialogDescription>
                Configure os escopos e limites para a nova chave
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Chave</Label>
                <Input
                  id="name"
                  placeholder="Ex: Integração ERP"
                  value={newKeyData.name}
                  onChange={(e) => setNewKeyData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* Quick Select Scopes */}
              <div className="space-y-2">
                <Label>Seleção Rápida</Label>
                <div className="flex gap-2 flex-wrap">
                  {SCOPE_GROUPS.map(group => (
                    <Button
                      key={group.name}
                      variant="outline"
                      size="sm"
                      onClick={() => applyScopeGroup(group.name)}
                    >
                      {group.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Scopes */}
              <div className="space-y-2">
                <Label>Escopos</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {Object.entries(SCOPE_DESCRIPTIONS).map(([scope, info]) => (
                    <label
                      key={scope}
                      className="flex items-start gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={newKeyData.scopes.includes(scope)}
                        onChange={() => toggleScope(scope)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{info.label}</div>
                        <div className="text-xs text-muted-foreground">{info.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rate Limit */}
              <div className="space-y-2">
                <Label htmlFor="rateLimit">Limite de Requisições (por minuto)</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  value={newKeyData.rateLimit}
                  onChange={(e) => setNewKeyData(prev => ({ ...prev, rateLimit: parseInt(e.target.value) || 100 }))}
                  min={1}
                  max={1000}
                />
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <Label htmlFor="expires">Validade (dias, 0 = sem expiração)</Label>
                <Input
                  id="expires"
                  type="number"
                  value={newKeyData.expiresInDays}
                  onChange={(e) => setNewKeyData(prev => ({ ...prev, expiresInDays: parseInt(e.target.value) || 0 }))}
                  min={0}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={createApiKey}
                disabled={!newKeyData.name || newKeyData.scopes.length === 0}
              >
                Criar Chave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* API Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle>Chaves Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma chave de API criada</p>
              <p className="text-sm">Crie uma nova chave para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Chave</TableHead>
                  <TableHead>Escopos</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{key.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Criada em {new Date(key.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {key.keyPrefix}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {key.scopes.slice(0, 3).map((scope) => (
                          <Badge key={scope} variant="outline" className="text-xs">
                            {scope.split(':')[0]}
                          </Badge>
                        ))}
                        {key.scopes.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{key.scopes.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{key.requestCount.toLocaleString()}</span>
                        {key.lastUsedAt && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(key.lastUsedAt).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {key.active ? (
                        key.expiresAt && new Date(key.expiresAt) < new Date() ? (
                          <Badge variant="destructive">Expirada</Badge>
                        ) : (
                          <Badge variant="default">Ativa</Badge>
                        )
                      ) : (
                        <Badge variant="secondary">Revogada</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => regenerateApiKey(key.id)}>
                            <RotateCw className="h-4 w-4 mr-2" />
                            Regenerar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteKeyId(key.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Revogar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Created Key Dialog */}
      <Dialog open={!!createdKey} onOpenChange={() => setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Chave Criada com Sucesso
            </DialogTitle>
            <DialogDescription>
              Copie a chave abaixo. Ela não será exibida novamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded-lg">
              <code className="text-sm break-all">{createdKey}</code>
            </div>
            
            <Button
              onClick={() => createdKey && copyToClipboard(createdKey)}
              className="w-full"
            >
              {copiedKey ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Chave
                </>
              )}
            </Button>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
              <p className="text-amber-700 dark:text-amber-400">
                Guarde esta chave em um local seguro. Ela não poderá ser recuperada depois de fechar esta janela.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation */}
      <AlertDialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar Chave de API</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A chave será permanentemente desativada e todas as integrações que a utilizam deixarão de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteKeyId) {
                  revokeApiKey(deleteKeyId);
                  setDeleteKeyId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revogar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
