// =============================================================================
// ConstrutorPro - Nova Transação
// =============================================================================

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
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
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { TRANSACTION_CATEGORIES, PAYMENT_STATUS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

// Types
interface Project {
  id: string;
  name: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface Client {
  id: string;
  name: string;
}

// Form state type
interface TransactionForm {
  type: 'income' | 'expense';
  category: string;
  description: string;
  value: string;
  date: string;
  dueDate: string;
  projectId: string;
  supplierId: string;
  clientId: string;
  documentNumber: string;
  notes: string;
  status: string;
}

const initialForm: TransactionForm = {
  type: 'expense',
  category: '',
  description: '',
  value: '',
  date: new Date().toISOString().split('T')[0],
  dueDate: '',
  projectId: '',
  supplierId: '',
  clientId: '',
  documentNumber: '',
  notes: '',
  status: 'pending',
};

// Fetch functions
async function fetchProjects(): Promise<{ data: Project[] }> {
  const response = await fetch('/api/projetos?limit=100');
  return response.json();
}

async function fetchSuppliers(): Promise<{ data: Supplier[] }> {
  const response = await fetch('/api/fornecedores?limit=100');
  return response.json();
}

async function fetchClients(): Promise<{ data: Client[] }> {
  const response = await fetch('/api/clientes?limit=100');
  return response.json();
}

export default function NovaTransacaoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState<TransactionForm>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data for dropdowns
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects-list-transaction'],
    queryFn: fetchProjects,
  });

  const { data: suppliersData, isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers-list-transaction'],
    queryFn: fetchSuppliers,
  });

  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-list-transaction'],
    queryFn: fetchClients,
  });

  const projects = projectsData?.data || [];
  const suppliers = suppliersData?.data || [];
  const clients = clientsData?.data || [];

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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.category) {
      newErrors.category = 'Categoria é obrigatória';
    }

    if (!form.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    if (!form.value) {
      newErrors.value = 'Valor é obrigatório';
    } else {
      const numericValue = parseFloat(form.value.replace(/[^\d,.-]/g, '').replace(',', '.'));
      if (isNaN(numericValue) || numericValue <= 0) {
        newErrors.value = 'Valor deve ser maior que zero';
      }
    }

    if (!form.date) {
      newErrors.date = 'Data é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatCurrency = (value: string): string => {
    const numeric = value.replace(/[^\d]/g, '');
    if (!numeric) return '';
    const number = parseFloat(numeric) / 100;
    return number.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const formatted = formatCurrency(value);
    setForm((prev) => ({ ...prev, [name]: formatted }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        type: form.type,
        category: form.category,
        description: form.description.trim(),
        value: parseFloat(form.value.replace(/[^\d,.-]/g, '').replace(',', '.')),
        date: form.date,
        dueDate: form.dueDate || null,
        projectId: form.projectId || null,
        supplierId: form.supplierId || null,
        clientId: form.clientId || null,
        documentNumber: form.documentNumber.trim() || null,
        notes: form.notes.trim() || null,
        status: form.status,
      };

      const response = await fetch('/api/financeiro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar transação');
      }

      toast({
        title: 'Sucesso',
        description: 'Transação criada com sucesso',
      });

      router.push('/financeiro');
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar transação',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = projectsLoading || suppliersLoading || clientsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/financeiro">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Transação</h1>
          <p className="text-muted-foreground">
            Registre uma nova receita ou despesa
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Transação</CardTitle>
                <CardDescription>
                  Dados principais da transação
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Type */}
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo *</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => handleSelectChange('type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Receita</SelectItem>
                        <SelectItem value="expense">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category">
                      Categoria <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => handleSelectChange('category', v)}
                    >
                      <SelectTrigger className={errors.category ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TRANSACTION_CATEGORIES).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && (
                      <p className="text-xs text-destructive">{errors.category}</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Descrição <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="Ex: Compra de cimento para obra"
                    value={form.description}
                    onChange={handleInputChange}
                    className={errors.description ? 'border-destructive' : ''}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive">{errors.description}</p>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Value */}
                  <div className="space-y-2">
                    <Label htmlFor="value">
                      Valor <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="value"
                      name="value"
                      placeholder="R$ 0,00"
                      value={form.value}
                      onChange={handleCurrencyChange}
                      className={errors.value ? 'border-destructive' : ''}
                    />
                    {errors.value && (
                      <p className="text-xs text-destructive">{errors.value}</p>
                    )}
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
                        {Object.entries(PAYMENT_STATUS).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="date">
                      Data <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      value={form.date}
                      onChange={handleInputChange}
                      className={errors.date ? 'border-destructive' : ''}
                    />
                    {errors.date && (
                      <p className="text-xs text-destructive">{errors.date}</p>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Data de Vencimento</Label>
                    <Input
                      id="dueDate"
                      name="dueDate"
                      type="date"
                      value={form.dueDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Related Entities */}
            <Card>
              <CardHeader>
                <CardTitle>Vínculos</CardTitle>
                <CardDescription>
                  Relacione a transação com projeto, fornecedor ou cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Project */}
                  <div className="space-y-2">
                    <Label htmlFor="projectId">Projeto</Label>
                    <Select
                      value={form.projectId}
                      onValueChange={(v) => handleSelectChange('projectId', v)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o projeto" />
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

                  {/* Supplier */}
                  <div className="space-y-2">
                    <Label htmlFor="supplierId">Fornecedor</Label>
                    <Select
                      value={form.supplierId}
                      onValueChange={(v) => handleSelectChange('supplierId', v)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Client */}
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Cliente</Label>
                    <Select
                      value={form.clientId}
                      onValueChange={(v) => handleSelectChange('clientId', v)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente" />
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
                </div>

                {/* Document Number */}
                <div className="space-y-2">
                  <Label htmlFor="documentNumber">Número do Documento</Label>
                  <Input
                    id="documentNumber"
                    name="documentNumber"
                    placeholder="Ex: NF-12345, REC-001"
                    value={form.documentNumber}
                    onChange={handleInputChange}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
                <CardDescription>
                  Notas adicionais sobre a transação
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
                      Salvar Transação
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/financeiro')}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </CardContent>
            </Card>

            {/* Help */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Dica</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Use o campo "Data de Vencimento" para controlar contas a pagar e receber.
                  Transações vencidas aparecerão em destaque no painel financeiro.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
