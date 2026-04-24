// =============================================================================
// ConstrutorPro - Budget Version History Component
// Interface para visualizar e gerenciar versões de orçamentos
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  History,
  Plus,
  RotateCcw,
  Check,
  X,
  Archive,
  Trash2,
  GitCompare,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  User,
  FileText,
  ArrowRight,
  Info,
  AlertTriangle,
} from 'lucide-react';

interface Version {
  id: string;
  versionNumber: number;
  name: string;
  description: string | null;
  totalValue: number;
  status: string;
  itemsAdded: number;
  itemsRemoved: number;
  itemsModified: number;
  valueChange: number;
  createdAt: string;
  creator: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface VersionStats {
  totalVersions: number;
  averageValueChange: number;
  approvalRate: number;
  totalValueGrowth: number;
}

interface ComparisonResult {
  versionFrom: Version;
  versionTo: Version;
  itemsAdded: unknown[];
  itemsRemoved: unknown[];
  itemsModified: unknown[];
  totalValueChange: number;
  summary: {
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    percentChange: number;
  };
}

interface BudgetVersionHistoryProps {
  budgetId: string;
}

export function BudgetVersionHistory({ budgetId }: BudgetVersionHistoryProps) {
  const { toast } = useToast();

  // Estados
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState<Version[]>([]);
  const [stats, setStats] = useState<VersionStats | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [versionDetailDialogOpen, setVersionDetailDialogOpen] = useState(false);

  // Form states
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionDescription, setNewVersionDescription] = useState('');
  const [compareFromVersion, setCompareFromVersion] = useState('');
  const [compareToVersion, setCompareToVersion] = useState('');
  const [versionToRestore, setVersionToRestore] = useState<Version | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [restoreReason, setRestoreReason] = useState('');

  // Loading states
  const [creating, setCreating] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);

  // Carregar dados
  useEffect(() => {
    loadData();
  }, [budgetId]);

  async function loadData() {
    setLoading(true);
    try {
      // Carregar versões
      const versionsRes = await fetch(`/api/orcamentos/${budgetId}/versoes?action=list`);
      const versionsData = await versionsRes.json();
      if (versionsData.success) {
        setVersions(versionsData.data.versions);
      }

      // Carregar estatísticas
      const statsRes = await fetch(`/api/orcamentos/${budgetId}/versoes?action=stats`);
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.data);
      }
    } catch (error) {
      console.error('Erro ao carregar versões:', error);
    } finally {
      setLoading(false);
    }
  }

  // Criar nova versão
  async function handleCreateVersion() {
    setCreating(true);
    try {
      const response = await fetch(`/api/orcamentos/${budgetId}/versoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          name: newVersionName,
          description: newVersionDescription,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Nova versão criada com sucesso.',
        });
        setCreateDialogOpen(false);
        setNewVersionName('');
        setNewVersionDescription('');
        loadData();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao criar versão.',
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
      setCreating(false);
    }
  }

  // Comparar versões
  async function handleCompareVersions() {
    if (!compareFromVersion || !compareToVersion) {
      toast({
        title: 'Erro',
        description: 'Selecione duas versões para comparar.',
        variant: 'destructive',
      });
      return;
    }

    setComparing(true);
    try {
      const response = await fetch(
        `/api/orcamentos/${budgetId}/versoes?action=compare&fromVersionId=${compareFromVersion}&toVersionId=${compareToVersion}`
      );

      const data = await response.json();

      if (data.success) {
        setComparison(data.data);
        toast({
          title: 'Comparação concluída',
          description: 'As versões foram comparadas com sucesso.',
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao comparar versões.',
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
      setComparing(false);
    }
  }

  // Restaurar versão
  async function handleRestoreVersion() {
    if (!versionToRestore) return;

    setRestoring(true);
    try {
      const response = await fetch(`/api/orcamentos/${budgetId}/versoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore',
          versionId: versionToRestore.id,
          reason: restoreReason,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Versão restaurada com sucesso.',
        });
        setRestoreDialogOpen(false);
        setVersionToRestore(null);
        setRestoreReason('');
        loadData();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao restaurar versão.',
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
      setRestoring(false);
    }
  }

  // Formatar moeda
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  // Formatar data
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Badge de status
  function getStatusBadge(status: string) {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
      draft: { label: 'Rascunho', variant: 'secondary' },
      approved: { label: 'Aprovada', variant: 'outline', className: 'text-green-600 border-green-600' },
      rejected: { label: 'Rejeitada', variant: 'destructive' },
      archived: { label: 'Arquivada', variant: 'outline' },
    };
    const c = config[status] || { label: status, variant: 'outline' };
    return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
  }

  // Ícone de mudança de valor
  function getValueChangeIcon(change: number) {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
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
            <History className="h-5 w-5" />
            Histórico de Versões
          </CardTitle>
          <CardDescription>
            Gerencie e visualize o histórico de alterações do orçamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Estatísticas */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{stats.totalVersions}</p>
                <p className="text-sm text-muted-foreground">Total de versões</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{stats.approvalRate}%</p>
                <p className="text-sm text-muted-foreground">Taxa de aprovação</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className={`text-2xl font-bold ${stats.totalValueGrowth >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {formatCurrency(stats.totalValueGrowth)}
                </p>
                <p className="text-sm text-muted-foreground">Variação total</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{formatCurrency(stats.averageValueChange)}</p>
                <p className="text-sm text-muted-foreground">Variação média/versão</p>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Versão
            </Button>
            <Button variant="outline" onClick={() => setCompareDialogOpen(true)}>
              <GitCompare className="mr-2 h-4 w-4" />
              Comparar Versões
            </Button>
          </div>

          {/* Lista de versões */}
          {versions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versão</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                  <TableHead>Criado por</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id}>
                    <TableCell className="font-medium">v{version.versionNumber}</TableCell>
                    <TableCell>{version.name}</TableCell>
                    <TableCell>{getStatusBadge(version.status)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(version.totalValue)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {getValueChangeIcon(version.valueChange)}
                        <span className={version.valueChange > 0 ? 'text-red-500' : version.valueChange < 0 ? 'text-green-500' : ''}>
                          {formatCurrency(version.valueChange)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {version.creator?.name || 'Sistema'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(version.createdAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedVersion(version);
                            setVersionDetailDialogOpen(true);
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                        {version.status !== 'approved' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setVersionToRestore(version);
                              setRestoreDialogOpen(true);
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Alert>
              <History className="h-4 w-4" />
              <AlertTitle>Nenhuma versão</AlertTitle>
              <AlertDescription>
                Este orçamento ainda não possui versões salvas. Crie uma nova versão para começar.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Criar Nova Versão */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Versão</DialogTitle>
            <DialogDescription>
              Salve o estado atual do orçamento como uma nova versão
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="versionName">Nome da Versão</Label>
              <Input
                id="versionName"
                placeholder="Ex: Versão Final, Revisão Cliente, etc."
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="versionDescription">Descrição / Motivo</Label>
              <Input
                id="versionDescription"
                placeholder="Ex: Alteração de quantidades após visita técnica"
                value={newVersionDescription}
                onChange={(e) => setNewVersionDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateVersion} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Versão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Comparar Versões */}
      <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Comparar Versões</DialogTitle>
            <DialogDescription>
              Compare duas versões para ver as diferenças
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Versão Inicial</Label>
                <Select value={compareFromVersion} onValueChange={setCompareFromVersion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a versão" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        v{v.versionNumber} - {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Versão Final</Label>
                <Select value={compareToVersion} onValueChange={setCompareToVersion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a versão" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        v{v.versionNumber} - {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleCompareVersions}
              disabled={comparing || !compareFromVersion || !compareToVersion}
              className="w-full"
            >
              {comparing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Comparando...
                </>
              ) : (
                <>
                  <GitCompare className="mr-2 h-4 w-4" />
                  Comparar
                </>
              )}
            </Button>

            {/* Resultado da Comparação */}
            {comparison && (
              <div className="space-y-4 mt-4 pt-4 border-t">
                <h4 className="font-medium">Resultado da Comparação</h4>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{comparison.summary.addedCount}</p>
                    <p className="text-sm text-muted-foreground">Itens adicionados</p>
                  </div>
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600">{comparison.summary.removedCount}</p>
                    <p className="text-sm text-muted-foreground">Itens removidos</p>
                  </div>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-600">{comparison.summary.modifiedCount}</p>
                    <p className="text-sm text-muted-foreground">Itens modificados</p>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Variação de valor:</span>
                    <span className={`text-lg font-bold ${comparison.totalValueChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {comparison.totalValueChange >= 0 ? '+' : ''}{formatCurrency(comparison.totalValueChange)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-muted-foreground">Variação percentual:</span>
                    <span className="text-sm font-medium">
                      {comparison.summary.percentChange >= 0 ? '+' : ''}{comparison.summary.percentChange}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCompareDialogOpen(false);
              setComparison(null);
              setCompareFromVersion('');
              setCompareToVersion('');
            }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Restaurar Versão */}
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar Versão</DialogTitle>
            <DialogDescription>
              Restaure esta versão como o estado atual do orçamento
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Restaurar uma versão anterior substituirá os dados atuais do orçamento.
              Uma nova versão será criada automaticamente com o estado restaurado.
            </AlertDescription>
          </Alert>

          {versionToRestore && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">v{versionToRestore.versionNumber} - {versionToRestore.name}</p>
              <p className="text-sm text-muted-foreground">
                Valor: {formatCurrency(versionToRestore.totalValue)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="restoreReason">Motivo da Restauração</Label>
            <Input
              id="restoreReason"
              placeholder="Ex: Cliente solicitou retorno à versão anterior"
              value={restoreReason}
              onChange={(e) => setRestoreReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRestoreVersion}
              disabled={restoring}
            >
              {restoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restaurar Versão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes da Versão */}
      <Dialog open={versionDetailDialogOpen} onOpenChange={setVersionDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Versão</DialogTitle>
          </DialogHeader>

          {selectedVersion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Versão</Label>
                  <p className="font-medium">v{selectedVersion.versionNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p>{getStatusBadge(selectedVersion.status)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nome</Label>
                  <p className="font-medium">{selectedVersion.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor Total</Label>
                  <p className="font-medium">{formatCurrency(selectedVersion.totalValue)}</p>
                </div>
              </div>

              {selectedVersion.description && (
                <div>
                  <Label className="text-muted-foreground">Descrição</Label>
                  <p className="text-sm">{selectedVersion.description}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 p-3 bg-muted rounded-lg">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{selectedVersion.itemsAdded}</p>
                  <p className="text-xs text-muted-foreground">Adicionados</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-red-600">{selectedVersion.itemsRemoved}</p>
                  <p className="text-xs text-muted-foreground">Removidos</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-yellow-600">{selectedVersion.itemsModified}</p>
                  <p className="text-xs text-muted-foreground">Modificados</p>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>Criado por: {selectedVersion.creator?.name || 'Sistema'}</p>
                <p>Data: {formatDate(selectedVersion.createdAt)}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionDetailDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
