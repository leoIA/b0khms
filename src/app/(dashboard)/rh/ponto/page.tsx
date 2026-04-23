// =============================================================================
// ConstrutorPro - Controle de Ponto Page (RH)
// =============================================================================

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Clock, Search, Play, Square, Coffee, LogIn, LogOut, Plus } from 'lucide-react';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Employee {
  id: string;
  name: string;
  employeeNumber: string | null;
  jobTitle: string | null;
  department: string | null;
}

interface TimeRecord {
  id: string;
  employeeId: string;
  date: string;
  time: string;
  type: string;
  device: string;
  notes: string | null;
  employees: Employee;
}

interface TimeRecordsResponse {
  success: boolean;
  data: {
    data: TimeRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

async function fetchTimeRecords(params: { employeeId?: string; startDate?: string; endDate?: string; page?: number; limit?: number }): Promise<TimeRecordsResponse> {
  const query = new URLSearchParams();
  if (params.employeeId) query.set('employeeId', params.employeeId);
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  
  const response = await fetch(`/api/rh/ponto?${query.toString()}`);
  return response.json();
}

async function createTimeRecord(data: { employeeId: string; date: string; time: string; type: string }): Promise<any> {
  const response = await fetch('/api/rh/ponto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao registrar ponto');
  }
  return response.json();
}

const RECORD_TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  entry: { label: 'Entrada', icon: LogIn, color: 'text-green-600' },
  exit: { label: 'Saída', icon: LogOut, color: 'text-red-600' },
  break_start: { label: 'Início Intervalo', icon: Coffee, color: 'text-amber-600' },
  break_end: { label: 'Fim Intervalo', icon: Coffee, color: 'text-amber-600' },
  overtime_start: { label: 'Início Hora Extra', icon: Plus, color: 'text-blue-600' },
  overtime_end: { label: 'Fim Hora Extra', icon: Plus, color: 'text-blue-600' },
};

const PAGE_SIZE = 20;

export default function PontoPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [employeeFilter, setEmployeeFilter] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(1);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [recordType, setRecordType] = useState('entry');
  const [recordTime, setRecordTime] = useState(new Date().toTimeString().slice(0, 5));

  const { data, isLoading } = useQuery({
    queryKey: ['time-records', employeeFilter, startDate, endDate, page],
    queryFn: () => fetchTimeRecords({ employeeId: employeeFilter || undefined, startDate, endDate, page, limit: PAGE_SIZE }),
  });

  const createMutation = useMutation({
    mutationFn: createTimeRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-records'] });
      toast({
        title: 'Sucesso',
        description: 'Ponto registrado com sucesso.',
      });
      setRegisterDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleRegister = () => {
    if (!selectedEmployee) {
      toast({
        title: 'Erro',
        description: 'Selecione um funcionário.',
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate({
      employeeId: selectedEmployee,
      date: new Date().toISOString().split('T')[0],
      time: recordTime,
      type: recordType,
    });
  };

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getRecordTypeBadge = (type: string) => {
    const config = RECORD_TYPE_CONFIG[type] || { label: type, icon: Clock, color: 'text-gray-600' };
    const Icon = config.icon;
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {config.label}
      </Badge>
    );
  };

  const records = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;
  const totalPages = data?.data?.pagination?.totalPages || Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Ponto</h1>
          <p className="text-muted-foreground">
            Registre e visualize o ponto dos funcionários
          </p>
        </div>
        <Button onClick={() => setRegisterDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Registrar Ponto
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label className="text-sm text-muted-foreground">Funcionário</Label>
              <Input
                placeholder="ID do funcionário (opcional)"
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Label className="text-sm text-muted-foreground">Data Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Label className="text-sm text-muted-foreground">Data Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Registros de Ponto
            <Badge variant="secondary" className="ml-2">
              {total} registro{total !== 1 ? 's' : ''}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-12 flex-1" />
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum registro encontrado</h3>
              <p className="text-muted-foreground mt-1">
                Ajuste os filtros ou registre um novo ponto.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Dispositivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{record.employees.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {record.employees.jobTitle} • {record.employees.department}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(record.date)}</TableCell>
                    <TableCell className="font-mono">{formatTime(record.time)}</TableCell>
                    <TableCell>{getRecordTypeBadge(record.type)}</TableCell>
                    <TableCell className="text-muted-foreground">{record.device || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {records.length > 0 && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      {/* Register Dialog */}
      <Dialog open={registerDialogOpen} onOpenChange={setRegisterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Ponto</DialogTitle>
            <DialogDescription>
              Registre manualmente o ponto de um funcionário
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>ID do Funcionário</Label>
              <Input
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                placeholder="Cole o ID do funcionário"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Registro</Label>
              <Select value={recordType} onValueChange={setRecordType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entrada</SelectItem>
                  <SelectItem value="break_start">Início Intervalo</SelectItem>
                  <SelectItem value="break_end">Fim Intervalo</SelectItem>
                  <SelectItem value="exit">Saída</SelectItem>
                  <SelectItem value="overtime_start">Início Hora Extra</SelectItem>
                  <SelectItem value="overtime_end">Fim Hora Extra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Horário</Label>
              <Input
                type="time"
                value={recordTime}
                onChange={(e) => setRecordTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegisterDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegister} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
