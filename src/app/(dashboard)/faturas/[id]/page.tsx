'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Plus, DollarSign, CreditCard } from 'lucide-react';

interface Fatura {
  id: string;
  numero: string;
  serie: string;
  dataEmissao: Date;
  dataVencimento: Date;
  valorOriginal: number;
  valorDesconto: number;
  valorJuros: number;
  valorMulta: number;
  valorTotal: number;
  valorPago: number;
  status: string;
  observacoes?: string;
  instrucoesPagto?: string;
  clients: { name: string; email?: string; cpfCnpj?: string; phone?: string };
  fatura_items: any[];
  fatura_pagamentos: any[];
}

export default function FaturaDetalhesPage() {
  const router = useRouter();
  const params = useParams();
  const [fatura, setFatura] = useState<Fatura | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagamentoDialog, setPagamentoDialog] = useState(false);
  const [pagamentoData, setPagamentoData] = useState({
    valor: '',
    formaPagamento: 'pix',
    documentoRef: '',
    observacoes: '',
  });

  useEffect(() => {
    loadFatura();
  }, [params.id]);

  const loadFatura = async () => {
    try {
      const response = await fetch(`/api/faturas/${params.id}`);
      const data = await response.json();
      setFatura(data);
    } catch (error) {
      console.error('Erro ao carregar fatura:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarPagamento = async () => {
    try {
      const response = await fetch(`/api/faturas/${params.id}/pagamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pagamentoData,
          valor: parseFloat(pagamentoData.valor),
          dataPagamento: new Date(),
        }),
      });

      if (response.ok) {
        loadFatura();
        setPagamentoDialog(false);
        setPagamentoData({
          valor: '',
          formaPagamento: 'pix',
          documentoRef: '',
          observacoes: '',
        });
      }
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pendente: 'bg-yellow-100 text-yellow-800',
      paga: 'bg-green-100 text-green-800',
      parcial: 'bg-blue-100 text-blue-800',
      vencida: 'bg-red-100 text-red-800',
      cancelada: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="flex justify-center py-8">Carregando...</div>;
  }

  if (!fatura) {
    return <div className="text-center py-8">Fatura não encontrada</div>;
  }

  const saldoDevedor = fatura.valorTotal - fatura.valorPago;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/faturas')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Fatura {fatura.numero}</h1>
            <p className="text-muted-foreground">Série: {fatura.serie}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(fatura.status === 'pendente' || fatura.status === 'parcial') && (
            <Dialog open={pagamentoDialog} onOpenChange={setPagamentoDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Registrar Pagamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Registrar Pagamento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={pagamentoData.valor}
                      onChange={(e) =>
                        setPagamentoData({ ...pagamentoData, valor: e.target.value })
                      }
                      placeholder={formatCurrency(saldoDevedor)}
                    />
                  </div>
                  <div>
                    <Label>Forma de Pagamento</Label>
                    <Select
                      value={pagamentoData.formaPagamento}
                      onValueChange={(v) =>
                        setPagamentoData({ ...pagamentoData, formaPagamento: v })
                      }
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
                  <div>
                    <Label>Documento/Comprovante</Label>
                    <Input
                      value={pagamentoData.documentoRef}
                      onChange={(e) =>
                        setPagamentoData({ ...pagamentoData, documentoRef: e.target.value })
                      }
                      placeholder="Número do comprovante"
                    />
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Input
                      value={pagamentoData.observacoes}
                      onChange={(e) =>
                        setPagamentoData({ ...pagamentoData, observacoes: e.target.value })
                      }
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleRegistrarPagamento}>Registrar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(fatura.valorTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(fatura.valorPago)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Saldo Devedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(saldoDevedor)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(fatura.status)}>{fatura.status}</Badge>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="items">Itens</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-muted-foreground">Nome: </span>
                    <span className="font-medium">{fatura.clients?.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CPF/CNPJ: </span>
                    <span>{fatura.clients?.cpfCnpj}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email: </span>
                    <span>{fatura.clients?.email}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Datas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-muted-foreground">Emissão: </span>
                    <span>{formatDate(fatura.dataEmissao)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Vencimento: </span>
                    <span>{formatDate(fatura.dataVencimento)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {fatura.observacoes && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{fatura.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="items" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead>Un.</TableHead>
                    <TableHead className="text-right">Valor Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fatura.fatura_items.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell>{item.descricao}</TableCell>
                      <TableCell className="text-right">{item.quantidade}</TableCell>
                      <TableCell>{item.unidade || '-'}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.valorUnitario)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.valorTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagamentos" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fatura.fatura_pagamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhum pagamento registrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    fatura.fatura_pagamentos.map((pagamento) => (
                      <TableRow key={pagamento.id}>
                        <TableCell>{formatDate(pagamento.dataPagamento)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            {pagamento.formaPagamento}
                          </div>
                        </TableCell>
                        <TableCell>{pagamento.documentoRef || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(pagamento.valor)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
