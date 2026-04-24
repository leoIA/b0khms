'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, Play, LogOut, Coffee, ArrowLeft, Check, X } from 'lucide-react';

interface RegistroPonto {
  id: string;
  data: Date;
  entrada1?: Date;
  saidaIntervalo?: Date;
  entradaIntervalo?: Date;
  saida1?: Date;
  horasTrabalhadas: number;
  horasExtras: number;
  horasFaltas: number;
  status: string;
  justificativa?: string;
  usuario_escalas: {
    users: { name: string; email: string };
    escalas_trabalho: { nome: string; horaEntrada: string; horaSaida: string };
  };
}

export default function PontoPage() {
  const router = useRouter();
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [loading, setLoading] = useState(true);
  const [registroAtual, setRegistroAtual] = useState<{
    entrada1?: Date;
    saidaIntervalo?: Date;
    entradaIntervalo?: Date;
    saida1?: Date;
  }>({});
  const [justificativaDialog, setJustificativaDialog] = useState(false);
  const [justificativa, setJustificativa] = useState('');

  useEffect(() => {
    loadRegistros();
    checkRegistroAtual();
  }, []);

  const loadRegistros = async () => {
    try {
      const response = await fetch('/api/ponto');
      const data = await response.json();
      setRegistros(data || []);
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkRegistroAtual = async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/ponto?dataInicio=${hoje}&dataFim=${hoje}`);
      const data = await response.json();
      if (data.length > 0) {
        setRegistroAtual({
          entrada1: data[0].entrada1 ? new Date(data[0].entrada1) : undefined,
          saidaIntervalo: data[0].saidaIntervalo ? new Date(data[0].saidaIntervalo) : undefined,
          entradaIntervalo: data[0].entradaIntervalo
            ? new Date(data[0].entradaIntervalo)
            : undefined,
          saida1: data[0].saida1 ? new Date(data[0].saida1) : undefined,
        });
      }
    } catch (error) {
      console.error('Erro ao verificar registro atual:', error);
    }
  };

  const handleRegistrarPonto = async (tipo: string) => {
    try {
      const response = await fetch('/api/ponto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo }),
      });

      if (response.ok) {
        loadRegistros();
        checkRegistroAtual();
      }
    } catch (error) {
      console.error('Erro ao registrar ponto:', error);
    }
  };

  const handleAprovar = async (id: string, aprovado: boolean) => {
    try {
      await fetch(`/api/ponto/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: aprovado ? 'aprovado' : 'rejeitado' }),
      });
      loadRegistros();
    } catch (error) {
      console.error('Erro ao aprovar registro:', error);
    }
  };

  const formatTime = (date?: Date | string) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getNextAction = () => {
    if (!registroAtual.entrada1) return { tipo: 'entrada1', label: 'Entrada', icon: Play };
    if (!registroAtual.saidaIntervalo) return { tipo: 'saidaIntervalo', label: 'Saída Intervalo', icon: Coffee };
    if (!registroAtual.entradaIntervalo)
      return { tipo: 'entradaIntervalo', label: 'Volta Intervalo', icon: Coffee };
    if (!registroAtual.saida1) return { tipo: 'saida1', label: 'Saída', icon: LogOut };
    return null;
  };

  const nextAction = getNextAction();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Ponto</h1>
          <p className="text-muted-foreground">Registro e gestão de ponto eletrônico</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Registrar Ponto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold">
                {new Date().toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
              <p className="text-muted-foreground">
                {new Date().toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 border rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Entrada</p>
                <p className="font-mono text-lg">{formatTime(registroAtual.entrada1)}</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Saída</p>
                <p className="font-mono text-lg">{formatTime(registroAtual.saida1)}</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Saída Intervalo</p>
                <p className="font-mono text-lg">{formatTime(registroAtual.saidaIntervalo)}</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Volta Intervalo</p>
                <p className="font-mono text-lg">{formatTime(registroAtual.entradaIntervalo)}</p>
              </div>
            </div>

            {nextAction && (
              <Button className="w-full" onClick={() => handleRegistrarPonto(nextAction.tipo)}>
                {nextAction.label}
              </Button>
            )}

            {registroAtual.saida1 && (
              <p className="text-center text-sm text-green-600">
                ✓ Jornada do dia registrada com sucesso
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Semanal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600">Horas Trabalhadas</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {registros
                      .reduce((sum, r) => sum + (r.horasTrabalhadas || 0), 0)
                      .toFixed(1)}
                    h
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600">Horas Extras</p>
                  <p className="text-2xl font-bold text-green-700">
                    {registros.reduce((sum, r) => sum + (r.horasExtras || 0), 0).toFixed(1)}h
                  </p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xs text-red-600">Horas Faltas</p>
                  <p className="text-2xl font-bold text-red-700">
                    {registros.reduce((sum, r) => sum + (r.horasFaltas || 0), 0).toFixed(1)}h
                  </p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-yellow-600">Pendentes</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {registros.filter((r) => r.status === 'pendente').length}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Registros</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Escala</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Intervalo</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>Horas</TableHead>
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
              ) : registros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                registros.map((registro) => (
                  <TableRow key={registro.id}>
                    <TableCell>{formatDate(registro.data)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {registro.usuario_escalas?.users?.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {registro.usuario_escalas?.users?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{registro.usuario_escalas?.escalas_trabalho?.nome}</TableCell>
                    <TableCell className="font-mono">{formatTime(registro.entrada1)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatTime(registro.saidaIntervalo)} -{' '}
                      {formatTime(registro.entradaIntervalo)}
                    </TableCell>
                    <TableCell className="font-mono">{formatTime(registro.saida1)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{registro.horasTrabalhadas?.toFixed(1)}h</span>
                        {registro.horasExtras > 0 && (
                          <span className="text-xs text-green-600">
                            +{registro.horasExtras?.toFixed(1)}h extra
                          </span>
                        )}
                        {registro.horasFaltas > 0 && (
                          <span className="text-xs text-red-600">
                            -{registro.horasFaltas?.toFixed(1)}h falta
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          registro.status === 'aprovado'
                            ? 'bg-green-100 text-green-800'
                            : registro.status === 'rejeitado'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {registro.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {registro.status === 'pendente' && (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAprovar(registro.id, true)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAprovar(registro.id, false)}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      )}
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
