// =============================================================================
// ConstrutorPro - Daily Logs (Diário de Obra) Page
// =============================================================================

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, ClipboardList, Calendar, Sun, Cloud, CloudRain, CloudLightning, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { WEATHER_CONDITIONS } from '@/lib/constants';
import { formatDate } from '@/lib/api';

interface DailyLog {
  id: string;
  date: string;
  weather: string;
  workersCount: number | null;
  summary: string;
  project: { id: string; name: string };
  createdBy: { id: string; name: string };
}

async function fetchDailyLogs(params: { search?: string; project?: string }): Promise<{ success: boolean; data: { data: DailyLog[]; pagination: { total: number } } }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.project && params.project !== 'all') query.set('projectId', params.project);
  
  const response = await fetch(`/api/diario-obra?${query.toString()}`);
  return response.json();
}

async function fetchProjects(): Promise<{ success: boolean; data: { data: { id: string; name: string }[] } }> {
  const response = await fetch('/api/projetos?limit=100');
  return response.json();
}

export default function DiarioObraPage() {
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['daily-logs', search, projectFilter],
    queryFn: () => fetchDailyLogs({ search, project: projectFilter }),
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: fetchProjects,
  });

  const getWeatherIcon = (weather: string) => {
    const icons: Record<string, React.ElementType> = {
      sunny: Sun,
      cloudy: Cloud,
      rainy: CloudRain,
      stormy: CloudLightning,
    };
    const Icon = icons[weather] || Sun;
    const config = WEATHER_CONDITIONS[weather as keyof typeof WEATHER_CONDITIONS];
    return (
      <div className="flex items-center gap-1">
        <Icon className="h-4 w-4" />
        <span>{config?.label || weather}</span>
      </div>
    );
  };

  const logs = logsData?.data?.data || [];
  const total = logsData?.data?.pagination?.total || 0;
  const projects = projectsData?.data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Diário de Obra</h1>
          <p className="text-muted-foreground">Registro diário das atividades nos canteiros</p>
        </div>
        <Button asChild>
          <Link href="/diario-obra/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Registro
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar nos registros..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Projetos</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      {logsLoading ? (
        <div className="grid gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}><CardContent className="py-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum registro encontrado</h3>
              <p className="text-muted-foreground mt-1">
                {search || projectFilter !== 'all' ? 'Tente ajustar os filtros.' : 'Comece adicionando um novo registro.'}
              </p>
              {!search && projectFilter === 'all' && (
                <Button asChild className="mt-4">
                  <Link href="/diario-obra/novo"><Plus className="mr-2 h-4 w-4" />Novo Registro</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {logs.map((log) => (
            <Link key={log.id} href={`/diario-obra/${log.id}`}>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{formatDate(log.date)}</p>
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getWeatherIcon(log.weather)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{log.summary}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{log.project.name}
                          </span>
                          {log.workersCount && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />{log.workersCount} trabalhadores
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Summary */}
      {total > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground text-center">
              Mostrando {logs.length} de {total} registro{total !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
