'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CheckCircle, XCircle, QrCode, Search } from 'lucide-react';
import { toast } from 'sonner';

interface InventarioItem {
  id: string;
  patrimonioId: string;
  encontrado: boolean;
  estadoConservacao?: string;
  localVerificacao?: string;
  observacoes?: string;
  dataVerificacao?: string;
  responsavelVerificacao?: string;
  patrimonios: {
    id: string;
    numeroPatrimonio: string;
    nome: string;
    marca?: string;
    modelo?: string;
    estadoConservacao: string;
    categoria?: { nome: string };
    local?: { nome: string };
  };
}

interface Inventario {
  id: string;
  nome: string;
  descricao?: string;
  dataInicio: string;
  dataFim?: string;
  status: string;
  estatisticas: {
    totalItens: number;
    itensEncontrados: number;
    itensNaoEncontrados: number;
    percentualConcluido: number;
  };
}

export default function InventarioDetalhesPage() {
  const router = useRouter();
  const params = useParams();
  const [inventario, setInventario] = useState<Inventario | null>(null);
  const [itens, setItens] = useState<InventarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventarioItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    encontrado: true,
    estadoConservacao: '',
    localVerificacao: '',
    observacoes: '',
  });

  useEffect(() => {
    loadData();
  }, [params.id]);

  const loadData = async () => {
    try {
      const [invRes, itensRes] = await Promise.all([
        fetch(`/api/patrimonio/inventario/${params.id}`),
        fetch(`/api/patrimonio/inventario/${params.id}/itens`),
      ]);

      const invData = await invRes.json();
      const itensData = await itensRes.json();

      setInventario(invData);
      setItens(itensData.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar inventário');
    } finally {
      setLoading(false);
    }
  };

  const openVerificacaoDialog = (item: InventarioItem) => {
    setSelectedItem(item);
    setFormData({
      encontrado: true,
      estadoConservacao: item.patrimonios.estadoConservacao || 'bom',
      localVerificacao: item.patrimonios.local?.nome || '',
      observacoes: '',
    });
    setDialogOpen(true);
  };

  const handleVerificar = async () => {
    if (!selectedItem) return;
    setSaving(true);

    try {
      const response = await fetch(`/api/patrimonio/inventario/${params.id}/itens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patrimonioId: selectedItem.patrimonioId,
          ...formData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao verificar item');
      }

      toast.success(formData.encontrado ? 'Item verificado!' : 'Item marcado como não encontrado');
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao verificar item');
    } finally {
      setSaving(false);
    }
  };

  const filteredItens = itens.filter(item => {
    const matchSearch = 
      item.patrimonios.numeroPatrimonio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.patrimonios.nome.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filtro === 'verificados') return matchSearch && item.encontrado;
    if (filtro === 'pendentes') return matchSearch && !item.encontrado;
    return matchSearch;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return <div className="flex justify-center py-8">Carregando...</div>;
  }

  if (!inventario) {
    return <div className="text-center py-8">Inventário não encontrado</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/patrimonio/inventario')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{inventario.nome}</h1>
            <p className="text-muted-foreground">
              Iniciado em {formatDate(inventario.dataInicio)}
            </p>
          </div>
        </div>
        <Badge className={
          inventario.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' :
          inventario.status === 'concluido' ? 'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
        }>
          {inventario.status === 'em_andamento' ? 'Em Andamento' : 
           inventario.status === 'concluido' ? 'Concluído' : 'Cancelado'}
        </Badge>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Itens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventario.estatisticas.totalItens}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Verificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {inventario.estatisticas.itensEncontrados}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Não Encontrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {inventario.estatisticas.itensNaoEncontrados}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Progresso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(inventario.estatisticas.percentualConcluido)}%</div>
            <Progress value={inventario.estatisticas.percentualConcluido} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            variant={filtro === 'todos' ? 'default' : 'outline'}
            onClick={() => setFiltro('todos')}
          >
            Todos
          </Button>
          <Button 
            variant={filtro === 'pendentes' ? 'default' : 'outline'}
            onClick={() => setFiltro('pendentes')}
          >
            Pendentes
          </Button>
          <Button 
            variant={filtro === 'verificados' ? 'default' : 'outline'}
            onClick={() => setFiltro('verificados')}
          >
            Verificados
          </Button>
        </div>
      </div>

      {/* Lista de Itens */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Patrimônio</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum item encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredItens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">
                      {item.patrimonios.numeroPatrimonio}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.patrimonios.nome}</div>
                        {item.patrimonios.marca && item.patrimonios.modelo && (
                          <div className="text-sm text-muted-foreground">
                            {item.patrimonios.marca} - {item.patrimonios.modelo}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.patrimonios.categoria?.nome || '-'}</TableCell>
                    <TableCell>{item.patrimonios.local?.nome || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.patrimonios.estadoConservacao}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.encontrado ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verificado
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {inventario.status === 'em_andamento' && !item.encontrado && (
                        <Button
                          size="sm"
                          onClick={() => openVerificacaoDialog(item)}
                        >
                          Verificar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de Verificação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verificar Patrimônio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-mono text-lg">{selectedItem?.patrimonios.numeroPatrimonio}</p>
              <p className="font-medium">{selectedItem?.patrimonios.nome}</p>
              {selectedItem?.patrimonios.marca && (
                <p className="text-sm text-muted-foreground">
                  {selectedItem.patrimonios.marca} - {selectedItem.patrimonios.modelo}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Status do Item</Label>
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant={formData.encontrado ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => setFormData(prev => ({ ...prev, encontrado: true }))}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Encontrado
                </Button>
                <Button
                  type="button"
                  variant={!formData.encontrado ? 'destructive' : 'outline'}
                  className="flex-1"
                  onClick={() => setFormData(prev => ({ ...prev, encontrado: false }))}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Não Encontrado
                </Button>
              </div>
            </div>

            {formData.encontrado && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="estadoConservacao">Estado de Conservação</Label>
                  <Select 
                    value={formData.estadoConservacao} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, estadoConservacao: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="bom">Bom</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="ruim">Ruim</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="localVerificacao">Local da Verificação</Label>
                  <Input
                    id="localVerificacao"
                    value={formData.localVerificacao}
                    onChange={(e) => setFormData(prev => ({ ...prev, localVerificacao: e.target.value }))}
                    placeholder="Onde o item foi encontrado"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Observações sobre a verificação"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleVerificar} disabled={saving}>
                {saving ? 'Salvando...' : 'Confirmar Verificação'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
