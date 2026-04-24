// =============================================================================
// ConstrutorPro - Orçamentos - Detalhes do Orçamento
// =============================================================================

'use client';

import { useState } from 'react';
import { useSession } from '@/hooks/use-session';
import { redirect, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Pencil,
  MoreHorizontal,
  FileText,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Download,
  Send,
  FileCheck,
  RefreshCw,
  User,
} from 'lucide-react';
import { BUDGET_STATUS, USER_ROLES } from '@/lib/constants';
import type { BudgetStatus, BudgetItem } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/api';

// Types
interface Budget {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: BudgetStatus;
  totalValue: number;
  discount: number | null;
  validUntil: string | null;
  approvedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    code: string | null;
  } | null;
  approver: {
    id: string;
    name: string;
    email: string | null;
  } | null;
  items: BudgetItem[];
  _count?: {
    items: number;
  };
}

// Fetch budget details
async function fetchBudget(id: string): Promise<Budget> {
  const response = await fetch(`/api/orcamentos/${id}`);
  if (!response.ok) throw new Error('Erro ao carregar orçamento');
  const data = await response.json();
  return data.data || data;
}

// Status badge component
function StatusBadge({ status }: { status: BudgetStatus }) {
  const config = BUDGET_STATUS[status];
  return (
    <Badge className={`${config.color} text-white`}>
      {config.label}
    </Badge>
  );
}

// Status timeline component
function StatusTimeline({ status }: { status: BudgetStatus }) {
  const steps = [
    { key: 'draft', label: 'Rascunho', icon: FileText },
    { key: 'pending', label: 'Pendente', icon: Clock },
    { key: 'approved', label: 'Aprovado', icon: CheckCircle2 },
  ];

  const rejectedSteps = [
    { key: 'draft', label: 'Rascunho', icon: FileText },
    { key: 'pending', label: 'Pendente', icon: Clock },
    { key: 'rejected', label: 'Rejeitado', icon: XCircle },
  ];

  const revisionSteps = [
    { key: 'draft', label: 'Rascunho', icon: FileText },
    { key: 'pending', label: 'Pendente', icon: Clock },
    { key: 'revision', label: 'Em Revisão', icon: RefreshCw },
  ];

  const getSteps = () => {
    if (status === 'rejected') return rejectedSteps;
    if (status === 'revision') return revisionSteps;
    return steps;
  };

  const currentSteps = getSteps();
  const currentIndex = currentSteps.findIndex(s => s.key === status);

  return (
    <div className="flex items-center justify-between">
      {currentSteps.map((step, index) => {
        const Icon = step.icon;
        const isCompleted = index < currentIndex || (index === currentIndex && (status === 'approved' || status === 'rejected'));
        const isCurrent = index === currentIndex;
        const isRejected = step.key === 'rejected';
        const isRevision = step.key === 'revision';

        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? isRejected
                      ? 'bg-red-500 text-white'
                      : isRevision
                      ? 'bg-orange-500 text-white'
                      : 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <span className={`text-xs mt-2 ${isCurrent ? 'font-medium' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
            {index < currentSteps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

export default function OrcamentoDetalhesPage() {
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  const router = useRouter();
  const params = useParams();
  const budgetId = params.id as string;

  // Redirect if not authenticated
  if (!sessionLoading && !isAuthenticated) {
    redirect('/login');
  }

  // Fetch budget
  const {
    data: budget,
    isLoading: budgetLoading,
    error,
  } = useQuery({
    queryKey: ['budget', budgetId],
    queryFn: () => fetchBudget(budgetId),
    enabled: isAuthenticated && !!budgetId,
  });

  // Check if user can approve/reject (manager or above)
  const canApprove = user && ['master_admin', 'company_admin', 'manager'].includes(user.role);
  const canEdit = budget && (budget.status === 'draft' || budget.status === 'revision');
  const canSubmit = budget && budget.status === 'draft';
  const canApproveReject = budget && budget.status === 'pending' && canApprove;

  if (sessionLoading || budgetLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !budget) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orcamentos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orçamento não encontrado</h1>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-muted-foreground">
              O orçamento solicitado não foi encontrado.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate totals
  const subtotal = budget.items?.reduce((sum, item) => sum + item.totalPrice, 0) || 0;
  const discount = budget.discount || 0;
  const total = budget.totalValue || subtotal - discount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orcamentos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{budget.name}</h1>
              <StatusBadge status={budget.status} />
            </div>
            {budget.code && (
              <p className="text-sm text-muted-foreground font-mono">{budget.code}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" asChild>
              <Link href={`/orcamentos/${budgetId}/editar`}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          )}
          {canSubmit && (
            <Button variant="outline">
              <Send className="h-4 w-4 mr-2" />
              Enviar para Aprovação
            </Button>
          )}
          {canApproveReject && (
            <>
              <Button variant="default" className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
              <Button variant="destructive">
                <XCircle className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
            </>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileText className="h-4 w-4 mr-2" />
                Exportar Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                Excluir Orçamento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(total)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Itens</p>
                <p className="text-lg font-bold">{budget.items?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <DollarSign className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Desconto</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(discount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Válido Até</p>
                <p className="text-lg font-bold">
                  {budget.validUntil ? formatDate(budget.validUntil) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status do Orçamento</CardTitle>
            </CardHeader>
            <CardContent className="py-6">
              <StatusTimeline status={budget.status} />
            </CardContent>
          </Card>

          {/* Description */}
          {budget.description && (
            <Card>
              <CardHeader>
                <CardTitle>Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {budget.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Itens do Orçamento</CardTitle>
              <CardDescription>
                {budget.items?.length || 0} item(ns)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {budget.items && budget.items.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[8%]">#</TableHead>
                        <TableHead className="w-[45%]">Descrição</TableHead>
                        <TableHead className="w-[8%]">Un.</TableHead>
                        <TableHead className="w-[12%] text-right">Qtd</TableHead>
                        <TableHead className="w-[15%] text-right">Preço Unit.</TableHead>
                        <TableHead className="w-[15%] text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budget.items
                        .sort((a, b) => a.order - b.order)
                        .map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-muted-foreground">
                              {index + 1}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.description}</p>
                                {item.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {item.notes}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell className="text-right">
                              {item.quantity.toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.unitPrice)}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {formatCurrency(item.totalPrice)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2" />
                  <p>Nenhum item adicionado</p>
                </div>
              )}

              {/* Totals */}
              {budget.items && budget.items.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Desconto:</span>
                          <span className="text-red-600">-{formatCurrency(discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold pt-2 border-t">
                        <span>Total:</span>
                        <span className="text-green-600">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Project */}
          {budget.project && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Projeto Vinculado</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{budget.project.name}</p>
                    {budget.project.code && (
                      <p className="text-xs text-muted-foreground font-mono">
                        {budget.project.code}
                      </p>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full mt-3" asChild>
                  <Link href={`/projetos/${budget.project.id}`}>
                    Ver Projeto
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Approval Info */}
          {budget.status === 'approved' && budget.approver && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Aprovação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{budget.approver.name}</p>
                    {budget.approver.email && (
                      <p className="text-xs text-muted-foreground">
                        {budget.approver.email}
                      </p>
                    )}
                  </div>
                </div>
                {budget.approvedAt && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(budget.approvedAt)}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Validity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Validade</CardTitle>
            </CardHeader>
            <CardContent>
              {budget.validUntil ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Válido até</p>
                  <p className="font-medium">
                    {new Date(budget.validUntil).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  {new Date(budget.validUntil) < new Date() && (
                    <Badge variant="destructive" className="mt-2">
                      Orçamento expirado
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Sem data de validade definida</p>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {budget.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {budget.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Criado em</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(budget.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium">Última atualização</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(budget.updatedAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
