// =============================================================================
// ConstrutorPro - Critical Path Component
// Componente para visualização do Caminho Crítico (CPM)
// =============================================================================

'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  GitBranch,
  Info,
  Loader2,
  Play,
  Route,
  Calendar,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface CPMResult {
  taskId: string;
  earlyStart: Date;
  earlyFinish: Date;
  lateStart: Date;
  lateFinish: Date;
  totalFloat: number;
  freeFloat: number;
  isCritical: boolean;
}

interface CPMAlert {
  taskId: string;
  taskName: string;
  type: 'critical' | 'negative_float' | 'near_critical' | 'delayed';
  message: string;
  severity: 'high' | 'medium' | 'low';
}

interface CPMTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  progress: number;
  status: string;
  earlyStart?: Date | null;
  earlyFinish?: Date | null;
  lateStart?: Date | null;
  lateFinish?: Date | null;
  totalFloat?: number | null;
  freeFloat?: number | null;
  isCritical?: boolean;
  dependencies?: Array<{
    dependsOnId: string;
    type: string;
    lag: number;
  }>;
}

interface CriticalPathPanelProps {
  scheduleId: string;
}

export function CriticalPathPanel({ scheduleId }: CriticalPathPanelProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [selectedDependsOnId, setSelectedDependsOnId] = useState<string>('');
  const [dependencyType, setDependencyType] = useState<string>('FS');
  const [dependencyLag, setDependencyLag] = useState<number>(0);
  const queryClient = useQueryClient();

  // Buscar dados CPM
  const { data: cpmData, isLoading, refetch } = useQuery({
    queryKey: ['cpm', scheduleId],
    queryFn: async () => {
      const res = await fetch(`/api/cronograma/cpm?scheduleId=${scheduleId}`);
      if (!res.ok) throw new Error('Erro ao carregar CPM');
      return res.json();
    },
    enabled: !!scheduleId,
  });

  // Calcular CPM
  const calculateMutation = useMutation({
    mutationFn: async () => {
      setIsCalculating(true);
      const res = await fetch(`/api/cronograma/cpm?scheduleId=${scheduleId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao calcular CPM');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Caminho crítico calculado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['cpm', scheduleId] });
      queryClient.invalidateQueries({ queryKey: ['cronograma', scheduleId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setIsCalculating(false);
    },
  });

  // Adicionar dependência
  const addDependencyMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/cronograma/cpm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTaskId,
          dependsOnId: selectedDependsOnId,
          type: dependencyType,
          lag: dependencyLag,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao adicionar dependência');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Dependência adicionada com sucesso!');
      setShowDependencyDialog(false);
      setSelectedTaskId('');
      setSelectedDependsOnId('');
      setDependencyType('FS');
      setDependencyLag(0);
      queryClient.invalidateQueries({ queryKey: ['cpm', scheduleId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const tasks: CPMTask[] = cpmData?.tasks || [];
  const alerts: CPMAlert[] = cpmData?.alerts || [];
  const criticalPath: string[] = cpmData?.cpm?.criticalPath || [];
  const metrics = cpmData?.metrics || null;

  const criticalTasks = tasks.filter((t) => t.isCritical);
  const nearCriticalTasks = tasks.filter(
    (t) => !t.isCritical && (t.totalFloat || 0) > 0 && (t.totalFloat || 0) <= 3
  );

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Route className="h-5 w-5" />
            Caminho Crítico (CPM)
          </h3>
          <p className="text-sm text-muted-foreground">
            Análise do Critical Path Method
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showDependencyDialog} onOpenChange={setShowDependencyDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <GitBranch className="h-4 w-4 mr-2" />
                Adicionar Dependência
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Dependência</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tarefa Sucessora</Label>
                  <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a tarefa" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks.map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tarefa Predecessora</Label>
                  <Select value={selectedDependsOnId} onValueChange={setSelectedDependsOnId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a predecessora" />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks
                        .filter((t) => t.id !== selectedTaskId)
                        .map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Dependência</Label>
                  <Select value={dependencyType} onValueChange={setDependencyType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FS">FS (Fim → Início)</SelectItem>
                      <SelectItem value="SS">SS (Início → Início)</SelectItem>
                      <SelectItem value="FF">FF (Fim → Fim)</SelectItem>
                      <SelectItem value="SF">SF (Início → Fim)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lag/Lead (dias)</Label>
                  <input
                    type="number"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={dependencyLag}
                    onChange={(e) => setDependencyLag(parseInt(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use valores positivos para lag (atraso) ou negativos para lead (adiantamento)
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDependencyDialog(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={() => addDependencyMutation.mutate()}
                  disabled={!selectedTaskId || !selectedDependsOnId || addDependencyMutation.isPending}
                >
                  {addDependencyMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={() => calculateMutation.mutate()} disabled={isCalculating}>
            {isCalculating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Calcular CPM
          </Button>
        </div>
      </div>

      {/* Métricas */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Route className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tarefas Críticas</p>
                  <p className="text-2xl font-bold">{criticalTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quase Críticas</p>
                  <p className="text-2xl font-bold">{nearCriticalTasks.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duração Projeto</p>
                  <p className="text-2xl font-bold">{cpmData?.cpm?.projectDuration || 0} dias</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">SPI</p>
                  <p className="text-2xl font-bold">
                    {metrics.schedulePerformanceIndex?.toFixed(2) || '1.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alertas */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertas ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map((alert, index) => (
                <Alert
                  key={index}
                  variant={alert.severity === 'high' ? 'destructive' : 'default'}
                >
                  {getAlertIcon(alert.severity)}
                  <AlertTitle className="text-sm">{alert.taskName}</AlertTitle>
                  <AlertDescription className="text-xs">
                    {alert.message}
                  </AlertDescription>
                </Alert>
              ))}
              {alerts.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  E mais {alerts.length - 5} alertas...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Tarefas com CPM */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tarefas com Análise CPM</CardTitle>
          <CardDescription>
            Tarefas críticas destacadas em vermelho
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Route className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Clique em "Calcular CPM" para iniciar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarefa</TableHead>
                  <TableHead>Início Mais Cedo</TableHead>
                  <TableHead>Término Mais Cedo</TableHead>
                  <TableHead>Início Mais Tarde</TableHead>
                  <TableHead>Término Mais Tarde</TableHead>
                  <TableHead className="text-center">Folga Total</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className={task.isCritical ? 'bg-red-50 dark:bg-red-950/20' : ''}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {task.isCritical && (
                          <Badge variant="destructive" className="text-xs">
                            Crítica
                          </Badge>
                        )}
                        <span className="font-medium">{task.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {task.earlyStart
                        ? format(new Date(task.earlyStart), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {task.earlyFinish
                        ? format(new Date(task.earlyFinish), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {task.lateStart
                        ? format(new Date(task.lateStart), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {task.lateFinish
                        ? format(new Date(task.lateFinish), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={
                          (task.totalFloat || 0) === 0
                            ? 'bg-red-100 text-red-700'
                            : (task.totalFloat || 0) <= 3
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }
                      >
                        {task.totalFloat ?? 0} dias
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {task.isCritical ? (
                        <Badge variant="destructive">Crítica</Badge>
                      ) : (task.totalFloat || 0) <= 3 ? (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                          Atenção
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Normal
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-100 border border-red-300" />
              <span>Crítica (Folga = 0)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300" />
              <span>Quase Crítica (Folga ≤ 3 dias)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 border border-green-300" />
              <span>Normal (Folga {'>'} 3 dias)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
