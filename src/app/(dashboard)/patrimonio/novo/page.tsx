'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Categoria {
  id: string;
  nome: string;
  codigo?: string;
  vidaUtilAnos: number;
  taxaDepreciacao: number;
}

interface Local {
  id: string;
  nome: string;
  endereco?: string;
}

interface Projeto {
  id: string;
  name: string;
  code?: string;
}

export default function NovoPatrimonioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
    dataAquisicao: new Date().toISOString().split('T')[0],
    dataInicioUso: '',
    vidaUtilMeses: '60',
    metodoDepreciacao: 'linear',
    estadoConservacao: 'novo',
    projectId: '',
    notaFiscal: '',
    dataNotaFiscal: '',
    fornecedor: '',
    numeroApolice: '',
    seguradora: '',
    vencimentoSeguro: '',
    observacoes: '',
  });

  useEffect(() => {
    loadDadosAuxiliares();
    gerarNumeroPatrimonio();
  }, []);

  const loadDadosAuxiliares = async () => {
    try {
      const [catRes, locRes, projRes] = await Promise.all([
        fetch('/api/patrimonio/categorias'),
        fetch('/api/patrimonio/locais'),
        fetch('/api/projetos?limit=100'),
      ]);

      const catData = await catRes.json();
      const locData = await locRes.json();
      const projData = await projRes.json();

      setCategorias(catData.data || catData || []);
      setLocais(locData.data || locData || []);
      setProjetos(projData.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados auxiliares:', error);
    }
  };

  const gerarNumeroPatrimonio = () => {
    const ano = new Date().getFullYear();
    const aleatorio = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    setFormData(prev => ({ ...prev, numeroPatrimonio: `PAT-${ano}-${aleatorio}` }));
  };

  const handleCategoriaChange = (categoriaId: string) => {
    const categoria = categorias.find(c => c.id === categoriaId);
    if (categoria) {
      setFormData(prev => ({
        ...prev,
        categoriaId,
        vidaUtilMeses: (categoria.vidaUtilAnos * 12).toString(),
      }));
    } else {
      setFormData(prev => ({ ...prev, categoriaId }));
    }
  };

  const handleValorAquisicaoChange = (valor: string) => {
    const valorNum = parseFloat(valor.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    const valorResidual = valorNum * 0.1; // 10% padrão
    setFormData(prev => ({
      ...prev,
      valorAquisicao: valor,
      valorResidual: valorResidual.toFixed(2),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

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

      const response = await fetch('/api/patrimonio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar patrimônio');
      }

      const data = await response.json();
      toast.success('Patrimônio criado com sucesso!');
      router.push(`/patrimonio/${data.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar patrimônio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push('/patrimonio')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Patrimônio</h1>
          <p className="text-muted-foreground">
            Cadastro de móveis, equipamentos e ativos
          </p>
        </div>
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
                  <Label htmlFor="numeroPatrimonio">Número do Patrimônio *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="numeroPatrimonio"
                      value={formData.numeroPatrimonio}
                      onChange={(e) => setFormData(prev => ({ ...prev, numeroPatrimonio: e.target.value }))}
                      placeholder="PAT-2024-0001"
                      required
                    />
                    <Button type="button" variant="outline" onClick={gerarNumeroPatrimonio}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome do bem"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição detalhada do bem"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    value={formData.marca}
                    onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                    placeholder="Marca"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input
                    id="modelo"
                    value={formData.modelo}
                    onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                    placeholder="Modelo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="numeroSerie">Nº Série</Label>
                  <Input
                    id="numeroSerie"
                    value={formData.numeroSerie}
                    onChange={(e) => setFormData(prev => ({ ...prev, numeroSerie: e.target.value }))}
                    placeholder="Número de série"
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
                <Select value={formData.categoriaId} onValueChange={handleCategoriaChange}>
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

          {/* Valores e Depreciação */}
          <Card>
            <CardHeader>
              <CardTitle>Valores e Depreciação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valorAquisicao">Valor de Aquisição *</Label>
                  <Input
                    id="valorAquisicao"
                    type="text"
                    value={formData.valorAquisicao}
                    onChange={(e) => handleValorAquisicaoChange(e.target.value)}
                    placeholder="0,00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valorResidual">Valor Residual</Label>
                  <Input
                    id="valorResidual"
                    type="text"
                    value={formData.valorResidual}
                    onChange={(e) => setFormData(prev => ({ ...prev, valorResidual: e.target.value }))}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataAquisicao">Data de Aquisição *</Label>
                  <Input
                    id="dataAquisicao"
                    type="date"
                    value={formData.dataAquisicao}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataAquisicao: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataInicioUso">Data Início de Uso</Label>
                  <Input
                    id="dataInicioUso"
                    type="date"
                    value={formData.dataInicioUso}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataInicioUso: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vidaUtilMeses">Vida Útil (meses)</Label>
                  <Input
                    id="vidaUtilMeses"
                    type="number"
                    value={formData.vidaUtilMeses}
                    onChange={(e) => setFormData(prev => ({ ...prev, vidaUtilMeses: e.target.value }))}
                    min="1"
                  />
                </div>
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
                    placeholder="Número da NF"
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
                  placeholder="Nome do fornecedor"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numeroApolice">Nº Apólice</Label>
                  <Input
                    id="numeroApolice"
                    value={formData.numeroApolice}
                    onChange={(e) => setFormData(prev => ({ ...prev, numeroApolice: e.target.value }))}
                    placeholder="Número da apólice"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="seguradora">Seguradora</Label>
                  <Input
                    id="seguradora"
                    value={formData.seguradora}
                    onChange={(e) => setFormData(prev => ({ ...prev, seguradora: e.target.value }))}
                    placeholder="Nome da seguradora"
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
                placeholder="Observações adicionais sobre o patrimônio..."
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => router.push('/patrimonio')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              'Salvando...'
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Patrimônio
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
