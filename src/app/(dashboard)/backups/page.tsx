// =============================================================================
// ConstrutorPro - Página de Backups
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Database,
  HardDrive,
  Clock,
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Shield,
  TestTube,
} from 'lucide-react';
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

interface BackupLog {
  id: string;
  type: string;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  sizeBytes: string | null;
  storageLocation: string | null;
  checksum: string | null;
  errorMessage: string | null;
  createdAt: string;
  backup_restore_tests: Array<{
    testedAt: string | null;
    status: string;
    durationSeconds: number | null;
  }>;
}

interface BackupStats {
  totalBackups: number;
  successfulBackups: number;
  failedBackups: number;
  lastBackup: {
    id: string;
    type: string;
    completedAt: string;
    sizeBytes: number;
  } | null;
  totalSizeBytes: number;
  lastRestoreTest: {
    testedAt: string;
    durationSeconds: number | null;
  } | null;
}

export default function BackupsPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [backups, setBackups] = useState<BackupLog[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [testDialog, setTestDialog] = useState<string | null>(null);
  const [cleanupDialog, setCleanupDialog] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, backupsRes] = await Promise.all([
        fetch('/api/backup?action=stats'),
        fetch('/api/backup?action=list&limit=20')
      ]);

      const statsData = await statsRes.json();
      const backupsData = await backupsRes.json();

      if (statsData.success) {
        setStats(statsData.data);
      }

      if (backupsData.success) {
        setBackups(backupsData.data.backups);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados de backup',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status, fetchData]);

  const executeBackup = async (type: 'full' | 'wal') => {
    setActionLoading(`backup-${type}`);
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: type === 'full' ? 'backup-full' : 'backup-wal',
          config: {
            enabled: true,
            schedule: 'daily',
            retentionDays: 30,
            storageType: 'local',
            encryptionEnabled: true,
            includeWAL: true,
            compressionEnabled: true,
          }
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: data.message,
        });
        fetchData();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao executar backup',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao executar backup',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const testRestore = async (backupLogId: string) => {
    setActionLoading(`test-${backupLogId}`);
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-restore',
          backupLogId
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Teste de restauração concluído com sucesso',
        });
        fetchData();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro no teste de restauração',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro no teste de restauração',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
      setTestDialog(null);
    }
  };

  const cleanupBackups = async () => {
    setActionLoading('cleanup');
    try {
      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup' })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: data.message,
        });
        fetchData();
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao limpar backups',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
      setCleanupDialog(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      success: 'default',
      failed: 'destructive',
      running: 'secondary',
      pending: 'outline'
    };
    const labels: Record<string, string> = {
      success: 'Sucesso',
      failed: 'Falhou',
      running: 'Executando',
      pending: 'Pendente'
    };
    return (
      <Badge variant={variants[status] || 'outline'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const labels: Record<string, string> = {
      full: 'Completo',
      incremental: 'Incremental',
      wal: 'WAL'
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const isMasterAdmin = session?.user?.role === 'master_admin';

  if (!isMasterAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Acesso Restrito</h2>
            <p className="text-muted-foreground mt-2">
              Apenas administradores master podem acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backup & Restauração</h1>
          <p className="text-muted-foreground">
            Gerencie backups do banco de dados com criptografia AES-256
          </p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Backups</p>
                <p className="text-2xl font-bold">{stats?.totalBackups || 0}</p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats?.totalBackups 
                    ? Math.round((stats.successfulBackups / stats.totalBackups) * 100) 
                    : 0}%
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Armazenamento Total</p>
                <p className="text-2xl font-bold">
                  {formatBytes(stats?.totalSizeBytes || 0)}
                </p>
              </div>
              <HardDrive className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Último Backup</p>
                <p className="text-sm font-bold">
                  {stats?.lastBackup 
                    ? formatDate(stats.lastBackup.completedAt)
                    : 'Nenhum backup'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações de Backup</CardTitle>
          <CardDescription>
            Execute backups manuais ou teste a restauração de backups existentes
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button 
            onClick={() => executeBackup('full')}
            disabled={actionLoading !== null}
          >
            {actionLoading === 'backup-full' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Database className="mr-2 h-4 w-4" />
            )}
            Backup Completo
          </Button>

          <Button 
            variant="outline"
            onClick={() => executeBackup('wal')}
            disabled={actionLoading !== null}
          >
            {actionLoading === 'backup-wal' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Backup WAL
          </Button>

          <AlertDialog open={cleanupDialog} onOpenChange={setCleanupDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={actionLoading !== null}>
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Expirados
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Limpeza</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso removerá todos os backups que já passaram do período de retenção.
                  Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={cleanupBackups}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Backups</CardTitle>
          <CardDescription>
            Todos os backups realizados com status e detalhes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum backup realizado</p>
              <p className="text-sm">Execute um backup completo para começar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Teste de Restauração</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => {
                  const lastTest = backup.backup_restore_tests[0];
                  
                  return (
                    <TableRow key={backup.id}>
                      <TableCell>{getTypeBadge(backup.type)}</TableCell>
                      <TableCell>{getStatusBadge(backup.status)}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(backup.startedAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(backup.completedAt)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {backup.sizeBytes ? formatBytes(Number(backup.sizeBytes)) : '-'}
                      </TableCell>
                      <TableCell>
                        {lastTest ? (
                          <div className="flex items-center gap-2">
                            {lastTest.status === 'success' ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="text-sm">
                              {formatDate(lastTest.testedAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Não testado</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {backup.status === 'success' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTestDialog(backup.id)}
                              disabled={actionLoading !== null}
                            >
                              {actionLoading === `test-${backup.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <TestTube className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Test Restore Dialog */}
      <Dialog open={!!testDialog} onOpenChange={() => setTestDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Teste de Restauração
            </DialogTitle>
            <DialogDescription>
              Este teste irá criar um banco de dados temporário e restaurar o backup para verificar sua integridade.
              O processo pode levar alguns minutos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={() => testDialog && testRestore(testDialog)}>
              Executar Teste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
