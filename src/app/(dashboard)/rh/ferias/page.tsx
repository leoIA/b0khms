// =============================================================================
// ConstrutorPro - Férias Page (RH)
// =============================================================================

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plane, Plus, Search, CheckCircle, XCircle } from 'lucide-react';
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

interface Vacation {
  id: string;
  employeeId: string;
  acquisitionStart: string;
  acquisitionEnd: string;
  vacationStart: string;
  vacationEnd: string;
  days: number;
  soldDays: number;
  vacationValue: number;
  oneThirdValue: number;
  totalValue: number;
  status: string;
  employees: {
    id: string;
    name: string;
    employeeNumber: string | null;
    jobTitle: string | null;
    department: string | null;
  };
}

interface VacationsResponse {
  success: boolean;
  data: {
    data: Vacation[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

async function fetchVacations(params: { status?: string; year?: number; page?: number }): Promise<VacationsResponse> {
  const query = new URLSearchParams();
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.year) query.set('year', params.year.toString());
  if (params.page) query.set('page', params.page.toString());
  
  const response = await fetch(`/api/rh/ferias?${query.toString()}`);
  return response.json();
}

async function approveVacation(id: string): Promise<any> {
  const response = await fetch('/api/rh/ferias', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'approve' }),
  });
  if (!response.ok) throw new Error('Erro ao aprovar férias');
  return response.json();
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  approved: { label: 'Aprovada', variant: 'default' },
  enjoyed: { label: 'Gozada', variant: 'default' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

const PAGE_SIZE = 10;

export default function FeriasPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['vacations', statusFilter, yearFilter, page],
    queryFn: () => fetchVacations({ status: statusFilter, year: parseInt(yearFilter), page }),
  });

  const approveMutation = useMutation({
    mutationFn: approveVacation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      toast({ title: 'Sucesso', description: 'Férias aprovadas.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));
  
  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

  const vacations = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;
  const totalPages = data?.data?.pagination?.totalPages || 1;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Férias</h1>
          <p className="text-muted-foreground">Gerencie as férias dos funcionários</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {[2023, 2024, 2025, 2026].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="approved">Aprovadas</SelectItem>
                <SelectItem value="enjoyed">Gozadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Férias
            <Badge variant="secondary">{total}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : vacations.length === 0 ? (
            <div className="text-center py-12">
              <Plane className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhuma férias encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vacations.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="font-medium">{v.employees.name}</div>
                      <div className="text-xs text-muted-foreground">{v.employees.jobTitle}</div>
                    </TableCell>
                    <TableCell>
                      {formatDate(v.vacationStart)} - {formatDate(v.vacationEnd)}
                    </TableCell>
                    <TableCell>{v.days} dias {v.soldDays > 0 && <span className="text-muted-foreground">(+ {v.soldDays} vendidos)</span>}</TableCell>
                    <TableCell>{formatCurrency(Number(v.totalValue))}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_CONFIG[v.status]?.variant || 'secondary'}>
                        {STATUS_CONFIG[v.status]?.label || v.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {v.status === 'pending' && (
                        <Button size="sm" variant="outline" onClick={() => approveMutation.mutate(v.id)}>
                          <CheckCircle className="mr-1 h-3 w-3" /> Aprovar
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

      {vacations.length > 0 && (
        <PaginationControls currentPage={page} totalPages={totalPages} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}
    </div>
  );
}
