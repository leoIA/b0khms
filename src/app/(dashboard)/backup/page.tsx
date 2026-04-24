// =============================================================================
// ConstrutorPro - Página de Backup e Agendamentos
// =============================================================================

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Database,
  Download,
  Upload,
  FileJson,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  HardDrive,
  Shield,
  Calendar,
  Clock,
  Info,
  Trash2,
  Play,
  Pause,
  Settings,
  Plus,
  RefreshCw,
  History,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =============================================================================
// Types
// =============================================================================

interface ModuleInfo {
  name: string;
  label: string;
  count: number;
}

interface BackupSchedule {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  modules: string[];
  retentionDays: number;
  maxBackups: number;
  encryptBackups: boolean;
  compressBackups: boolean;
  scheduledTime: string;
  isActive: boolean;
  nextRunAt?: Date;
  lastRunAt?: Date;
  lastStatus?: string;
}

interface BackupHistoryItem {
  id: string;
  scheduleId: string | null;
  triggerType: string;
  status: string;
  modules: string[];
  fileSize: number | null;
  duration: number | null;
  createdAt: Date;
  completedAt: Date | null;
  errorMessage: string | null;
}

// =============================================================================
// Constants
// =============================================================================

const MODULE_LABELS: Record<string, string> = {
  projects: 'Projetos',
  clients: 'Clientes',
  suppliers: 'Fornecedores',
  materials: 'Materiais',
  compositions: 'Composições',
  budgets: 'Orçamentos',
  transactions: 'Transações',
  dailyLogs: 'Diário de Obra',
  scheduleTasks: 'Cronograma',
  users: 'Usuários',
  settings: 'Configurações',
};

const FREQUENCY_LABELS: Record<string, string> = {
  hourly: 'A cada hora',
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
};

const STATUS_COLORS: Record<string, string> = {
  success: 'bg-green-500',
  failed: 'bg-red-500',
  running: 'bg-blue-500',
  pending: 'bg-yellow-500',
};

const STATUS_LABELS: Record<string, string> = {
  success: 'Sucesso',
  failed: 'Falhou',
  running: 'Executando',
  pending: 'Pendente',
  partial: 'Parcial',
};

// =============================================================================
// Component
// =============================================================================

export default function BackupPage() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMasterAdmin = session?.user?.role === 'master_admin';

  // State
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<'idle' | 'validating' | 'restoring' | 'done'>('idle');
  const [newScheduleDialogOpen, setNewScheduleDialogOpen] = useState(false);
  
  // New schedule form
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    description: '',
    frequency: 'daily' as 'hourly' | 'daily' | 'weekly' | 'monthly',
    modules: [] as string[],
    retentionDays: 30,
    maxBackups: 10,
    scheduledTime: '02:00',
    notifyOnSuccess: true,
    notifyOnFailure: true,
  });

  // Queries
  const { data: schedulesData, isLoading: schedulesLoading, refetch: refetchSchedules } = useQuery({
    queryKey: ['backup-schedules'],
    queryFn: async () => {
      const response = await fetch('/api/backup/schedules');
      return response.json();
    },
    enabled: isMasterAdmin,
  });

  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ['backup-history'],
    queryFn: async () => {
      const response = await fetch('/api/backup/history');
      return response.json();
    },
    enabled: isMasterAdmin,
  });

  // Mutations
  const executeBackupMutation = useMutation({
    mutationFn: async (modules: string[]) => {
      const response = await fetch('/api/backup/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Backup executado',
          description: `Backup de ${data.backup.modules.length} módulos criado com sucesso.`,
        });
        refetchHistory();
      } else {
        toast({
          title: 'Erro no backup',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    },
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (schedule: typeof newSchedule) => {
      const response = await fetch('/api/backup/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...schedule,
          companyId: session?.user?.companyId,
        }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: 'Agendamento criado',
          description: 'O agendamento de backup foi criado com sucesso.',
        });
        setNewScheduleDialogOpen(false);
        setNewSchedule({
          name: '',
          description: '',
          frequency: 'daily',
          modules: [],
          retentionDays: 30,
          maxBackups: 10,
          scheduledTime: '02:00',
          notifyOnSuccess: true,
          notifyOnFailure: true,
        });
        refetchSchedules();
      } else {
        toast({
          title: 'Erro ao criar agendamento',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await fetch(`/api/backup/schedules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      return response.json();
    },
    onSuccess: () => {
      refetchSchedules();
    },
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/backup/schedules/${id}`, {
        method: 'DELETE',
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Agendamento removido',
        description: 'O agendamento foi removido com sucesso.',
      });
      refetchSchedules();
    },
  });

  // Handlers
  const handleModuleToggle = useCallback((module: string) => {
    setSelectedModules((prev) =>
      prev.includes(module)
        ? prev.filter((m) => m !== module)
        : [...prev, module]
    );
  }, []);

  const handleExecuteBackup = useCallback(() => {
    if (selectedModules.length === 0) {
      toast({
        title: 'Selecione módulos',
        description: 'Selecione pelo menos um módulo para o backup.',
        variant: 'destructive',
      });
      return;
    }
    executeBackupMutation.mutate(selectedModules);
  }, [selectedModules, executeBackupMutation, toast]);

  const handleDownloadBackup = useCallback(async (backupId: string) => {
    try {
      const response = await fetch(`/api/backup/history/${backupId}?download=true`);
      if (!response.ok) throw new Error('Erro ao baixar backup');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${backupId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: 'Erro ao baixar',
        description: 'Não foi possível baixar o backup.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleRestoreBackup = useCallback(async (backupId: string) => {
    try {
      const response = await fetch(`/api/backup/restore/${backupId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overwrite: false }),
      });
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Backup restaurado',
          description: `${data.modulesRestored?.length || 0} módulos restaurados.`,
        });
      } else {
        toast({
          title: 'Erro na restauração',
          description: data.error || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro na restauração',
        description: 'Não foi possível restaurar o backup.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}min`;
  };

  // Available modules
  const availableModules = Object.entries(MODULE_LABELS).map(([name, label]) => ({
    name,
    label,
  }));

  const schedules = schedulesData?.data || [];
  const history = historyData?.data?.history || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Backup e Restauração</h1>
          <p className="text-muted-foreground">
            Gerencie backups, agendamentos e restauração de dados
          </p>
        </div>
        {isMasterAdmin && (
          <Button onClick={() => setNewScheduleDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="execute" className="space-y-4">
        <TabsList>
          <TabsTrigger value="execute">
            <Play className="h-4 w-4 mr-2" />
            Executar Backup
          </TabsTrigger>
          {isMasterAdmin && (
            <TabsTrigger value="schedules">
              <Calendar className="h-4 w-4 mr-2" />
              Agendamentos
            </TabsTrigger>
          )}
          {isMasterAdmin && (
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Histórico
            </TabsTrigger>
          )}
        </TabsList>

        {/* Execute Backup Tab */}
        <TabsContent value="execute" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Executar Backup Manual</CardTitle>
              <CardDescription>
                Selecione os módulos e execute um backup imediatamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Module Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Selecione os Módulos</Label>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedModules(availableModules.map(m => m.name))}
                    >
                      Selecionar Todos
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedModules([])}>
                      Limpar
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {availableModules.map((module) => (
                    <div
                      key={module.name}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedModules.includes(module.name)
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => handleModuleToggle(module.name)}
                    >
                      <Checkbox
                        id={module.name}
                        checked={selectedModules.includes(module.name)}
                        onCheckedChange={() => handleModuleToggle(module.name)}
                      />
                      <Label htmlFor={module.name} className="cursor-pointer">
                        {module.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selection Summary */}
              {selectedModules.length > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Seleção</AlertTitle>
                  <AlertDescription>
                    {selectedModules.length} módulo(s): {selectedModules.map(m => MODULE_LABELS[m]).join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleExecuteBackup}
                  disabled={selectedModules.length === 0 || executeBackupMutation.isPending}
                >
                  {executeBackupMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Executar Backup
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedules Tab */}
        {isMasterAdmin && (
          <TabsContent value="schedules" className="space-y-4">
            {schedulesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : schedules.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum agendamento configurado</p>
                  <Button className="mt-4" onClick={() => setNewScheduleDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Agendamento
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {schedules.map((schedule: BackupSchedule) => (
                  <Card key={schedule.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{schedule.name}</h3>
                            <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                              {schedule.isActive ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {schedule.description || FREQUENCY_LABELS[schedule.frequency]} às {schedule.scheduledTime}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {schedule.modules.map((m) => (
                              <Badge key={m} variant="outline" className="text-xs">
                                {MODULE_LABELS[m] || m}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleScheduleMutation.mutate({
                              id: schedule.id,
                              isActive: !schedule.isActive,
                            })}
                          >
                            {schedule.isActive ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteScheduleMutation.mutate(schedule.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {schedule.nextRunAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Próxima execução: {format(new Date(schedule.nextRunAt), "dd/MM/yyyy 'às' HH:mm")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        )}

        {/* History Tab */}
        {isMasterAdmin && (
          <TabsContent value="history" className="space-y-4">
            {historyLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : history.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhum backup executado ainda</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Módulos</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tamanho</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((item: BackupHistoryItem) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-sm">
                            {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.triggerType === 'manual' ? 'Manual' : 'Agendado'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {item.modules.slice(0, 3).map((m) => (
                                <Badge key={m} variant="secondary" className="text-xs">
                                  {MODULE_LABELS[m] || m}
                                </Badge>
                              ))}
                              {item.modules.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{item.modules.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${STATUS_COLORS[item.status]} text-white`}>
                              {STATUS_LABELS[item.status] || item.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatBytes(item.fileSize)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDuration(item.duration)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {item.status === 'success' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadBackup(item.id)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              {item.status === 'success' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRestoreBackup(item.id)}
                                >
                                  <Upload className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* New Schedule Dialog */}
      <Dialog open={newScheduleDialogOpen} onOpenChange={setNewScheduleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Agendamento de Backup</DialogTitle>
            <DialogDescription>
              Configure um novo agendamento automático de backup
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Agendamento</Label>
              <Input
                id="name"
                value={newSchedule.name}
                onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                placeholder="Ex: Backup Diário Completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Select
                value={newSchedule.frequency}
                onValueChange={(v) => setNewSchedule({ ...newSchedule, frequency: v as typeof newSchedule.frequency })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">A cada hora</SelectItem>
                  <SelectItem value="daily">Diário</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledTime">Horário</Label>
              <Input
                id="scheduledTime"
                type="time"
                value={newSchedule.scheduledTime}
                onChange={(e) => setNewSchedule({ ...newSchedule, scheduledTime: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Módulos</Label>
              <div className="grid grid-cols-2 gap-2">
                {availableModules.map((module) => (
                  <div key={module.name} className="flex items-center space-x-2">
                    <Checkbox
                      id={`schedule-${module.name}`}
                      checked={newSchedule.modules.includes(module.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewSchedule({ ...newSchedule, modules: [...newSchedule.modules, module.name] });
                        } else {
                          setNewSchedule({ ...newSchedule, modules: newSchedule.modules.filter(m => m !== module.name) });
                        }
                      }}
                    />
                    <Label htmlFor={`schedule-${module.name}`} className="text-sm">
                      {module.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="retentionDays">Retenção (dias)</Label>
                <Input
                  id="retentionDays"
                  type="number"
                  value={newSchedule.retentionDays}
                  onChange={(e) => setNewSchedule({ ...newSchedule, retentionDays: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxBackups">Máx. Backups</Label>
                <Input
                  id="maxBackups"
                  type="number"
                  value={newSchedule.maxBackups}
                  onChange={(e) => setNewSchedule({ ...newSchedule, maxBackups: parseInt(e.target.value) || 10 })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewScheduleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => createScheduleMutation.mutate(newSchedule)}
              disabled={!newSchedule.name || newSchedule.modules.length === 0 || createScheduleMutation.isPending}
            >
              {createScheduleMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Criar Agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
