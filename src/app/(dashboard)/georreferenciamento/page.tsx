'use client';

// =============================================================================
// ConstrutorPro - Georreferenciamento
// Sistema de localização, check-ins e cercas geográficas
// =============================================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  MapPin,
  Plus,
  Search,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Navigation,
  Circle,
  Map,
  Smartphone,
  Activity,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Geofence {
  id: string;
  name: string;
  description?: string;
  centerLat: number;
  centerLng: number;
  radius: number;
  fenceType: 'circle' | 'polygon';
  isActive: boolean;
  alertOnEnter: boolean;
  alertOnExit: boolean;
  createdAt: string;
  projects?: {
    id: string;
    name: string;
  };
}

interface Checkin {
  id: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  checkinType: 'arrival' | 'departure' | 'break_start' | 'break_end';
  address?: string;
  notes?: string;
  createdAt: string;
  users: {
    id: string;
    name: string;
    avatar?: string;
  };
  projects: {
    id: string;
    name: string;
  };
}

interface Project {
  id: string;
  name: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function GeorreferenciamentoPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: '',
    centerLat: '',
    centerLng: '',
    radius: '100',
    alertOnEnter: true,
    alertOnExit: false,
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [geofencesRes, checkinsRes, projectsRes] = await Promise.all([
        fetch('/api/geofences'),
        fetch('/api/checkins'),
        fetch('/api/projetos'),
      ]);

      const geofencesData = await geofencesRes.json();
      const checkinsData = await checkinsRes.json();
      const projectsData = await projectsRes.json();

      if (geofencesData.success) {
        setGeofences(geofencesData.data);
      }
      if (checkinsData.success) {
        setCheckins(checkinsData.data);
      }
      if (projectsData.success) {
        setProjects(projectsData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGeofence = async () => {
    if (!formData.name || !formData.centerLat || !formData.centerLng) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/geofences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          projectId: formData.projectId || undefined,
          centerLat: parseFloat(formData.centerLat),
          centerLng: parseFloat(formData.centerLng),
          radius: parseInt(formData.radius),
          alertOnEnter: formData.alertOnEnter,
          alertOnExit: formData.alertOnExit,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeofences((prev) => [data.data, ...prev]);
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success('Cerca geográfica criada com sucesso!');
      } else {
        toast.error(data.error || 'Erro ao criar cerca');
      }
    } catch (error) {
      console.error('Error creating geofence:', error);
      toast.error('Erro ao criar cerca');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      projectId: '',
      centerLat: '',
      centerLng: '',
      radius: '100',
      alertOnEnter: true,
      alertOnExit: false,
    });
  };

  const getCheckinTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      arrival: 'Chegada',
      departure: 'Saída',
      break_start: 'Início Pausa',
      break_end: 'Fim Pausa',
    };
    return labels[type] || type;
  };

  const getCheckinTypeBadge = (type: string) => {
    const styles: Record<string, { variant: 'default' | 'secondary' | 'outline'; className: string }> = {
      arrival: { variant: 'default', className: 'bg-green-100 text-green-800' },
      departure: { variant: 'default', className: 'bg-red-100 text-red-800' },
      break_start: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800' },
      break_end: { variant: 'secondary', className: 'bg-blue-100 text-blue-800' },
    };
    const style = styles[type] || { variant: 'outline', className: '' };
    return (
      <Badge variant={style.variant} className={style.className}>
        {getCheckinTypeLabel(type)}
      </Badge>
    );
  };

  const formatCoordinates = (lat: number, lng: number) => {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredGeofences = geofences.filter((geofence) => {
    const matchesSearch = geofence.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = projectFilter === 'all' || geofence.projects?.id === projectFilter;
    return matchesSearch && matchesProject;
  });

  const filteredCheckins = checkins.filter((checkin) => {
    const matchesSearch =
      checkin.users.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      checkin.projects.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = projectFilter === 'all' || checkin.projects.id === projectFilter;
    return matchesSearch && matchesProject;
  });

  // Stats
  const totalGeofences = geofences.length;
  const activeGeofences = geofences.filter((g) => g.isActive).length;
  const todayCheckins = checkins.filter((c) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(c.createdAt) >= today;
  }).length;

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Georreferenciamento</h1>
          <p className="text-gray-500 mt-1">
            Gerencie cercas geográficas e check-ins de funcionários
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Cerca Geográfica
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Cerca Geográfica</DialogTitle>
              <DialogDescription>
                Configure uma nova cerca geográfica para controle de presença
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Cerca *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Obra Centro, Canteiro Principal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="project">Projeto (opcional)</Label>
                <Select
                  value={formData.projectId}
                  onValueChange={(value) => setFormData({ ...formData, projectId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lat">Latitude *</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="0.000001"
                    placeholder="-23.550520"
                    value={formData.centerLat}
                    onChange={(e) => setFormData({ ...formData, centerLat: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lng">Longitude *</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="0.000001"
                    placeholder="-46.633308"
                    value={formData.centerLng}
                    onChange={(e) => setFormData({ ...formData, centerLng: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="radius">Raio (metros)</Label>
                <Input
                  id="radius"
                  type="number"
                  placeholder="100"
                  value={formData.radius}
                  onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
                />
                <p className="text-xs text-gray-500">
                  Distância do centro em metros para delimitar a cerca
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  placeholder="Observações sobre a cerca"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateGeofence} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Cerca'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Cercas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Circle className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{totalGeofences}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Cercas Ativas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{activeGeofences}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Check-ins Hoje</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">{todayCheckins}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Projetos com Cerca</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold">
                {new Set(geofences.filter((g) => g.projects).map((g) => g.projects?.id)).size}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="checkins" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checkins">
            <Activity className="h-4 w-4 mr-2" />
            Check-ins
          </TabsTrigger>
          <TabsTrigger value="geofences">
            <Circle className="h-4 w-4 mr-2" />
            Cercas Geográficas
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Projetos</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Check-ins Tab */}
        <TabsContent value="checkins">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Check-ins</CardTitle>
              <CardDescription>
                {filteredCheckins.length} check-in(s) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredCheckins.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Navigation className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum check-in encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Data/Hora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCheckins.map((checkin) => (
                      <TableRow key={checkin.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="font-medium">{checkin.users.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{checkin.projects.name}</TableCell>
                        <TableCell>{getCheckinTypeBadge(checkin.checkinType)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {formatCoordinates(checkin.latitude, checkin.longitude)}
                            </code>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{formatDate(checkin.createdAt)}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geofences Tab */}
        <TabsContent value="geofences">
          <Card>
            <CardHeader>
              <CardTitle>Cercas Geográficas</CardTitle>
              <CardDescription>
                {filteredGeofences.length} cerca(s) encontrada(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredGeofences.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Circle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma cerca geográfica configurada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Projeto</TableHead>
                      <TableHead>Centro</TableHead>
                      <TableHead>Raio</TableHead>
                      <TableHead>Alertas</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGeofences.map((geofence) => (
                      <TableRow key={geofence.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{geofence.name}</p>
                            {geofence.description && (
                              <p className="text-sm text-gray-500">{geofence.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {geofence.projects ? (
                            <Badge variant="outline">{geofence.projects.name}</Badge>
                          ) : (
                            <span className="text-gray-400">Geral</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {formatCoordinates(geofence.centerLat, geofence.centerLng)}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{geofence.radius}m</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {geofence.alertOnEnter && (
                              <Badge variant="secondary" className="text-xs">
                                Entrada
                              </Badge>
                            )}
                            {geofence.alertOnExit && (
                              <Badge variant="secondary" className="text-xs">
                                Saída
                              </Badge>
                            )}
                            {!geofence.alertOnEnter && !geofence.alertOnExit && (
                              <span className="text-gray-400">Nenhum</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {geofence.isActive ? (
                            <Badge className="bg-green-100 text-green-800">Ativa</Badge>
                          ) : (
                            <Badge variant="secondary">Inativa</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
