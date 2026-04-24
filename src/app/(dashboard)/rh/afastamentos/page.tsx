// =============================================================================
// ConstrutorPro - Afastamentos Page (RH)
// =============================================================================

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Plus, CheckCircle, XCircle } from 'lucide-react';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Button } from '@/components/ui/button';
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

interface Leave {
  id: string;
  employeeId: string;
  type: string;
  reason: string;
  startDate: string;
  endDate: string | null;
  days: number | null;
  isPaid: boolean;
  paidPercent: number;
  status: string;
  cidCode: string | null;
  employees: {
    id: string;
    name: string;
    employeeNumber: string | null;
    jobTitle: string | null;
    department: string | null;
  };
}

interface LeavesResponse {
  success: boolean;
  data: {
    data: Leave[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

async function fetchLeaves(params: { type?: string; status?: string; page?: number }): Promise<LeavesResponse> {
  const query = new URLSearchParams();
  if (params.type && params.type !== 'all') query.set('type', params.type);
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.page) query.set('page', params.page.toString());
  
  const response = await fetch(`/api/rh/afastamentos?${query.toString()}`);
  return response.json();
}

async function returnLeave(id: string): Promise<any> {
  const response = await fetch('/api/rh/afastamentos', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, action: 'return' }),
  });
  if (!response.ok) throw new Error('Erro ao registrar retorno');
  return response.json();
}

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  sick_leave: { label: 'Licença Médica', color: 'text-red-600' },
  accident: { label: 'Acidente', color: 'text-red-600' },
  maternity: { label: 'Licença Maternidade', color: 'text-pink-600' },
  paternity: { label: 'Licença Paternidade', color: 'text-blue-600' },
  marriage: { label: 'Casamento', color: 'text-purple-600' },
  bereavement: { label: 'Luto', color: 'text-gray-600' },
  suspension: { label: 'Suspensão', color: 'text-amber-600' },
  other: { label: 'Outro', color: 'text-gray-600' },
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativo', variant: 'destructive' },
  returned: { label: 'Retornou', variant: 'default' },
  cancelled: { label: 'Cancelado', variant: 'secondary' },
};

const PAGE_SIZE = 10;

export default function AfastamentosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', typeFilter, statusFilter, page],
    queryFn: () => fetchLeaves({ type: typeFilter, status: statusFilter, page }),
  });

  const returnMutation = useMutation({
    mutationFn: returnLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      toast({ title: 'Sucesso', description: 'Retorno registrado.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const formatDate = (date: string) => new Date(date).toLocaleDateString('pt-BR');

  const leaves = data?.data?.data || [];
  const total = data?.data?.pagination?.total || 0;
  const totalPages = data?.data?.pagination?.totalPages || 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Afastamentos</h1>
        <p className="text-muted-foreground">Controle de afastamentos e licenças</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="sick_leave">Licença Médica</SelectItem>
                <SelectItem value="accident">Acidente</SelectItem>
                <SelectItem value="maternity">Licença Maternidade</SelectItem>
                <SelectItem value="paternity">Licença Paternidade</SelectItem>
                <SelectItem value="suspension">Suspensão</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="returned">Retornados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Afastamentos
            <Badge variant="secondary">{total}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum afastamento encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Remunerado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <div className="font-medium">{l.employees.name}</div>
                      <div className="text-xs text-muted-foreground">{l.employees.department}</div>
                    </TableCell>
                    <TableCell>
                      <span className={TYPE_CONFIG[l.type]?.color}>
                        {TYPE_CONFIG[l.type]?.label || l.type}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-48 truncate">{l.reason}</TableCell>
                    <TableCell>
                      {formatDate(l.startDate)}
                      {l.endDate && ` - ${formatDate(l.endDate)}`}
                      {l.days && <span className="text-muted-foreground"> ({l.days} dias)</span>}
                    </TableCell>
                    <TableCell>
                      {l.isPaid ? `${l.paidPercent}%` : 'Não'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_CONFIG[l.status]?.variant || 'secondary'}>
                        {STATUS_CONFIG[l.status]?.label || l.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {l.status === 'active' && (
                        <Button size="sm" variant="outline" onClick={() => returnMutation.mutate(l.id)}>
                          <CheckCircle className="mr-1 h-3 w-3" /> Retorno
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

      {leaves.length > 0 && (
        <PaginationControls currentPage={page} totalPages={totalPages} totalItems={total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      )}
    </div>
  );
}
