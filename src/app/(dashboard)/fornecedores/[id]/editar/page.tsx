// =============================================================================
// ConstrutorPro - Editar Fornecedor Page
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BRAZILIAN_STATES, SUPPLIER_STATUS } from '@/lib/constants';
import type { Supplier, SupplierStatus } from '@/types';

// -----------------------------------------------------------------------------
// Supplier Categories
// -----------------------------------------------------------------------------

const SUPPLIER_CATEGORIES = [
  { value: 'construcao', label: 'Construção' },
  { value: 'eletrico', label: 'Elétrico' },
  { value: 'hidraulico', label: 'Hidráulico' },
  { value: 'acabamento', label: 'Acabamento' },
  { value: 'pintura', label: 'Pintura' },
  { value: 'movel', label: 'Móveis e Decoração' },
  { value: 'ferragem', label: 'Ferragem' },
  { value: 'ferramentas', label: 'Ferramentas' },
  { value: 'seguranca', label: 'Segurança' },
  { value: 'locacao', label: 'Locação de Equipamentos' },
  { value: 'servicos', label: 'Serviços' },
  { value: 'outros', label: 'Outros' },
];

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function EditarFornecedorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tradeName: '',
    cnpj: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    contactPerson: '',
    category: '',
    notes: '',
    status: 'active' as SupplierStatus,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const supplierId = params.id as string;

  // Fetch supplier
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchSupplier = async () => {
      if (!session) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/fornecedores/${supplierId}`);
        const data = await response.json();

        if (data.success) {
          const supplier = data.data as Supplier;
          setFormData({
            name: supplier.name || '',
            tradeName: supplier.tradeName || '',
            cnpj: supplier.cnpj || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            mobile: supplier.mobile || '',
            address: supplier.address || '',
            city: supplier.city || '',
            state: supplier.state || '',
            zipCode: supplier.zipCode || '',
            contactPerson: supplier.contactPerson || '',
            category: supplier.category || '',
            notes: supplier.notes || '',
            status: supplier.status || 'active',
          });
        } else {
          toast({
            title: 'Erro',
            description: data.error || 'Erro ao carregar fornecedor.',
            variant: 'destructive',
          });
          router.push('/fornecedores');
        }
      } catch {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar fornecedor.',
          variant: 'destructive',
        });
        router.push('/fornecedores');
      } finally {
        setIsLoading(false);
      }
    };

    if (session && supplierId) {
      fetchSupplier();
    }
  }, [session, supplierId, router, toast]);

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle select change
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Format CNPJ
  const formatCnpj = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  // Format phone
  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  // Format CEP
  const formatCep = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  // Handle formatted input
  const handleFormattedInput = (
    e: React.ChangeEvent<HTMLInputElement>,
    formatter: (value: string) => string
  ) => {
    const { name, value } = e.target;
    const formatted = formatter(value);
    setFormData((prev) => ({ ...prev, [name]: formatted }));
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (formData.zipCode && formData.zipCode.replace(/\D/g, '').length !== 8) {
      newErrors.zipCode = 'CEP inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, corrija os erros no formulário.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        ...formData,
        cnpj: formData.cnpj ? formData.cnpj.replace(/\D/g, '') : undefined,
        phone: formData.phone ? formData.phone.replace(/\D/g, '') : undefined,
        mobile: formData.mobile ? formData.mobile.replace(/\D/g, '') : undefined,
        zipCode: formData.zipCode ? formData.zipCode.replace(/\D/g, '') : undefined,
      };

      const response = await fetch(`/api/fornecedores/${supplierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Fornecedor atualizado com sucesso.',
        });
        router.push('/fornecedores');
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao atualizar fornecedor.',
          variant: 'destructive',
        });
        if (data.details) {
          const newErrors: Record<string, string> = {};
          Object.entries(data.details).forEach(([field, messages]) => {
            newErrors[field] = (messages as string[])[0];
          });
          setErrors(newErrors);
        }
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar fornecedor.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (status === 'loading' || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/fornecedores">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Fornecedor</h1>
          <p className="text-muted-foreground">
            Atualize os dados do fornecedor
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
                <CardTitle>Informações da Empresa</CardTitle>
                <CardDescription>
                  Dados básicos do fornecedor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="name">
                      Razão Social <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Nome da empresa"
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tradeName">Nome Fantasia</Label>
                    <Input
                      id="tradeName"
                      name="tradeName"
                      value={formData.tradeName}
                      onChange={handleChange}
                      placeholder="Nome fantasia"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ</Label>
                    <Input
                      id="cnpj"
                      name="cnpj"
                      value={formData.cnpj}
                      onChange={(e) => handleFormattedInput(e, formatCnpj)}
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@exemplo.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactPerson">Pessoa de Contato</Label>
                    <Input
                      id="contactPerson"
                      name="contactPerson"
                      value={formData.contactPerson}
                      onChange={handleChange}
                      placeholder="Nome do contato"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={(e) => handleFormattedInput(e, formatPhone)}
                      placeholder="(00) 0000-0000"
                      maxLength={14}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mobile">Celular</Label>
                    <Input
                      id="mobile"
                      name="mobile"
                      value={formData.mobile}
                      onChange={(e) => handleFormattedInput(e, formatPhone)}
                      placeholder="(00) 00000-0000"
                      maxLength={15}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Endereço</CardTitle>
                <CardDescription>
                  Informações de localização
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Rua, número, complemento"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => handleFormattedInput(e, formatCep)}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                    {errors.zipCode && (
                      <p className="text-sm text-destructive">{errors.zipCode}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Cidade"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Select
                      value={formData.state}
                      onValueChange={(value) => handleSelectChange('state', value)}
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
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
                <CardDescription>
                  Informações adicionais sobre o fornecedor
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Observações, condições de pagamento, prazos..."
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Status e Categoria</CardTitle>
                <CardDescription>
                  Classificação do fornecedor
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SUPPLIER_STATUS).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleSelectChange('category', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPLIER_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? (
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
                  asChild
                  disabled={isSaving}
                >
                  <Link href="/fornecedores">Cancelar</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
