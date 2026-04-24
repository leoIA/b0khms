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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Check, X, Plus, Receipt } from 'lucide-react';

interface Viagem {
  id: string;
  objetivo: string;
  destino: string;
  tipoViagem: string;
  dataIda: Date;
  dataVolta: Date;
  valorDiarias: number;
  quantidadeDiarias: number;
  valorPassagens: number;
  valorHospedagem: number;
  valorOutros: number;
  valorTotal: number;
  status: string;
  motivoRejeicao?: string;
  observacoes?: string;
  users_solicitante: { name: string; email: string; phone?: string };
  users_aprovador?: { name: string };
  viagem_passagens: any[];
  viagem_despesas: any[];
}

export default function ViagemDetalhesPage() {
  const router = useRouter();
  const params = useParams();
  const [viagem, setViagem] = useState<Viagem | null>(null);
  const [loading, setLoading] = useState(true);
  const [aprovacaoDialog, setAprovacaoDialog] = useState(false);
  const [rejeicaoMotivo, setRejeicaoMotivo] = useState('');
  const [despesaDialog, setDespesaDialog] = useState(false);

  useEffect(() => {
    loadViagem();
  }, [params.id]);

  const loadViagem = async () => {
    try {
      const response = await fetch(`/api/viagens/${params.id}`);
      const data = await response.json();
      setViagem(data);
    } catch (error) {
      console.error('Erro ao carregar viagem:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAprovar = async (aprovado: boolean) => {
    try {
      const response = await fetch(`/api/viagens/${params.id}/aprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aprovado,
          motivoRejeicao: !aprovado ? rejeicaoMotivo : undefined,
        }),
      });

      if (response.ok) {
        loadViagem();
        setAprovacaoDialog(false);
        setRejeicaoMotivo('');
      }
    } catch (error) {
      console.error('Erro ao processar aprovação:', error);
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
      aprovada: 'bg-green-100 text-green-800',
      rejeitada: 'bg-red-100 text-red-800',
      em_viagem: 'bg-blue-100 text-blue-800',
      concluida: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="flex justify-center py-8">Carregando...</div>;
  }

  if (!viagem) {
    return <div className="text-center py-8">Viagem não encontrada</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/viagens')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{viagem.objetivo}</h1>
            <p className="text-muted-foreground">{viagem.destino}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {viagem.status === 'pendente' && (
            <Dialog open={aprovacaoDialog} onOpenChange={setAprovacaoDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Check className="mr-2 h-4 w-4" />
                  Aprovar/Rejeitar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Aprovar Viagem</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label>Motivo da Rejeição (se aplicável)</Label>
                    <Textarea
                      value={rejeicaoMotivo}
                      onChange={(e) => setRejeicaoMotivo(e.target.value)}
                      placeholder="Informe o motivo se for rejeitar..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="destructive" onClick={() => handleAprovar(false)}>
                    <X className="mr-2 h-4 w-4" />
                    Rejeitar
                  </Button>
                  <Button onClick={() => handleAprovar(true)}>
                    <Check className="mr-2 h-4 w-4" />
                    Aprovar
                  </Button>
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
              Diárias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{viagem.quantidadeDiarias}</div>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(viagem.valorDiarias)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Passagens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(viagem.valorPassagens)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hospedagem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(viagem.valorHospedagem)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(viagem.valorTotal)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="passagens">Passagens</TabsTrigger>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Dados da Viagem</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Solicitante:</span>
                      <span>{viagem.users_solicitante?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span>{viagem.users_solicitante?.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tipo:</span>
                      <Badge variant="outline">{viagem.tipoViagem}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Período:</span>
                      <span>
                        {formatDate(viagem.dataIda)} a {formatDate(viagem.dataVolta)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={getStatusColor(viagem.status)}>{viagem.status}</Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Aprovação</h3>
                  <div className="space-y-3">
                    {viagem.users_aprovador ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Aprovador:</span>
                          <span>{viagem.users_aprovador.name}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Aguardando aprovação</p>
                    )}
                    {viagem.motivoRejeicao && (
                      <div className="mt-4 p-3 bg-red-50 rounded-lg">
                        <p className="text-sm font-medium text-red-800">Motivo da Rejeição:</p>
                        <p className="text-sm text-red-600">{viagem.motivoRejeicao}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {viagem.observacoes && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-semibold mb-2">Observações</h3>
                  <p className="text-muted-foreground">{viagem.observacoes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="passagens" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Passagens</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Companhia</TableHead>
                    <TableHead>Origem/Destino</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viagem.viagem_passagens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma passagem registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    viagem.viagem_passagens.map((passagem) => (
                      <TableRow key={passagem.id}>
                        <TableCell>
                          <Badge variant="outline">{passagem.tipo}</Badge>
                        </TableCell>
                        <TableCell>{passagem.companhia}</TableCell>
                        <TableCell>
                          {passagem.origem} → {passagem.destino}
                        </TableCell>
                        <TableCell>{formatDate(passagem.dataEmbarque)}</TableCell>
                        <TableCell>{formatCurrency(passagem.valorPassagem)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="despesas" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Despesas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viagem.viagem_despesas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma despesa registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    viagem.viagem_despesas.map((despesa) => (
                      <TableRow key={despesa.id}>
                        <TableCell>
                          <Badge variant="outline">{despesa.tipo}</Badge>
                        </TableCell>
                        <TableCell>{despesa.descricao}</TableCell>
                        <TableCell>{formatDate(despesa.data)}</TableCell>
                        <TableCell>{formatCurrency(despesa.valor)}</TableCell>
                        <TableCell>
                          <Badge>{despesa.status}</Badge>
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
