'use client';

// =============================================================================
// ConstrutorPro - Componente de Configuração de BDI
// =============================================================================

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Save, Calculator, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface BDIConfig {
  id: string;
  nome: string;
  descricao?: string;
  pis: number;
  cofins: number;
  iss: number;
  irpj: number;
  csll: number;
  cpp: number;
  administracaoCentral: number;
  despesasFinanceiras: number;
  riscos: number;
  seguros: number;
  garantia: number;
  lucro: number;
  despesasComercializacao: number;
  totalImpostos: number;
  totalBDI: number;
}

export function BDISettingsTab() {
  const [config, setConfig] = useState<BDIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Carregar configuração
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/configuracoes/bdi');
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.data);
      } else {
        toast.error('Erro ao carregar configurações de BDI');
      }
    } catch (error) {
      console.error('Erro ao carregar BDI:', error);
      toast.error('Erro ao carregar configurações de BDI');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof BDIConfig, value: string) => {
    if (!config) return;
    
    const numValue = parseFloat(value) || 0;
    setConfig({ ...config, [field]: numValue });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/configuracoes/bdi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: config.nome,
          descricao: config.descricao,
          pis: config.pis,
          cofins: config.cofins,
          iss: config.iss,
          irpj: config.irpj,
          csll: config.csll,
          cpp: config.cpp,
          administracaoCentral: config.administracaoCentral,
          despesasFinanceiras: config.despesasFinanceiras,
          riscos: config.riscos,
          seguros: config.seguros,
          garantia: config.garantia,
          lucro: config.lucro,
          despesasComercializacao: config.despesasComercializacao,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setConfig(data.data);
        setHasChanges(false);
        toast.success('Configurações de BDI salvas com sucesso!');
      } else {
        toast.error(data.error || 'Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro ao salvar BDI:', error);
      toast.error('Erro ao salvar configurações de BDI');
    } finally {
      setSaving(false);
    }
  };

  const calcularTotalImpostos = () => {
    if (!config) return 0;
    return config.pis + config.cofins + config.iss + config.irpj + config.csll + config.cpp;
  };

  const calcularTotalBDI = () => {
    if (!config) return 0;
    return calcularTotalImpostos() + 
      config.administracaoCentral + 
      config.despesasFinanceiras + 
      config.riscos + 
      config.seguros + 
      config.garantia + 
      config.lucro + 
      config.despesasComercializacao;
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
          <h3 className="text-lg font-medium">BDI - Benefícios e Despesas Indiretas</h3>
          <p className="text-sm text-muted-foreground">
            Configure os percentuais de BDI para composição de preços
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

      {/* Resumo do BDI */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Resumo do BDI
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Impostos</p>
              <p className="text-2xl font-bold text-red-600">
                {calcularTotalImpostos().toFixed(2)}%
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Administração</p>
              <p className="text-2xl font-bold text-blue-600">
                {((config.administracaoCentral || 0) + (config.despesasFinanceiras || 0)).toFixed(2)}%
              </p>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Lucro</p>
              <p className="text-2xl font-bold text-green-600">
                {(config.lucro || 0).toFixed(2)}%
              </p>
            </div>
            <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">Total BDI</p>
              <p className="text-2xl font-bold text-primary">
                {calcularTotalBDI().toFixed(2)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulário de Configuração */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Impostos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              💰 Impostos
            </CardTitle>
            <CardDescription>
              Impostos federais, estaduais e municipais sobre faturamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pis">PIS/PASEP (%)</Label>
                <Input
                  id="pis"
                  type="number"
                  step="0.01"
                  value={config.pis}
                  onChange={(e) => handleInputChange('pis', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cofins">COFINS (%)</Label>
                <Input
                  id="cofins"
                  type="number"
                  step="0.01"
                  value={config.cofins}
                  onChange={(e) => handleInputChange('cofins', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="iss">ISS (%)</Label>
                <Input
                  id="iss"
                  type="number"
                  step="0.01"
                  value={config.iss}
                  onChange={(e) => handleInputChange('iss', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="irpj">IRPJ (%)</Label>
                <Input
                  id="irpj"
                  type="number"
                  step="0.01"
                  value={config.irpj}
                  onChange={(e) => handleInputChange('irpj', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="csll">CSLL (%)</Label>
                <Input
                  id="csll"
                  type="number"
                  step="0.01"
                  value={config.csll}
                  onChange={(e) => handleInputChange('csll', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpp">CPP (%)</Label>
                <Input
                  id="cpp"
                  type="number"
                  step="0.01"
                  value={config.cpp}
                  onChange={(e) => handleInputChange('cpp', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Administração */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              🏢 Administração Central
            </CardTitle>
            <CardDescription>
              Despesas administrativas e financeiras da empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminCentral">Administração Central (%)</Label>
              <Input
                id="adminCentral"
                type="number"
                step="0.01"
                value={config.administracaoCentral}
                onChange={(e) => handleInputChange('administracaoCentral', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Despesas administrativas, pessoal da sede, aluguel, etc.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="despFinanceiras">Despesas Financeiras (%)</Label>
              <Input
                id="despFinanceiras"
                type="number"
                step="0.01"
                value={config.despesasFinanceiras}
                onChange={(e) => handleInputChange('despesasFinanceiras', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Juros, taxas bancárias, spread cambial, etc.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Riscos e Seguros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              ⚠️ Riscos e Seguros
            </CardTitle>
            <CardDescription>
              Provisão para riscos, seguros e garantias
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="riscos">Fundo de Reserva/Riscos (%)</Label>
              <Input
                id="riscos"
                type="number"
                step="0.01"
                value={config.riscos}
                onChange={(e) => handleInputChange('riscos', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seguros">Seguros (%)</Label>
              <Input
                id="seguros"
                type="number"
                step="0.01"
                value={config.seguros}
                onChange={(e) => handleInputChange('seguros', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Seguro de obra, responsabilidade civil, etc.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="garantia">Garantia da Obra (%)</Label>
              <Input
                id="garantia"
                type="number"
                step="0.01"
                value={config.garantia}
                onChange={(e) => handleInputChange('garantia', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Provisão para atendimento à garantia (5 anos conforme lei)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Lucro e Comercialização */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              📈 Lucro e Comercialização
            </CardTitle>
            <CardDescription>
              Margem de lucro e despesas de comercialização
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lucro">Margem de Lucro (%)</Label>
              <Input
                id="lucro"
                type="number"
                step="0.01"
                value={config.lucro}
                onChange={(e) => handleInputChange('lucro', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Lucro líquido pretendido pela construtora
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="comercializacao">Despesas de Comercialização (%)</Label>
              <Input
                id="comercializacao"
                type="number"
                step="0.01"
                value={config.despesasComercializacao}
                onChange={(e) => handleInputChange('despesasComercializacao', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Comissões de corretores, propaganda, marketing, etc.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Observações */}
      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Dica importante</p>
              <p>
                O BDI total recomendado para construção civil varia entre <strong>25% e 35%</strong>. 
                Valores muito baixos podem comprometer a sustentabilidade do negócio, enquanto 
                valores muito altos podem tornar a proposta menos competitiva.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
