// =============================================================================
// ConstrutorPro - Diário de Obra Detail Page
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
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Pencil,
  Calendar,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Clock,
  Users,
  Thermometer,
  User,
  MapPin,
  FileText,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatDate } from '@/lib/api';
import { WEATHER_CONDITIONS } from '@/lib/constants';
import type { DailyLogWeather } from '@/types';

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
  createdAt: Date;
  project?: {
    id: string;
    name: string;
  };
  author?: {
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
  photos?: {
    id: string;
    url: string;
    description?: string;
  }[];
}

function getWeatherIcon(weather: DailyLogWeather) {
  const icons = {
    sunny: Sun,
    cloudy: Cloud,
    rainy: CloudRain,
    stormy: CloudLightning,
  };
  const Icon = icons[weather] || Sun;
  return <Icon className="h-8 w-8" />;
}

export default function DiarioObraDetailPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    },
  });

  const params = useParams();
  const router = useRouter();
  const logId = params.id as string;

  const { data: log, isLoading } = useQuery<DailyLogWithDetails>({
    queryKey: ['diario-obra', logId],
    queryFn: async () => {
      const res = await fetch(`/api/diario-obra/${logId}`);
      if (!res.ok) throw new Error('Erro ao carregar diário');
      return res.json();
    },
    enabled: !!session?.user?.companyId && !!logId,
  });

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

  if (!log) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <FileText className="h-16 w-16 text-muted-foreground/50" />
        <p className="mt-4 text-muted-foreground">Diário não encontrado</p>
        <Button className="mt-4" asChild>
          <Link href="/diario-obra">Voltar para Diários</Link>
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
            <Link href="/diario-obra">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Diário de Obra
            </h1>
            <p className="text-muted-foreground">
              {formatDate(log.date)} - {log.project?.name ?? 'Sem projeto'}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/diario-obra/${logId}/editar`}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      {/* Main Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Weather and Work Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Weather */}
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    {getWeatherIcon(log.weather)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clima</p>
                    <p className="text-lg font-medium">
                      {WEATHER_CONDITIONS[log.weather]?.label}
                    </p>
                  </div>
                </div>

                {/* Temperature */}
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Thermometer className="h-8 w-8 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Temperatura</p>
                    <p className="text-lg font-medium">
                      {log.temperatureMin ?? '--'}°C -{' '}
                      {log.temperatureMax ?? '--'}°C
                    </p>
                  </div>
                </div>

                {/* Work Hours */}
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <Clock className="h-8 w-8 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Horário de Trabalho
                    </p>
                    <p className="text-lg font-medium">
                      {log.workStartTime ?? '--:--'} -{' '}
                      {log.workEndTime ?? '--:--'}
                    </p>
                  </div>
                </div>

                {/* Workers */}
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-orange-500/10">
                    <Users className="h-8 w-8 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Trabalhadores
                    </p>
                    <p className="text-lg font-medium">
                      {log.workersCount ?? 0} pessoas
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{log.summary}</p>
            </CardContent>
          </Card>

          {/* Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Atividades Realizadas</CardTitle>
              <CardDescription>
                {log.activities?.length ?? 0} atividade(s) registrada(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {log.activities && log.activities.length > 0 ? (
                <div className="space-y-4">
                  {log.activities.map((activity, index) => (
                    <div
                      key={activity.id}
                      className="p-4 border rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">
                            {index + 1}. {activity.description}
                          </p>
                          {activity.location && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3" />
                              {activity.location}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          {activity.workersCount && (
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {activity.workersCount}
                            </div>
                          )}
                          {activity.startTime && activity.endTime && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {activity.startTime} - {activity.endTime}
                            </div>
                          )}
                        </div>
                      </div>
                      {activity.observations && (
                        <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                          {activity.observations}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma atividade registrada
                </p>
              )}
            </CardContent>
          </Card>

          {/* Observations */}
          {(log.observations || log.incidents || log.visitors) && (
            <Card>
              <CardHeader>
                <CardTitle>Informações Adicionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {log.observations && (
                  <div>
                    <p className="text-sm font-medium mb-1">Observações</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {log.observations}
                    </p>
                  </div>
                )}

                {log.incidents && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <p className="text-sm font-medium">Ocorrências/Incidentes</p>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {log.incidents}
                    </p>
                  </div>
                )}

                {log.visitors && (
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <p className="text-sm font-medium">Visitantes</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {log.visitors}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle>Projeto</CardTitle>
            </CardHeader>
            <CardContent>
              {log.project ? (
                <Link
                  href={`/projetos/${log.project.id}`}
                  className="text-primary hover:underline"
                >
                  {log.project.name}
                </Link>
              ) : (
                <span className="text-muted-foreground">Sem projeto</span>
              )}
            </CardContent>
          </Card>

          {/* Author Info */}
          <Card>
            <CardHeader>
              <CardTitle>Registrado por</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{log.author?.name ?? 'Desconhecido'}</p>
                  <p className="text-sm text-muted-foreground">
                    em {formatDate(log.createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photos Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Fotos</CardTitle>
              <CardDescription>
                Registro fotográfico do dia
              </CardDescription>
            </CardHeader>
            <CardContent>
              {log.photos && log.photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {log.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="aspect-video rounded-lg bg-muted overflow-hidden"
                    >
                      <img
                        src={photo.url}
                        alt={photo.description ?? 'Foto'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Nenhuma foto registrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
