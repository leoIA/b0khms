// =============================================================================
// ConstrutorPro - Novo Diário de Obra Page
// =============================================================================

'use client';

import { useSession } from 'next-auth/react';
import { redirect, useRouter } from 'next/navigation';
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
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
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

const weatherOptions: { value: DailyLogWeather; icon: React.ReactNode; label: string }[] = [
  { value: 'sunny', icon: <Sun className="h-5 w-5" />, label: 'Ensolarado' },
  { value: 'cloudy', icon: <Cloud className="h-5 w-5" />, label: 'Nublado' },
  { value: 'rainy', icon: <CloudRain className="h-5 w-5" />, label: 'Chuvoso' },
  { value: 'stormy', icon: <CloudLightning className="h-5 w-5" />, label: 'Tempestade' },
];

export default function NovoDiarioObraPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    },
  });

  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    projectId: '',
    date: new Date().toISOString().split('T')[0],
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

  const [activities, setActivities] = useState<Activity[]>([
    {
      id: '1',
      description: '',
      location: '',
      workersCount: '',
      startTime: '',
      endTime: '',
      observations: '',
    },
  ]);

  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects-for-diario-novo'],
    queryFn: async () => {
      const res = await fetch('/api/projetos?limit=100&status=active');
      if (!res.ok) throw new Error('Erro ao carregar projetos');
      const data = await res.json();
      return data.data ?? [];
    },
    enabled: !!session?.user?.companyId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData & { activities: Activity[] }) => {
      const res = await fetch('/api/diario-obra', {
        method: 'POST',
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
        throw new Error(error.error ?? 'Erro ao criar diário');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Diário de obra criado com sucesso!');
      router.push(`/diario-obra/${data.data.id}`);
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

    await createMutation.mutateAsync({ ...formData, activities });
    setIsSubmitting(false);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeProjects = projects?.filter((p) => p.status === 'active') ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/diario-obra">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Diário de Obra</h1>
          <p className="text-muted-foreground">
            Registre as atividades do dia
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
                    {activeProjects.length === 0 ? (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        Nenhum projeto ativo encontrado
                      </div>
                    ) : (
                      activeProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))
                    )}
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
                  placeholder="Ex: 18"
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
                  placeholder="Ex: 28"
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
                  placeholder="Ex: 15"
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
                  placeholder="Nomes dos visitantes"
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
                placeholder="Descreva resumidamente o que foi realizado hoje..."
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
                      placeholder="Descreva a atividade realizada"
                      value={activity.description}
                      onChange={(e) =>
                        updateActivity(activity.id, 'description', e.target.value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Local</Label>
                    <Input
                      placeholder="Ex: Pavimento 2"
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
                      placeholder="Ex: 5"
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
                      placeholder="Observações sobre a atividade..."
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
            <CardDescription>
              Observações e ocorrências do dia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="observations">Observações Gerais</Label>
              <Textarea
                id="observations"
                placeholder="Observações adicionais sobre o dia de trabalho..."
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
                placeholder="Registre qualquer ocorrência ou incidente..."
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
            <Link href="/diario-obra">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Diário
          </Button>
        </div>
      </form>
    </div>
  );
}
