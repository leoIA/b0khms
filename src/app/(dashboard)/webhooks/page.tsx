'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Globe,
  Plus,
  MoreHorizontal,
  Play,
  Trash2,
  Edit,
  ChevronDown,
  CheckCircle,
  XCircle,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { WEBHOOK_EVENTS } from '@/lib/webhook-service';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  failureCount: number;
  createdAt: string;
  _count: {
    webhook_deliveries: number;
  };
}

interface TestResult {
  success: boolean;
  statusCode?: number;
  responseTime?: number;
  response?: string;
  error?: string;
}

export default function WebhooksPage() {
  const { data: session, status } = useSession({ required: true });
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [newSecret, setNewSecret] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    isActive: true,
  });

  // Fetch webhooks
  const fetchWebhooks = async () => {
    try {
      const res = await fetch('/api/webhooks');
      const data = await res.json();
      if (data.success) {
        setWebhooks(data.data);
      }
    } catch {
      toast.error('Erro ao carregar webhooks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchWebhooks();
    }
  }, [session]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      events: [],
      isActive: true,
    });
    setEditMode(false);
    setEditingWebhook(null);
  };

  // Open create dialog
  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (webhook: Webhook) => {
    setEditMode(true);
    setEditingWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
    });
    setDialogOpen(true);
  };

  // Toggle event selection
  const toggleEvent = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  // Create/Update webhook
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editMode ? `/api/webhooks/${editingWebhook?.id}` : '/api/webhooks';
      const method = editMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(editMode ? 'Webhook atualizado!' : 'Webhook criado!');
        setDialogOpen(false);
        resetForm();
        fetchWebhooks();

        // Show secret if new webhook
        if (!editMode && data.data.secret) {
          setNewSecret(data.data.secret);
          setSecretDialogOpen(true);
        }
      } else {
        toast.error(data.error || 'Erro ao salvar webhook');
      }
    } catch {
      toast.error('Erro ao salvar webhook');
    }
  };

  // Delete webhook
  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const res = await fetch(`/api/webhooks/${deleteId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Webhook excluído!');
        setDeleteId(null);
        fetchWebhooks();
      } else {
        toast.error(data.error || 'Erro ao excluir webhook');
      }
    } catch {
      toast.error('Erro ao excluir webhook');
    }
  };

  // Test webhook
  const handleTest = async (webhookId: string) => {
    setTestingId(webhookId);
    setTestResult(null);
    setTestDialogOpen(true);

    try {
      const res = await fetch(`/api/webhooks/${webhookId}/test`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        setTestResult(data.data);
        fetchWebhooks();
      } else {
        setTestResult({
          success: false,
          error: data.error || 'Erro ao testar webhook',
        });
      }
    } catch {
      setTestResult({
        success: false,
        error: 'Erro ao testar webhook',
      });
    } finally {
      setTestingId(null);
    }
  };

  // Toggle webhook status
  const toggleStatus = async (webhook: Webhook) => {
    try {
      const res = await fetch(`/api/webhooks/${webhook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !webhook.isActive }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(webhook.isActive ? 'Webhook desativado!' : 'Webhook ativado!');
        fetchWebhooks();
      } else {
        toast.error(data.error || 'Erro ao atualizar status');
      }
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  // Format date
  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR');
  };

  // Get status badge
  const getStatusBadge = (webhook: Webhook) => {
    if (!webhook.isActive) {
      return <Badge variant="secondary">Inativo</Badge>;
    }
    if (webhook.failureCount > 3) {
      return <Badge variant="destructive">Falhando</Badge>;
    }
    if (webhook.lastSuccessAt) {
      return <Badge variant="default" className="bg-green-600">Operacional</Badge>;
    }
    return <Badge variant="outline">Novo</Badge>;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Webhooks</h1>
          <p className="text-muted-foreground">
            Configure webhooks para integrar com sistemas externos
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Webhook
        </Button>
      </div>

      {/* Webhooks List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Webhooks Configurados
          </CardTitle>
          <CardDescription>
            Webhooks são notificações HTTP enviadas quando eventos ocorrem no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum webhook configurado</p>
              <p className="text-sm">Clique em &quot;Novo Webhook&quot; para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Disparo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {webhook.url}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {webhook.events.length} evento{webhook.events.length !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(webhook)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(webhook.lastTriggeredAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleTest(webhook.id)}>
                            <Play className="mr-2 h-4 w-4" />
                            Testar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditDialog(webhook)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleStatus(webhook)}>
                            {webhook.isActive ? (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(webhook.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editMode ? 'Editar Webhook' : 'Novo Webhook'}
              </DialogTitle>
              <DialogDescription>
                Configure o webhook para receber notificações de eventos
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Ex: Integração CRM"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="url">URL de Destino *</Label>
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, url: e.target.value }))
                    }
                    placeholder="https://api.exemplo.com/webhooks"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    URL HTTPS que receberá as requisições POST
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isActive: checked }))
                    }
                  />
                  <Label htmlFor="isActive">Webhook ativo</Label>
                </div>
              </div>

              {/* Events Selection */}
              <div className="space-y-4">
                <Label>Eventos *</Label>
                <p className="text-sm text-muted-foreground">
                  Selecione os eventos que devem disparar este webhook
                </p>

                {Object.entries(WEBHOOK_EVENTS).map(([category, events]) => (
                  <Collapsible key={category}>
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-muted">
                      <span className="font-medium">{category}</span>
                      <ChevronDown className="h-4 w-4" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 pt-2 space-y-2">
                      {events.map((event) => (
                        <label
                          key={event.event}
                          className="flex items-start gap-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.events.includes(event.event)}
                            onChange={() => toggleEvent(event.event)}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-sm">{event.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {event.description}
                            </div>
                          </div>
                        </label>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}

                {formData.events.length === 0 && (
                  <p className="text-sm text-destructive">
                    Selecione pelo menos um evento
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={!formData.name || !formData.url || formData.events.length === 0}
              >
                {editMode ? 'Salvar' : 'Criar Webhook'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Test Result Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Teste de Webhook</DialogTitle>
            <DialogDescription>
              Resultado do teste de envio do webhook
            </DialogDescription>
          </DialogHeader>

          {testingId ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Enviando teste...</span>
            </div>
          ) : testResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    <span className="font-medium text-green-600">Sucesso!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-red-500" />
                    <span className="font-medium text-red-600">Falhou</span>
                  </>
                )}
              </div>

              {testResult.statusCode && (
                <div>
                  <Label>Código HTTP</Label>
                  <div className="text-sm font-mono bg-muted p-2 rounded">
                    {testResult.statusCode}
                  </div>
                </div>
              )}

              {testResult.responseTime && (
                <div>
                  <Label>Tempo de Resposta</Label>
                  <div className="text-sm">{testResult.responseTime}ms</div>
                </div>
              )}

              {testResult.response && (
                <div>
                  <Label>Resposta</Label>
                  <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-[200px]">
                    {testResult.response}
                  </pre>
                </div>
              )}

              {testResult.error && (
                <div>
                  <Label>Erro</Label>
                  <div className="text-sm text-destructive">{testResult.error}</div>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button onClick={() => setTestDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Secret Dialog */}
      <Dialog open={secretDialogOpen} onOpenChange={setSecretDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Secret do Webhook
            </DialogTitle>
            <DialogDescription>
              Guarde este secret em local seguro. Ele não será exibido novamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
              <code className="text-sm break-all select-all">{newSecret}</code>
            </div>

            <p className="text-sm text-muted-foreground">
              Use este secret para verificar a assinatura dos webhooks recebidos.
              A assinatura é enviada no header <code>X-Webhook-Signature</code>.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => copyToClipboard(newSecret)}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar
            </Button>
            <Button onClick={() => setSecretDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este webhook? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
