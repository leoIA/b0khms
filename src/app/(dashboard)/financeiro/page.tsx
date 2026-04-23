// =============================================================================
// ConstrutorPro - Finance Page
// =============================================================================

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, TrendingDown, Clock, Plus, Search, Filter } from 'lucide-react';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { PAYMENT_STATUS, TRANSACTION_TYPES, TRANSACTION_CATEGORIES } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/api';

interface Transaction {
  id: string;
  type: string;
  category: string;
  description: string;
  value: number;
  date: string;
  dueDate: string | null;
  status: string;
  project?: { id: string; name: string } | null;
  supplier?: { id: string; name: string } | null;
  client?: { id: string; name: string } | null;
}

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingIncome: number;
  pendingExpenses: number;
}

async function fetchDashboard(): Promise<{ success: boolean; data: DashboardStats }> {
  const response = await fetch('/api/financeiro/dashboard');
  return response.json();
}

async function fetchTransactions(params: { type?: string; status?: string; search?: string; page?: number; limit?: number }): Promise<{ success: boolean; data: { data: Transaction[]; pagination: { total: number; page: number; limit: number; totalPages: number } } }> {
  const query = new URLSearchParams();
  if (params.type && params.type !== 'all') query.set('type', params.type);
  if (params.status && params.status !== 'all') query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', params.page.toString());
  if (params.limit) query.set('limit', params.limit.toString());
  
  const response = await fetch(`/api/financeiro?${query.toString()}`);
  return response.json();
}

const PAGE_SIZE = 10;

export default function FinanceiroPage() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['finance-dashboard'],
    queryFn: fetchDashboard,
  });

  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', typeFilter, statusFilter, search, page],
    queryFn: () => fetchTransactions({ type: typeFilter, status: statusFilter, search, page, limit: PAGE_SIZE }),
  });

  const dashboard = dashboardData?.data;
  const transactions = transactionsData?.data?.data || [];
  const total = transactionsData?.data?.pagination?.total || 0;
  const totalPages = transactionsData?.data?.pagination?.totalPages || Math.ceil(total / PAGE_SIZE);

  const getStatusBadge = (status: string) => {
    const config = PAYMENT_STATUS[status as keyof typeof PAYMENT_STATUS];
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      partial: 'default',
      paid: 'default',
      overdue: 'destructive',
      cancelled: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {config?.label || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financeiro</h1>
          <p className="text-muted-foreground">
            Controle financeiro da sua construtora
          </p>
        </div>
        <Button asChild>
          <Link href="/financeiro/nova-transacao">
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receitas</p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboardLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(dashboard?.totalIncome || 0)
                  )}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesas</p>
                <p className="text-2xl font-bold text-red-600">
                  {dashboardLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(dashboard?.totalExpenses || 0)
                  )}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-bold ${(dashboard?.balance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {dashboardLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(dashboard?.balance || 0)
                  )}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">A Receber</p>
                <p className="text-2xl font-bold text-blue-600">
                  {dashboardLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(dashboard?.pendingIncome || 0)
                  )}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">A Pagar</p>
                <p className="text-2xl font-bold text-orange-600">
                  {dashboardLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(dashboard?.pendingExpenses || 0)
                  )}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar transações..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receitas</SelectItem>
                <SelectItem value="expense">Despesas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transações</CardTitle>
          <CardDescription>
            {total} transação{total !== 1 ? 'ões' : ''} encontrada{total !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhuma transação encontrada</h3>
              <p className="text-muted-foreground mt-1">
                Comece adicionando uma nova transação.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-sm">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        {transaction.supplier && (
                          <p className="text-xs text-muted-foreground">
                            Fornecedor: {transaction.supplier.name}
                          </p>
                        )}
                        {transaction.client && (
                          <p className="text-xs text-muted-foreground">
                            Cliente: {transaction.client.name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TRANSACTION_CATEGORIES[transaction.category as keyof typeof TRANSACTION_CATEGORIES]?.label || transaction.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {transaction.project?.name || '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCurrency(transaction.value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {transactions.length > 0 && (
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
