'use client';

// =============================================================================
// ConstrutorPro - Componente de Configuração de Encargos Sociais
// =============================================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, Calculator, AlertCircle, RefreshCw, Info, TrendingUp } from 'lucide-react';

interface EncargosConfig {
  id: string;
  nome: string;
  descricao?: string;
  inssPatronal: number;
  inssRAT: number;
  inssFAP: number;
  fgts: number;
  fgtsMultaRescisoria: number;
  fgtsMultaRescisoriaSemCausa: number;
  avisoPrevioIndenizado: number;
  salarioEducacao: number;
  incra: number;
  senai: number;
  sesi: number;
  sebrae: number;
  ferias: number;
  tercoFerias: number;
  abonoFerias: number;
  decimoTerceiro: number;
  auxilioTransporte: number;
  auxilioAlimentacao: number;
  totalEncargosPercentual: number;
}

export function EncargosSettingsTab() {
  const [config, setConfig] = useState<EncargosConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [calcSalario, setCalcSalario] = useState<string>('20');
  const [calcHoras, setCalcHoras] = useState<string>('1');
  const [calcResult, setCalcResult] = useState<any>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/configuracoes/encargos');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.data);
      } else {
        toast.error('Erro ao carregar configurações de encargos');
      }
    } catch (error) {
      console.error('Erro ao carregar encargos:', error);
      toast.error('Erro ao carregar configurações de encargos');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof EncargosConfig, value: string) => {
    if (!config) return;
    
    const numValue = parseFloat(value) || 0;
    setConfig({ ...config, [field]: numValue });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/configuracoes/encargos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inssPatronal: config.inssPatronal,
          inssRAT: config.inssRAT,
          inssFAP: config.inssFAP,
          fgts: config.fgts,
          fgtsMultaRescisoria: config.fgtsMultaRescisoria,
          fgtsMultaRescisoriaSemCausa: config.fgtsMultaRescisoriaSemCausa,
          avisoPrevioIndenizado: config.avisoPrevioIndenizado,
          salarioEducacao: config.salarioEducacao,
          incra: config.incra,
          senai: config.senai,
          sesi: config.sesi,
          sebrae: config.sebrae,
          ferias: config.ferias,
          tercoFerias: config.tercoFerias,
          abonoFerias: config.abonoFerias,
          decimoTerceiro: config.decimoTerceiro,
          auxilioTransporte: config.auxilioTransporte,
          auxilioAlimentacao: config.auxilioAlimentacao,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setConfig(data.data);
        setHasChanges(false);
        toast.success('Configurações de encargos salvas com sucesso!');
      } else {
        toast.error(data.error || 'Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro ao salvar encargos:', error);
      toast.error('Erro ao salvar configurações de encargos');
    } finally {
      setSaving(false);
    }
  };

  const calcularCusto = async () => {
    const salario = parseFloat(calcSalario) || 0;
    const horas = parseFloat(calcHoras) || 1;

    try {
      const response = await fetch('/api/configuracoes/encargos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salarioHora: salario,
          horasTrabalho: horas,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setCalcResult(data.data);
      } else {
        toast.error('Erro ao calcular custo');
      }
    } catch (error) {
      console.error('Erro ao calcular:', error);
      toast.error('Erro ao calcular custo');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Erro ao carregar configurações</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Encargos Sociais</h3>
          <p className="text-sm text-muted-foreground">
            Configure os encargos sociais para cálculo de custo de mão de obra
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              <AlertCircle className="w-3 h-3 mr-1" />
              Alterações não salvas
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={loadConfig}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Resumo */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Total de Encargos sobre Salário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-green-600">
              {config.totalEncargosPercentual?.toFixed(2) || '0.00'}%
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Este percentual é aplicado sobre o salário bruto</p>
              <p>para calcular o custo total de mão de obra.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Configuração */}
      <Tabs defaultValue="inss" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="inss">INSS</TabsTrigger>
          <TabsTrigger value="fgts">FGTS</TabsTrigger>
          <TabsTrigger value="beneficios">Benefícios</TabsTrigger>
          <TabsTrigger value="calcular">Calcular</TabsTrigger>
        </TabsList>

        {/* INSS */}
        <TabsContent value="inss">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">INSS Patronal</CardTitle>
              <CardDescription>
                Contribuição previdenciária sobre a folha de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="inssPatronal">Alíquota Base (%)</Label>
                  <Input
                    id="inssPatronal"
                    type="number"
                    step="0.01"
                    value={config.inssPatronal}
                    onChange={(e) => handleInputChange('inssPatronal', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Normalmente 20%</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inssRAT">RAT (%)</Label>
                  <Input
                    id="inssRAT"
                    type="number"
                    step="0.01"
                    value={config.inssRAT}
                    onChange={(e) => handleInputChange('inssRAT', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Risco Ambiental</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inssFAP">FAP</Label>
                  <Input
                    id="inssFAP"
                    type="number"
                    step="0.01"
                    value={config.inssFAP}
                    onChange={(e) => handleInputChange('inssFAP', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">0,5 a 2,0</p>
                </div>
              </div>
              
              {/* Contribuições Sociais */}
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Contribuições Sociais (Sistema S)</h4>
                <div className="grid grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salarioEducacao">Sal. Educação</Label>
                    <Input
                      id="salarioEducacao"
                      type="number"
                      step="0.01"
                      value={config.salarioEducacao}
                      onChange={(e) => handleInputChange('salarioEducacao', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="incra">INCRA</Label>
                    <Input
                      id="incra"
                      type="number"
                      step="0.01"
                      value={config.incra}
                      onChange={(e) => handleInputChange('incra', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senai">SENAI</Label>
                    <Input
                      id="senai"
                      type="number"
                      step="0.01"
                      value={config.senai}
                      onChange={(e) => handleInputChange('senai', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sesi">SESI</Label>
                    <Input
                      id="sesi"
                      type="number"
                      step="0.01"
                      value={config.sesi}
                      onChange={(e) => handleInputChange('sesi', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sebrae">SEBRAE</Label>
                    <Input
                      id="sebrae"
                      type="number"
                      step="0.01"
                      value={config.sebrae}
                      onChange={(e) => handleInputChange('sebrae', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FGTS */}
        <TabsContent value="fgts">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">FGTS e Multas Rescisórias</CardTitle>
              <CardDescription>
                Fundo de Garantia e provisão para rescisões
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fgts">FGTS Mensal (%)</Label>
                  <Input
                    id="fgts"
                    type="number"
                    step="0.01"
                    value={config.fgts}
                    onChange={(e) => handleInputChange('fgts', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">8% sobre salário</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fgtsMulta">Multa Rescisória (%)</Label>
                  <Input
                    id="fgtsMulta"
                    type="number"
                    step="0.01"
                    value={config.fgtsMultaRescisoria}
                    onChange={(e) => handleInputChange('fgtsMultaRescisoria', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">40% sobre FGTS acumulado</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fgtsSemCausa">Multa Sem Justa Causa (%)</Label>
                  <Input
                    id="fgtsSemCausa"
                    type="number"
                    step="0.01"
                    value={config.fgtsMultaRescisoriaSemCausa}
                    onChange={(e) => handleInputChange('fgtsMultaRescisoriaSemCausa', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Adicional de 10%</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="avisoPrevio">Aviso Prévio (%)</Label>
                  <Input
                    id="avisoPrevio"
                    type="number"
                    step="0.01"
                    value={config.avisoPrevioIndenizado}
                    onChange={(e) => handleInputChange('avisoPrevioIndenizado', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">8,33% (1/12 por ano)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Benefícios */}
        <TabsContent value="beneficios">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Benefícios Trabalhistas</CardTitle>
              <CardDescription>
                Férias, 13º salário e auxílios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ferias">Férias (%)</Label>
                  <Input
                    id="ferias"
                    type="number"
                    step="0.01"
                    value={config.ferias}
                    onChange={(e) => handleInputChange('ferias', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">11,11% (30/270 dias)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tercoFerias">1/3 de Férias (%)</Label>
                  <Input
                    id="tercoFerias"
                    type="number"
                    step="0.01"
                    value={config.tercoFerias}
                    onChange={(e) => handleInputChange('tercoFerias', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">3,70% sobre salário</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="decimoTerceiro">13º Salário (%)</Label>
                  <Input
                    id="decimoTerceiro"
                    type="number"
                    step="0.01"
                    value={config.decimoTerceiro}
                    onChange={(e) => handleInputChange('decimoTerceiro', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">8,33% (1/12 por mês)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="abonoFerias">Abono Pecuniário (%)</Label>
                  <Input
                    id="abonoFerias"
                    type="number"
                    step="0.01"
                    value={config.abonoFerias}
                    onChange={(e) => handleInputChange('abonoFerias', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Opcional (0% se não usar)</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-3">Auxílios</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="auxilioTransporte">Vale-transporte (%)</Label>
                    <Input
                      id="auxilioTransporte"
                      type="number"
                      step="0.01"
                      value={config.auxilioTransporte}
                      onChange={(e) => handleInputChange('auxilioTransporte', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">% do salário (máx 6%)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auxilioAlimentacao">Vale-alimentação (%)</Label>
                    <Input
                      id="auxilioAlimentacao"
                      type="number"
                      step="0.01"
                      value={config.auxilioAlimentacao}
                      onChange={(e) => handleInputChange('auxilioAlimentacao', e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Opcional</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calculadora */}
        <TabsContent value="calcular">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="w-5 h-5" />
                Calculadora de Custo de Mão de Obra
              </CardTitle>
              <CardDescription>
                Calcule o custo total de mão de obra com encargos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calcSalario">Salário por Hora (R$)</Label>
                  <Input
                    id="calcSalario"
                    type="number"
                    step="0.01"
                    value={calcSalario}
                    onChange={(e) => setCalcSalario(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="calcHoras">Horas de Trabalho</Label>
                  <Input
                    id="calcHoras"
                    type="number"
                    step="0.01"
                    value={calcHoras}
                    onChange={(e) => setCalcHoras(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={calcularCusto} className="w-full">
                    <Calculator className="w-4 h-4 mr-2" />
                    Calcular
                  </Button>
                </div>
              </div>

              {calcResult && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-2 bg-background rounded">
                      <p className="text-sm text-muted-foreground">Salário Base</p>
                      <p className="text-xl font-bold">R$ {calcResult.salarioHora.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">por hora</p>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <p className="text-sm text-muted-foreground">Encargos</p>
                      <p className="text-xl font-bold text-orange-600">R$ {calcResult.encargosHora.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{calcResult.encargosPercentual.toFixed(2)}%</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded border border-green-200">
                      <p className="text-sm text-muted-foreground">Custo Total/Hora</p>
                      <p className="text-xl font-bold text-green-600">R$ {calcResult.custoHoraTotal.toFixed(2)}</p>
                    </div>
                    <div className="text-center p-2 bg-primary/10 rounded border border-primary/20">
                      <p className="text-sm text-muted-foreground">Custo Total</p>
                      <p className="text-xl font-bold text-primary">R$ {calcResult.custoTotal.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{calcResult.horasTrabalho}h</p>
                    </div>
                  </div>

                  {/* Detalhamento */}
                  <div className="pt-4 border-t">
                    <h5 className="font-medium mb-2">Detalhamento dos Encargos</h5>
                    <div className="grid grid-cols-5 gap-2 text-sm">
                      <div className="p-2 bg-background rounded">
                        <p className="text-muted-foreground">INSS</p>
                        <p className="font-medium">R$ {calcResult.breakdown.inss.toFixed(2)}</p>
                      </div>
                      <div className="p-2 bg-background rounded">
                        <p className="text-muted-foreground">FGTS</p>
                        <p className="font-medium">R$ {calcResult.breakdown.fgts.toFixed(2)}</p>
                      </div>
                      <div className="p-2 bg-background rounded">
                        <p className="text-muted-foreground">Sistema S</p>
                        <p className="font-medium">R$ {calcResult.breakdown.contribuicoesSociais.toFixed(2)}</p>
                      </div>
                      <div className="p-2 bg-background rounded">
                        <p className="text-muted-foreground">Benefícios</p>
                        <p className="font-medium">R$ {calcResult.breakdown.beneficiosTrabalhistas.toFixed(2)}</p>
                      </div>
                      <div className="p-2 bg-background rounded">
                        <p className="text-muted-foreground">Auxílios</p>
                        <p className="font-medium">R$ {calcResult.breakdown.auxilios.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Sobre os Encargos Sociais</p>
              <p>
                Os valores padrão seguem a legislação brasileira vigente. O RAT varia de 1% a 3% 
                conforme o CNAE. O FAP varia de 0,5 a 2,0 conforme o histórico da empresa. 
                Consulte a Receita Federal para valores atualizados.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
