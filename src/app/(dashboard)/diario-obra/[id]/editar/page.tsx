// =============================================================================
// ConstrutorPro - Editar Diário de Obra Page
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { WEATHER_CONDITIONS } from '@/lib/constants';
import type { DailyLogWeather, Project } from '@/types';

interface Activity {
  id: string;
  description: string;
  location: string;
  workersCount: string;
  startTime: string;
  endTime: string;
  observations: string;
}

interface DailyLogWithDetails {
  id: string;
  projectId: string;
  date: Date;
  weather: DailyLogWeather;
  temperatureMin?: number | null;
  temperatureMax?: number | null;
  workStartTime?: string | null;
  workEndTime?: string | null;
  workersCount?: number | null;
  summary: string;
  observations?: string | null;
  incidents?: string | null;
  visitors?: string | null;
  project?: {
    id: string;
    name: string;
  };
  activities?: {
    id: string;
    description: string;
    location?: string;
    workersCount?: number;
    startTime?: string;
    endTime?: string;
    observations?: string;
  }[];
}

const weatherOptions: { value: DailyLogWeather; icon: React.ReactNode; label: string }[] = [
  { value: 'sunny', icon: <Sun className="h-5 w-5" />, label: 'Ensolarado' },
  { value: 'cloudy', icon: <Cloud className="h-5 w-5" />, label: 'Nublado' },
  { value: 'rainy', icon: <CloudRain className="h-5 w-5" />, label: 'Chuvoso' },
  { value: 'stormy', icon: <CloudLightning className="h-5 w-5" />, label: 'Tempestade' },
];

export default function EditarDiarioObraPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    },
  });

  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const logId = params.id as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '',
    date: '',
    weather: 'sunny' as DailyLogWeather,
    temperatureMin: '',
    temperatureMax: '',
    workStartTime: '07:00',
    workEndTime: '17:00',
    workersCount: '',
    summary: '',
    observations: '',
    incidents: '',
    visitors: '',
  });

  const [activities, setActivities] = useState<Activity[]>([]);

  const { data: log, isLoading: isLoadingLog } = useQuery<DailyLogWithDetails>({
    queryKey: ['diario-obra', logId],
    queryFn: async () => {
      const res = await fetch(`/api/diario-obra/${logId}`);
      if (!res.ok) throw new Error('Erro ao carregar diário');
      return res.json();
    },
    enabled: !!session?.user?.companyId && !!logId,
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects-for-diario-edit'],
    queryFn: async () => {
      const res = await fetch('/api/projetos?limit=100');
      if (!res.ok) throw new Error('Erro ao carregar projetos');
      const data = await res.json();
      return data.data ?? [];
    },
    enabled: !!session?.user?.companyId,
  });

  // Populate form when log data is loaded
  const isInitialized = useRef(false);
  
  useEffect(() => {
    if (log && !isInitialized.current) {
      isInitialized.current = true;
      const date = new Date(log.date);
      // Use startTransition to batch state updates
      const newFormData = {
        projectId: log.projectId,
        date: date.toISOString().split('T')[0],
        weather: log.weather,
        temperatureMin: log.temperatureMin?.toString() ?? '',
        temperatureMax: log.temperatureMax?.toString() ?? '',
        workStartTime: log.workStartTime ?? '07:00',
        workEndTime: log.workEndTime ?? '17:00',
        workersCount: log.workersCount?.toString() ?? '',
        summary: log.summary,
        observations: log.observations ?? '',
        incidents: log.incidents ?? '',
        visitors: log.visitors ?? '',
      };
      
      const newActivities = log.activities && log.activities.length > 0
        ? log.activities.map((a) => ({
            id: a.id,
            description: a.description,
            location: a.location ?? '',
            workersCount: a.workersCount?.toString() ?? '',
            startTime: a.startTime ?? '',
            endTime: a.endTime ?? '',
            observations: a.observations ?? '',
          }))
        : [{
            id: '1',
            description: '',
            location: '',
            workersCount: '',
            startTime: '',
            endTime: '',
            observations: '',
          }];
      
      // Defer state updates to avoid synchronous setState in effect
      queueMicrotask(() => {
        setFormData(newFormData);
        setActivities(newActivities);
      });
    }
  }, [log]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { activities: Activity[] }) => {
      const res = await fetch(`/api/diario-obra/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: data.projectId,
          date: new Date(data.date),
          weather: data.weather,
          temperatureMin: data.temperatureMin ? parseFloat(data.temperatureMin) : null,
          temperatureMax: data.temperatureMax ? parseFloat(data.temperatureMax) : null,
          workStartTime: data.workStartTime,
          workEndTime: data.workEndTime,
          workersCount: data.workersCount ? parseInt(data.workersCount) : null,
          summary: data.summary,
          observations: data.observations || null,
          incidents: data.incidents || null,
          visitors: data.visitors || null,
          activities: data.activities
            .filter((a) => a.description.trim())
            .map((a) => ({
              id: a.id.includes('-') ? undefined : a.id,
              description: a.description,
              location: a.location || null,
              workersCount: a.workersCount ? parseInt(a.workersCount) : null,
              startTime: a.startTime || null,
              endTime: a.endTime || null,
              observations: a.observations || null,
            })),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error ?? 'Erro ao atualizar diário');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diario-obra', logId] });
      queryClient.invalidateQueries({ queryKey: ['diario-obra'] });
      toast.success('Diário de obra atualizado com sucesso!');
      router.push(`/diario-obra/${logId}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addActivity = () => {
    setActivities([
      ...activities,
      {
        id: Date.now().toString(),
        description: '',
        location: '',
        workersCount: '',
        startTime: '',
        endTime: '',
        observations: '',
      },
    ]);
  };

  const removeActivity = (id: string) => {
    if (activities.length > 1) {
      setActivities(activities.filter((a) => a.id !== id));
    }
  };

  const updateActivity = (id: string, field: keyof Activity, value: string) => {
    setActivities(
      activities.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.projectId || !formData.date || !formData.summary) {
      toast.error('Preencha todos os campos obrigatórios');
      setIsSubmitting(false);
      return;
    }

    const validActivities = activities.filter((a) => a.description.trim());
    if (validActivities.length === 0) {
      toast.error('Adicione pelo menos uma atividade');
      setIsSubmitting(false);
      return;
    }

    await updateMutation.mutateAsync({ ...formData, activities });
    setIsSubmitting(false);
  };

  if (status === 'loading' || isLoadingLog) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!log) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground">Diário não encontrado</p>
        <Button className="mt-4" asChild>
          <Link href="/diario-obra">Voltar para Diários</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/diario-obra/${logId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Diário de Obra</h1>
          <p className="text-muted-foreground">
            Atualize as informações do registro
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>
              Dados gerais do diário de obra
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="project">
                  Projeto <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, projectId: value })
                  }
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Selecione um projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">
                  Data <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Clima</Label>
                <Select
                  value={formData.weather}
                  onValueChange={(value: DailyLogWeather) =>
                    setFormData({ ...formData, weather: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {weatherOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          {option.icon}
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="tempMin">Temp. Mínima (°C)</Label>
                <Input
                  id="tempMin"
                  type="number"
                  value={formData.temperatureMin}
                  onChange={(e) =>
                    setFormData({ ...formData, temperatureMin: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tempMax">Temp. Máxima (°C)</Label>
                <Input
                  id="tempMax"
                  type="number"
                  value={formData.temperatureMax}
                  onChange={(e) =>
                    setFormData({ ...formData, temperatureMax: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Início do Trabalho</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.workStartTime}
                  onChange={(e) =>
                    setFormData({ ...formData, workStartTime: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">Término do Trabalho</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.workEndTime}
                  onChange={(e) =>
                    setFormData({ ...formData, workEndTime: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="workersCount">Número de Trabalhadores</Label>
                <Input
                  id="workersCount"
                  type="number"
                  value={formData.workersCount}
                  onChange={(e) =>
                    setFormData({ ...formData, workersCount: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visitors">Visitantes</Label>
                <Input
                  id="visitors"
                  value={formData.visitors}
                  onChange={(e) =>
                    setFormData({ ...formData, visitors: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="summary">
                Resumo do Dia <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="summary"
                value={formData.summary}
                onChange={(e) =>
                  setFormData({ ...formData, summary: e.target.value })
                }
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Activities */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Atividades Realizadas</CardTitle>
                <CardDescription>
                  Liste as atividades executadas no dia
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addActivity}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className="p-4 border rounded-lg space-y-4 relative"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Atividade {index + 1}</span>
                  {activities.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeActivity(activity.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Descrição *</Label>
                    <Input
                      value={activity.description}
                      onChange={(e) =>
                        updateActivity(activity.id, 'description', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Local</Label>
                    <Input
                      value={activity.location}
                      onChange={(e) =>
                        updateActivity(activity.id, 'location', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Trabalhadores</Label>
                    <Input
                      type="number"
                      value={activity.workersCount}
                      onChange={(e) =>
                        updateActivity(activity.id, 'workersCount', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Horário Início</Label>
                    <Input
                      type="time"
                      value={activity.startTime}
                      onChange={(e) =>
                        updateActivity(activity.id, 'startTime', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Horário Término</Label>
                    <Input
                      type="time"
                      value={activity.endTime}
                      onChange={(e) =>
                        updateActivity(activity.id, 'endTime', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={activity.observations}
                      onChange={(e) =>
                        updateActivity(activity.id, 'observations', e.target.value)
                      }
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Adicionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="observations">Observações Gerais</Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) =>
                  setFormData({ ...formData, observations: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="incidents">Ocorrências / Incidentes</Label>
              <Textarea
                id="incidents"
                value={formData.incidents}
                onChange={(e) =>
                  setFormData({ ...formData, incidents: e.target.value })
                }
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button variant="outline" type="button" asChild>
            <Link href={`/diario-obra/${logId}`}>Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </form>
    </div>
  );
}
