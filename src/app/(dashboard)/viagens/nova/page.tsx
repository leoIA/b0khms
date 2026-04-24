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
import { ArrowLeft, Calculator, Plane, Bus } from 'lucide-react';

export default function NovaViagemPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    objetivo: '',
    destino: '',
    tipoViagem: 'nacional',
    dataIda: '',
    dataVolta: '',
    meioTransporte: 'aviao',
    precisaPassagem: true,
    precisaLocacao: false,
    valorPassagens: '',
    valorHospedagem: '',
    valorOutros: '',
    observacoes: '',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/viagens/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
  };

  // Calculate number of days between dates
  const calcularDiarias = () => {
    if (!formData.dataIda || !formData.dataVolta) return 0;
    
    const dataIda = new Date(formData.dataIda);
    const dataVolta = new Date(formData.dataVolta);
    const diffTime = Math.abs(dataVolta.getTime() - dataIda.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive
    
    return diffDays;
  };

  // Calculate daily rate value
  const calcularValorDiarias = () => {
    if (!config) return 0;
    
    const qtdDiarias = calcularDiarias();
    const valorDiaria = formData.tipoViagem === 'nacional'
      ? config.diariaNacional || 150
      : config.diariaInternacional || 250;
    
    return qtdDiarias * Number(valorDiaria);
  };

  // Calculate total estimate
  const calcularTotal = () => {
    const diarias = calcularValorDiarias();
    const passagens = Number(formData.valorPassagens) || 0;
    const hospedagem = Number(formData.valorHospedagem) || 0;
    const outros = Number(formData.valorOutros) || 0;
    
    return diarias + passagens + hospedagem + outros;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/viagens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantidadeDiarias: calcularDiarias(),
          valorDiarias: calcularValorDiarias(),
          valorTotal: calcularTotal(),
          dataIda: new Date(formData.dataIda),
          dataVolta: new Date(formData.dataVolta),
        }),
      });

      if (response.ok) {
        router.push('/viagens');
      }
    } catch (error) {
      console.error('Erro ao criar viagem:', error);
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
        <Button variant="ghost" onClick={() => router.push('/viagens')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Solicitação de Viagem</h1>
          <p className="text-muted-foreground">Preencha os dados para solicitar a viagem</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Dados da Viagem</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Objetivo da Viagem *</Label>
                    <Input
                      value={formData.objetivo}
                      onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                      placeholder="Ex: Reunião com cliente, Visita técnica..."
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>Destino *</Label>
                    <Input
                      value={formData.destino}
                      onChange={(e) => setFormData({ ...formData, destino: e.target.value })}
                      placeholder="Cidade, Estado"
                      required
                    />
                  </div>

                  <div>
                    <Label>Tipo de Viagem</Label>
                    <Select
                      value={formData.tipoViagem}
                      onValueChange={(v) => setFormData({ ...formData, tipoViagem: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nacional">Nacional</SelectItem>
                        <SelectItem value="internacional">Internacional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Data de Ida *</Label>
                    <Input
                      type="date"
                      value={formData.dataIda}
                      onChange={(e) => setFormData({ ...formData, dataIda: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label>Data de Volta *</Label>
                    <Input
                      type="date"
                      value={formData.dataVolta}
                      onChange={(e) => setFormData({ ...formData, dataVolta: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label>Meio de Transporte</Label>
                    <Select
                      value={formData.meioTransporte}
                      onValueChange={(v) => setFormData({ ...formData, meioTransporte: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aviao">
                          <div className="flex items-center gap-2">
                            <Plane className="h-4 w-4" /> Avião
                          </div>
                        </SelectItem>
                        <SelectItem value="onibus">
                          <div className="flex items-center gap-2">
                            <Bus className="h-4 w-4" /> Ônibus
                          </div>
                        </SelectItem>
                        <SelectItem value="carro_empresa">Carro da Empresa</SelectItem>
                        <SelectItem value="carro_locado">Carro Locado</SelectItem>
                        <SelectItem value="proprio">Veículo Próprio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Precisa Passagem?</Label>
                    <Select
                      value={formData.precisaPassagem ? 'sim' : 'nao'}
                      onValueChange={(v) => setFormData({ ...formData, precisaPassagem: v === 'sim' })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim">Sim</SelectItem>
                        <SelectItem value="nao">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Valores Estimados</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Valor Passagens</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valorPassagens}
                        onChange={(e) => setFormData({ ...formData, valorPassagens: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label>Valor Hospedagem</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valorHospedagem}
                        onChange={(e) => setFormData({ ...formData, valorHospedagem: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <Label>Outros Valores</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valorOutros}
                        onChange={(e) => setFormData({ ...formData, valorOutros: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    placeholder="Informações adicionais sobre a viagem..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-4">
                  <Button type="button" variant="outline" onClick={() => router.push('/viagens')}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Enviando...' : 'Solicitar Viagem'}
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
                Resumo da Viagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tipo:</span>
                  <Badge variant="outline">{formData.tipoViagem}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Período:</span>
                  <span>
                    {formData.dataIda && formData.dataVolta
                      ? `${calcularDiarias()} dias`
                      : '-'}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diárias ({calcularDiarias()}x):</span>
                  <span className="font-medium">{formatCurrency(calcularValorDiarias())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Passagens:</span>
                  <span className="font-medium">
                    {formatCurrency(Number(formData.valorPassagens) || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hospedagem:</span>
                  <span className="font-medium">
                    {formatCurrency(Number(formData.valorHospedagem) || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outros:</span>
                  <span className="font-medium">
                    {formatCurrency(Number(formData.valorOutros) || 0)}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-semibold">Valor Total Estimado:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(calcularTotal())}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {config && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Valores de Diária</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nacional:</span>
                  <span>{formatCurrency(config.diariaNacional || 150)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Internacional:</span>
                  <span>{formatCurrency(config.diariaInternacional || 250)}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
