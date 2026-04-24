// =============================================================================
// ConstrutorPro - Orçamentos - Editar Orçamento
// =============================================================================

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from '@/hooks/use-session';
import { redirect, useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  DollarSign,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { BUDGET_STATUS, MEASUREMENT_UNITS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/api';

// Types
interface Project {
  id: string;
  name: string;
  code: string | null;
}

interface BudgetItem {
  id: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  totalPrice: number;
  notes: string;
  order: number;
}

interface Budget {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  projectId: string | null;
  validUntil: string | null;
  discount: number | null;
  notes: string | null;
  items: {
    id: string;
    description: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes: string | null;
    order: number;
  }[];
}

interface BudgetForm {
  name: string;
  code: string;
  description: string;
  projectId: string;
  status: string;
  validUntil: string;
  discount: string;
  notes: string;
}

// Fetch budget
async function fetchBudget(id: string): Promise<Budget> {
  const response = await fetch(`/api/orcamentos/${id}`);
  if (!response.ok) throw new Error('Erro ao carregar orçamento');
  const data = await response.json();
  return data.data || data;
}

// Fetch projects for dropdown
async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/projetos?limit=100');
  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

export default function EditarOrcamentoPage() {
  const { user, isAuthenticated, isLoading: sessionLoading } = useSession();
  const router = useRouter();
  const params = useParams();
  const budgetId = params.id as string;
  const { toast } = useToast();

  const [form, setForm] = useState<BudgetForm>({
    name: '',
    code: '',
    description: '',
    projectId: '',
    status: 'draft',
    validUntil: '',
    discount: '',
    notes: '',
  });
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if not authenticated
  if (!sessionLoading && !isAuthenticated) {
    redirect('/login');
  }

  // Fetch budget
  const { data: budget, isLoading: budgetLoading } = useQuery({
    queryKey: ['budget', budgetId],
    queryFn: () => fetchBudget(budgetId),
    enabled: isAuthenticated && !!budgetId,
  });

  // Fetch projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-list'],
    queryFn: fetchProjects,
    enabled: isAuthenticated,
  });

  // Populate form when budget data loads
  useEffect(() => {
    if (budget) {
      setForm({
        name: budget.name || '',
        code: budget.code || '',
        description: budget.description || '',
        projectId: budget.projectId || '',
        status: budget.status || 'draft',
        validUntil: budget.validUntil ? budget.validUntil.split('T')[0] : '',
        discount: budget.discount ? formatCurrency(budget.discount) : '',
        notes: budget.notes || '',
      });

      // Populate items
      if (budget.items && budget.items.length > 0) {
        setItems(
          budget.items
            .sort((a, b) => a.order - b.order)
            .map((item) => ({
              id: item.id,
              description: item.description,
              unit: item.unit,
              quantity: item.quantity.toString(),
              unitPrice: formatCurrency(item.unitPrice),
              totalPrice: item.totalPrice,
              notes: item.notes || '',
              order: item.order,
            }))
        );
      }
    }
  }, [budget]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Items management
  const addItem = () => {
    const newOrder = items.length > 0 ? Math.max(...items.map(i => i.order)) + 1 : 0;
    const newItem: BudgetItem = {
      id: `temp-${Date.now()}`,
      description: '',
      unit: 'un',
      quantity: '',
      unitPrice: '',
      totalPrice: 0,
      notes: '',
      order: newOrder,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof BudgetItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        // Calculate total price
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = parseFloat(updated.quantity.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
          const price = parseFloat(updated.unitPrice.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
          updated.totalPrice = qty * price;
        }

        return updated;
      })
    );
  };

  // Move item up/down
  const moveItem = (id: string, direction: 'up' | 'down') => {
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;

      const newItems = [...prev];
      if (direction === 'up' && index > 0) {
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      } else if (direction === 'down' && index < prev.length - 1) {
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
      }

      // Update order
      return newItems.map((item, idx) => ({ ...item, order: idx }));
    });
  };

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const discount = parseFloat(form.discount.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
    const total = subtotal - discount;
    return { subtotal, discount, total };
  }, [items, form.discount]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (items.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Adicione pelo menos um item ao orçamento',
        variant: 'destructive',
      });
      return false;
    }

    // Validate items
    const invalidItems = items.filter(
      (item) => !item.description.trim() || !item.quantity || !item.unitPrice
    );
    if (invalidItems.length > 0) {
      toast({
        title: 'Atenção',
        description: 'Preencha todos os campos obrigatórios dos itens',
        variant: 'destructive',
      });
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        description: form.description.trim() || null,
        projectId: form.projectId || null,
        status: form.status,
        validUntil: form.validUntil || null,
        discount: totals.discount,
        notes: form.notes.trim() || null,
        items: items.map((item, index) => ({
          id: item.id.startsWith('temp-') ? undefined : item.id,
          description: item.description.trim(),
          unit: item.unit,
          quantity: parseFloat(item.quantity.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0,
          unitPrice: parseFloat(item.unitPrice.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0,
          totalPrice: item.totalPrice,
          notes: item.notes.trim() || null,
          order: index,
        })),
      };

      const response = await fetch(`/api/orcamentos/${budgetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar orçamento');
      }

      toast({
        title: 'Sucesso',
        description: 'Orçamento atualizado com sucesso',
      });

      router.push(`/orcamentos/${budgetId}`);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao atualizar orçamento',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sessionLoading || budgetLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orcamentos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orçamento não encontrado</h1>
          </div>
        </div>
      </div>
    );
  }

  // Check if budget can be edited
  if (budget.status !== 'draft' && budget.status !== 'revision') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orcamentos">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Editar Orçamento</h1>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Orçamento não pode ser editado</h3>
            <p className="text-muted-foreground mb-4">
              Apenas orçamentos em rascunho ou em revisão podem ser editados.
            </p>
            <Button asChild>
              <Link href={`/orcamentos/${budgetId}`}>
                Voltar para Detalhes
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/orcamentos/${budgetId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Orçamento</h1>
          <p className="text-muted-foreground">
            {budget.name}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>
                  Dados principais do orçamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nome do Orçamento <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Ex: Orçamento Construção Residencial"
                      value={form.name}
                      onChange={handleInputChange}
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name}</p>
                    )}
                  </div>

                  {/* Code */}
                  <div className="space-y-2">
                    <Label htmlFor="code">Código</Label>
                    <Input
                      id="code"
                      name="code"
                      placeholder="Ex: ORC-2024-001"
                      value={form.code}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Descreva o orçamento..."
                    value={form.description}
                    onChange={handleInputChange}
                    rows={2}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {/* Project */}
                  <div className="space-y-2">
                    <Label htmlFor="projectId">Projeto</Label>
                    <Select
                      value={form.projectId}
                      onValueChange={(v) => handleSelectChange('projectId', v)}
                      disabled={projectsLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o projeto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sem projeto</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.code ? `${project.code} - ` : ''}{project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={form.status}
                      onValueChange={(v) => handleSelectChange('status', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(BUDGET_STATUS).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Valid Until */}
                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Válido Até</Label>
                    <Input
                      id="validUntil"
                      name="validUntil"
                      type="date"
                      value={form.validUntil}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Itens do Orçamento</CardTitle>
                    <CardDescription>
                      Adicione os itens que compõem o orçamento
                    </CardDescription>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {items.length === 0 ? (
                  <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <DollarSign className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground mb-4">
                      Nenhum item adicionado
                    </p>
                    <Button type="button" variant="outline" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Primeiro Item
                    </Button>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-[5%]"></TableHead>
                          <TableHead className="w-[35%]">Descrição</TableHead>
                          <TableHead className="w-[10%]">Un.</TableHead>
                          <TableHead className="w-[12%]">Qtd</TableHead>
                          <TableHead className="w-[15%]">Preço Unit.</TableHead>
                          <TableHead className="w-[15%]">Total</TableHead>
                          <TableHead className="w-[8%]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => moveItem(item.id, 'up')}
                                  disabled={index === 0}
                                >
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => moveItem(item.id, 'down')}
                                  disabled={index === items.length - 1}
                                >
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Descrição do item"
                                value={item.description}
                                onChange={(e) =>
                                  updateItem(item.id, 'description', e.target.value)
                                }
                                className="border-0 h-8"
                              />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={item.unit}
                                onValueChange={(v) => updateItem(item.id, 'unit', v)}
                              >
                                <SelectTrigger className="border-0 h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {MEASUREMENT_UNITS.map((unit) => (
                                    <SelectItem key={unit.value} value={unit.value}>
                                      {unit.value}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="0"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(item.id, 'quantity', e.target.value)
                                }
                                className="border-0 h-8 text-right"
                                type="number"
                                step="0.01"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="R$ 0,00"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  updateItem(item.id, 'unitPrice', e.target.value)
                                }
                                className="border-0 h-8 text-right"
                              />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.totalPrice)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Totals */}
                {items.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal:</span>
                          <span>{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Desconto:</span>
                          <span className="text-red-600">-{formatCurrency(totals.discount)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                          <span>Total:</span>
                          <span className="text-green-600">{formatCurrency(totals.total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Discount */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Desconto</CardTitle>
                <CardDescription>
                  Aplique um desconto ao orçamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="discount">Valor do Desconto</Label>
                  <Input
                    id="discount"
                    name="discount"
                    placeholder="R$ 0,00"
                    value={form.discount}
                    onChange={handleInputChange}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observações</CardTitle>
                <CardDescription>
                  Notas adicionais sobre o orçamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Observações gerais..."
                  value={form.notes}
                  onChange={handleInputChange}
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Itens:</span>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Desconto:</span>
                  <span className="text-red-600">-{formatCurrency(totals.discount)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-green-600">{formatCurrency(totals.total)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/orcamentos/${budgetId}`)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
