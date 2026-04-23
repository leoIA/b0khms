// =============================================================================
// ConstrutorPro - Projects List Page
// =============================================================================

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Plus, Search, FolderKanban, Calendar, DollarSign, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { PROJECT_STATUS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/api';

interface Project {
  id: string;
  name: string;
  code: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  estimatedValue: number;
  physicalProgress: number;
  financialProgress: number;
  address: string | null;
  city: string | null;
  client: { id: string; name: string } | null;
  _count?: { budgets: number; dailyLogs: number };
}

async function fetchProjects(params: { search?: string; status?: string; page?: number; limit?: number }): Promise<{ success: boolean; data: { data: Project[]; pagination: { total: number; page: number; limit: number; totalPages: number } } }> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  
  const response = await fetch(`/api/projetos?${query.toString()}`);
  return response.json();
}

const PAGE_SIZE = 10;

export default function ProjectsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search, statusFilter, page],
    queryFn: () => fetchProjects({ search, status: statusFilter, page, limit: PAGE_SIZE }),
  });

  const getStatusBadge = (status: string) => {
    const config = PROJECT_STATUS[status as keyof typeof PROJECT_STATUS];
    const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      active: 'default',
      completed: 'secondary',
      planning: 'outline',
      paused: 'outline',
      delayed: 'destructive',
      cancelled: 'outline',
    };
    return (
      <Badge 
        variant={variantMap[status] || 'secondary'}
      >
        {config?.label || status}
      </Badge>
    );
  };

  const projects = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;
  const totalPages = data?.data?.pagination?.totalPages || Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground">
            Gerencie os projetos da sua construtora
          </p>
        </div>
        <Button asChild>
          <Link href="/projetos/novo">
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto
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
                  placeholder="Buscar por nome, código ou descrição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="planning">Planejamento</SelectItem>
                <SelectItem value="active">Em Andamento</SelectItem>
                <SelectItem value="paused">Pausado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum projeto encontrado</h3>
              <p className="text-muted-foreground mt-1">
                {search || statusFilter !== 'all'
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Comece adicionando um novo projeto.'}
              </p>
              {!search && statusFilter === 'all' && (
                <Button asChild className="mt-4">
                  <Link href="/projetos/novo">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Projeto
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projetos/${project.id}`}>
              <Card className="cursor-pointer h-full hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg line-clamp-1">
                        {project.name}
                      </CardTitle>
                      {project.code && (
                        <p className="text-sm text-muted-foreground">
                          {project.code}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(project.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {project.client && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="truncate">{project.client.name}</span>
                      </div>
                    )}

                    {project.city && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="truncate">{project.city}</span>
                      </div>
                    )}

                    {project.startDate && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDate(project.startDate)}
                          {project.endDate && ` - ${formatDate(project.endDate)}`}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm font-medium">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{formatCurrency(project.estimatedValue)}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium">{project.physicalProgress}%</span>
                      </div>
                      <Progress value={project.physicalProgress} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {projects.length > 0 && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
