// =============================================================================
// ConstrutorPro - Cronograma Detail Page (Gantt Chart View)
// =============================================================================

'use client';

import { useSession } from 'next-auth/react';
import { redirect, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Calendar,
  Clock,
  User,
  Loader2,
  GripVertical,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { format, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { SCHEDULE_STATUS } from '@/lib/constants';
import type { Schedule, ScheduleTask, ScheduleStatus } from '@/types';

interface ScheduleWithTasks extends Schedule {
  project?: {
    id: string;
    name: string;
  };
  tasks: ScheduleTaskWithChildren[];
}

interface ScheduleTaskWithChildren extends ScheduleTask {
  children?: ScheduleTaskWithChildren[];
}

interface TaskFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  responsible: string;
  status: ScheduleStatus;
  progress: number;
  parentId: string;
}

const COLORS = {
  pending: '#6b7280',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  delayed: '#ef4444',
  cancelled: '#9ca3af',
};

function getStatusBadge(status: ScheduleStatus) {
  const config = SCHEDULE_STATUS[status];
  return (
    <Badge variant="outline" className={`${config.color} text-white border-0`}>
      {config.label}
    </Badge>
  );
}

function TaskRow({
  task,
  level = 0,
  expandedTasks,
  toggleExpand,
  onEdit,
  onDelete,
  dates,
  totalDays,
}: {
  task: ScheduleTaskWithChildren;
  level?: number;
  expandedTasks: Set<string>;
  toggleExpand: (id: string) => void;
  onEdit: (task: ScheduleTaskWithChildren) => void;
  onDelete: (id: string) => void;
  dates: Date[];
  totalDays: number;
}) {
  const hasChildren = task.children && task.children.length > 0;
  const isExpanded = expandedTasks.has(task.id);
  const taskStart = new Date(task.startDate);
  const taskEnd = new Date(task.endDate);
  const startOffset = differenceInDays(taskStart, dates[0]);
  const duration = differenceInDays(taskEnd, taskStart) + 1;

  return (
    <>
      <div
        className="flex items-center border-b border-border hover:bg-muted/50"
        style={{ paddingLeft: `${level * 24}px` }}
      >
        {/* Task Info */}
        <div className="flex items-center gap-2 p-2 w-64 flex-shrink-0 border-r border-border">
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(task.id)}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{task.name}</p>
            <div className="flex items-center gap-2">
              <Progress value={task.progress} className="w-12 h-1.5" />
              <span className="text-xs text-muted-foreground">
                {task.progress}%
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Gantt Bar */}
        <div className="flex-1 relative h-10 min-w-0">
          {/* Grid lines */}
          <div className="absolute inset-0 flex">
            {dates.map((date, i) => (
              <div
                key={i}
                className={`flex-1 border-r border-border/30 ${
                  date.getDay() === 0 || date.getDay() === 6
                    ? 'bg-muted/30'
                    : ''
                }`}
              />
            ))}
          </div>

          {/* Task bar */}
          <div
            className="absolute top-2 h-6 rounded-md flex items-center px-2 text-xs text-white font-medium"
            style={{
              left: `${(startOffset / totalDays) * 100}%`,
              width: `${(duration / totalDays) * 100}%`,
              minWidth: '20px',
              backgroundColor: COLORS[task.status],
            }}
          >
            <span className="truncate">{task.name}</span>
          </div>
        </div>
      </div>

      {/* Children */}
      {hasChildren &&
        isExpanded &&
        task.children!.map((child) => (
          <TaskRow
            key={child.id}
            task={child}
            level={level + 1}
            expandedTasks={expandedTasks}
            toggleExpand={toggleExpand}
            onEdit={onEdit}
            onDelete={onDelete}
            dates={dates}
            totalDays={totalDays}
          />
        ))}
    </>
  );
}

export default function CronogramaDetailPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    },
  });

  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const scheduleId = params.id as string;

  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduleTaskWithChildren | null>(null);
  const [taskFormData, setTaskFormData] = useState<TaskFormData>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    responsible: '',
    status: 'pending',
    progress: 0,
    parentId: '',
  });

  const { data: schedule, isLoading } = useQuery<ScheduleWithTasks>({
    queryKey: ['cronograma', scheduleId],
    queryFn: async () => {
      const res = await fetch(`/api/cronograma/${scheduleId}`);
      if (!res.ok) throw new Error('Erro ao carregar cronograma');
      return res.json();
    },
    enabled: !!session?.user?.companyId && !!scheduleId,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const res = await fetch(`/api/cronograma/${scheduleId}/tarefas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          responsible: data.responsible,
          status: data.status,
          progress: data.progress,
          parentId: data.parentId || null,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error ?? 'Erro ao criar tarefa');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma', scheduleId] });
      toast.success('Tarefa criada com sucesso!');
      setIsAddTaskOpen(false);
      resetTaskForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async (data: { id: string; task: Partial<TaskFormData> }) => {
      const res = await fetch(`/api/cronograma/${scheduleId}/tarefas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.id,
          ...data.task,
          ...(data.task.startDate && { startDate: new Date(data.task.startDate) }),
          ...(data.task.endDate && { endDate: new Date(data.task.endDate) }),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error ?? 'Erro ao atualizar tarefa');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma', scheduleId] });
      toast.success('Tarefa atualizada com sucesso!');
      setEditingTask(null);
      resetTaskForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/cronograma/${scheduleId}/tarefas?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error ?? 'Erro ao excluir tarefa');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cronograma', scheduleId] });
      toast.success('Tarefa excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTasks(newExpanded);
  };

  const resetTaskForm = () => {
    setTaskFormData({
      name: '',
      description: '',
      startDate: schedule?.startDate
        ? format(new Date(schedule.startDate), 'yyyy-MM-dd')
        : '',
      endDate: schedule?.endDate
        ? format(new Date(schedule.endDate), 'yyyy-MM-dd')
        : '',
      responsible: '',
      status: 'pending',
      progress: 0,
      parentId: '',
    });
  };

  const handleEditTask = (task: ScheduleTaskWithChildren) => {
    setEditingTask(task);
    setTaskFormData({
      name: task.name,
      description: task.description ?? '',
      startDate: format(new Date(task.startDate), 'yyyy-MM-dd'),
      endDate: format(new Date(task.endDate), 'yyyy-MM-dd'),
      responsible: task.responsible ?? '',
      status: task.status,
      progress: task.progress,
      parentId: task.parentId ?? '',
    });
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
      deleteTaskMutation.mutate(id);
    }
  };

  // Calculate dates for Gantt chart
  const { dates, totalDays } = useMemo(() => {
    if (!schedule) return { dates: [], totalDays: 0 };

    const start = new Date(schedule.startDate);
    const end = new Date(schedule.endDate);
    const days = differenceInDays(end, start) + 1;
    const dateArray: Date[] = [];

    for (let i = 0; i <= days; i++) {
      dateArray.push(addDays(start, i));
    }

    return { dates: dateArray, totalDays: days };
  }, [schedule]);

  // Build task tree
  const taskTree = useMemo(() => {
    if (!schedule?.tasks) return [];

    const taskMap = new Map<string, ScheduleTaskWithChildren>();
    schedule.tasks.forEach((task) => {
      taskMap.set(task.id, { ...task, children: [] });
    });

    const rootTasks: ScheduleTaskWithChildren[] = [];
    schedule.tasks.forEach((task) => {
      const taskWithChildren = taskMap.get(task.id)!;
      if (task.parentId && taskMap.has(task.parentId)) {
        taskMap.get(task.parentId)!.children!.push(taskWithChildren);
      } else {
        rootTasks.push(taskWithChildren);
      }
    });

    return rootTasks;
  }, [schedule]);

  // Flatten tasks for parent selection
  const flatTasks = useMemo(() => {
    if (!schedule?.tasks) return [];
    return schedule.tasks;
  }, [schedule]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-1" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Calendar className="h-16 w-16 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">Cronograma não encontrado</p>
        <Button className="mt-4" asChild>
          <Link href="/cronograma">Voltar para Cronogramas</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/cronograma">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{schedule.name}</h1>
            <p className="text-muted-foreground">
              {schedule.project?.name ?? 'Sem projeto'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(schedule.status)}
          <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetTaskForm}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nova Tarefa</DialogTitle>
                <DialogDescription>
                  Adicione uma nova tarefa ao cronograma
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="taskName">
                    Nome da Tarefa <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="taskName"
                    value={taskFormData.name}
                    onChange={(e) =>
                      setTaskFormData({ ...taskFormData, name: e.target.value })
                    }
                    placeholder="Ex: Fundação"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taskDescription">Descrição</Label>
                  <Textarea
                    id="taskDescription"
                    value={taskFormData.description}
                    onChange={(e) =>
                      setTaskFormData({
                        ...taskFormData,
                        description: e.target.value,
                      })
                    }
                    placeholder="Descrição da tarefa..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taskStartDate">Data Início</Label>
                    <Input
                      id="taskStartDate"
                      type="date"
                      value={taskFormData.startDate}
                      onChange={(e) =>
                        setTaskFormData({
                          ...taskFormData,
                          startDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taskEndDate">Data Término</Label>
                    <Input
                      id="taskEndDate"
                      type="date"
                      value={taskFormData.endDate}
                      onChange={(e) =>
                        setTaskFormData({
                          ...taskFormData,
                          endDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taskResponsible">Responsável</Label>
                    <Input
                      id="taskResponsible"
                      value={taskFormData.responsible}
                      onChange={(e) =>
                        setTaskFormData({
                          ...taskFormData,
                          responsible: e.target.value,
                        })
                      }
                      placeholder="Nome do responsável"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taskProgress">Progresso (%)</Label>
                    <Input
                      id="taskProgress"
                      type="number"
                      min={0}
                      max={100}
                      value={taskFormData.progress}
                      onChange={(e) =>
                        setTaskFormData({
                          ...taskFormData,
                          progress: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="taskStatus">Status</Label>
                    <Select
                      value={taskFormData.status}
                      onValueChange={(value: ScheduleStatus) =>
                        setTaskFormData({ ...taskFormData, status: value })
                      }
                    >
                      <SelectTrigger id="taskStatus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="in_progress">Em Andamento</SelectItem>
                        <SelectItem value="completed">Concluído</SelectItem>
                        <SelectItem value="delayed">Atrasado</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taskParent">Tarefa Pai</Label>
                    <Select
                      value={taskFormData.parentId}
                      onValueChange={(value) =>
                        setTaskFormData({ ...taskFormData, parentId: value })
                      }
                    >
                      <SelectTrigger id="taskParent">
                        <SelectValue placeholder="Nenhuma (raiz)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhuma (raiz)</SelectItem>
                        {flatTasks.map((task) => (
                          <SelectItem key={task.id} value={task.id}>
                            {task.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddTaskOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => createTaskMutation.mutate(taskFormData)}
                  disabled={createTaskMutation.isPending}
                >
                  {createTaskMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Criar Tarefa
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Período</p>
                <p className="font-medium">
                  {format(new Date(schedule.startDate), 'dd/MM/yyyy', {
                    locale: ptBR,
                  })}{' '}
                  -{' '}
                  {format(new Date(schedule.endDate), 'dd/MM/yyyy', {
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Duração</p>
                <p className="font-medium">{totalDays} dias</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Progress className="h-5 w-5" />
              <div>
                <p className="text-sm text-muted-foreground">Progresso</p>
                <p className="font-medium">{schedule.progress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Tarefas</p>
                <p className="font-medium">{schedule.tasks?.length ?? 0} tarefas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gantt Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Gráfico de Gantt</CardTitle>
          <CardDescription>
            Visualize e gerencie as tarefas do cronograma
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Gantt Container */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header */}
              <div className="flex border-b border-border bg-muted/50">
                <div className="w-64 flex-shrink-0 p-2 border-r border-border font-medium text-sm">
                  Tarefa
                </div>
                <div className="flex-1 flex">
                  {dates.slice(0, 30).map((date, i) => (
                    <div
                      key={i}
                      className={`flex-1 p-1 text-center text-xs border-r border-border/30 ${
                        date.getDay() === 0 || date.getDay() === 6
                          ? 'bg-muted/50'
                          : ''
                      }`}
                    >
                      {format(date, 'dd/MM', { locale: ptBR })}
                    </div>
                  ))}
                  {dates.length > 30 && (
                    <div className="p-1 text-center text-xs text-muted-foreground">
                      +{dates.length - 30} dias
                    </div>
                  )}
                </div>
              </div>

              {/* Tasks */}
              {taskTree.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma tarefa cadastrada</p>
                  <p className="text-sm mt-1">
                    Clique em "Nova Tarefa" para começar
                  </p>
                </div>
              ) : (
                <div>
                  {taskTree.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      expandedTasks={expandedTasks}
                      toggleExpand={toggleExpand}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                      dates={dates.slice(0, 30)}
                      totalDays={Math.min(totalDays, 29)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Task Dialog */}
      <Dialog
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Tarefa</DialogTitle>
            <DialogDescription>
              Atualize as informações da tarefa
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editTaskName">
                Nome da Tarefa <span className="text-destructive">*</span>
              </Label>
              <Input
                id="editTaskName"
                value={taskFormData.name}
                onChange={(e) =>
                  setTaskFormData({ ...taskFormData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTaskDescription">Descrição</Label>
              <Textarea
                id="editTaskDescription"
                value={taskFormData.description}
                onChange={(e) =>
                  setTaskFormData({ ...taskFormData, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editTaskStartDate">Data Início</Label>
                <Input
                  id="editTaskStartDate"
                  type="date"
                  value={taskFormData.startDate}
                  onChange={(e) =>
                    setTaskFormData({ ...taskFormData, startDate: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editTaskEndDate">Data Término</Label>
                <Input
                  id="editTaskEndDate"
                  type="date"
                  value={taskFormData.endDate}
                  onChange={(e) =>
                    setTaskFormData({ ...taskFormData, endDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editTaskResponsible">Responsável</Label>
                <Input
                  id="editTaskResponsible"
                  value={taskFormData.responsible}
                  onChange={(e) =>
                    setTaskFormData({ ...taskFormData, responsible: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editTaskProgress">Progresso (%)</Label>
                <Input
                  id="editTaskProgress"
                  type="number"
                  min={0}
                  max={100}
                  value={taskFormData.progress}
                  onChange={(e) =>
                    setTaskFormData({
                      ...taskFormData,
                      progress: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTaskStatus">Status</Label>
              <Select
                value={taskFormData.status}
                onValueChange={(value: ScheduleStatus) =>
                  setTaskFormData({ ...taskFormData, status: value })
                }
              >
                <SelectTrigger id="editTaskStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="delayed">Atrasado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                updateTaskMutation.mutate({
                  id: editingTask!.id,
                  task: taskFormData,
                })
              }
              disabled={updateTaskMutation.isPending}
            >
              {updateTaskMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
