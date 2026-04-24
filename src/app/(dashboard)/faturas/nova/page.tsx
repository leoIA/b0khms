'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Plus, Trash2, Calculator } from 'lucide-react';

interface Cliente {
  id: string;
  name: string;
  cpfCnpj?: string;
  email?: string;
}

interface Projeto {
  id: string;
  name: string;
  code?: string;
}

interface Medicao {
  id: string;
  numero: number;
  valorTotal: number;
  status: string;
}

interface ItemFatura {
  descricao: string;
  quantidade: number;
  unidade: string;
  valorUnitario: number;
  valorTotal: number;
}

export default function NovaFaturaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);
  
  const [formData, setFormData] = useState({
    clienteId: '',
    projectId: '',
    medicaoId: '',
    dataEmissao: new Date().toISOString().split('T')[0],
    dataVencimento: '',
    valorDesconto: '',
    valorJuros: '',
    valorMulta: '',
    observacoes: '',
    instrucoesPagto: '',
  });

  const [itens, setItens] = useState<ItemFatura[]>([
    { descricao: '', quantidade: 1, unidade: 'un', valorUnitario: 0, valorTotal: 0 },
  ]);

  useEffect(() => {
    loadClientes();
    loadProjetos();
  }, []);

  useEffect(() => {
    if (formData.projectId) {
      loadMedicoes(formData.projectId);
    }
  }, [formData.projectId]);

  const loadClientes = async () => {
    try {
      const response = await fetch('/api/clientes');
      const data = await response.json();
      setClientes(data.data || data || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    }
  };

  const loadProjetos = async () => {
    try {
      const response = await fetch('/api/projetos');
      const data = await response.json();
      setProjetos(data.data || data || []);
    } catch (error) {
      console.error('Erro ao carregar projetos:', error);
    }
  };

  const loadMedicoes = async (projectId: string) => {
    try {
      const response = await fetch(`/api/medicoes?projectId=${projectId}&status=aprovada`);
      const data = await response.json();
      setMedicoes(data.data || data || []);
    } catch (error) {
      console.error('Erro ao carregar medições:', error);
    }
  };

  const handleItemChange = (index: number, field: keyof ItemFatura, value: any) => {
    const novosItens = [...itens];
    novosItens[index] = {
      ...novosItens[index],
      [field]: value,
    };

    // Calcular total do item
    if (field === 'quantidade' || field === 'valorUnitario') {
      novosItens[index].valorTotal =
        novosItens[index].quantidade * novosItens[index].valorUnitario;
    }

    setItens(novosItens);
  };

  const adicionarItem = () => {
    setItens([
      ...itens,
      { descricao: '', quantidade: 1, unidade: 'un', valorUnitario: 0, valorTotal: 0 },
    ]);
  };

  const removerItem = (index: number) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  const calcularTotal = () => {
    const subtotal = itens.reduce((sum, item) => sum + item.valorTotal, 0);
    const desconto = Number(formData.valorDesconto) || 0;
    const juros = Number(formData.valorJuros) || 0;
    const multa = Number(formData.valorMulta) || 0;
    return subtotal - desconto + juros + multa;
  };

  const handleImportarMedicao = async (medicaoId: string) => {
    if (!medicaoId) return;

    try {
      const response = await fetch(`/api/medicoes/${medicaoId}`);
      const medicao = await response.json();

      if (medicao.medicao_items) {
        const novosItens = medicao.medicao_items.map((item: any) => ({
          descricao: item.descricao,
          quantidade: Number(item.quantidade),
          unidade: item.unidade,
          valorUnitario: Number(item.valorUnitario),
          valorTotal: Number(item.valorTotal),
        }));
        setItens(novosItens);
      }
    } catch (error) {
      console.error('Erro ao importar medição:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/faturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          itens,
          valorOriginal: itens.reduce((sum, item) => sum + item.valorTotal, 0),
          valorTotal: calcularTotal(),
          dataEmissao: new Date(formData.dataEmissao),
          dataVencimento: new Date(formData.dataVencimento),
        }),
      });

      if (response.ok) {
        router.push('/faturas');
      }
    } catch (error) {
      console.error('Erro ao criar fatura:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/faturas')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Fatura</h1>
          <p className="text-muted-foreground">Emitir fatura para cliente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Dados da Fatura</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Cliente *</Label>
                    <Select
                      value={formData.clienteId}
                      onValueChange={(v) => setFormData({ ...formData, clienteId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.name}
                            {cliente.cpfCnpj && ` - ${cliente.cpfCnpj}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Projeto</Label>
                    <Select
                      value={formData.projectId}
                      onValueChange={(v) => setFormData({ ...formData, projectId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o projeto" />
                      </SelectTrigger>
                      <SelectContent>
                        {projetos.map((projeto) => (
                          <SelectItem key={projeto.id} value={projeto.id}>
                            {projeto.code ? `${projeto.code} - ` : ''}{projeto.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Data de Emissão *</Label>
                    <Input
                      type="date"
                      value={formData.dataEmissao}
                      onChange={(e) => setFormData({ ...formData, dataEmissao: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label>Data de Vencimento *</Label>
                    <Input
                      type="date"
                      value={formData.dataVencimento}
                      onChange={(e) => setFormData({ ...formData, dataVencimento: e.target.value })}
                      required
                    />
                  </div>

                  {formData.projectId && medicoes.length > 0 && (
                    <div className="col-span-2">
                      <Label>Importar de Medição</Label>
                      <Select
                        value={formData.medicaoId}
                        onValueChange={(v) => {
                          setFormData({ ...formData, medicaoId: v });
                          handleImportarMedicao(v);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma medição aprovada" />
                        </SelectTrigger>
                        <SelectContent>
                          {medicoes.map((medicao) => (
                            <SelectItem key={medicao.id} value={medicao.id}>
                              Medição #{medicao.numero} - {formatCurrency(medicao.valorTotal)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Itens da Fatura</h3>
                    <Button type="button" variant="outline" size="sm" onClick={adicionarItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-1/3">Descrição</TableHead>
                        <TableHead className="w-20">Qtd</TableHead>
                        <TableHead className="w-20">Un.</TableHead>
                        <TableHead className="w-32">Valor Unit.</TableHead>
                        <TableHead className="w-32">Total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itens.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              value={item.descricao}
                              onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
                              placeholder="Descrição do item"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.quantidade}
                              onChange={(e) =>
                                handleItemChange(index, 'quantidade', parseFloat(e.target.value) || 0)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.unidade}
                              onChange={(e) => handleItemChange(index, 'unidade', e.target.value)}
                              className="w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.valorUnitario}
                              onChange={(e) =>
                                handleItemChange(index, 'valorUnitario', parseFloat(e.target.value) || 0)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(item.valorTotal)}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removerItem(index)}
                              disabled={itens.length === 1}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Acréscimos e Descontos</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Desconto</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valorDesconto}
                        onChange={(e) => setFormData({ ...formData, valorDesconto: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label>Juros</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valorJuros}
                        onChange={(e) => setFormData({ ...formData, valorJuros: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label>Multa</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valorMulta}
                        onChange={(e) => setFormData({ ...formData, valorMulta: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={formData.observacoes}
                      onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Instruções de Pagamento</Label>
                    <Textarea
                      value={formData.instrucoesPagto}
                      onChange={(e) => setFormData({ ...formData, instrucoesPagto: e.target.value })}
                      rows={3}
                      placeholder="Ex: Pagamento via PIX até a data de vencimento..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => router.push('/faturas')}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Criando...' : 'Criar Fatura'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Resumo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">
                    {formatCurrency(itens.reduce((sum, item) => sum + item.valorTotal, 0))}
                  </span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span>Desconto:</span>
                  <span>-{formatCurrency(Number(formData.valorDesconto) || 0)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Juros:</span>
                  <span>+{formatCurrency(Number(formData.valorJuros) || 0)}</span>
                </div>
                <div className="flex justify-between text-orange-600">
                  <span>Multa:</span>
                  <span>+{formatCurrency(Number(formData.valorMulta) || 0)}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-semibold text-lg">Total:</span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(calcularTotal())}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-1">Total de Itens:</p>
                  <p>{itens.length} item(ns)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
