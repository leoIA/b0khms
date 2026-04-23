'use client';

// =============================================================================
// ConstrutorPro - Faturamento
// Sistema completo de gestão de faturamento e cobranças
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
  Receipt,
  Plus,
  Search,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Building2,
  CreditCard,
  Banknote,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface Billing {
  id: string;
  numero: string;
  tipo: 'medicao' | 'avulso' | 'mensal';
  valorTotal: number;
  dataEmissao: string;
  dataVencimento: string;
  status: 'rascunho' | 'emitida' | 'paga' | 'vencida' | 'cancelada';
  observacoes?: string;
  createdAt: string;
  clients?: {
    id: string;
    name: string;
    email?: string;
  };
  projects?: {
    id: string;
    name: string;
  };
  medicoes?: {
    id: string;
    numero: number;
  };
  payments?: Payment[];
}

interface Payment {
  id: string;
  valor: number;
  dataPagamento: string;
  formaPagamento: string;
  observacoes?: string;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function FaturamentoPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [billings, setBillings] = useState<Billing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<Billing | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form state
  const [paymentForm, setPaymentForm] = useState({
    valor: '',
    formaPagamento: 'pix',
    observacoes: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchBillings();
    }
  }, [isAuthenticated]);

  const fetchBillings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/billings');
      const data = await response.json();

      if (data.success) {
        setBillings(data.data);
      } else {
        toast.error(data.error || 'Erro ao carregar faturamento');
      }
    } catch (error) {
      console.error('Error fetching billings:', error);
      toast.error('Erro ao carregar faturamento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterPayment = async () => {
    if (!selectedBilling || !paymentForm.valor) {
      toast.error('Informe o valor do pagamento');
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch(`/api/billings/${selectedBilling.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor: parseFloat(paymentForm.valor),
          formaPagamento: paymentForm.formaPagamento,
          observacoes: paymentForm.observacoes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setBillings((prev) =>
          prev.map((b) =>
            b.id === selectedBilling.id
              ? { ...b, status: data.data.status, payments: [...(b.payments || []), data.data.payment] }
              : b
          )
        );
        setIsPaymentDialogOpen(false);
        setPaymentForm({ valor: '', formaPagamento: 'pix', observacoes: '' });
        toast.success('Pagamento registrado com sucesso!');
      } else {
        toast.error(data.error || 'Erro ao registrar pagamento');
      }
    } catch (error) {
      console.error('Error registering payment:', error);
      toast.error('Erro ao registrar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; label: string }> = {
      rascunho: { variant: 'outline', className: 'text-gray-600', label: 'Rascunho' },
      emitida: { variant: 'secondary', className: 'bg-blue-100 text-blue-800', label: 'Emitida' },
      paga: { variant: 'default', className: 'bg-green-100 text-green-800', label: 'Paga' },
      vencida: { variant: 'destructive', className: '', label: 'Vencida' },
      cancelada: { variant: 'outline', className: 'text-gray-500', label: 'Cancelada' },
    };
    const style = styles[status] || styles.rascunho;
    return (
      <Badge variant={style.variant} className={style.className}>
        {style.label}
      </Badge>
    );
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      medicao: 'Medição',
      avulso: 'Avulso',
      mensal: 'Mensal',
    };
    return labels[tipo] || tipo;
  };

  const getFormaPagamentoLabel = (forma: string) => {
    const labels: Record<string, string> = {
      pix: 'PIX',
      boleto: 'Boleto',
      transferencia: 'Transferência',
      cartao: 'Cartão',
      dinheiro: 'Dinheiro',
      cheque: 'Cheque',
    };
    return labels[forma] || forma;
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

  const filteredBillings = billings.filter((billing) => {
    const matchesSearch =
      billing.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      billing.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      billing.projects?.name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || billing.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalEmitido = billings
    .filter((b) => b.status !== 'rascunho' && b.status !== 'cancelada')
    .reduce((sum, b) => sum + b.valorTotal, 0);
  const totalRecebido = billings
    .filter((b) => b.status === 'paga')
    .reduce((sum, b) => sum + b.valorTotal, 0);
  const totalPendente = billings
    .filter((b) => b.status === 'emitida')
    .reduce((sum, b) => sum + b.valorTotal, 0);
  const totalVencido = billings
    .filter((b) => b.status === 'vencida')
    .reduce((sum, b) => sum + b.valorTotal, 0);

  const canManagePayments = user?.role && ['master_admin', 'company_admin', 'manager', 'finance'].includes(user.role);

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
          <h1 className="text-2xl font-bold text-gray-900">Faturamento</h1>
          <p className="text-gray-500 mt-1">
            Gerencie faturas, cobranças e recebimentos
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Emitido</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{formatCurrency(totalEmitido)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recebido</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold text-green-600">{formatCurrency(totalRecebido)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>A Receber</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold text-amber-600">{formatCurrency(totalPendente)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Vencido</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold text-red-600">{formatCurrency(totalVencido)}</span>
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
                  placeholder="Buscar por número, cliente ou projeto..."
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
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="emitida">Emitida</SelectItem>
                <SelectItem value="paga">Paga</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Faturas</CardTitle>
          <CardDescription>
            {filteredBillings.length} fatura(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBillings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhuma fatura encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBillings.map((billing) => (
                  <TableRow key={billing.id}>
                    <TableCell>
                      <span className="font-mono font-medium">{billing.numero}</span>
                    </TableCell>
                    <TableCell>
                      {billing.clients ? (
                        <div>
                          <p className="font-medium">{billing.clients.name}</p>
                          {billing.clients.email && (
                            <p className="text-sm text-gray-500">{billing.clients.email}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {billing.projects ? (
                        <Badge variant="outline">{billing.projects.name}</Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getTipoLabel(billing.tipo)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{formatDate(billing.dataEmissao)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className={`text-sm ${billing.status === 'vencida' ? 'text-red-600 font-medium' : ''}`}>
                          {formatDate(billing.dataVencimento)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(billing.valorTotal)}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(billing.status)}</TableCell>
                    <TableCell>
                      {canManagePayments && (billing.status === 'emitida' || billing.status === 'vencida') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBilling(billing);
                            setPaymentForm({
                              ...paymentForm,
                              valor: billing.valorTotal.toString(),
                            });
                            setIsPaymentDialogOpen(true);
                          }}
                        >
                          <DollarSign className="h-4 w-4 mr-1" />
                          Receber
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

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              Fatura: {selectedBilling?.numero} - Valor: {selectedBilling && formatCurrency(selectedBilling.valorTotal)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor do Pagamento *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={paymentForm.valor}
                onChange={(e) => setPaymentForm({ ...paymentForm, valor: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="forma">Forma de Pagamento</Label>
              <Select
                value={paymentForm.formaPagamento}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, formaPagamento: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Observações</Label>
              <Input
                id="obs"
                value={paymentForm.observacoes}
                onChange={(e) => setPaymentForm({ ...paymentForm, observacoes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterPayment} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Pagamento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
