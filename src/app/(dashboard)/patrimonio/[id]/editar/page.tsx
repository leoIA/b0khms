'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Patrimonio {
  id: string;
  numeroPatrimonio: string;
  nome: string;
  descricao?: string;
  marca?: string;
  modelo?: string;
  numeroSerie?: string;
  valorAquisicao: number;
  valorAtual: number;
  valorResidual: number;
  dataAquisicao: string;
  dataInicioUso?: string;
  vidaUtilMeses: number;
  metodoDepreciacao: string;
  depreciacaoAcumulada: number;
  status: string;
  estadoConservacao: string;
  projectId?: string;
  notaFiscal?: string;
  dataNotaFiscal?: string;
  fornecedor?: string;
  numeroApolice?: string;
  seguradora?: string;
  vencimentoSeguro?: string;
  observacoes?: string;
  categoriaId?: string;
  localId?: string;
}

interface Categoria {
  id: string;
  nome: string;
  codigo?: string;
  vidaUtilAnos: number;
}

interface Local {
  id: string;
  nome: string;
}

interface Projeto {
  id: string;
  name: string;
  code?: string;
}

export default function EditarPatrimonioPage() {
  const router = useRouter();
  const params = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patrimonio, setPatrimonio] = useState<Patrimonio | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [projetos, setProjetos] = useState<Projeto[]>([]);

  const [formData, setFormData] = useState({
    numeroPatrimonio: '',
    nome: '',
    descricao: '',
    categoriaId: '',
    localId: '',
    marca: '',
    modelo: '',
    numeroSerie: '',
    valorAquisicao: '',
    valorResidual: '',
    dataAquisicao: '',
    dataInicioUso: '',
    vidaUtilMeses: '60',
    metodoDepreciacao: 'linear',
    estadoConservacao: 'bom',
    projectId: '',
    notaFiscal: '',
    dataNotaFiscal: '',
    fornecedor: '',
    numeroApolice: '',
    seguradora: '',
    vencimentoSeguro: '',
    observacoes: '',
    status: 'ativo',
  });

  useEffect(() => {
    loadDados();
  }, [params.id]);

  const loadDados = async () => {
    try {
      const [patRes, catRes, locRes, projRes] = await Promise.all([
        fetch(`/api/patrimonio/${params.id}`),
        fetch('/api/patrimonio/categorias'),
        fetch('/api/patrimonio/locais'),
        fetch('/api/projetos?limit=100'),
      ]);

      const patData = await patRes.json();
      const catData = await catRes.json();
      const locData = await locRes.json();
      const projData = await projRes.json();

      setPatrimonio(patData);
      setCategorias(catData.data || catData || []);
      setLocais(locData.data || locData || []);
      setProjetos(projData.data || []);

      // Preencher formulário
      setFormData({
        numeroPatrimonio: patData.numeroPatrimonio || '',
        nome: patData.nome || '',
        descricao: patData.descricao || '',
        categoriaId: patData.categoriaId || '',
        localId: patData.localId || '',
        marca: patData.marca || '',
        modelo: patData.modelo || '',
        numeroSerie: patData.numeroSerie || '',
        valorAquisicao: patData.valorAquisicao?.toString() || '',
        valorResidual: patData.valorResidual?.toString() || '',
        dataAquisicao: patData.dataAquisicao?.split('T')[0] || '',
        dataInicioUso: patData.dataInicioUso?.split('T')[0] || '',
        vidaUtilMeses: patData.vidaUtilMeses?.toString() || '60',
        metodoDepreciacao: patData.metodoDepreciacao || 'linear',
        estadoConservacao: patData.estadoConservacao || 'bom',
        projectId: patData.projectId || '',
        notaFiscal: patData.notaFiscal || '',
        dataNotaFiscal: patData.dataNotaFiscal?.split('T')[0] || '',
        fornecedor: patData.fornecedor || '',
        numeroApolice: patData.numeroApolice || '',
        seguradora: patData.seguradora || '',
        vencimentoSeguro: patData.vencimentoSeguro?.split('T')[0] || '',
        observacoes: patData.observacoes || '',
        status: patData.status || 'ativo',
      });
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar patrimônio');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        ...formData,
        valorAquisicao: parseFloat(formData.valorAquisicao.replace(',', '.') || '0'),
        valorResidual: parseFloat(formData.valorResidual.replace(',', '.') || '0'),
        vidaUtilMeses: parseInt(formData.vidaUtilMeses),
        dataAquisicao: formData.dataAquisicao,
        dataInicioUso: formData.dataInicioUso || null,
        dataNotaFiscal: formData.dataNotaFiscal || null,
        vencimentoSeguro: formData.vencimentoSeguro || null,
        projectId: formData.projectId || null,
        categoriaId: formData.categoriaId || null,
        localId: formData.localId || null,
      };

      const response = await fetch(`/api/patrimonio/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar patrimônio');
      }

      toast.success('Patrimônio atualizado com sucesso!');
      router.push(`/patrimonio/${params.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar patrimônio');
    } finally {
      setSaving(false);
    }
  };

  const handleBaixa = async () => {
    if (!confirm('Tem certeza que deseja dar baixa neste patrimônio? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch(`/api/patrimonio/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'baixado' }),
      });

      if (!response.ok) throw new Error('Erro ao dar baixa');

      toast.success('Baixa realizada com sucesso!');
      router.push('/patrimonio');
    } catch (error) {
      toast.error('Erro ao dar baixa no patrimônio');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8">Carregando...</div>;
  }

  if (!patrimonio) {
    return <div className="text-center py-8">Patrimônio não encontrado</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push(`/patrimonio/${params.id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Editar Patrimônio</h1>
            <p className="text-muted-foreground font-mono">{patrimonio.numeroPatrimonio}</p>
          </div>
        </div>
        {patrimonio.status === 'ativo' && (
          <Button variant="destructive" onClick={handleBaixa}>
            <Trash2 className="mr-2 h-4 w-4" />
            Dar Baixa
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Identificação */}
          <Card>
            <CardHeader>
              <CardTitle>Identificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numeroPatrimonio">Número do Patrimônio</Label>
                  <Input
                    id="numeroPatrimonio"
                    value={formData.numeroPatrimonio}
                    onChange={(e) => setFormData(prev => ({ ...prev, numeroPatrimonio: e.target.value }))}
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="manutencao">Em Manutenção</SelectItem>
                      <SelectItem value="baixado">Baixado</SelectItem>
                      <SelectItem value="doado">Doado</SelectItem>
                      <SelectItem value="vendido">Vendido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    value={formData.marca}
                    onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input
                    id="modelo"
                    value={formData.modelo}
                    onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroSerie">Nº Série</Label>
                  <Input
                    id="numeroSerie"
                    value={formData.numeroSerie}
                    onChange={(e) => setFormData(prev => ({ ...prev, numeroSerie: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Classificação */}
          <Card>
            <CardHeader>
              <CardTitle>Classificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="categoriaId">Categoria</Label>
                <Select 
                  value={formData.categoriaId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, categoriaId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.codigo ? `${cat.codigo} - ` : ''}{cat.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="localId">Local</Label>
                <Select 
                  value={formData.localId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, localId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um local" />
                  </SelectTrigger>
                  <SelectContent>
                    {locais.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectId">Obra/Projeto</Label>
                <Select 
                  value={formData.projectId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma obra (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {projetos.map((proj) => (
                      <SelectItem key={proj.id} value={proj.id}>
                        {proj.code ? `${proj.code} - ` : ''}{proj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
            </CardContent>
          </Card>

          {/* Valores */}
          <Card>
            <CardHeader>
              <CardTitle>Valores e Depreciação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor de Aquisição</Label>
                  <div className="text-lg font-semibold">
                    R$ {patrimonio.valorAquisicao?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Valor Atual</Label>
                  <div className="text-lg font-semibold">
                    R$ {patrimonio.valorAtual?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valorResidual">Valor Residual</Label>
                  <Input
                    id="valorResidual"
                    type="text"
                    value={formData.valorResidual}
                    onChange={(e) => setFormData(prev => ({ ...prev, valorResidual: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vidaUtilMeses">Vida Útil (meses)</Label>
                  <Input
                    id="vidaUtilMeses"
                    type="number"
                    value={formData.vidaUtilMeses}
                    onChange={(e) => setFormData(prev => ({ ...prev, vidaUtilMeses: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="metodoDepreciacao">Método de Depreciação</Label>
                  <Select 
                    value={formData.metodoDepreciacao} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, metodoDepreciacao: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Linear</SelectItem>
                      <SelectItem value="acelerada">Acelerada</SelectItem>
                      <SelectItem value="soma_digitos">Soma dos Dígitos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Depreciação Acumulada</Label>
                  <div className="text-lg font-semibold">
                    R$ {patrimonio.depreciacaoAcumulada?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documentação */}
          <Card>
            <CardHeader>
              <CardTitle>Documentação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="notaFiscal">Nota Fiscal</Label>
                  <Input
                    id="notaFiscal"
                    value={formData.notaFiscal}
                    onChange={(e) => setFormData(prev => ({ ...prev, notaFiscal: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataNotaFiscal">Data da NF</Label>
                  <Input
                    id="dataNotaFiscal"
                    type="date"
                    value={formData.dataNotaFiscal}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataNotaFiscal: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Input
                  id="fornecedor"
                  value={formData.fornecedor}
                  onChange={(e) => setFormData(prev => ({ ...prev, fornecedor: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numeroApolice">Nº Apólice</Label>
                  <Input
                    id="numeroApolice"
                    value={formData.numeroApolice}
                    onChange={(e) => setFormData(prev => ({ ...prev, numeroApolice: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seguradora">Seguradora</Label>
                  <Input
                    id="seguradora"
                    value={formData.seguradora}
                    onChange={(e) => setFormData(prev => ({ ...prev, seguradora: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vencimentoSeguro">Vencimento do Seguro</Label>
                <Input
                  id="vencimentoSeguro"
                  type="date"
                  value={formData.vencimentoSeguro}
                  onChange={(e) => setFormData(prev => ({ ...prev, vencimentoSeguro: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => router.push(`/patrimonio/${params.id}`)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
