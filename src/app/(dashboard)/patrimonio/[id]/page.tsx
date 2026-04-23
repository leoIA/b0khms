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
import { ArrowLeft, Edit, Wrench, ArrowRightLeft, TrendingDown, Calendar } from 'lucide-react';

interface Patrimonio {
  id: string;
  numeroPatrimonio: string;
  nome: string;
  descricao?: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  valorAquisicao: number;
  valorAtual: number;
  valorResidual: number;
  depreciacaoAcumulada: number;
  dataAquisicao: Date;
  dataInicioUso?: Date;
  vidaUtilMeses: number;
  status: string;
  estadoConservacao: string;
  notaFiscal?: string;
  fornecedor?: string;
  seguradora?: string;
  numeroApolice?: string;
  vencimentoSeguro?: Date;
  ultimaManutencao?: Date;
  proximaManutencao?: Date;
  observacoes?: string;
  categoria?: { nome: string };
  local?: { nome: string };
  patrimonio_manutencoes: any[];
  patrimonio_movimentacoes: any[];
  patrimonio_depreciacoes: any[];
}

export default function PatrimonioDetalhesPage() {
  const router = useRouter();
  const params = useParams();
  const [patrimonio, setPatrimonio] = useState<Patrimonio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatrimonio();
  }, [params.id]);

  const loadPatrimonio = async () => {
    try {
      const response = await fetch(`/api/patrimonio/${params.id}`);
      const data = await response.json();
      setPatrimonio(data);
    } catch (error) {
      console.error('Erro ao carregar patrimônio:', error);
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

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ativo: 'bg-green-100 text-green-800',
      manutencao: 'bg-yellow-100 text-yellow-800',
      baixado: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="flex justify-center py-8">Carregando...</div>;
  }

  if (!patrimonio) {
    return <div className="text-center py-8">Patrimônio não encontrado</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/patrimonio')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{patrimonio.nome}</h1>
            <p className="text-muted-foreground font-mono">{patrimonio.numeroPatrimonio}</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/patrimonio/${params.id}/editar`)}>
          <Edit className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor de Aquisição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(patrimonio.valorAquisicao)}</div>
            <p className="text-sm text-muted-foreground">{formatDate(patrimonio.dataAquisicao)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(patrimonio.valorAtual)}</div>
            <p className="text-sm text-muted-foreground">
              Depreciação: {formatCurrency(patrimonio.depreciacaoAcumulada)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getStatusColor(patrimonio.status)}>{patrimonio.status}</Badge>
            <p className="text-sm text-muted-foreground mt-2">
              Estado: {patrimonio.estadoConservacao}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Informações</TabsTrigger>
          <TabsTrigger value="manutencoes">
            <Wrench className="h-4 w-4 mr-2" />
            Manutenções
          </TabsTrigger>
          <TabsTrigger value="movimentacoes">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Movimentações
          </TabsTrigger>
          <TabsTrigger value="depreciacoes">
            <TrendingDown className="h-4 w-4 mr-2" />
            Depreciações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Dados do Bem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Marca</p>
                    <p className="font-medium">{patrimonio.marca || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Modelo</p>
                    <p className="font-medium">{patrimonio.modelo || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Nº Série</p>
                    <p className="font-medium">{patrimonio.numeroSerie || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vida Útil</p>
                    <p className="font-medium">{patrimonio.vidaUtilMeses} meses</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Localização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Categoria</p>
                    <p className="font-medium">{patrimonio.categoria?.nome || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Local</p>
                    <p className="font-medium">{patrimonio.local?.nome || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Nota Fiscal</p>
                    <p className="font-medium">{patrimonio.notaFiscal || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Fornecedor</p>
                    <p className="font-medium">{patrimonio.fornecedor || '-'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Seguro</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Seguradora</p>
                    <p className="font-medium">{patrimonio.seguradora || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Apólice</p>
                    <p className="font-medium">{patrimonio.numeroApolice || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vencimento</p>
                    <p className="font-medium">{formatDate(patrimonio.vencimentoSeguro)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manutencoes" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patrimonio.patrimonio_manutencoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma manutenção registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    patrimonio.patrimonio_manutencoes.map((manutencao) => (
                      <TableRow key={manutencao.id}>
                        <TableCell>{formatDate(manutencao.dataManutencao)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{manutencao.tipo}</Badge>
                        </TableCell>
                        <TableCell>{manutencao.descricao}</TableCell>
                        <TableCell>{formatCurrency(manutencao.valor)}</TableCell>
                        <TableCell>
                          <Badge>{manutencao.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimentacoes" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Responsável</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patrimonio.patrimonio_movimentacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhuma movimentação registrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    patrimonio.patrimonio_movimentacoes.map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell>{formatDate(mov.dataMovimentacao)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{mov.tipo}</Badge>
                        </TableCell>
                        <TableCell>{mov.motivo || '-'}</TableCell>
                        <TableCell>{mov.responsavel || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="depreciacoes" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competência</TableHead>
                    <TableHead>Depreciação</TableHead>
                    <TableHead>Acumulado</TableHead>
                    <TableHead>Valor Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patrimonio.patrimonio_depreciacoes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        Nenhuma depreciação calculada
                      </TableCell>
                    </TableRow>
                  ) : (
                    patrimonio.patrimonio_depreciacoes.map((dep) => (
                      <TableRow key={dep.id}>
                        <TableCell>{formatDate(dep.competencia)}</TableCell>
                        <TableCell>{formatCurrency(dep.valorDepreciacao)}</TableCell>
                        <TableCell>{formatCurrency(dep.valorAcumulado)}</TableCell>
                        <TableCell>{formatCurrency(dep.valorLiquido)}</TableCell>
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
