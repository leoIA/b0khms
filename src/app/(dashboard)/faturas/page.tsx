'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Search, Eye, FileText, Calendar, DollarSign, Users } from 'lucide-react';

interface Fatura {
  id: string;
  numero: string;
  dataEmissao: Date;
  dataVencimento: Date;
  valorTotal: number;
  valorPago: number;
  status: string;
  clients: { name: string; email?: string; cpfCnpj?: string };
  _count?: { fatura_pagamentos: number };
}

export default function FaturasPage() {
  const router = useRouter();
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadFaturas();
  }, [search, statusFilter]);

  const loadFaturas = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await fetch(`/api/faturas?${params}`);
      const data = await response.json();
      setFaturas(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
    } finally {
      setLoading(false);
    }
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const isVencida = (dataVencimento: Date, status: string) => {
    if (status !== 'pendente' && status !== 'parcial') return false;
    return new Date(dataVencimento) < new Date();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faturamento</h1>
          <p className="text-muted-foreground">Gestão de faturas e recebimentos</p>
        </div>
        <Button onClick={() => router.push('/faturas/nova')}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Fatura
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">A Receber</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(
                    faturas
                      .filter((f) => f.status === 'pendente' || f.status === 'parcial')
                      .reduce((sum, f) => sum + (f.valorTotal - f.valorPago), 0)
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recebido (Mês)</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    faturas.filter((f) => f.status === 'paga').reduce((sum, f) => sum + f.valorTotal, 0)
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vencidas</p>
                <p className="text-2xl font-bold text-red-600">
                  {faturas.filter((f) => isVencida(f.dataVencimento, f.status)).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Faturas</p>
                <p className="text-2xl font-bold">{faturas.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar faturas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="paga">Paga</SelectItem>
            <SelectItem value="vencida">Vencida</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Valor Pago</TableHead>
                <TableHead>Pagamentos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : faturas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhuma fatura encontrada
                  </TableCell>
                </TableRow>
              ) : (
                faturas.map((fatura) => (
                  <TableRow key={fatura.id}>
                    <TableCell className="font-mono">{fatura.numero}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{fatura.clients?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {fatura.clients?.cpfCnpj}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(fatura.dataEmissao)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          isVencida(fatura.dataVencimento, fatura.status) ? 'text-red-600 font-medium' : ''
                        }
                      >
                        {formatDate(fatura.dataVencimento)}
                      </span>
                    </TableCell>
                    <TableCell>{formatCurrency(fatura.valorTotal)}</TableCell>
                    <TableCell>{formatCurrency(fatura.valorPago)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{fatura._count?.fatura_pagamentos || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(fatura.status)}>{fatura.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/faturas/${fatura.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
