'use client';

// =============================================================================
// ConstrutorPro - Diárias de Viagem (Travel Allowances)
// Sistema completo de gestão de diárias e despesas de viagem
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  Plane,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Loader2,
  MapPin,
  Calendar,
  FileText,
  Receipt,
  Users,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface TravelAllowance {
  id: string;
  destination: string;
  origin: string;
  startDate: string;
  endDate: string;
  purpose: string;
  transportation: string;
  accommodation: boolean;
  dailyRate: number;
  totalDays: number;
  totalAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  notes?: string;
  createdAt: string;
  users: {
    id: string;
    name: string;
    email: string;
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
  travel_expenses?: TravelExpense[];
}

interface TravelExpense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  receipt?: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function DiariasViagemPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [allowances, setAllowances] = useState<TravelAllowance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedAllowance, setSelectedAllowance] = useState<TravelAllowance | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    totalAmount: 0,
  });

  // Form state
  const [formData, setFormData] = useState({
    destination: '',
    origin: '',
    startDate: '',
    endDate: '',
    purpose: '',
    transportation: 'car',
    accommodation: false,
    notes: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllowances();
    }
  }, [isAuthenticated]);

  const fetchAllowances = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/travel-allowances');
      const data = await response.json();

      if (data.success) {
        setAllowances(data.data);
        calculateStats(data.data);
      } else {
        toast.error(data.error || 'Erro ao carregar diárias');
      }
    } catch (error) {
      console.error('Error fetching allowances:', error);
      toast.error('Erro ao carregar diárias');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: TravelAllowance[]) => {
    const total = data.length;
    const pending = data.filter((a) => a.status === 'pending').length;
    const approved = data.filter((a) => a.status === 'approved' || a.status === 'paid').length;
    const totalAmount = data.reduce((sum, a) => sum + a.totalAmount, 0);

    setStats({ total, pending, approved, totalAmount });
  };

  const handleCreateAllowance = async () => {
    if (!formData.destination || !formData.origin || !formData.purpose) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast.error('Selecione as datas da viagem');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/travel-allowances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setAllowances((prev) => [data.data, ...prev]);
        setIsCreateDialogOpen(false);
        resetForm();
        toast.success('Solicitação de diária criada com sucesso!');
        if (data.warnings && data.warnings.length > 0) {
          toast.warning(data.warnings.join('. '));
        }
      } else {
        toast.error(data.error || 'Erro ao criar solicitação');
      }
    } catch (error) {
      console.error('Error creating allowance:', error);
      toast.error('Erro ao criar solicitação');
    } finally {
      setIsCreating(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/travel-allowances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      });

      const data = await response.json();

      if (data.success) {
        setAllowances((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a))
        );
        toast.success('Diária aprovada com sucesso');
      } else {
        toast.error(data.error || 'Erro ao aprovar diária');
      }
    } catch (error) {
      console.error('Error approving allowance:', error);
      toast.error('Erro ao aprovar diária');
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      const response = await fetch(`/api/travel-allowances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason }),
      });

      const data = await response.json();

      if (data.success) {
        setAllowances((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a))
        );
        toast.success('Diária rejeitada');
      } else {
        toast.error(data.error || 'Erro ao rejeitar diária');
      }
    } catch (error) {
      console.error('Error rejecting allowance:', error);
      toast.error('Erro ao rejeitar diária');
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const response = await fetch(`/api/travel-allowances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pay' }),
      });

      const data = await response.json();

      if (data.success) {
        setAllowances((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'paid' } : a))
        );
        toast.success('Diária marcada como paga');
      } else {
        toast.error(data.error || 'Erro ao marcar como paga');
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Erro ao marcar como paga');
    }
  };

  const resetForm = () => {
    setFormData({
      destination: '',
      origin: '',
      startDate: '',
      endDate: '',
      purpose: '',
      transportation: 'car',
      accommodation: false,
      notes: '',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      pending: { variant: 'secondary', label: 'Pendente' },
      approved: { variant: 'default', label: 'Aprovada' },
      paid: { variant: 'default', label: 'Paga' },
      rejected: { variant: 'destructive', label: 'Rejeitada' },
      cancelled: { variant: 'outline', label: 'Cancelada' },
    };
    const style = styles[status] || styles.pending;
    return <Badge variant={style.variant}>{style.label}</Badge>;
  };

  const getTransportationLabel = (transport: string) => {
    const labels: Record<string, string> = {
      car: 'Carro',
      plane: 'Avião',
      bus: 'Ônibus',
      own_vehicle: 'Veículo Próprio',
      rental: 'Alugado',
    };
    return labels[transport] || transport;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const filteredAllowances = allowances.filter((allowance) => {
    const matchesSearch =
      allowance.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allowance.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allowance.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allowance.users.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || allowance.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const canApprove = user?.role && ['master_admin', 'company_admin', 'manager', 'finance'].includes(user.role);

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
          <h1 className="text-2xl font-bold text-gray-900">Diárias de Viagem</h1>
          <p className="text-gray-500 mt-1">
            Gerencie solicitações de diárias e despesas de viagem
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Solicitação
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Solicitação de Diária</DialogTitle>
              <DialogDescription>
                Preencha os dados da viagem
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origin">Origem *</Label>
                  <Input
                    id="origin"
                    placeholder="Cidade de origem"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destino *</Label>
                  <Input
                    id="destination"
                    placeholder="Cidade de destino"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de Início *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data de Fim *</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Finalidade *</Label>
                <Input
                  id="purpose"
                  placeholder="Motivo da viagem"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transportation">Transporte</Label>
                <Select
                  value={formData.transportation}
                  onValueChange={(value) => setFormData({ ...formData, transportation: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Carro</SelectItem>
                    <SelectItem value="plane">Avião</SelectItem>
                    <SelectItem value="bus">Ônibus</SelectItem>
                    <SelectItem value="own_vehicle">Veículo Próprio</SelectItem>
                    <SelectItem value="rental">Alugado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Input
                  id="notes"
                  placeholder="Observações adicionais"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
              <Button onClick={handleCreateAllowance} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Solicitação'
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
            <CardDescription>Total de Solicitações</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendentes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aprovadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.approved}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Valor Total</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por destino, origem, finalidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="approved">Aprovada</SelectItem>
                <SelectItem value="paid">Paga</SelectItem>
                <SelectItem value="rejected">Rejeitada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitações</CardTitle>
          <CardDescription>
            {filteredAllowances.length} solicitação(ões) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAllowances.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Plane className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma solicitação encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Rota</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAllowances.map((allowance) => (
                  <TableRow key={allowance.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{allowance.users.name}</p>
                        <p className="text-sm text-gray-500">{allowance.users.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>{allowance.origin}</span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium">{allowance.destination}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {formatDate(allowance.startDate)} - {formatDate(allowance.endDate)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{allowance.totalDays}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(allowance.totalAmount)}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(allowance.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canApprove && allowance.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleApprove(allowance.id)}
                              title="Aprovar"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReject(allowance.id, 'Rejeitado pelo gestor')}
                              title="Rejeitar"
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                        {canApprove && allowance.status === 'approved' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMarkPaid(allowance.id)}
                            title="Marcar como Paga"
                          >
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
