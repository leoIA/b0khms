// =============================================================================
// ConstrutorPro - Editar Material Page
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
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { MEASUREMENT_UNITS } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

interface Supplier {
  id: string;
  name: string;
}

interface Material {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  unitCost: number;
  unitPrice: number | null;
  supplierId: string | null;
  stockQuantity: number | null;
  minStock: number | null;
  category: string | null;
  isActive: boolean;
}

const MATERIAL_CATEGORIES = [
  'Estrutural',
  'Acabamento',
  'Hidráulico',
  'Elétrico',
  'Revestimento',
  'Pintura',
  'Madeira',
  'Metalúrgico',
  'Ferramentas',
  'Segurança',
  'Outros',
];

export default function EditarMaterialPage() {
  const router = useRouter();
  const params = useParams();
  const materialId = params.id as string;
  const { toast } = useToast();
  
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login');
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    unit: 'un',
    unitCost: '',
    unitPrice: '',
    supplierId: '',
    stockQuantity: '',
    minStock: '',
    category: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (session && materialId) {
      fetchMaterial();
      fetchSuppliers();
    }
  }, [session, materialId]);

  const fetchMaterial = async () => {
    try {
      const response = await fetch(`/api/materiais/${materialId}`);
      const data = await response.json();

      if (response.ok && data.data) {
        const material: Material = data.data;
        setFormData({
          code: material.code,
          name: material.name,
          description: material.description || '',
          unit: material.unit,
          unitCost: material.unitCost.toString(),
          unitPrice: material.unitPrice?.toString() || '',
          supplierId: material.supplierId || '',
          stockQuantity: material.stockQuantity?.toString() || '',
          minStock: material.minStock?.toString() || '',
          category: material.category || '',
          isActive: material.isActive,
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Material não encontrado.',
          variant: 'destructive',
        });
        router.push('/materiais');
      }
    } catch (error) {
      console.error('Error fetching material:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar material.',
        variant: 'destructive',
      });
      router.push('/materiais');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/fornecedores?limit=100&status=active');
      const data = await response.json();
      if (data.data) {
        setSuppliers(data.data);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Código é obrigatório';
    }
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    if (!formData.unit) {
      newErrors.unit = 'Unidade é obrigatória';
    }
    if (!formData.unitCost || parseFloat(formData.unitCost) < 0) {
      newErrors.unitCost = 'Custo unitário deve ser maior ou igual a zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/materiais/${materialId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: formData.code.trim(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          unit: formData.unit,
          unitCost: parseFloat(formData.unitCost),
          unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
          supplierId: formData.supplierId || null,
          stockQuantity: formData.stockQuantity
            ? parseFloat(formData.stockQuantity)
            : null,
          minStock: formData.minStock ? parseFloat(formData.minStock) : null,
          category: formData.category || null,
          isActive: formData.isActive,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Material atualizado com sucesso.',
        });
        router.push('/materiais');
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Não foi possível atualizar o material.',
          variant: 'destructive',
        });
        if (data.details) {
          const fieldErrors: Record<string, string> = {};
          Object.entries(data.details).forEach(([field, messages]) => {
            fieldErrors[field] = (messages as string[])[0];
          });
          setErrors(fieldErrors);
        }
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar material.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Card>
          <CardContent className="p-6 space-y-6">
            <Skeleton className="h-64 w-full" />
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
          <Link href="/materiais">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Material</h1>
          <p className="text-muted-foreground">
            Atualize os dados do material
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informações do Material</CardTitle>
            <CardDescription>
              Atualize os dados do material conforme necessário
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="code">
                  Código <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="Ex: MAT-001"
                  className={errors.code ? 'border-destructive' : ''}
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Cimento CP-II-E-32"
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">
                  Unidade <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) =>
                    setFormData({ ...formData, unit: value })
                  }
                >
                  <SelectTrigger className={errors.unit ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEASUREMENT_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.unit && (
                  <p className="text-sm text-destructive">{errors.unit}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplier">Fornecedor</Label>
                <Select
                  value={formData.supplierId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, supplierId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descrição detalhada do material..."
                rows={3}
              />
            </div>

            {/* Financial Info */}
            <div className="space-y-4">
              <h3 className="font-medium">Informações Financeiras</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="unitCost">
                    Custo Unitário <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id="unitCost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unitCost}
                      onChange={(e) =>
                        setFormData({ ...formData, unitCost: e.target.value })
                      }
                      placeholder="0,00"
                      className={`pl-10 ${errors.unitCost ? 'border-destructive' : ''}`}
                    />
                  </div>
                  {errors.unitCost && (
                    <p className="text-sm text-destructive">{errors.unitCost}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitPrice">Preço de Venda</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id="unitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unitPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, unitPrice: e.target.value })
                      }
                      placeholder="0,00"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stock Info */}
            <div className="space-y-4">
              <h3 className="font-medium">Controle de Estoque</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stockQuantity">Quantidade em Estoque</Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.stockQuantity}
                    onChange={(e) =>
                      setFormData({ ...formData, stockQuantity: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minStock">Estoque Mínimo</Label>
                  <Input
                    id="minStock"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({ ...formData, minStock: e.target.value })
                    }
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Alerta quando o estoque ficar abaixo deste valor
                  </p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="isActive">Material Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Desative para ocultar este material dos orçamentos
                </p>
              </div>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t">
              <Button type="button" variant="outline" asChild>
                <Link href="/materiais">Cancelar</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar Alterações
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
