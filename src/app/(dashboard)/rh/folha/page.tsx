// =============================================================================
// ConstrutorPro - Folha de Pagamento Page (RH)
// =============================================================================

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, Plus, Search, Calculator, CheckCircle, FileText, Eye } from 'lucide-react';
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

interface Payroll {
  id: string;
  number: string;
  referenceMonth: number;
  referenceYear: number;
  type: string;
  status: string;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalEmployer: number;
  calculationDate: string | null;
  paymentDate: string | null;
  createdAt: string;
  _count?: { payroll_items: number };
}

interface PayrollsResponse {
  success: boolean;
  data: {
    data: Payroll[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

async function fetchPayrolls(params: { referenceMonth?: number; referenceYear?: number; status?: string; page?: number }): Promise<PayrollsResponse> {
  const query = new URLSearchParams();
  if (params.referenceMonth) query.set('referenceMonth', params.referenceMonth.toString());
  if (params.referenceYear) query.set('referenceYear', params.referenceYear.toString());
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.page) query.set('page', params.page.toString());
  
  const response = await fetch(`/api/rh/folha?${query.toString()}`);
  return response.json();
}

async function createPayroll(data: { referenceMonth: number; referenceYear: number; type: string }): Promise<any> {
  const response = await fetch('/api/rh/folha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao criar folha');
  }
  return response.json();
}

async function calculatePayroll(payrollId: string): Promise<any> {
  const response = await fetch('/api/rh/folha', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payrollId }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao calcular folha');
  }
  return response.json();
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  calculated: { label: 'Calculada', variant: 'default' },
  approved: { label: 'Aprovada', variant: 'default' },
  paid: { label: 'Paga', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

const TYPE_CONFIG: Record<string, string> = {
  regular: 'Folha Mensal',
  '13th_first': '13º 1ª Parcela',
  '13th_second': '13º 2ª Parcela',
  vacation: 'Férias',
  rescission: 'Rescisão',
  complement: 'Complementar',
};

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const PAGE_SIZE = 10;

export default function FolhaPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const currentDate = new Date();
  const [monthFilter, setMonthFilter] = useState<string>((currentDate.getMonth() + 1).toString());
  const [yearFilter, setYearFilter] = useState<string>(currentDate.getFullYear().toString());
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newMonth, setNewMonth] = useState(currentDate.getMonth() + 1);
  const [newYear, setNewYear] = useState(currentDate.getFullYear());
  const [newType, setNewType] = useState('regular');

  const { data, isLoading } = useQuery({
    queryKey: ['payrolls', monthFilter, yearFilter, statusFilter, page],
    queryFn: () => fetchPayrolls({
      referenceMonth: parseInt(monthFilter),
      referenceYear: parseInt(yearFilter),
      status: statusFilter,
      page,
    }),
  });

  const createMutation = useMutation({
    mutationFn: createPayroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      toast({
        title: 'Sucesso',
        description: 'Folha criada com sucesso.',
      });
      setCreateDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const calculateMutation = useMutation({
    mutationFn: calculatePayroll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
      toast({
        title: 'Sucesso',
        description: 'Folha calculada com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    createMutation.mutate({
      referenceMonth: newMonth,
      referenceYear: newYear,
      type: newType,
    });
  };

  const handleCalculate = (payrollId: string) => {
    calculateMutation.mutate(payrollId);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const payrolls = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;
  const totalPages = data?.data?.pagination?.totalPages || Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Folha de Pagamento</h1>
          <p className="text-muted-foreground">
            Gerencie as folhas de pagamento da empresa
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Folha
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-full md:w-32">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {[2023, 2024, 2025, 2026].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="calculated">Calculada</SelectItem>
                <SelectItem value="approved">Aprovada</SelectItem>
                <SelectItem value="paid">Paga</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Folhas de Pagamento
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
          ) : payrolls.length === 0 ? (
            <div className="text-center py-12">
              <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhuma folha encontrada</h3>
              <p className="text-muted-foreground mt-1">
                Crie uma nova folha de pagamento para este período.
              </p>
              <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Folha
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Funcionários</TableHead>
                  <TableHead>Proventos</TableHead>
                  <TableHead>Descontos</TableHead>
                  <TableHead>Líquido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrolls.map((payroll) => (
                  <TableRow key={payroll.id}>
                    <TableCell className="font-mono">{payroll.number}</TableCell>
                    <TableCell>
                      {MONTHS[payroll.referenceMonth - 1]?.label}/{payroll.referenceYear}
                    </TableCell>
                    <TableCell>{TYPE_CONFIG[payroll.type] || payroll.type}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{payroll._count?.payroll_items || 0}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(Number(payroll.totalGross))}</TableCell>
                    <TableCell className="text-red-600">{formatCurrency(Number(payroll.totalDeductions))}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(Number(payroll.totalNet))}</TableCell>
                    <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                    <TableCell className="text-right">
                      {payroll.status === 'draft' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCalculate(payroll.id)}
                          disabled={calculateMutation.isPending}
                        >
                          <Calculator className="mr-1 h-3 w-3" />
                          Calcular
                        </Button>
                      )}
                      {payroll.status === 'calculated' && (
                        <Button size="sm" variant="outline">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Aprovar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {payrolls.length > 0 && (
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Folha de Pagamento</DialogTitle>
            <DialogDescription>
              Crie uma nova folha de pagamento para o período selecionado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mês de Referência</Label>
                <Select value={newMonth.toString()} onValueChange={(v) => setNewMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Select value={newYear.toString()} onValueChange={(v) => setNewYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2023, 2024, 2025, 2026].map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Folha</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Folha Mensal</SelectItem>
                  <SelectItem value="13th_first">13º Salário - 1ª Parcela</SelectItem>
                  <SelectItem value="13th_second">13º Salário - 2ª Parcela</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Criando...' : 'Criar Folha'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
