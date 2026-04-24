// =============================================================================
// ConstrutorPro - Propostas Comerciais - Nova Proposta
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/use-session';
import { useRouter, useSearchParams } from 'next/navigation';
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
  GripVertical,
  Save,
  Send,
  FileText,
  DollarSign,
  Calendar,
  Settings,
  FileSignature,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/api';

// Types
interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpfCnpj: string | null;
}

interface Project {
  id: string;
  name: string;
  code: string | null;
  clientId: string | null;
}

interface Budget {
  id: string;
  name: string;
  code: string | null;
  totalValue: number;
  projectId: string | null;
}

interface ProposalItem {
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

// Fetch functions
async function fetchClients(): Promise<Client[]> {
  const response = await fetch('/api/clientes?limit=1000');
  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/projetos?limit=1000');
  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

async function fetchBudgets(): Promise<Budget[]> {
  const response = await fetch('/api/orcamentos?limit=1000');
  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

// Create empty item
function createEmptyItem(): ProposalItem {
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

export default function NovaPropostaPage() {
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [items, setItems] = useState<ProposalItem[]>([createEmptyItem()]);

  // Redirect if not authenticated
  if (!sessionLoading && !isAuthenticated) {
    router.push('/login');
  }

  // Fetch data
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: fetchClients,
    enabled: isAuthenticated,
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    enabled: isAuthenticated,
  });

  const { data: budgets = [], isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: fetchBudgets,
    enabled: isAuthenticated,
  });

  // Pre-fill from URL params
  useEffect(() => {
    const clientIdParam = searchParams.get('clientId');
    const projectIdParam = searchParams.get('projectId');
    const budgetIdParam = searchParams.get('budgetId');

    if (clientIdParam) setClientId(clientIdParam);
    if (projectIdParam) setProjectId(projectIdParam);
    if (budgetIdParam) setBudgetId(budgetIdParam);
  }, [searchParams]);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discount = discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue;
  const totalValue = Math.max(0, subtotal - discount);

  // Item management
  const addItem = () => {
    setItems([...items, createEmptyItem()]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof ProposalItem, value: string | number) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  // Handle save
  const handleSave = async (sendAfterSave: boolean = false) => {
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
        clientId: clientId || undefined,
        projectId: projectId || undefined,
        budgetId: budgetId || undefined,
        paymentTerms: paymentTerms || undefined,
        deliveryTime: deliveryTime || undefined,
        warrantyTerms: warrantyTerms || undefined,
        validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
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
          ...item,
          order: index,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      };

      const response = await fetch('/api/propostas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proposalData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar proposta');
      }

      const result = await response.json();
      router.push(`/propostas/${result.data.id}`);
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar proposta');
    } finally {
      setSaving(false);
    }
  };

  if (sessionLoading || clientsLoading || projectsLoading || budgetsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/propostas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Nova Proposta Comercial</h1>
          <p className="text-muted-foreground">
            Crie uma nova proposta para enviar aos seus clientes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Salvar Rascunho
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Form */}
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
                  <CardDescription>Informações básicas da proposta</CardDescription>
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
                      <CardDescription>Adicione os itens que serão incluídos na proposta</CardDescription>
                    </div>
                    <Button onClick={addItem} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item, index) => (
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
                                <SelectItem value="vb">VB</SelectItem>
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
                  <CardDescription>Configure as condições de pagamento, entrega e garantia</CardDescription>
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
                  <CardDescription>Configure como a proposta será apresentada ao cliente</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Seções a Incluir</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="includeCover">Capa da Proposta</Label>
                        <Switch
                          id="includeCover"
                          checked={includeCover}
                          onCheckedChange={setIncludeCover}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="includeSummary">Resumo Executivo</Label>
                        <Switch
                          id="includeSummary"
                          checked={includeSummary}
                          onCheckedChange={setIncludeSummary}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="includeTimeline">Cronograma</Label>
                        <Switch
                          id="includeTimeline"
                          checked={includeTimeline}
                          onCheckedChange={setIncludeTimeline}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="includeTeam">Equipe</Label>
                        <Switch
                          id="includeTeam"
                          checked={includeTeam}
                          onCheckedChange={setIncludeTeam}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="includePortfolio">Portfólio</Label>
                        <Switch
                          id="includePortfolio"
                          checked={includePortfolio}
                          onCheckedChange={setIncludePortfolio}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="requiresSignature">Requer Assinatura Digital</Label>
                        <Switch
                          id="requiresSignature"
                          checked={requiresSignature}
                          onCheckedChange={setRequiresSignature}
                        />
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

              <div className="space-y-2">
                <Button className="w-full" onClick={() => handleSave(false)} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Salvando...' : 'Salvar Rascunho'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
