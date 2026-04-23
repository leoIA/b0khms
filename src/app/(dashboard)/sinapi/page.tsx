// =============================================================================
// ConstrutorPro - SINAPI Module
// Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil
// =============================================================================

'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Database,
  Search,
  Download,
  Import,
  ChevronDown,
  ChevronRight,
  Package,
  Users,
  Building2,
  DollarSign,
  FileSpreadsheet,
  Info,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/api';
import { toast } from 'sonner';
import type { SINAPIComposicao, SINAPIItem } from '@/lib/sinapi/data';

interface SINAPICategoria {
  id: string;
  nome: string;
}

export default function SINAPIPage() {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      redirect('/login');
    },
  });

  const [search, setSearch] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState<string>('todas');
  const [selectedComposicao, setSelectedComposicao] = useState<SINAPIComposicao | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  // Fetch SINAPI data
  const { data: sinapiData, isLoading } = useQuery({
    queryKey: ['sinapi', search, categoriaFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoriaFilter && categoriaFilter !== 'todas') params.set('categoria', categoriaFilter);

      const res = await fetch(`/api/sinapi?${params}`);
      if (!res.ok) throw new Error('Erro ao carregar dados SINAPI');
      return res.json();
    },
    enabled: !!session?.user?.companyId,
  });

  // Fetch materiais
  const { data: materiaisData } = useQuery({
    queryKey: ['sinapi-materiais'],
    queryFn: async () => {
      const res = await fetch('/api/sinapi?tipo=materiais');
      if (!res.ok) throw new Error('Erro ao carregar materiais');
      return res.json();
    },
    enabled: !!session?.user?.companyId,
  });

  // Fetch mão de obra
  const { data: maoDeObraData } = useQuery({
    queryKey: ['sinapi-mao-de-obra'],
    queryFn: async () => {
      const res = await fetch('/api/sinapi?tipo=mao-de-obra');
      if (!res.ok) throw new Error('Erro ao carregar mão de obra');
      return res.json();
    },
    enabled: !!session?.user?.companyId,
  });

  // Import composition mutation
  const importMutation = useMutation({
    mutationFn: async (composicao: SINAPIComposicao) => {
      setImportingId(composicao.codigo);
      const res = await fetch('/api/composicoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `SINAPI-${composicao.codigo}`,
          name: composicao.descricao,
          description: `${composicao.descricao} (Origem: SINAPI)`,
          unit: composicao.unidade,
          totalCost: composicao.custoTotal,
          totalPrice: composicao.precoTotal,
          profitMargin: 30,
          items: composicao.itens.map((item, index) => ({
            description: item.descricao,
            unit: item.unidade,
            quantity: item.quantidade,
            unitCost: item.precoUnitario,
            totalCost: item.custoTotal,
            itemType: item.tipo === 'mao_de_obra' ? 'labor' : item.tipo,
            order: index,
          })),
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error ?? 'Erro ao importar composição');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['composicoes'] });
      toast.success('Composição importada com sucesso!');
      setImportingId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setImportingId(null);
    },
  });

  const toggleItem = (codigo: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(codigo)) {
      newExpanded.delete(codigo);
    } else {
      newExpanded.add(codigo);
    }
    setExpandedItems(newExpanded);
  };

  const composicoes = sinapiData?.composicoes ?? [];
  const categorias = sinapiData?.categorias ?? [];
  const materiais = materiaisData?.materiais ?? [];
  const maoDeObra = maoDeObraData?.maoDeObra ?? [];

  if (status === 'loading' || isLoading) {
    return <SINAPISkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold tracking-tight">SINAPI</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm py-1 px-3">
            <FileSpreadsheet className="h-4 w-4 mr-1" />
            Base Oficial Brasil
          </Badge>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                O que é o SINAPI?
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                O SINAPI é o Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil,
                desenvolvido pela CAIXA em parceria com o IBGE. Fornece custos médios de materiais,
                mão de obra e composições de serviços utilizados como referência em orçamentos
                públicos e privados em todo o Brasil.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Package className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Composições</p>
                <p className="text-2xl font-bold">{composicoes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Building2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Materiais</p>
                <p className="text-2xl font-bold">{materiais.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mão de Obra</p>
                <p className="text-2xl font-bold">{maoDeObra.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <DollarSign className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categorias</p>
                <p className="text-2xl font-bold">{categorias.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="composicoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="composicoes">
            <Package className="h-4 w-4 mr-2" />
            Composições
          </TabsTrigger>
          <TabsTrigger value="materiais">
            <Building2 className="h-4 w-4 mr-2" />
            Materiais
          </TabsTrigger>
          <TabsTrigger value="mao-de-obra">
            <Users className="h-4 w-4 mr-2" />
            Mão de Obra
          </TabsTrigger>
        </TabsList>

        {/* Composições Tab */}
        <TabsContent value="composicoes" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar composições por código ou descrição..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Filtrar por categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as Categorias</SelectItem>
                    {categorias.map((cat: SINAPICategoria) => (
                      <SelectItem key={cat.id} value={cat.nome}>
                        {cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Composições List */}
          <Card>
            <CardHeader>
              <CardTitle>Composições SINAPI</CardTitle>
              <CardDescription>
                Selecione uma composição para visualizar detalhes e importar para o seu orçamento
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {composicoes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma composição encontrada</p>
                </div>
              ) : (
                <div className="divide-y">
                  {composicoes.map((composicao: SINAPIComposicao) => (
                    <Collapsible
                      key={composicao.codigo}
                      open={expandedItems.has(composicao.codigo)}
                      onOpenChange={() => toggleItem(composicao.codigo)}
                    >
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-4 hover:bg-muted/50">
                          <div className="flex items-center gap-4">
                            {expandedItems.has(composicao.codigo) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono">
                                  {composicao.codigo}
                                </Badge>
                                <Badge variant="secondary">{composicao.categoria}</Badge>
                              </div>
                              <p className="font-medium mt-1">{composicao.descricao}</p>
                              <p className="text-sm text-muted-foreground">
                                Unidade: {composicao.unidade}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              {formatCurrency(composicao.precoTotal)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Custo: {formatCurrency(composicao.custoTotal)}
                            </p>
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="px-4 pb-4 bg-muted/30">
                          {/* Items Table */}
                          <div className="mt-2 rounded-md border">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Código</TableHead>
                                  <TableHead>Descrição</TableHead>
                                  <TableHead>Tipo</TableHead>
                                  <TableHead className="text-right">Qtd</TableHead>
                                  <TableHead className="text-right">Unit.</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {composicao.itens.map((item: SINAPIItem) => (
                                  <TableRow key={item.codigo}>
                                    <TableCell className="font-mono text-xs">
                                      {item.codigo}
                                    </TableCell>
                                    <TableCell>{item.descricao}</TableCell>
                                    <TableCell>
                                      <Badge
                                        variant="outline"
                                        className={
                                          item.tipo === 'material'
                                            ? 'bg-blue-50 text-blue-700'
                                            : item.tipo === 'mao_de_obra'
                                            ? 'bg-purple-50 text-purple-700'
                                            : 'bg-gray-50 text-gray-700'
                                        }
                                      >
                                        {item.tipo === 'mao_de_obra' ? 'Mão de Obra' : item.tipo}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {item.quantidade} {item.unidade}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(item.precoUnitario)}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                      {formatCurrency(item.custoTotal)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Import Button */}
                          <div className="mt-4 flex justify-end">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                importMutation.mutate(composicao);
                              }}
                              disabled={importingId === composicao.codigo}
                            >
                              {importingId === composicao.codigo ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Import className="h-4 w-4 mr-2" />
                              )}
                              Importar para Minhas Composições
                            </Button>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materiais Tab */}
        <TabsContent value="materiais">
          <Card>
            <CardHeader>
              <CardTitle>Materiais Básicos SINAPI</CardTitle>
              <CardDescription>
                Preços de referência de materiais de construção
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Preço Unitário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materiais.map((mat: { codigo: string; descricao: string; unidade: string; preco: number }) => (
                    <TableRow key={mat.codigo}>
                      <TableCell className="font-mono">{mat.codigo}</TableCell>
                      <TableCell>{mat.descricao}</TableCell>
                      <TableCell>{mat.unidade}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(mat.preco)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Mão de Obra Tab */}
        <TabsContent value="mao-de-obra">
          <Card>
            <CardHeader>
              <CardTitle>Mão de Obra SINAPI</CardTitle>
              <CardDescription>
                Salários e encargos de mão de obra por hora
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead className="text-right">Valor/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {maoDeObra.map((mod: { codigo: string; descricao: string; unidade: string; preco: number }) => (
                    <TableRow key={mod.codigo}>
                      <TableCell className="font-mono">{mod.codigo}</TableCell>
                      <TableCell>{mod.descricao}</TableCell>
                      <TableCell>{mod.unidade}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(mod.preco)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SINAPISkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
