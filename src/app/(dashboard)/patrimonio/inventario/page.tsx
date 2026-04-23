'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ClipboardList, Eye, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Inventario {
  id: string;
  nome: string;
  descricao?: string;
  dataInicio: string;
  dataFim?: string;
  status: string;
  totalItens: number;
  itensVerificados: number;
  createdAt: string;
}

export default function InventarioPage() {
  const router = useRouter();
  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    observacoes: '',
  });

  useEffect(() => {
    loadInventarios();
  }, []);

  const loadInventarios = async () => {
    try {
      const response = await fetch('/api/patrimonio/inventario');
      const data = await response.json();
      setInventarios(data.data || []);
    } catch (error) {
      console.error('Erro ao carregar inventários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInventario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/patrimonio/inventario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar inventário');
      }

      toast.success('Inventário criado com sucesso!');
      setDialogOpen(false);
      setFormData({ nome: '', descricao: '', observacoes: '' });
      loadInventarios();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar inventário');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizarInventario = async (id: string) => {
    if (!confirm('Tem certeza que deseja finalizar este inventário?')) return;

    try {
      const response = await fetch(`/api/patrimonio/inventario/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'concluido' }),
      });

      if (!response.ok) throw new Error('Erro ao finalizar inventário');

      toast.success('Inventário finalizado com sucesso!');
      loadInventarios();
    } catch (error) {
      toast.error('Erro ao finalizar inventário');
    }
  };

  const handleExcluirInventario = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este inventário?')) return;

    try {
      const response = await fetch(`/api/patrimonio/inventario/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao excluir inventário');

      toast.success('Inventário excluído com sucesso!');
      loadInventarios();
    } catch (error) {
      toast.error('Erro ao excluir inventário');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      em_andamento: 'bg-blue-100 text-blue-800',
      concluido: 'bg-green-100 text-green-800',
      cancelado: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventário de Patrimônio</h1>
          <p className="text-muted-foreground">
            Gestão de inventário e verificação de ativos
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Inventário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Inventário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateInventario} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Inventário *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Inventário Anual 2024"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição do inventário"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Observações adicionais"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Criando...' : 'Criar Inventário'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Inventários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventarios.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {inventarios.filter(i => i.status === 'em_andamento').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Concluídos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {inventarios.filter(i => i.status === 'concluido').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Itens Verificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {inventarios.reduce((acc, i) => acc + i.itensVerificados, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Inventários */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Data Início</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : inventarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum inventário criado
                  </TableCell>
                </TableRow>
              ) : (
                inventarios.map((inventario) => (
                  <TableRow key={inventario.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{inventario.nome}</div>
                          {inventario.descricao && (
                            <div className="text-sm text-muted-foreground">
                              {inventario.descricao}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(inventario.dataInicio)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{inventario.itensVerificados}/{inventario.totalItens}</span>
                          <span>
                            {inventario.totalItens > 0 
                              ? Math.round((inventario.itensVerificados / inventario.totalItens) * 100)
                              : 0}%
                          </span>
                        </div>
                        <Progress 
                          value={inventario.totalItens > 0 
                            ? (inventario.itensVerificados / inventario.totalItens) * 100
                            : 0
                          } 
                          className="h-2"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(inventario.status)}>
                        {inventario.status === 'em_andamento' ? 'Em Andamento' : 
                         inventario.status === 'concluido' ? 'Concluído' : 'Cancelado'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/patrimonio/inventario/${inventario.id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {inventario.status === 'em_andamento' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFinalizarInventario(inventario.id)}
                              title="Finalizar"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExcluirInventario(inventario.id)}
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
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
