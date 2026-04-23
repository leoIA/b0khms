// =============================================================================
// ConstrutorPro - Configuração de BDI
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
  AlertTriangle,
  CheckCircle2,
  Percent,
  DollarSign,
  Info,
  Plus,
  Pencil,
  Trash2,
  Copy,
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

// Types
interface BDIConfig {
  id: string;
  name: string;
  description: string | null;
  pis: number;
  cofins: number;
  iss: number;
  irpj: number;
  csll: number;
  cpmf: number;
  administracaoCentral: number;
  despesasFinanceiras: number;
  riscosContingencias: number;
  segurosGarantias: number;
  lucro: number;
  comercializacao: number;
  maxLimit: number;
  alertThreshold: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface BDIConfigForm {
  name: string;
  description: string;
  pis: number;
  cofins: number;
  iss: number;
  irpj: number;
  csll: number;
  cpmf: number;
  administracaoCentral: number;
  despesasFinanceiras: number;
  riscosContingencias: number;
  segurosGarantias: number;
  lucro: number;
  comercializacao: number;
  maxLimit: number;
  alertThreshold: number;
}

const DEFAULT_FORM: BDIConfigForm = {
  name: '',
  description: '',
  pis: 0.65,
  cofins: 3.0,
  iss: 5.0,
  irpj: 4.8,
  csll: 2.88,
  cpmf: 0,
  administracaoCentral: 5.0,
  despesasFinanceiras: 2.0,
  riscosContingencias: 2.0,
  segurosGarantias: 1.0,
  lucro: 10.0,
  comercializacao: 0,
  maxLimit: 25.0,
  alertThreshold: 20.0,
};

export default function BDIConfigPage() {
  const { user, isLoading: sessionLoading } = useSession();
  const { toast } = useToast();

  // States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<BDIConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<BDIConfig | null>(null);
  const [form, setForm] = useState<BDIConfigForm>(DEFAULT_FORM);
  const [showDialog, setShowDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null);
  
  // Cálculo do BDI em tempo real
  const [calculatedBDI, setCalculatedBDI] = useState<number>(0);
  const [exceedsLimit, setExceedsLimit] = useState(false);

  // Calcular BDI
  const calculateBDI = useCallback((config: BDIConfigForm) => {
    const totalImpostos = config.pis + config.cofins + config.iss + config.irpj + config.csll + config.cpmf;
    
    const numerador = (1 + config.administracaoCentral / 100) *
                      (1 + config.riscosContingencias / 100) *
                      (1 + config.segurosGarantias / 100);
    const denominador = 1 - (totalImpostos / 100) - (config.lucro / 100) -
                        (config.despesasFinanceiras / 100) - (config.comercializacao / 100);

    const bdi = denominador > 0 ? (numerador / denominador - 1) * 100 : 0;
    return Math.round(bdi * 100) / 100;
  }, []);

  // Atualizar cálculo quando form mudar
  useEffect(() => {
    const bdi = calculateBDI(form);
    setCalculatedBDI(bdi);
    setExceedsLimit(bdi > form.maxLimit);
  }, [form, calculateBDI]);

  // Buscar configurações
  useEffect(() => {
    async function fetchConfigs() {
      if (sessionLoading || !user?.companyId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/bdi-configs');
        const data = await response.json();

        if (data.success) {
          setConfigs(data.data);
          const defaultConfig = data.data.find((c: BDIConfig) => c.isDefault);
          if (defaultConfig) {
            setSelectedConfig(defaultConfig);
            setForm({
              name: defaultConfig.name,
              description: defaultConfig.description || '',
              pis: defaultConfig.pis,
              cofins: defaultConfig.cofins,
              iss: defaultConfig.iss,
              irpj: defaultConfig.irpj,
              csll: defaultConfig.csll,
              cpmf: defaultConfig.cpmf,
              administracaoCentral: defaultConfig.administracaoCentral,
              despesasFinanceiras: defaultConfig.despesasFinanceiras,
              riscosContingencias: defaultConfig.riscosContingencias,
              segurosGarantias: defaultConfig.segurosGarantias,
              lucro: defaultConfig.lucro,
              comercializacao: defaultConfig.comercializacao,
              maxLimit: defaultConfig.maxLimit,
              alertThreshold: defaultConfig.alertThreshold,
            });
          }
        }
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar configurações de BDI.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }

    fetchConfigs();
  }, [sessionLoading, user?.companyId, toast]);

  // Salvar configuração
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
      const url = editMode && selectedConfig ? `/api/bdi-configs/${selectedConfig.id}` : '/api/bdi-configs';
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
        
        const listResponse = await fetch('/api/bdi-configs');
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

  // Excluir configuração
  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/bdi-configs/${id}`, {
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

  // Duplicar configuração
  const handleDuplicate = async (config: BDIConfig) => {
    setForm({
      name: `${config.name} (Cópia)`,
      description: config.description || '',
      pis: config.pis,
      cofins: config.cofins,
      iss: config.iss,
      irpj: config.irpj,
      csll: config.csll,
      cpmf: config.cpmf,
      administracaoCentral: config.administracaoCentral,
      despesasFinanceiras: config.despesasFinanceiras,
      riscosContingencias: config.riscosContingencias,
      segurosGarantias: config.segurosGarantias,
      lucro: config.lucro,
      comercializacao: config.comercializacao,
      maxLimit: config.maxLimit,
      alertThreshold: config.alertThreshold,
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração de BDI</h1>
          <p className="text-muted-foreground">
            Gerencie os percentuais de BDI para seus orçamentos
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
                  {editMode ? 'Editar Configuração de BDI' : 'Nova Configuração de BDI'}
                </DialogTitle>
                <DialogDescription>
                  Configure os percentuais para cálculo do BDI
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Nome e Descrição */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome da Configuração *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ex: BDI Padrão, BDI Obras Públicas"
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

                {/* Resultado do BDI */}
                <Card className={exceedsLimit ? 'border-destructive' : 'border-primary'}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        <span className="font-semibold">BDI Calculado:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${exceedsLimit ? 'text-destructive' : 'text-primary'}`}>
                          {calculatedBDI.toFixed(2)}%
                        </span>
                        {exceedsLimit && (
                          <Badge variant="destructive">Acima do limite TCU</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Impostos */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Impostos (Grupo A)
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="pis">PIS/PASEP (%)</Label>
                      <Input
                        id="pis"
                        type="number"
                        step="0.01"
                        value={form.pis}
                        onChange={(e) => setForm({ ...form, pis: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cofins">COFINS (%)</Label>
                      <Input
                        id="cofins"
                        type="number"
                        step="0.01"
                        value={form.cofins}
                        onChange={(e) => setForm({ ...form, cofins: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="iss">ISS (%)</Label>
                      <Input
                        id="iss"
                        type="number"
                        step="0.01"
                        value={form.iss}
                        onChange={(e) => setForm({ ...form, iss: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="irpj">IRPJ (%)</Label>
                      <Input
                        id="irpj"
                        type="number"
                        step="0.01"
                        value={form.irpj}
                        onChange={(e) => setForm({ ...form, irpj: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="csll">CSLL (%)</Label>
                      <Input
                        id="csll"
                        type="number"
                        step="0.01"
                        value={form.csll}
                        onChange={(e) => setForm({ ...form, csll: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpmf">CPMF (%)</Label>
                      <Input
                        id="cpmf"
                        type="number"
                        step="0.01"
                        value={form.cpmf}
                        onChange={(e) => setForm({ ...form, cpmf: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Despesas Indiretas */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Despesas Indiretas
                  </h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="administracaoCentral">Administração Central (%)</Label>
                      <Input
                        id="administracaoCentral"
                        type="number"
                        step="0.01"
                        value={form.administracaoCentral}
                        onChange={(e) => setForm({ ...form, administracaoCentral: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="despesasFinanceiras">Despesas Financeiras (%)</Label>
                      <Input
                        id="despesasFinanceiras"
                        type="number"
                        step="0.01"
                        value={form.despesasFinanceiras}
                        onChange={(e) => setForm({ ...form, despesasFinanceiras: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="riscosContingencias">Riscos e Contingências (%)</Label>
                      <Input
                        id="riscosContingencias"
                        type="number"
                        step="0.01"
                        value={form.riscosContingencias}
                        onChange={(e) => setForm({ ...form, riscosContingencias: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="segurosGarantias">Seguros e Garantias (%)</Label>
                      <Input
                        id="segurosGarantias"
                        type="number"
                        step="0.01"
                        value={form.segurosGarantias}
                        onChange={(e) => setForm({ ...form, segurosGarantias: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lucro">Lucro (%)</Label>
                      <Input
                        id="lucro"
                        type="number"
                        step="0.01"
                        value={form.lucro}
                        onChange={(e) => setForm({ ...form, lucro: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comercializacao">Comercialização (%)</Label>
                      <Input
                        id="comercializacao"
                        type="number"
                        step="0.01"
                        value={form.comercializacao}
                        onChange={(e) => setForm({ ...form, comercializacao: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Limites */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Limites e Alertas
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="maxLimit">Limite Máximo TCU (%)</Label>
                      <Input
                        id="maxLimit"
                        type="number"
                        step="0.01"
                        value={form.maxLimit}
                        onChange={(e) => setForm({ ...form, maxLimit: parseFloat(e.target.value) || 25 })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Limite para obras públicas (TCU recomenda 25%)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="alertThreshold">Limiar de Alerta (%)</Label>
                      <Input
                        id="alertThreshold"
                        type="number"
                        step="0.01"
                        value={form.alertThreshold}
                        onChange={(e) => setForm({ ...form, alertThreshold: parseFloat(e.target.value) || 20 })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Alerta quando BDI ultrapassar este valor
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fórmula */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Fórmula do BDI</AlertTitle>
                  <AlertDescription className="text-sm">
                    BDI = (1 + Admin) × (1 + Riscos) × (1 + Seguros) ÷ (1 - Impostos - Lucro - Desp. Fin. - Comerc.) - 1
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

      {/* Lista de Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de BDI</CardTitle>
          <CardDescription>
            Gerencie as configurações de BDI para seus orçamentos. O BDI padrão será usado automaticamente em novos orçamentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma configuração de BDI</p>
              <p className="text-sm">Crie uma configuração para começar a usar BDI em seus orçamentos.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">BDI Calculado</TableHead>
                  <TableHead className="text-center">Limite TCU</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => {
                  const bdi = calculateBDI({
                    pis: config.pis,
                    cofins: config.cofins,
                    iss: config.iss,
                    irpj: config.irpj,
                    csll: config.csll,
                    cpmf: config.cpmf,
                    administracaoCentral: config.administracaoCentral,
                    despesasFinanceiras: config.despesasFinanceiras,
                    riscosContingencias: config.riscosContingencias,
                    segurosGarantias: config.segurosGarantias,
                    lucro: config.lucro,
                    comercializacao: config.comercializacao,
                    maxLimit: config.maxLimit,
                    alertThreshold: config.alertThreshold,
                    name: config.name,
                    description: config.description || '',
                  });
                  const exceeds = bdi > config.maxLimit;

                  return (
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
                        <span className={`font-bold ${exceeds ? 'text-destructive' : 'text-primary'}`}>
                          {bdi.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {exceeds ? (
                          <div className="flex items-center justify-center gap-1 text-destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Excede {config.maxLimit}%</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>OK ({config.maxLimit}%)</span>
                          </div>
                        )}
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
                                    pis: config.pis,
                                    cofins: config.cofins,
                                    iss: config.iss,
                                    irpj: config.irpj,
                                    csll: config.csll,
                                    cpmf: config.cpmf,
                                    administracaoCentral: config.administracaoCentral,
                                    despesasFinanceiras: config.despesasFinanceiras,
                                    riscosContingencias: config.riscosContingencias,
                                    segurosGarantias: config.segurosGarantias,
                                    lucro: config.lucro,
                                    comercializacao: config.comercializacao,
                                    maxLimit: config.maxLimit,
                                    alertThreshold: config.alertThreshold,
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
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta configuração de BDI? Esta ação não pode ser desfeita.
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
