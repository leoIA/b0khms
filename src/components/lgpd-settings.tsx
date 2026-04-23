// =============================================================================
// ConstrutorPro - LGPD Settings Component
// Interface para gerenciamento de dados pessoais (LGPD)
// =============================================================================

'use client';

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
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Database,
  Download,
  Trash2,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Shield,
  Clock,
  XCircle,
} from 'lucide-react';

interface DataSummary {
  totalRecords: number;
  byTable: {
    table: string;
    count: number;
    lastUpdated: string | null;
  }[];
  oldestRecord: string | null;
  newestRecord: string | null;
}

interface LGPDRequest {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  processedAt: string | null;
}

interface CanDeleteResult {
  canDelete: boolean;
  reason?: string;
  warnings: string[];
}

export function LGPDSettings() {
  const { toast } = useToast();

  // Estados
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [requests, setRequests] = useState<LGPDRequest[]>([]);
  const [canDelete, setCanDelete] = useState<CanDeleteResult | null>(null);

  // Dialog states
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);
  const [requestIdToDelete, setRequestIdToDelete] = useState<string | null>(null);

  // Loading states
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDeleteLoading, setConfirmDeleteLoading] = useState(false);

  // Confirmation input
  const [confirmationText, setConfirmationText] = useState('');

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Carregar resumo de dados
      const summaryRes = await fetch('/api/lgpd?action=summary');
      const summaryData = await summaryRes.json();
      if (summaryData.success) {
        setSummary(summaryData.data);
      }

      // Carregar solicitações
      const requestsRes = await fetch('/api/lgpd?action=requests');
      const requestsData = await requestsRes.json();
      if (requestsData.success) {
        setRequests(requestsData.data);
      }

      // Verificar se pode deletar
      const canDeleteRes = await fetch('/api/lgpd?action=can-delete');
      const canDeleteData = await canDeleteRes.json();
      if (canDeleteData.success) {
        setCanDelete(canDeleteData.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados LGPD:', error);
    } finally {
      setLoading(false);
    }
  }

  // Exportar dados
  async function handleExport() {
    setExportLoading(true);
    try {
      const response = await fetch('/api/lgpd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'export' }),
      });

      const data = await response.json();

      if (data.success) {
        // Criar arquivo para download
        const blob = new Blob([data.data.jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `construtorpro-dados-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        toast({
          title: 'Exportação concluída',
          description: `Seus dados foram exportados com sucesso.`,
        });

        setExportDialogOpen(false);
        loadData();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao exportar dados.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao conectar com o servidor.',
        variant: 'destructive',
      });
    } finally {
      setExportLoading(false);
    }
  }

  // Solicitar exclusão
  async function handleRequestDeletion() {
    setDeleteLoading(true);
    try {
      const response = await fetch('/api/lgpd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request-deletion' }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Solicitação registrada',
          description: 'Sua solicitação de exclusão foi registrada.',
        });
        setDeleteDialogOpen(false);
        setRequestIdToDelete(data.data.requestId);
        setConfirmDeleteDialogOpen(true);
        loadData();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao solicitar exclusão.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao conectar com o servidor.',
        variant: 'destructive',
      });
    } finally {
      setDeleteLoading(false);
    }
  }

  // Confirmar exclusão
  async function handleConfirmDeletion() {
    if (confirmationText !== 'EXCLUIR') {
      toast({
        title: 'Erro',
        description: 'Digite EXCLUIR para confirmar.',
        variant: 'destructive',
      });
      return;
    }

    setConfirmDeleteLoading(true);
    try {
      const response = await fetch('/api/lgpd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm-deletion',
          requestId: requestIdToDelete,
          confirmationCode: 'CONFIRMED',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Exclusão concluída',
          description: 'Seus dados foram excluídos/anonimizados conforme solicitado.',
        });
        setConfirmDeleteDialogOpen(false);
        setConfirmationText('');
        // Recarregar página para refletir mudanças
        window.location.href = '/login';
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao confirmar exclusão.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao conectar com o servidor.',
        variant: 'destructive',
      });
    } finally {
      setConfirmDeleteLoading(false);
    }
  }

  // Traduzir nome da tabela
  function getTableName(tableName: string): string {
    const names: Record<string, string> = {
      activities: 'Atividades',
      ai_conversations: 'Conversas de IA',
      daily_logs: 'Diários de Obra',
      projects: 'Projetos',
      budgets: 'Orçamentos',
      medicoes: 'Medições',
      purchase_orders: 'Ordens de Compra',
      sinapi_imports: 'Importações SINAPI',
      sessions: 'Sessões',
    };
    return names[tableName] || tableName;
  }

  // Traduzir tipo de solicitação
  function getRequestType(type: string): string {
    const types: Record<string, string> = {
      export: 'Exportação',
      delete: 'Exclusão',
      access: 'Acesso',
      rectify: 'Retificação',
    };
    return types[type] || type;
  }

  // Traduzir status
  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      processing: { label: 'Processando', variant: 'default' },
      completed: { label: 'Concluído', variant: 'outline' },
      rejected: { label: 'Rejeitado', variant: 'destructive' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Lei Geral de Proteção de Dados (LGPD)
          </CardTitle>
          <CardDescription>
            Gerencie seus dados pessoais conforme a LGPD
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Resumo de Dados */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Seus Dados
            </h4>

            {summary && summary.totalRecords > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{summary.totalRecords}</p>
                  <p className="text-sm text-muted-foreground">Total de registros</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{summary.byTable.length}</p>
                  <p className="text-sm text-muted-foreground">Tabelas com dados</p>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    {summary.oldestRecord
                      ? `Desde ${new Date(summary.oldestRecord).toLocaleDateString('pt-BR')}`
                      : 'Nenhum dado'}
                  </p>
                  <p className="text-sm text-muted-foreground">Registro mais antigo</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum dado encontrado.</p>
            )}

            {summary && summary.byTable.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tabela</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                    <TableHead>Última Atualização</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.byTable.slice(0, 5).map((item) => (
                    <TableRow key={item.table}>
                      <TableCell>{getTableName(item.table)}</TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                      <TableCell>
                        {item.lastUpdated
                          ? new Date(item.lastUpdated).toLocaleDateString('pt-BR')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Ações */}
          <div className="space-y-3">
            <h4 className="font-medium">Seus Direitos</h4>

            <div className="grid gap-3 md:grid-cols-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => setExportDialogOpen(true)}
              >
                <Download className="mr-2 h-4 w-4" />
                Exportar Meus Dados
              </Button>

              <Button
                variant="destructive"
                className="justify-start"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={!canDelete?.canDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Solicitar Exclusão
              </Button>
            </div>
          </div>

          {/* Histórico de Solicitações */}
          {requests.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Histórico de Solicitações
              </h4>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.slice(0, 5).map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{getRequestType(request.type)}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Informações LGPD */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Seus Direitos na LGPD</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                <li><strong>Acesso:</strong> Você pode solicitar informações sobre os dados que temos sobre você.</li>
                <li><strong>Portabilidade:</strong> Você pode solicitar uma cópia dos seus dados em formato estruturado.</li>
                <li><strong>Exclusão:</strong> Você pode solicitar a exclusão dos seus dados pessoais (sujeito a obrigações legais).</li>
                <li><strong>Retificação:</strong> Você pode solicitar a correção de dados incompletos ou incorretos.</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Dialog de Exportação */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Exportar Dados Pessoais
            </DialogTitle>
            <DialogDescription>
              Você receberá um arquivo JSON com todos os seus dados pessoais
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <FileText className="h-4 w-4" />
            <AlertTitle>Formato do Arquivo</AlertTitle>
            <AlertDescription>
              O arquivo será no formato JSON, legível por máquinas e humanos.
              Você pode abrir com qualquer editor de texto ou visualizador de JSON.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleExport} disabled={exportLoading}>
              {exportLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Solicitação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Solicitar Exclusão de Dados
            </DialogTitle>
            <DialogDescription>
              Esta ação iniciará o processo de exclusão dos seus dados pessoais
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              A exclusão de dados pode impactar seu acesso ao sistema e histórico.
              Alguns dados podem ser retidos por obrigação legal.
            </AlertDescription>
          </Alert>

          {canDelete?.warnings && canDelete.warnings.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Avisos</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {canDelete.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRequestDeletion}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Solicitando...
                </>
              ) : (
                'Solicitar Exclusão'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={confirmDeleteDialogOpen} onOpenChange={setConfirmDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão Definitiva
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Ação Irreversível</AlertTitle>
            <AlertDescription>
              Ao confirmar, seus dados pessoais serão excluídos ou anonimizados.
              Você será desconectado do sistema e não poderá mais acessar sua conta.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Digite <strong>EXCLUIR</strong> para confirmar:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
              placeholder="EXCLUIR"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDeleteDialogOpen(false);
                setConfirmationText('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeletion}
              disabled={confirmDeleteLoading || confirmationText !== 'EXCLUIR'}
            >
              {confirmDeleteLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Confirmar Exclusão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
