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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Clock, Users, Calendar, Check, X } from 'lucide-react';

interface Escala {
  id: string;
  nome: string;
  codigo?: string;
  horaEntrada: string;
  horaSaida: string;
  horasDiarias: number;
  permiteBancoHoras: boolean;
  ativo: boolean;
  _count?: { usuario_escalas: number };
}

export default function EscalasPage() {
  const router = useRouter();
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    codigo: '',
    descricao: '',
    horaEntrada: '08:00',
    horaSaida: '17:00',
    intervaloInicio: '12:00',
    intervaloFim: '13:00',
    horasDiarias: 8,
    horasSemanais: 40,
    toleranciaEntrada: 10,
    toleranciaSaida: 10,
    permiteBancoHoras: true,
  });

  useEffect(() => {
    loadEscalas();
  }, []);

  const loadEscalas = async () => {
    try {
      const response = await fetch('/api/escalas');
      const data = await response.json();
      setEscalas(data || []);
    } catch (error) {
      console.error('Erro ao carregar escalas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const response = await fetch('/api/escalas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        loadEscalas();
        setDialogOpen(false);
        setFormData({
          nome: '',
          codigo: '',
          descricao: '',
          horaEntrada: '08:00',
          horaSaida: '17:00',
          intervaloInicio: '12:00',
          intervaloFim: '13:00',
          horasDiarias: 8,
          horasSemanais: 40,
          toleranciaEntrada: 10,
          toleranciaSaida: 10,
          permiteBancoHoras: true,
        });
      }
    } catch (error) {
      console.error('Erro ao criar escala:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Escalas de Trabalho</h1>
          <p className="text-muted-foreground">Configuração de escalas e jornadas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Escala
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Escala de Trabalho</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Escala Padrão"
                  />
                </div>
                <div>
                  <Label>Código</Label>
                  <Input
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="ESC001"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hora Entrada</Label>
                  <Input
                    type="time"
                    value={formData.horaEntrada}
                    onChange={(e) => setFormData({ ...formData, horaEntrada: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Hora Saída</Label>
                  <Input
                    type="time"
                    value={formData.horaSaida}
                    onChange={(e) => setFormData({ ...formData, horaSaida: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Início Intervalo</Label>
                  <Input
                    type="time"
                    value={formData.intervaloInicio}
                    onChange={(e) => setFormData({ ...formData, intervaloInicio: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Fim Intervalo</Label>
                  <Input
                    type="time"
                    value={formData.intervaloFim}
                    onChange={(e) => setFormData({ ...formData, intervaloFim: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Horas Diárias</Label>
                  <Input
                    type="number"
                    value={formData.horasDiarias}
                    onChange={(e) =>
                      setFormData({ ...formData, horasDiarias: parseFloat(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Horas Semanais</Label>
                  <Input
                    type="number"
                    value={formData.horasSemanais}
                    onChange={(e) =>
                      setFormData({ ...formData, horasSemanais: parseFloat(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tolerância Entrada (min)</Label>
                  <Input
                    type="number"
                    value={formData.toleranciaEntrada}
                    onChange={(e) =>
                      setFormData({ ...formData, toleranciaEntrada: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label>Tolerância Saída (min)</Label>
                  <Input
                    type="number"
                    value={formData.toleranciaSaida}
                    onChange={(e) =>
                      setFormData({ ...formData, toleranciaSaida: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate}>Criar Escala</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Escalas</p>
                <p className="text-2xl font-bold">{escalas.length}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativas</p>
                <p className="text-2xl font-bold text-green-600">
                  {escalas.filter((e) => e.ativo).length}
                </p>
              </div>
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Colaboradores</p>
                <p className="text-2xl font-bold">
                  {escalas.reduce((sum, e) => sum + (e._count?.usuario_escalas || 0), 0)}
                </p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Com Banco de Horas</p>
                <p className="text-2xl font-bold text-orange-600">
                  {escalas.filter((e) => e.permiteBancoHoras).length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Horas/Dia</TableHead>
                <TableHead>Banco Horas</TableHead>
                <TableHead>Colaboradores</TableHead>
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
              ) : escalas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma escala cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                escalas.map((escala) => (
                  <TableRow key={escala.id}>
                    <TableCell className="font-medium">{escala.nome}</TableCell>
                    <TableCell className="font-mono">{escala.codigo || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {escala.horaEntrada} - {escala.horaSaida}
                      </div>
                    </TableCell>
                    <TableCell>{escala.horasDiarias}h</TableCell>
                    <TableCell>
                      {escala.permiteBancoHoras ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Sim
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          Não
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{escala._count?.usuario_escalas || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={escala.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {escala.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/escalas/${escala.id}`)}
                      >
                        Ver
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
