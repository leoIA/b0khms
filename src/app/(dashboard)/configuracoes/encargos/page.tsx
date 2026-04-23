// =============================================================================
// ConstrutorPro - Configuração de Encargos Sociais
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from '@/hooks/use-session';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Save,
  Calculator,
  Info,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Users,
  Percent,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface LaborChargeConfig {
  id: string;
  name: string;
  description: string | null;
  uf: string | null;
  sindicato: string | null;
  categoria: string | null;
  inssPatronal: number;
  fgts: number;
  salarioEducacao: number;
  incra: number;
  sesi: number;
  senai: number;
  sebrae: number;
  sebraq: number;
  avisoPrevioIndenizado: number;
  multaFgts: number;
  contribuicaoSocialMulta: number;
  ferias: number;
  tercoConstitucional: number;
  decimoTerceiro: number;
  fgtsFerias13: number;
  rotatividade: number;
  totalEncargos: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface LaborChargeForm {
  name: string;
  description: string;
  uf: string;
  sindicato: string;
  categoria: string;
  inssPatronal: number;
  fgts: number;
  salarioEducacao: number;
  incra: number;
  sesi: number;
  senai: number;
  sebrae: number;
  sebraq: number;
  avisoPrevioIndenizado: number;
  multaFgts: number;
  contribuicaoSocialMulta: number;
  ferias: number;
  tercoConstitucional: number;
  decimoTerceiro: number;
  fgtsFerias13: number;
  rotatividade: number;
}

const DEFAULT_FORM: LaborChargeForm = {
  name: '',
  description: '',
  uf: '',
  sindicato: '',
  categoria: '',
  inssPatronal: 20.0,
  fgts: 8.0,
  salarioEducacao: 2.5,
  incra: 0.2,
  sesi: 1.5,
  senai: 1.0,
  sebrae: 0.6,
  sebraq: 0.15,
  avisoPrevioIndenizado: 8.33,
  multaFgts: 3.2,
  contribuicaoSocialMulta: 0.64,
  ferias: 11.11,
  tercoConstitucional: 3.7,
  decimoTerceiro: 8.33,
  fgtsFerias13: 1.11,
  rotatividade: 5.0,
};

export default function LaborChargesConfigPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<LaborChargeConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<LaborChargeConfig | null>(null);
  const [form, setForm] = useState<LaborChargeForm>(DEFAULT_FORM);
  const [showDialog, setShowDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  const [testSalary, setTestSalary] = useState<number>(2500);
  
  const [calculatedCharges, setCalculatedCharges] = useState({
    grupoA: 0,
    grupoB: 0,
    grupoC: 0,
    grupoD: 0,
    total: 0,
    custoTotal: 0,
  });

  const calculateCharges = useCallback((config: LaborChargeForm, salario: number) => {
    const grupoA = config.inssPatronal + config.fgts + config.salarioEducacao +
                   config.incra + config.sesi + config.senai + config.sebrae + config.sebraq;
    const grupoB = config.avisoPrevioIndenizado + config.multaFgts + config.contribuicaoSocialMulta;
    const grupoC = config.ferias + config.tercoConstitucional + config.decimoTerceiro + config.fgtsFerias13;
    const grupoD = config.rotatividade;
    const total = grupoA + grupoB + grupoC + grupoD;
    const custoTotal = salario * (1 + total / 100);

    return { grupoA, grupoB, grupoC, grupoD, total, custoTotal };
  }, []);

  useEffect(() => {
    const charges = calculateCharges(form, testSalary);
    setCalculatedCharges(charges);
  }, [form, testSalary, calculateCharges]);

  useEffect(() => {
    async function fetchConfigs() {
      if (sessionLoading || !user?.companyId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/labor-charges');
        const data = await response.json();

        if (data.success) {
          setConfigs(data.data);
          const defaultConfig = data.data.find((c: LaborChargeConfig) => c.isDefault);
          if (defaultConfig) {
            setSelectedConfig(defaultConfig);
            setForm({
              name: defaultConfig.name,
              description: defaultConfig.description || '',
              uf: defaultConfig.uf || '',
              sindicato: defaultConfig.sindicato || '',
              categoria: defaultConfig.categoria || '',
              inssPatronal: defaultConfig.inssPatronal,
              fgts: defaultConfig.fgts,
              salarioEducacao: defaultConfig.salarioEducacao,
              incra: defaultConfig.incra,
              sesi: defaultConfig.sesi,
              senai: defaultConfig.senai,
              sebrae: defaultConfig.sebrae,
              sebraq: defaultConfig.sebraq,
              avisoPrevioIndenizado: defaultConfig.avisoPrevioIndenizado,
              multaFgts: defaultConfig.multaFgts,
              contribuicaoSocialMulta: defaultConfig.contribuicaoSocialMulta,
              ferias: defaultConfig.ferias,
              tercoConstitucional: defaultConfig.tercoConstitucional,
              decimoTerceiro: defaultConfig.decimoTerceiro,
              fgtsFerias13: defaultConfig.fgtsFerias13,
              rotatividade: defaultConfig.rotatividade,
            });
          }
        }
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar configurações de encargos.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchConfigs();
  }, [sessionLoading, user?.companyId, toast]);

  const handleSave = async () => {
    if (!form.name) {
      toast({
        title: 'Erro',
        description: 'Nome da configuração é obrigatório.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const url = editMode && selectedConfig ? `/api/labor-charges/${selectedConfig.id}` : '/api/labor-charges';
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: `Configuração ${editMode ? 'atualizada' : 'criada'} com sucesso.`,
        });
        
        const listResponse = await fetch('/api/labor-charges');
        const listData = await listResponse.json();
        if (listData.success) {
          setConfigs(listData.data);
        }
        
        setShowDialog(false);
        setEditMode(false);
        setForm(DEFAULT_FORM);
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao salvar configuração.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configuração.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/labor-charges/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Configuração excluída com sucesso.',
        });
        setConfigs(configs.filter(c => c.id !== id));
        if (selectedConfig?.id === id) {
          setSelectedConfig(null);
          setForm(DEFAULT_FORM);
        }
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao excluir configuração.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir configuração.',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialog(null);
    }
  };

  const handleDuplicate = async (config: LaborChargeConfig) => {
    setForm({
      name: `${config.name} (Cópia)`,
      description: config.description || '',
      uf: config.uf || '',
      sindicato: config.sindicato || '',
      categoria: config.categoria || '',
      inssPatronal: config.inssPatronal,
      fgts: config.fgts,
      salarioEducacao: config.salarioEducacao,
      incra: config.incra,
      sesi: config.sesi,
      senai: config.senai,
      sebrae: config.sebrae,
      sebraq: config.sebraq,
      avisoPrevioIndenizado: config.avisoPrevioIndenizado,
      multaFgts: config.multaFgts,
      contribuicaoSocialMulta: config.contribuicaoSocialMulta,
      ferias: config.ferias,
      tercoConstitucional: config.tercoConstitucional,
      decimoTerceiro: config.decimoTerceiro,
      fgtsFerias13: config.fgtsFerias13,
      rotatividade: config.rotatividade,
    });
    setEditMode(false);
    setShowDialog(true);
  };

  if (sessionLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const isCompanyAdmin = user?.role === 'company_admin' || user?.role === 'master_admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Encargos Sociais</h1>
          <p className="text-muted-foreground">
            Configure os encargos sobre mão de obra conforme CLT
          </p>
        </div>
        {isCompanyAdmin && (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => { setForm(DEFAULT_FORM); setEditMode(false); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Configuração
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editMode ? 'Editar Configuração de Encargos' : 'Nova Configuração de Encargos'}
                </DialogTitle>
                <DialogDescription>
                  Configure os percentuais de encargos sociais sobre mão de obra
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Configuração *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ex: Encargos Padrão, Encargos SP"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Input
                      id="description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Descrição opcional"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="uf">UF</Label>
                    <Input
                      id="uf"
                      value={form.uf}
                      onChange={(e) => setForm({ ...form, uf: e.target.value })}
                      placeholder="Ex: SP"
                      maxLength={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sindicato">Sindicato</Label>
                    <Input
                      id="sindicato"
                      value={form.sindicato}
                      onChange={(e) => setForm({ ...form, sindicato: e.target.value })}
                      placeholder="Nome do sindicato"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <Input
                      id="categoria"
                      value={form.categoria}
                      onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                      placeholder="Categoria profissional"
                    />
                  </div>
                </div>

                <Card className="border-primary">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calculator className="h-5 w-5 text-primary" />
                          <span className="font-semibold">Total de Encargos:</span>
                        </div>
                        <span className="text-2xl font-bold text-primary">
                          {calculatedCharges.total.toFixed(2)}%
                        </span>
                      </div>
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="testSalary">Salário Base para Simulação</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">R$</span>
                            <Input
                              id="testSalary"
                              type="number"
                              className="pl-10"
                              value={testSalary}
                              onChange={(e) => setTestSalary(parseFloat(e.target.value) || 0)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Custo Total com Encargos</Label>
                          <div className="text-2xl font-bold text-green-600">
                            R$ {calculatedCharges.custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Grupo A - Encargos Básicos ({calculatedCharges.grupoA.toFixed(2)}%)
                  </h3>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="inssPatronal">INSS Patronal (%)</Label>
                      <Input
                        id="inssPatronal"
                        type="number"
                        step="0.01"
                        value={form.inssPatronal}
                        onChange={(e) => setForm({ ...form, inssPatronal: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fgts">FGTS (%)</Label>
                      <Input
                        id="fgts"
                        type="number"
                        step="0.01"
                        value={form.fgts}
                        onChange={(e) => setForm({ ...form, fgts: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salarioEducacao">Salário-Educação (%)</Label>
                      <Input
                        id="salarioEducacao"
                        type="number"
                        step="0.01"
                        value={form.salarioEducacao}
                        onChange={(e) => setForm({ ...form, salarioEducacao: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="incra">INCRA (%)</Label>
                      <Input
                        id="incra"
                        type="number"
                        step="0.01"
                        value={form.incra}
                        onChange={(e) => setForm({ ...form, incra: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sesi">SESI (%)</Label>
                      <Input
                        id="sesi"
                        type="number"
                        step="0.01"
                        value={form.sesi}
                        onChange={(e) => setForm({ ...form, sesi: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="senai">SENAI (%)</Label>
                      <Input
                        id="senai"
                        type="number"
                        step="0.01"
                        value={form.senai}
                        onChange={(e) => setForm({ ...form, senai: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sebrae">SEBRAE (%)</Label>
                      <Input
                        id="sebrae"
                        type="number"
                        step="0.01"
                        value={form.sebrae}
                        onChange={(e) => setForm({ ...form, sebrae: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sebraq">SEBRAQ (%)</Label>
                      <Input
                        id="sebraq"
                        type="number"
                        step="0.01"
                        value={form.sebraq}
                        onChange={(e) => setForm({ ...form, sebraq: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Grupo B - Aviso Prévio e Multa ({calculatedCharges.grupoB.toFixed(2)}%)
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="avisoPrevioIndenizado">Aviso Prévio Indenizado (%)</Label>
                      <Input
                        id="avisoPrevioIndenizado"
                        type="number"
                        step="0.01"
                        value={form.avisoPrevioIndenizado}
                        onChange={(e) => setForm({ ...form, avisoPrevioIndenizado: parseFloat(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-muted-foreground">1/12 = 8,33%</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="multaFgts">Multa FGTS 40% (%)</Label>
                      <Input
                        id="multaFgts"
                        type="number"
                        step="0.01"
                        value={form.multaFgts}
                        onChange={(e) => setForm({ ...form, multaFgts: parseFloat(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-muted-foreground">40% sobre 8% = 3,2%</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contribuicaoSocialMulta">Contrib. Social s/Multa (%)</Label>
                      <Input
                        id="contribuicaoSocialMulta"
                        type="number"
                        step="0.01"
                        value={form.contribuicaoSocialMulta}
                        onChange={(e) => setForm({ ...form, contribuicaoSocialMulta: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Grupo C - Férias e 13º ({calculatedCharges.grupoC.toFixed(2)}%)
                  </h3>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label htmlFor="ferias">Férias (%)</Label>
                      <Input
                        id="ferias"
                        type="number"
                        step="0.01"
                        value={form.ferias}
                        onChange={(e) => setForm({ ...form, ferias: parseFloat(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-muted-foreground">30/270 = 11,11%</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tercoConstitucional">1/3 Constitucional (%)</Label>
                      <Input
                        id="tercoConstitucional"
                        type="number"
                        step="0.01"
                        value={form.tercoConstitucional}
                        onChange={(e) => setForm({ ...form, tercoConstitucional: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="decimoTerceiro">13º Salário (%)</Label>
                      <Input
                        id="decimoTerceiro"
                        type="number"
                        step="0.01"
                        value={form.decimoTerceiro}
                        onChange={(e) => setForm({ ...form, decimoTerceiro: parseFloat(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-muted-foreground">1/12 = 8,33%</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fgtsFerias13">FGTS s/Férias/13º (%)</Label>
                      <Input
                        id="fgtsFerias13"
                        type="number"
                        step="0.01"
                        value={form.fgtsFerias13}
                        onChange={(e) => setForm({ ...form, fgtsFerias13: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Grupo D - Rescisórios ({calculatedCharges.grupoD.toFixed(2)}%)
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="rotatividade">Taxa de Rotatividade (%)</Label>
                      <Input
                        id="rotatividade"
                        type="number"
                        step="0.01"
                        value={form.rotatividade}
                        onChange={(e) => setForm({ ...form, rotatividade: parseFloat(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-muted-foreground">Média do setor da construção</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Cálculo de Encargos</AlertTitle>
                  <AlertDescription className="text-sm">
                    Custo Total = Salário Base × (1 + Total Encargos%). Os valores percentuais são aplicados sobre o salário bruto mensal.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de Encargos</CardTitle>
          <CardDescription>
            Gerencie as configurações de encargos sociais para suas composições.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma configuração de encargos</p>
              <p className="text-sm">Crie uma configuração para começar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">UF</TableHead>
                  <TableHead className="text-center">Total Encargos</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {config.name}
                          {config.isDefault && (
                            <Badge variant="secondary" className="text-xs">Padrão</Badge>
                          )}
                        </div>
                        {config.description && (
                          <p className="text-sm text-muted-foreground">{config.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {config.uf || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-primary">
                        {config.totalEncargos.toFixed(2)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={config.isActive ? 'default' : 'secondary'}>
                        {config.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicate(config)}
                          title="Duplicar"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {isCompanyAdmin && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedConfig(config);
                                setForm({
                                  name: config.name,
                                  description: config.description || '',
                                  uf: config.uf || '',
                                  sindicato: config.sindicato || '',
                                  categoria: config.categoria || '',
                                  inssPatronal: config.inssPatronal,
                                  fgts: config.fgts,
                                  salarioEducacao: config.salarioEducacao,
                                  incra: config.incra,
                                  sesi: config.sesi,
                                  senai: config.senai,
                                  sebrae: config.sebrae,
                                  sebraq: config.sebraq,
                                  avisoPrevioIndenizado: config.avisoPrevioIndenizado,
                                  multaFgts: config.multaFgts,
                                  contribuicaoSocialMulta: config.contribuicaoSocialMulta,
                                  ferias: config.ferias,
                                  tercoConstitucional: config.tercoConstitucional,
                                  decimoTerceiro: config.decimoTerceiro,
                                  fgtsFerias13: config.fgtsFerias13,
                                  rotatividade: config.rotatividade,
                                });
                                setEditMode(true);
                                setShowDialog(true);
                              }}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {!config.isDefault && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteDialog(config.id)}
                                title="Excluir"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta configuração? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => deleteDialog && handleDelete(deleteDialog)}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
