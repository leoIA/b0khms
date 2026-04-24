// =============================================================================
// ConstrutorPro - SINAPI Import Component
// Interface para importação de base SINAPI oficial
// =============================================================================

'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Upload,
  Database,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Download,
  FileSpreadsheet,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface SinapiImport {
  id: string;
  mesReferencia: number;
  anoReferencia: number;
  fonte: string;
  arquivoNome: string | null;
  status: string;
  totalComposicoes: number;
  totalInsumos: number;
  erroMensagem: string | null;
  createdAt: string;
  processedAt: string | null;
  users: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    sinapi_composicoes: number;
    sinapi_insumos: number;
  };
}

const meses = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const anos = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - i);

export function SINAPIImportTab() {
  const [mesReferencia, setMesReferencia] = useState<string>('');
  const [anoReferencia, setAnoReferencia] = useState<string>('');
  const [isImporting, setIsImporting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Buscar importações existentes
  const { data: importsData, isLoading } = useQuery({
    queryKey: ['sinapi-imports'],
    queryFn: async () => {
      const res = await fetch('/api/sinapi/import');
      if (!res.ok) throw new Error('Erro ao carregar importações');
      return res.json();
    },
  });

  // Mutação para importar dados SINAPI de exemplo
  const importMutation = useMutation({
    mutationFn: async () => {
      setIsImporting(true);

      // Buscar dados SINAPI de exemplo
      const sinapiRes = await fetch('/api/sinapi');
      if (!sinapiRes.ok) throw new Error('Erro ao buscar dados SINAPI');
      const sinapiData = await sinapiRes.json();

      // Preparar dados para importação
      const composicoes = sinapiData.composicoes?.map((comp: any) => ({
        codigo: comp.codigo,
        descricao: comp.descricao,
        unidade: comp.unidade,
        categoria: comp.categoria,
        custoUnitario: comp.custoTotal,
      })) || [];

      const insumos: any[] = [];
      const insumosSet = new Set<string>();

      // Extrair insumos únicos das composições
      sinapiData.composicoes?.forEach((comp: any) => {
        comp.itens?.forEach((item: any) => {
          if (!insumosSet.has(item.codigo)) {
            insumosSet.add(item.codigo);
            insumos.push({
              codigo: item.codigo,
              descricao: item.descricao,
              unidade: item.unidade,
              tipo: item.tipo,
              precoUnitario: item.precoUnitario,
            });
          }
        });
      });

      // Enviar para importação
      const res = await fetch('/api/sinapi/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mesReferencia: parseInt(mesReferencia),
          anoReferencia: parseInt(anoReferencia),
          fonte: 'CAIXA',
          composicoes,
          insumos,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro na importação');
      }

      return res.json();
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Importação concluída com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['sinapi-imports'] });
      setMesReferencia('');
      setAnoReferencia('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setIsImporting(false);
    },
  });

  // Mutação para deletar importação
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sinapi/import?id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Erro ao remover importação');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Importação removida com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['sinapi-imports'] });
      setDeleteId(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleImport = () => {
    if (!mesReferencia || !anoReferencia) {
      toast.error('Selecione o mês e ano de referência');
      return;
    }

    importMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluido':
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Concluído
          </Badge>
        );
      case 'processando':
        return (
          <Badge variant="secondary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Processando
          </Badge>
        );
      case 'erro':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const imports = importsData?.imports || [];

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Importação SINAPI</AlertTitle>
        <AlertDescription>
          Importe a base oficial SINAPI da CAIXA para ter acesso a mais de 3.000
          composições de preços atualizados. Você pode fazer múltiplas importações
          para diferentes meses/anos de referência.
        </AlertDescription>
      </Alert>

      {/* Formulário de Importação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Nova Importação
          </CardTitle>
          <CardDescription>
            Selecione o período de referência e inicie a importação da base SINAPI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="mes">Mês de Referência</Label>
              <Select value={mesReferencia} onValueChange={setMesReferencia}>
                <SelectTrigger id="mes">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value.toString()}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ano">Ano de Referência</Label>
              <Select value={anoReferencia} onValueChange={setAnoReferencia}>
                <SelectTrigger id="ano">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((ano) => (
                    <SelectItem key={ano} value={ano.toString()}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleImport}
                disabled={isImporting || !mesReferencia || !anoReferencia}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Importar Base SINAPI
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Esta ação irá importar as composições SINAPI
              disponíveis no sistema para o período selecionado. Se já existir uma
              importação para este período, ela será rejeitada.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Importações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importações Realizadas
          </CardTitle>
          <CardDescription>
            Histórico de todas as importações SINAPI realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : imports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma importação realizada ainda</p>
              <p className="text-sm mt-2">
                Importe a base SINAPI para ter acesso às composições
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Composições</TableHead>
                  <TableHead className="text-right">Insumos</TableHead>
                  <TableHead>Importado por</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp: SinapiImport) => (
                  <TableRow key={imp.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {String(imp.mesReferencia).padStart(2, '0')}/{imp.anoReferencia}
                      </div>
                    </TableCell>
                    <TableCell>{imp.fonte}</TableCell>
                    <TableCell>{getStatusBadge(imp.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {imp._count?.sinapi_composicoes || imp.totalComposicoes}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {imp._count?.sinapi_insumos || imp.totalInsumos}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{imp.users?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {imp.users?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(imp.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(imp.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Confirmar Exclusão</DialogTitle>
                            <DialogDescription>
                              Tem certeza que deseja excluir esta importação? Esta ação
                              não pode ser desfeita e removerá todas as composições e
                              insumos importados.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline">Cancelar</Button>
                            <Button
                              variant="destructive"
                              onClick={() => deleteMutation.mutate(imp.id)}
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 mr-2" />
                              )}
                              Excluir
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
