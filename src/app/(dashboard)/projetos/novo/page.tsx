// =============================================================================
// ConstrutorPro - Projetos - Novo Projeto
// =============================================================================

'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
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
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { PROJECT_STATUS, BRAZILIAN_STATES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

// Types
interface Client {
  id: string;
  name: string;
}

interface User {
  id: string;
  name: string;
}

// Fetch clients for dropdown
async function fetchClients(): Promise<Client[]> {
  const response = await fetch('/api/clientes?limit=100');
  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

// Fetch users (managers) for dropdown
async function fetchManagers(): Promise<User[]> {
  const response = await fetch('/api/usuarios?limit=100');
  if (!response.ok) return [];
  const data = await response.json();
  return data.data || [];
}

// Form state type
interface ProjectForm {
  name: string;
  code: string;
  description: string;
  clientId: string;
  status: string;
  startDate: string;
  endDate: string;
  estimatedValue: string;
  address: string;
  city: string;
  state: string;
  managerId: string;
  notes: string;
}

const initialForm: ProjectForm = {
  name: '',
  code: '',
  description: '',
  clientId: '',
  status: 'planning',
  startDate: '',
  endDate: '',
  estimatedValue: '',
  address: '',
  city: '',
  state: '',
  managerId: '',
  notes: '',
};

export default function NovoProjetoPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login');
    },
  });
  const { toast } = useToast();
  const [form, setForm] = useState<ProjectForm>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients-list'],
    queryFn: fetchClients,
    enabled: !!session,
  });

  // Fetch managers
  const { data: managers = [], isLoading: managersLoading } = useQuery({
    queryKey: ['managers-list'],
    queryFn: fetchManagers,
    enabled: !!session,
  });

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

    if (!form.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (start > end) {
        newErrors.endDate = 'Data de término deve ser posterior à data de início';
      }
    }

    if (form.estimatedValue) {
      const value = parseFloat(form.estimatedValue.replace(/[^\d,.-]/g, '').replace(',', '.'));
      if (isNaN(value) || value < 0) {
        newErrors.estimatedValue = 'Valor estimado inválido';
      }
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
        name: form.name.trim(),
        code: form.code.trim() || null,
        description: form.description.trim() || null,
        clientId: form.clientId || null,
        status: form.status,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        estimatedValue: form.estimatedValue
          ? parseFloat(form.estimatedValue.replace(/[^\d,.-]/g, '').replace(',', '.'))
          : 0,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state || null,
        managerId: form.managerId || null,
        notes: form.notes.trim() || null,
      };

      const response = await fetch('/api/projetos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar projeto');
      }

      toast({
        title: 'Sucesso',
        description: 'Projeto criado com sucesso',
      });

      router.push(`/projetos/${data.data.id}`);
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar projeto',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const isLoading = clientsLoading || managersLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/projetos">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Novo Projeto</h1>
          <p className="text-muted-foreground">
            Cadastre um novo projeto
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
                <CardTitle>Informações Básicas</CardTitle>
                <CardDescription>
                  Dados principais do projeto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nome do Projeto <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Ex: Residencial Parque Verde"
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
                      placeholder="Ex: PRJ-2024-001"
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
                    placeholder="Descreva o projeto..."
                    value={form.description}
                    onChange={handleInputChange}
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
                        {Object.entries(PROJECT_STATUS).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {value.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Manager */}
                  <div className="space-y-2">
                    <Label htmlFor="managerId">Gerente Responsável</Label>
                    <Select
                      value={form.managerId}
                      onValueChange={(v) => handleSelectChange('managerId', v)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o gerente" />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Estimated Value */}
                  <div className="space-y-2">
                    <Label htmlFor="estimatedValue">Valor Estimado</Label>
                    <Input
                      id="estimatedValue"
                      name="estimatedValue"
                      placeholder="R$ 0,00"
                      value={form.estimatedValue}
                      onChange={handleCurrencyChange}
                      className={errors.estimatedValue ? 'border-destructive' : ''}
                    />
                    {errors.estimatedValue && (
                      <p className="text-xs text-destructive">{errors.estimatedValue}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle>Localização</CardTitle>
                <CardDescription>
                  Endereço do projeto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Ex: Rua das Flores, 123"
                    value={form.address}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {/* City */}
                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="Ex: São Paulo"
                      value={form.city}
                      onChange={handleInputChange}
                    />
                  </div>

                  {/* State */}
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Select
                      value={form.state}
                      onValueChange={(v) => handleSelectChange('state', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRAZILIAN_STATES.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Empty space for alignment */}
                  <div />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Cronograma</CardTitle>
                <CardDescription>
                  Datas do projeto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    value={form.startDate}
                    onChange={handleInputChange}
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="endDate">Data de Término</Label>
                  <Input
                    id="endDate"
                    name="endDate"
                    type="date"
                    value={form.endDate}
                    onChange={handleInputChange}
                    className={errors.endDate ? 'border-destructive' : ''}
                  />
                  {errors.endDate && (
                    <p className="text-xs text-destructive">{errors.endDate}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
                <CardDescription>
                  Notas adicionais sobre o projeto
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
                      Salvar Projeto
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/projetos')}
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
