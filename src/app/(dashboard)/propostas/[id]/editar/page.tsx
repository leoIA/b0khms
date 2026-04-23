// =============================================================================
// ConstrutorPro - Propostas Comerciais - Editar
// =============================================================================

'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from '@/hooks/use-session';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/api';

// Types
interface Client {
  id: string;
  name: string;
  email: string | null;
}

interface Project {
  id: string;
  name: string;
  code: string | null;
}

interface Budget {
  id: string;
  name: string;
  code: string | null;
}

interface ProposalItem {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  category: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  notes: string | null;
  order: number;
}

interface Proposal {
  id: string;
  number: string;
  title: string;
  objective: string | null;
  status: string;
  version: number;
  subtotal: number;
  discountType: string | null;
  discountValue: number | null;
  discountReason: string | null;
  totalValue: number;
  paymentTerms: string | null;
  deliveryTime: string | null;
  warrantyTerms: string | null;
  validUntil: string | null;
  deliveryAddress: string | null;
  terms: string | null;
  notes: string | null;
  clientNotes: string | null;
  includeCover: boolean;
  includeSummary: boolean;
  includeTimeline: boolean;
  includeTeam: boolean;
  includePortfolio: boolean;
  customIntroduction: string | null;
  requiresSignature: boolean;
  clientId: string | null;
  projectId: string | null;
  budgetId: string | null;
  proposal_items: ProposalItem[];
  clients: { id: string; name: string } | null;
  projects: { id: string; name: string } | null;
}

// Fetch functions
async function fetchProposal(id: string): Promise<Proposal> {
  const response = await fetch(`/api/propostas/${id}`);
  if (!response.ok) throw new Error('Erro ao carregar proposta');
  return response.json().then(r => r.data);
}

async function fetchClients(): Promise<Client[]> {
  const response = await fetch('/api/clientes?limit=1000');
  if (!response.ok) return [];
  return response.json().then(r => r.data || []);
}

async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/projetos?limit=1000');
  if (!response.ok) return [];
  return response.json().then(r => r.data || []);
}

async function fetchBudgets(): Promise<Budget[]> {
  const response = await fetch('/api/orcamentos?limit=1000');
  if (!response.ok) return [];
  return response.json().then(r => r.data || []);
}

// Item type
interface ItemFormData {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  notes: string;
}

function createEmptyItem(): ItemFormData {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    code: '',
    title: '',
    description: '',
    category: '',
    unit: 'un',
    quantity: 1,
    unitPrice: 0,
    notes: '',
  };
}

export default function EditarPropostaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // Form state
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [clientId, setClientId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');
  const [budgetId, setBudgetId] = useState<string>('');

  // Commercial conditions
  const [paymentTerms, setPaymentTerms] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  const [warrantyTerms, setWarrantyTerms] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Discount
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState('');

  // Presentation
  const [includeCover, setIncludeCover] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeTimeline, setIncludeTimeline] = useState(false);
  const [includeTeam, setIncludeTeam] = useState(false);
  const [includePortfolio, setIncludePortfolio] = useState(false);
  const [customIntroduction, setCustomIntroduction] = useState('');
  const [requiresSignature, setRequiresSignature] = useState(false);

  // Terms
  const [terms, setTerms] = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Items
  const [items, setItems] = useState<ItemFormData[]>([]);

  // Redirect if not authenticated
  if (!sessionLoading && !isAuthenticated) {
    router.push('/login');
  }

  // Fetch proposal data
  const { data: proposal, isLoading: proposalLoading } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => fetchProposal(id),
    enabled: isAuthenticated && !!id,
  });

  // Fetch related data
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    enabled: isAuthenticated,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    enabled: isAuthenticated,
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets'],
    queryFn: fetchBudgets,
    enabled: isAuthenticated,
  });

  // Populate form when proposal loads
  useEffect(() => {
    if (proposal) {
      setTitle(proposal.title);
      setObjective(proposal.objective || '');
      setClientId(proposal.clientId || '');
      setProjectId(proposal.projectId || '');
      setBudgetId(proposal.budgetId || '');
      setPaymentTerms(proposal.paymentTerms || '');
      setDeliveryTime(proposal.deliveryTime || '');
      setWarrantyTerms(proposal.warrantyTerms || '');
      setValidUntil(proposal.validUntil ? proposal.validUntil.split('T')[0] : '');
      setDeliveryAddress(proposal.deliveryAddress || '');
      setDiscountType((proposal.discountType as 'percentage' | 'fixed') || 'percentage');
      setDiscountValue(proposal.discountValue || 0);
      setDiscountReason(proposal.discountReason || '');
      setIncludeCover(proposal.includeCover);
      setIncludeSummary(proposal.includeSummary);
      setIncludeTimeline(proposal.includeTimeline);
      setIncludeTeam(proposal.includeTeam);
      setIncludePortfolio(proposal.includePortfolio);
      setCustomIntroduction(proposal.customIntroduction || '');
      setRequiresSignature(proposal.requiresSignature);
      setTerms(proposal.terms || '');
      setClientNotes(proposal.clientNotes || '');
      setInternalNotes(proposal.notes || '');

      // Populate items
      setItems(proposal.proposal_items.map(item => ({
        id: item.id,
        code: item.code || '',
        title: item.title,
        description: item.description || '',
        category: item.category || '',
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        notes: item.notes || '',
      })));
    }
  }, [proposal]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discount = discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue;
  const totalValue = Math.max(0, subtotal - discount);

  // Item management
  const addItem = () => {
    setItems([...items, createEmptyItem()]);
  };

  const removeItem = (itemId: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== itemId));
    }
  };

  const updateItem = (itemId: string, field: keyof ItemFormData, value: string | number) => {
    setItems(items.map(item =>
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  // Handle save
  const handleSave = async () => {
    if (!title.trim()) {
      alert('Título é obrigatório');
      return;
    }

    if (items.length === 0 || !items.some(i => i.title.trim())) {
      alert('Adicione pelo menos um item à proposta');
      return;
    }

    setSaving(true);

    try {
      const proposalData = {
        title,
        objective: objective || undefined,
        clientId: clientId || null,
        projectId: projectId || null,
        budgetId: budgetId || null,
        paymentTerms: paymentTerms || undefined,
        deliveryTime: deliveryTime || undefined,
        warrantyTerms: warrantyTerms || undefined,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
        deliveryAddress: deliveryAddress || undefined,
        discountType,
        discountValue,
        discountReason: discountReason || undefined,
        includeCover,
        includeSummary,
        includeTimeline,
        includeTeam,
        includePortfolio,
        customIntroduction: customIntroduction || undefined,
        requiresSignature,
        terms: terms || undefined,
        clientNotes: clientNotes || undefined,
        notes: internalNotes || undefined,
        items: items.filter(i => i.title.trim()).map((item, index) => ({
          code: item.code || undefined,
          title: item.title,
          description: item.description || undefined,
          category: item.category || undefined,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes || undefined,
          order: index,
        })),
      };

      const response = await fetch(`/api/propostas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposalData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar proposta');
      }

      queryClient.invalidateQueries({ queryKey: ['proposal', id] });
      router.push(`/propostas/${id}`);
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar proposta');
    } finally {
      setSaving(false);
    }
  };

  if (sessionLoading || proposalLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Proposta não encontrada
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if proposal can be edited
  if (!['draft', 'review'].includes(proposal.status)) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Esta proposta não pode mais ser editada (status atual: {proposal.status})
          </CardContent>
        </Card>
        <Button asChild>
          <Link href={`/propostas/${id}`}>Voltar para Detalhes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/propostas/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Editar Proposta</h1>
          <p className="text-muted-foreground">
            {proposal.number} - Versão {proposal.version}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
              <TabsTrigger value="items">Itens</TabsTrigger>
              <TabsTrigger value="conditions">Condições</TabsTrigger>
              <TabsTrigger value="presentation">Apresentação</TabsTrigger>
            </TabsList>

            {/* Basic Data Tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Identificação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Proposta para Construção de Residência"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="objective">Objetivo / Escopo</Label>
                    <Textarea
                      id="objective"
                      value={objective}
                      onChange={(e) => setObjective(e.target.value)}
                      placeholder="Descreva o objetivo e escopo da proposta..."
                      rows={4}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Select value={clientId} onValueChange={setClientId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {clients.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Projeto</Label>
                      <Select value={projectId} onValueChange={setProjectId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Orçamento de Origem</Label>
                      <Select value={budgetId} onValueChange={setBudgetId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum</SelectItem>
                          {budgets.map((budget) => (
                            <SelectItem key={budget.id} value={budget.id}>
                              {budget.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Termos e Condições</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="terms">Termos e Condições Gerais</Label>
                    <Textarea
                      id="terms"
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      placeholder="Termos e condições gerais da proposta..."
                      rows={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientNotes">Notas para o Cliente</Label>
                    <Textarea
                      id="clientNotes"
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      placeholder="Notas visíveis para o cliente..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="internalNotes">Observações Internas</Label>
                    <Textarea
                      id="internalNotes"
                      value={internalNotes}
                      onChange={(e) => setInternalNotes(e.target.value)}
                      placeholder="Observações internas (não visíveis para o cliente)..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Items Tab */}
            <TabsContent value="items" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Itens da Proposta</CardTitle>
                      <CardDescription>Gerencie os itens da proposta</CardDescription>
                    </div>
                    <Button onClick={addItem} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <Card key={item.id} className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid gap-4 md:grid-cols-6">
                          <div className="space-y-2">
                            <Label>Código</Label>
                            <Input
                              value={item.code}
                              onChange={(e) => updateItem(item.id, 'code', e.target.value)}
                              placeholder="COD-001"
                            />
                          </div>

                          <div className="md:col-span-3 space-y-2">
                            <Label>Título *</Label>
                            <Input
                              value={item.title}
                              onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                              placeholder="Descrição do item"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Input
                              value={item.category}
                              onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                              placeholder="Serviço"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Unidade</Label>
                            <Select value={item.unit} onValueChange={(v) => updateItem(item.id, 'unit', v)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="un">Unidade</SelectItem>
                                <SelectItem value="m">Metro</SelectItem>
                                <SelectItem value="m2">m²</SelectItem>
                                <SelectItem value="m3">m³</SelectItem>
                                <SelectItem value="kg">Kg</SelectItem>
                                <SelectItem value="hr">Hora</SelectItem>
                                <SelectItem value="dia">Dia</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Quantidade</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Preço Unit.</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Total</Label>
                            <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center font-medium">
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </div>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.id)}
                          disabled={items.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-4 space-y-2">
                        <Label>Descrição Detalhada</Label>
                        <Textarea
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Descrição detalhada do item..."
                          rows={2}
                        />
                      </div>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Conditions Tab */}
            <TabsContent value="conditions" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Condições Comerciais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="paymentTerms">Condições de Pagamento</Label>
                      <Textarea
                        id="paymentTerms"
                        value={paymentTerms}
                        onChange={(e) => setPaymentTerms(e.target.value)}
                        placeholder="Ex: 50% na assinatura, 50% na entrega"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deliveryTime">Prazo de Execução/Entrega</Label>
                      <Input
                        id="deliveryTime"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        placeholder="Ex: 90 dias úteis"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="warrantyTerms">Termos de Garantia</Label>
                      <Textarea
                        id="warrantyTerms"
                        value={warrantyTerms}
                        onChange={(e) => setWarrantyTerms(e.target.value)}
                        placeholder="Ex: 5 anos para estrutura, 1 ano para acabamentos"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="validUntil">Validade da Proposta</Label>
                      <Input
                        id="validUntil"
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryAddress">Endereço de Entrega/Execução</Label>
                    <Textarea
                      id="deliveryAddress"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Endereço completo..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Desconto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Tipo de Desconto</Label>
                      <Select value={discountType} onValueChange={(v: 'percentage' | 'fixed') => setDiscountType(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentual (%)</SelectItem>
                          <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Valor do Desconto</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Motivo do Desconto</Label>
                      <Input
                        value={discountReason}
                        onChange={(e) => setDiscountReason(e.target.value)}
                        placeholder="Ex: Desconto promocional"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Presentation Tab */}
            <TabsContent value="presentation" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Configurações de Apresentação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Seções a Incluir</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center justify-between">
                        <Label>Capa da Proposta</Label>
                        <Switch checked={includeCover} onCheckedChange={setIncludeCover} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Resumo Executivo</Label>
                        <Switch checked={includeSummary} onCheckedChange={setIncludeSummary} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Cronograma</Label>
                        <Switch checked={includeTimeline} onCheckedChange={setIncludeTimeline} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Equipe</Label>
                        <Switch checked={includeTeam} onCheckedChange={setIncludeTeam} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Portfólio</Label>
                        <Switch checked={includePortfolio} onCheckedChange={setIncludePortfolio} />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label>Requer Assinatura Digital</Label>
                        <Switch checked={requiresSignature} onCheckedChange={setRequiresSignature} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="customIntroduction">Introdução Personalizada</Label>
                    <Textarea
                      id="customIntroduction"
                      value={customIntroduction}
                      onChange={(e) => setCustomIntroduction(e.target.value)}
                      placeholder="Texto de introdução que aparecerá no início da proposta..."
                      rows={6}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Summary */}
        <div className="space-y-6">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Resumo da Proposta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Desconto {discountType === 'percentage' ? `(${discountValue}%)` : ''}</span>
                    <span>-{formatCurrency(discount)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-green-600">{formatCurrency(totalValue)}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>{items.filter(i => i.title.trim()).length} item(ns)</p>
                {validUntil && <p>Válida até {new Date(validUntil).toLocaleDateString('pt-BR')}</p>}
              </div>

              <Separator />

              <Button className="w-full" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
