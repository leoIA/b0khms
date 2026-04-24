// =============================================================================
// ConstrutorPro - Detalhes da Medição Page
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Pencil,
  CheckCircle,
  DollarSign,
  Printer,
  FileText,
  Calendar,
  User,
  Building2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MedicaoItem {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  quantidadeAnt: number;
  valorUnitario: number;
  valorTotal: number;
  observacao: string | null;
  ordem: number;
  composicao: {
    id: string;
    code: string;
    name: string;
    unit: string;
  };
}

interface Medicao {
  id: string;
  numero: number;
  dataInicio: string;
  dataFim: string;
  status: 'rascunho' | 'aprovada' | 'paga' | 'cancelada';
  valorTotal: number;
  observacoes: string | null;
  createdAt: string;
  aprovadoEm: string | null;
  project: {
    id: string;
    name: string;
    code: string | null;
    status: string;
  };
  criador: {
    id: string;
    name: string;
  } | null;
  aprovador: {
    id: string;
    name: string;
  } | null;
  itens: MedicaoItem[];
}

const statusColors = {
  rascunho: 'secondary',
  aprovada: 'default',
  paga: 'default',
  cancelada: 'destructive',
} as const;

const statusLabels = {
  rascunho: 'Rascunho',
  aprovada: 'Aprovada',
  paga: 'Paga',
  cancelada: 'Cancelada',
} as const;

export default function MedicaoDetalhesPage() {
  const router = useRouter();
  const params = useParams();
  const medicaoId = params.id as string;

  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login');
    },
  });

  const { toast } = useToast();
  const [medicao, setMedicao] = useState<Medicao | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'aprovar' | 'pagar' | 'cancelar' | null>(null);

  useEffect(() => {
    if (session && medicaoId) {
      fetchMedicao();
    }
  }, [session, medicaoId]);

  const fetchMedicao = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/medicoes/${medicaoId}`);
      const data = await response.json();

      if (response.ok) {
        setMedicao(data);
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Não foi possível carregar a medição.',
          variant: 'destructive',
        });
        router.push('/medicoes');
      }
    } catch (error) {
      console.error('Error fetching medicao:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar medição.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!confirmAction || !medicao) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/medicoes/${medicaoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: confirmAction }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: `Medição ${confirmAction === 'aprovar' ? 'aprovada' : confirmAction === 'pagar' ? 'marcada como paga' : 'cancelada'} com sucesso.`,
        });
        fetchMedicao();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Não foi possível realizar a ação.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao realizar ação.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (status === 'loading' || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!medicao) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/medicoes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                Medição #{medicao.numero}
              </h1>
              <Badge
                variant={statusColors[medicao.status]}
                className={
                  medicao.status === 'aprovada'
                    ? 'bg-green-600 hover:bg-green-700'
                    : medicao.status === 'paga'
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : ''
                }
              >
                {statusLabels[medicao.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {medicao.project.name}
              {medicao.project.code && ` (${medicao.project.code})`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          {medicao.status === 'rascunho' && (
            <Button asChild>
              <Link href={`/medicoes/${medicaoId}/editar`}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info Cards */}
        <div className="lg:col-span-1 space-y-6">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Projeto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium">{medicao.project.name}</p>
              </div>
              {medicao.project.code && (
                <div>
                  <p className="text-sm text-muted-foreground">Código</p>
                  <p className="font-medium font-mono">{medicao.project.code}</p>
                </div>
              )}
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={`/projetos/${medicao.project.id}`}>
                  Ver Projeto
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Period Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Período
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Data Início</p>
                <p className="font-medium">
                  {format(new Date(medicao.dataInicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Fim</p>
                <p className="font-medium">
                  {format(new Date(medicao.dataFim), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* People Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Responsáveis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Criado por</p>
                <p className="font-medium">{medicao.criador?.name ?? '-'}</p>
                <p className="text-xs text-muted-foreground">
                  em {format(new Date(medicao.createdAt), "dd/MM/yyyy 'às' HH:mm")}
                </p>
              </div>
              {medicao.aprovador && (
                <div>
                  <p className="text-sm text-muted-foreground">Aprovado por</p>
                  <p className="font-medium">{medicao.aprovador.name}</p>
                  {medicao.aprovadoEm && (
                    <p className="text-xs text-muted-foreground">
                      em {format(new Date(medicao.aprovadoEm), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumo Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itens</span>
                <span className="font-medium">{medicao.itens.length}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Total</span>
                <span className="font-bold text-xl text-green-600">
                  {formatCurrency(medicao.valorTotal)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Observations */}
          {medicao.observacoes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{medicao.observacoes}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {medicao.status !== 'cancelada' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {medicao.status === 'rascunho' && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => setConfirmAction('aprovar')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar Medição
                  </Button>
                )}
                {medicao.status === 'aprovada' && (
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => setConfirmAction('pagar')}
                  >
                    <DollarSign className="h-4 w-4 mr-2" />
                    Marcar como Paga
                  </Button>
                )}
                {medicao.status !== 'paga' && (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setConfirmAction('cancelar')}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Cancelar Medição
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Items Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Itens da Medição</CardTitle>
              <CardDescription>
                Composições executadas e quantidades medidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {medicao.itens.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Nenhum item nesta medição
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-center">Un.</TableHead>
                        <TableHead className="text-right">Qtd. Ant.</TableHead>
                        <TableHead className="text-right">Qtd. Med.</TableHead>
                        <TableHead className="text-right">Vl. Unit.</TableHead>
                        <TableHead className="text-right">Vl. Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {medicao.itens.map((item, index) => (
                        <TableRow key={item.id || index}>
                          <TableCell className="font-mono text-sm">
                            {item.composicao.code}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.descricao}</p>
                              {item.observacao && (
                                <p className="text-xs text-muted-foreground">
                                  {item.observacao}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {item.unidade}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.quantidadeAnt.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {item.quantidade.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.valorUnitario)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(item.valorTotal)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Total */}
              <div className="mt-4 flex justify-end">
                <div className="bg-muted rounded-lg p-4 w-64">
                  <div className="flex justify-between mb-2">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(medicao.valorTotal)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-green-600">
                      {formatCurrency(medicao.valorTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === 'aprovar' && 'Aprovar Medição'}
              {confirmAction === 'pagar' && 'Marcar como Paga'}
              {confirmAction === 'cancelar' && 'Cancelar Medição'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === 'aprovar' && 'Tem certeza que deseja aprovar esta medição? Esta ação não pode ser desfeita.'}
              {confirmAction === 'pagar' && 'Tem certeza que deseja marcar esta medição como paga?'}
              {confirmAction === 'cancelar' && 'Tem certeza que deseja cancelar esta medição? Esta ação não pode ser desfeita.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={actionLoading}
              className={
                confirmAction === 'cancelar'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : confirmAction === 'aprovar'
                  ? 'bg-green-600 hover:bg-green-700'
                  : ''
              }
            >
              {actionLoading ? 'Processando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
