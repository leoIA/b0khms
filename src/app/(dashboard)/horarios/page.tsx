'use client';

// =============================================================================
// ConstrutorPro - Quadro de Horários
// Sistema de gestão de horários, banco de horas e folgas
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
  Clock,
  Plus,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Loader2,
  Timer,
  Users,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Coffee,
  Plane,
  FileText,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface TimeEntry {
  id: string;
  date: string;
  startTime: string;
  endTime?: string;
  breakMinutes: number;
  totalMinutes: number;
  overtimeMinutes: number;
  notes?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  users: {
    id: string;
    name: string;
    avatar?: string;
  };
  projects?: {
    id: string;
    name: string;
  };
  approver?: {
    id: string;
    name: string;
  };
}

interface HourBank {
  id: string;
  month: string;
  year: number;
  balanceMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  users: {
    id: string;
    name: string;
  };
}

interface TimeOffRequest {
  id: string;
  type: 'vacation' | 'day_off' | 'sick_leave' | 'other';
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  users: {
    id: string;
    name: string;
  };
  approver?: {
    id: string;
    name: string;
  };
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function HorariosPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [hourBanks, setHourBanks] = useState<HourBank[]>([]);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    date: '',
    startTime: '',
    endTime: '',
    breakMinutes: '60',
    notes: '',
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
      const [entriesRes, banksRes, timeOffRes] = await Promise.all([
        fetch('/api/time-entries'),
        fetch('/api/hour-banks'),
        fetch('/api/time-off'),
      ]);

      const entriesData = await entriesRes.json();
      const banksData = await banksRes.json();
      const timeOffData = await timeOffRes.json();

      if (entriesData.success) setTimeEntries(entriesData.data);
      if (banksData.success) setHourBanks(banksData.data);
      if (timeOffData.success) setTimeOffRequests(timeOffData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTimeEntry = async () => {
    if (!formData.date || !formData.startTime) {
      toast.error('Preencha data e horário de entrada');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime || undefined,
          breakMinutes: parseInt(formData.breakMinutes) || 60,
          notes: formData.notes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTimeEntries((prev) => [data.data, ...prev]);
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success('Registro de ponto criado com sucesso!');
      } else {
        toast.error(data.error || 'Erro ao criar registro');
      }
    } catch (error) {
      console.error('Error creating time entry:', error);
      toast.error('Erro ao criar registro');
    } finally {
      setIsCreating(false);
    }
  };

  const handleApproveEntry = async (id: string, type: 'entry' | 'timeoff') => {
    try {
      const endpoint = type === 'entry' ? `/api/time-entries/${id}` : `/api/time-off/${id}`;
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      const data = await response.json();

      if (data.success) {
        if (type === 'entry') {
          setTimeEntries((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: 'approved' } : e))
          );
        } else {
          setTimeOffRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r))
          );
        }
        toast.success('Aprovado com sucesso');
      } else {
        toast.error(data.error || 'Erro ao aprovar');
      }
    } catch (error) {
      console.error('Error approving:', error);
      toast.error('Erro ao aprovar');
    }
  };

  const handleRejectEntry = async (id: string, type: 'entry' | 'timeoff') => {
    try {
      const endpoint = type === 'entry' ? `/api/time-entries/${id}` : `/api/time-off/${id}`;
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      const data = await response.json();

      if (data.success) {
        if (type === 'entry') {
          setTimeEntries((prev) =>
            prev.map((e) => (e.id === id ? { ...e, status: 'rejected' } : e))
          );
        } else {
          setTimeOffRequests((prev) =>
            prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r))
          );
        }
        toast.success('Rejeitado');
      } else {
        toast.error(data.error || 'Erro ao rejeitar');
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      toast.error('Erro ao rejeitar');
    }
  };

  const resetForm = () => {
    setFormData({
      date: '',
      startTime: '',
      endTime: '',
      breakMinutes: '60',
      notes: '',
    });
  };

  const formatMinutes = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
      pending: { variant: 'secondary', className: 'bg-amber-100 text-amber-800', label: 'Pendente' },
      approved: { variant: 'default', className: 'bg-green-100 text-green-800', label: 'Aprovado' },
      rejected: { variant: 'destructive', className: '', label: 'Rejeitado' },
    };
    const style = styles[status] || styles.pending;
    return (
      <Badge variant={style.variant} className={style.className}>
        {style.label}
      </Badge>
    );
  };

  const getTimeOffTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vacation: 'Férias',
      day_off: 'Folga',
      sick_leave: 'Licença Médica',
      other: 'Outro',
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const filteredEntries = timeEntries.filter((entry) => {
    return entry.users.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredTimeOff = timeOffRequests.filter((request) => {
    return request.users.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Stats
  const pendingEntries = timeEntries.filter((e) => e.status === 'pending').length;
  const pendingTimeOff = timeOffRequests.filter((r) => r.status === 'pending').length;
  const totalOvertime = timeEntries
    .filter((e) => e.status === 'approved')
    .reduce((sum, e) => sum + e.overtimeMinutes, 0);
  const currentMonthBalance = hourBanks[0]?.remainingMinutes || 0;

  const canApprove = user?.role && ['master_admin', 'company_admin', 'manager'].includes(user.role);

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
          <h1 className="text-2xl font-bold text-gray-900">Quadro de Horários</h1>
          <p className="text-gray-500 mt-1">
            Gerencie registros de ponto, banco de horas e solicitações de folga
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Registrar Ponto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Ponto</DialogTitle>
              <DialogDescription>
                Preencha os dados do registro de ponto
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="date">Data *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Entrada *</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">Saída</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="break">Pausa (minutos)</Label>
                <Input
                  id="break"
                  type="number"
                  value={formData.breakMinutes}
                  onChange={(e) => setFormData({ ...formData, breakMinutes: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateTimeEntry} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
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
            <CardDescription>Pontos Pendentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold">{pendingEntries}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Solicitações de Folga</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-purple-600" />
              <span className="text-2xl font-bold">{pendingTimeOff}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Horas Extras (mês)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{formatMinutes(totalOvertime)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo Banco de Horas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Timer className="h-5 w-5 text-blue-600" />
              <span className={`text-2xl font-bold ${currentMonthBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatMinutes(Math.abs(currentMonthBalance))}
                {currentMonthBalance < 0 ? ' negativo' : ''}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="entries" className="space-y-4">
        <TabsList>
          <TabsTrigger value="entries">
            <Clock className="h-4 w-4 mr-2" />
            Registro de Ponto
          </TabsTrigger>
          <TabsTrigger value="timeoff">
            <Coffee className="h-4 w-4 mr-2" />
            Solicitações de Folga
          </TabsTrigger>
          <TabsTrigger value="hourbank">
            <Timer className="h-4 w-4 mr-2" />
            Banco de Horas
          </TabsTrigger>
        </TabsList>

        {/* Search */}
        <Card>
          <CardContent className="py-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por funcionário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Entries Tab */}
        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <CardTitle>Registros de Ponto</CardTitle>
              <CardDescription>
                {filteredEntries.length} registro(s) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum registro encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Entrada</TableHead>
                      <TableHead>Saída</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Extras</TableHead>
                      <TableHead>Status</TableHead>
                      {canApprove && <TableHead className="w-[100px]">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <span className="font-medium">{entry.users.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(entry.date)}</TableCell>
                        <TableCell>{entry.startTime}</TableCell>
                        <TableCell>{entry.endTime || '-'}</TableCell>
                        <TableCell>{formatMinutes(entry.totalMinutes)}</TableCell>
                        <TableCell>
                          {entry.overtimeMinutes > 0 ? (
                            <span className="text-green-600 font-medium">
                              +{formatMinutes(entry.overtimeMinutes)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(entry.status)}</TableCell>
                        {canApprove && (
                          <TableCell>
                            {entry.status === 'pending' && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleApproveEntry(entry.id, 'entry')}
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRejectEntry(entry.id, 'entry')}
                                >
                                  <XCircle className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Time Off Tab */}
        <TabsContent value="timeoff">
          <Card>
            <CardHeader>
              <CardTitle>Solicitações de Folga</CardTitle>
              <CardDescription>
                {filteredTimeOff.length} solicitação(ões) encontrada(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTimeOff.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Coffee className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma solicitação encontrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Status</TableHead>
                      {canApprove && <TableHead className="w-[100px]">Ações</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTimeOff.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <span className="font-medium">{request.users.name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getTimeOffTypeLabel(request.type)}</Badge>
                        </TableCell>
                        <TableCell>
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </TableCell>
                        <TableCell>{request.days}</TableCell>
                        <TableCell>{request.reason || '-'}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        {canApprove && (
                          <TableCell>
                            {request.status === 'pending' && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleApproveEntry(request.id, 'timeoff')}
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRejectEntry(request.id, 'timeoff')}
                                >
                                  <XCircle className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hour Bank Tab */}
        <TabsContent value="hourbank">
          <Card>
            <CardHeader>
              <CardTitle>Banco de Horas</CardTitle>
              <CardDescription>
                {hourBanks.length} registro(s) encontrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hourBanks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Timer className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nenhum registro no banco de horas</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funcionário</TableHead>
                      <TableHead>Mês/Ano</TableHead>
                      <TableHead>Saldo Anterior</TableHead>
                      <TableHead>Utilizado</TableHead>
                      <TableHead>Saldo Atual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hourBanks.map((bank) => (
                      <TableRow key={bank.id}>
                        <TableCell>
                          <span className="font-medium">{bank.users.name}</span>
                        </TableCell>
                        <TableCell>{bank.month}/{bank.year}</TableCell>
                        <TableCell>{formatMinutes(bank.balanceMinutes)}</TableCell>
                        <TableCell>{formatMinutes(bank.usedMinutes)}</TableCell>
                        <TableCell>
                          <span className={`font-medium ${bank.remainingMinutes < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatMinutes(Math.abs(bank.remainingMinutes))}
                            {bank.remainingMinutes < 0 ? ' (negativo)' : ''}
                          </span>
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
