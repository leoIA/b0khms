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
import { 
  Plus, Search, Edit, Eye, Building2, Package, 
  ClipboardList, TrendingDown, AlertTriangle, 
  Wrench, FileText 
} from 'lucide-react';

interface Patrimonio {
  id: string;
  numeroPatrimonio: string;
  nome: string;
  descricao?: string;
  marca?: string;
  modelo?: string;
  valorAquisicao: number;
  valorAtual: number;
  status: string;
  estadoConservacao: string;
  dataAquisicao: Date;
  vencimentoSeguro?: Date;
  proximaManutencao?: Date;
  categoria?: { nome: string };
  local?: { nome: string };
}

interface Relatorio {
  totalAtivos: number;
  valorTotalAquisicao: number;
  valorTotalAtual: number;
  depreciacaoTotal: number;
  porStatus: { status: string; quantidade: number; valorTotal: number }[];
  segurosVencendo: { id: string; nome: string; numeroPatrimonio: string; }[];
  manutencoesProximas: { id: string; nome: string; numeroPatrimonio: string; }[];
}

export default function PatrimonioPage() {
  const router = useRouter();
  const [patrimonios, setPatrimonios] = useState<Patrimonio[]>([]);
  const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const loadData = async () => {
    try {
      const [patRes, relRes] = await Promise.all([
        fetch(`/api/patrimonio?search=${search}&status=${statusFilter}`),
        fetch('/api/patrimonio/relatorio'),
      ]);

      const patData = await patRes.json();
      const relData = await relRes.json();

      setPatrimonios(patData.data || []);
      setRelatorio(relData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ativo: 'bg-green-100 text-green-800',
      manutencao: 'bg-yellow-100 text-yellow-800',
      baixado: 'bg-red-100 text-red-800',
      doado: 'bg-blue-100 text-blue-800',
      vendido: 'bg-purple-100 text-purple-800',
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patrimônio</h1>
          <p className="text-muted-foreground">
            Gestão de móveis, equipamentos e ativos da empresa
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/patrimonio/inventario')}>
            <ClipboardList className="mr-2 h-4 w-4" />
            Inventário
          </Button>
          <Button onClick={() => router.push('/patrimonio/novo')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Patrimônio
          </Button>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total de Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{relatorio?.totalAtivos || 0}</div>
            <p className="text-sm text-muted-foreground">itens cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Valor de Aquisição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(relatorio?.valorTotalAquisicao || 0)}
            </div>
            <p className="text-sm text-muted-foreground">custo original</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Valor Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(relatorio?.valorTotalAtual || 0)}
            </div>
            <p className="text-sm text-muted-foreground">
              Depreciação: {formatCurrency(relatorio?.depreciacaoTotal || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {(relatorio?.segurosVencendo?.length || 0) + (relatorio?.manutencoesProximas?.length || 0)}
            </div>
            <p className="text-sm text-muted-foreground">seguros/manutenções próximas</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {((relatorio?.segurosVencendo?.length ?? 0) > 0 || (relatorio?.manutencoesProximas?.length ?? 0) > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {relatorio?.segurosVencendo && relatorio.segurosVencendo.length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-orange-800">
                  <AlertTriangle className="h-4 w-4" />
                  Seguros Vencendo (30 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relatorio.segurosVencendo.slice(0, 3).map((s) => (
                    <div key={s.id} className="flex justify-between items-center text-sm">
                      <span className="font-mono">{s.numeroPatrimonio}</span>
                      <span className="text-orange-700">{s.nome}</span>
                    </div>
                  ))}
                  {relatorio.segurosVencendo.length > 3 && (
                    <p className="text-sm text-orange-600">
                      +{relatorio.segurosVencendo.length - 3} outros
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {relatorio?.manutencoesProximas && relatorio.manutencoesProximas.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-800">
                  <Wrench className="h-4 w-4" />
                  Manutenções Próximas (30 dias)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {relatorio.manutencoesProximas.slice(0, 3).map((m) => (
                    <div key={m.id} className="flex justify-between items-center text-sm">
                      <span className="font-mono">{m.numeroPatrimonio}</span>
                      <span className="text-blue-700">{m.nome}</span>
                    </div>
                  ))}
                  {relatorio.manutencoesProximas.length > 3 && (
                    <p className="text-sm text-blue-600">
                      +{relatorio.manutencoesProximas.length - 3} outros
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar patrimônio..."
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
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="manutencao">Em Manutenção</SelectItem>
            <SelectItem value="baixado">Baixado</SelectItem>
            <SelectItem value="doado">Doado</SelectItem>
            <SelectItem value="vendido">Vendido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela de Patrimônios */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Patrimônio</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Valor Atual</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : patrimonios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum patrimônio encontrado
                  </TableCell>
                </TableRow>
              ) : (
                patrimonios.map((patrimonio) => (
                  <TableRow key={patrimonio.id}>
                    <TableCell className="font-mono">
                      {patrimonio.numeroPatrimonio}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{patrimonio.nome}</div>
                        {patrimonio.marca && patrimonio.modelo && (
                          <div className="text-sm text-muted-foreground">
                            {patrimonio.marca} - {patrimonio.modelo}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{patrimonio.categoria?.nome || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {patrimonio.local?.nome || '-'}
                      </div>
                    </TableCell>
                    <TableCell>{formatCurrency(patrimonio.valorAtual)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{patrimonio.estadoConservacao}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(patrimonio.status)}>
                        {patrimonio.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/patrimonio/${patrimonio.id}`)}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/patrimonio/${patrimonio.id}/editar`)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
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
