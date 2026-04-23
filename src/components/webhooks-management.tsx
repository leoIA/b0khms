'use client';

/**
 * Webhooks Management Component
 * 
 * Features:
 * - Create/manage webhooks
 * - View logs
 * - Test webhooks
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Webhook,
  Plus,
  Play,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
} from 'lucide-react';

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  successCount: number;
  failureCount: number;
  lastTriggeredAt: string | null;
  createdAt: string;
  secret?: string;
}

interface WebhookLog {
  id: string;
  event: string;
  success: boolean;
  statusCode: number | null;
  error: string | null;
  triggeredAt: string;
}

const WEBHOOK_EVENTS: Record<string, string> = {
  'project.created': 'Projeto criado',
  'project.updated': 'Projeto atualizado',
  'project.deleted': 'Projeto excluído',
  'project.status_changed': 'Status do projeto alterado',
  'budget.created': 'Orçamento criado',
  'budget.updated': 'Orçamento atualizado',
  'budget.approved': 'Orçamento aprovado',
  'task.created': 'Tarefa criada',
  'task.updated': 'Tarefa atualizada',
  'task.completed': 'Tarefa concluída',
  'purchase_order.created': 'Pedido de compra criado',
  'purchase_order.approved': 'Pedido de compra aprovado',
  'invoice.created': 'Fatura criada',
  'invoice.paid': 'Fatura paga',
  'invoice.overdue': 'Fatura vencida',
  'measurement.created': 'Medição criada',
  'measurement.approved': 'Medição aprovada',
  'asset.created': 'Ativo criado',
  'asset.updated': 'Ativo atualizado',
};

export function WebhooksManagement() {
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [selectedWebhookLogs, setSelectedWebhookLogs] = useState<WebhookLog[]>([]);
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: '',
  });
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/webhooks');
      const data = await response.json();
      setWebhooks(data.data || []);
      setAvailableEvents(data.events || Object.keys(WEBHOOK_EVENTS));
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWebhook = async () => {
    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebhook),
      });

      const data = await response.json();

      if (data.secret) {
        setCreatedSecret(data.secret);
      }

      fetchWebhooks();
      setShowCreateDialog(false);
      setNewWebhook({ name: '', url: '', events: [], secret: '' });
    } catch (error) {
      console.error('Failed to create webhook:', error);
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      await fetch(`/api/webhooks/${id}`, { method: 'DELETE' });
      fetchWebhooks();
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  };

  const testWebhook = async (id: string) => {
    try {
      await fetch(`/api/webhooks/${id}/test`, { method: 'POST' });
      // Could show a toast notification here
    } catch (error) {
      console.error('Failed to test webhook:', error);
    }
  };

  const viewLogs = async (id: string) => {
    try {
      const response = await fetch(`/api/webhooks/${id}/logs`);
      const data = await response.json();
      setSelectedWebhookLogs(data.logs || []);
      setShowLogsDialog(true);
    } catch (error) {
      console.error('Failed to fetch webhook logs:', error);
    }
  };

  const toggleEvent = (event: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Webhooks</h2>
          <p className="text-muted-foreground">
            Configure webhooks para receber notificações em tempo real
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Webhook</DialogTitle>
              <DialogDescription>
                Configure um webhook para receber notificações de eventos
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Ex: Integração ERP"
                  value={newWebhook.name}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="url">URL do Endpoint</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://seu-servidor.com/webhook"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  URL que receberá as requisições POST com os eventos
                </p>
              </div>

              {/* Secret */}
              <div className="space-y-2">
                <Label htmlFor="secret">Secret (opcional)</Label>
                <Input
                  id="secret"
                  placeholder="Deixe em branco para gerar automaticamente"
                  value={newWebhook.secret}
                  onChange={(e) => setNewWebhook(prev => ({ ...prev, secret: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Usado para assinar payloads (HMAC-SHA256)
                </p>
              </div>

              {/* Events */}
              <div className="space-y-2">
                <Label>Eventos</Label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {availableEvents.map((event) => (
                    <label
                      key={event}
                      className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={newWebhook.events.includes(event)}
                        onChange={() => toggleEvent(event)}
                        className="mt-0.5"
                      />
                      <div>
                        <div className="text-sm">{WEBHOOK_EVENTS[event] || event}</div>
                        <div className="text-xs text-muted-foreground">{event}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={createWebhook}
                disabled={!newWebhook.name || !newWebhook.url || newWebhook.events.length === 0}
              >
                Criar Webhook
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Webhooks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Webhooks Configurados</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Webhook className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum webhook configurado</p>
              <p className="text-sm">Crie um novo webhook para receber notificações</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Estatísticas</TableHead>
                  <TableHead className="w-32">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{webhook.name}</div>
                        {webhook.secret && (
                          <code className="text-xs text-muted-foreground">
                            {webhook.secret}
                          </code>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded max-w-xs truncate">
                          {webhook.url}
                        </code>
                        <a
                          href={webhook.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {webhook.events.slice(0, 2).map((event) => (
                          <Badge key={event} variant="outline" className="text-xs">
                            {WEBHOOK_EVENTS[event] || event}
                          </Badge>
                        ))}
                        {webhook.events.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{webhook.events.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {webhook.active ? (
                        <Badge variant="default" className="bg-green-500">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          {webhook.successCount}
                        </div>
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          {webhook.failureCount}
                        </div>
                      </div>
                      {webhook.lastTriggeredAt && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(webhook.lastTriggeredAt).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => testWebhook(webhook.id)}
                          title="Testar"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => viewLogs(webhook.id)}
                          title="Ver logs"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteWebhookId(webhook.id)}
                          title="Excluir"
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Logs Dialog */}
      <Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Histórico de Execuções</DialogTitle>
            <DialogDescription>
              Últimas execuções do webhook
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {selectedWebhookLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma execução registrada
              </p>
            ) : (
              selectedWebhookLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border ${
                    log.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {log.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <Badge variant="outline">{log.event}</Badge>
                      {log.statusCode && (
                        <Badge variant={log.statusCode < 400 ? 'default' : 'destructive'}>
                          HTTP {log.statusCode}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.triggeredAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {log.error && (
                    <p className="text-sm text-red-600 mt-2">{log.error}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteWebhookId} onOpenChange={() => setDeleteWebhookId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O webhook será permanentemente removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteWebhookId) {
                  deleteWebhook(deleteWebhookId);
                  setDeleteWebhookId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Created Secret Dialog */}
      <Dialog open={!!createdSecret} onOpenChange={() => setCreatedSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Webhook Criado</DialogTitle>
            <DialogDescription>
              Guarde o secret abaixo. Ele não será exibido novamente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-muted p-3 rounded-lg">
              <code className="text-sm break-all">{createdSecret}</code>
            </div>
            
            <Button
              onClick={() => createdSecret && copyToClipboard(createdSecret)}
              className="w-full"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Secret
                </>
              )}
            </Button>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg text-sm">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
              <p className="text-amber-700 dark:text-amber-400">
                Use este secret para verificar a assinatura dos payloads recebidos.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
