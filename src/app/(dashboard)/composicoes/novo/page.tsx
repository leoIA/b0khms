// =============================================================================
// ConstrutorPro - Nova Composição Page
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Pencil,
  DollarSign,
  GripVertical,
} from 'lucide-react';
import { MEASUREMENT_UNITS } from '@/lib/constants';
import { formatCurrency } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Material {
  id: string;
  code: string;
  name: string;
  unit: string;
  unitCost: number;
}

interface CompositionItem {
  id: string;
  tempId: string;
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  itemType: 'material' | 'labor' | 'equipment' | 'service' | 'other';
  materialId?: string;
  coefficient?: number;
  order: number;
}

const ITEM_TYPES = [
  { value: 'material', label: 'Material' },
  { value: 'labor', label: 'Mão de Obra' },
  { value: 'equipment', label: 'Equipamento' },
  { value: 'service', label: 'Serviço' },
  { value: 'other', label: 'Outro' },
];

export default function NovaComposicaoPage() {
  const router = useRouter();
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login');
    },
  });
  
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    unit: 'm2',
    profitMargin: '30',
    isActive: true,
  });

  const [items, setItems] = useState<CompositionItem[]>([]);
  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<CompositionItem | null>(null);
  const [itemFormData, setItemFormData] = useState({
    description: '',
    unit: 'un',
    quantity: '',
    unitCost: '',
    itemType: 'material' as 'material' | 'labor' | 'equipment' | 'service' | 'other',
    materialId: '',
    coefficient: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (session) {
      fetchMaterials();
    }
  }, [session]);

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/materiais?limit=200&isActive=true');
      const data = await response.json();
      if (data.data) {
        setMaterials(data.data);
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  // Calculate totals
  const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
  const profitMargin = parseFloat(formData.profitMargin) || 0;
  const totalPrice = totalCost * (1 + profitMargin / 100);

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
    if (profitMargin < 0 || profitMargin > 100) {
      newErrors.profitMargin = 'Margem deve estar entre 0 e 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setItemFormData({
      description: '',
      unit: 'un',
      quantity: '',
      unitCost: '',
      itemType: 'material',
      materialId: '',
      coefficient: '',
    });
    setItemDialog(true);
  };

  const handleEditItem = (item: CompositionItem) => {
    setEditingItem(item);
    setItemFormData({
      description: item.description,
      unit: item.unit,
      quantity: item.quantity.toString(),
      unitCost: item.unitCost.toString(),
      itemType: item.itemType,
      materialId: item.materialId || '',
      coefficient: item.coefficient?.toString() || '',
    });
    setItemDialog(true);
  };

  const handleSaveItem = () => {
    if (!itemFormData.description.trim()) {
      toast({
        title: 'Erro',
        description: 'Descrição do item é obrigatória.',
        variant: 'destructive',
      });
      return;
    }

    const quantity = parseFloat(itemFormData.quantity) || 0;
    const unitCost = parseFloat(itemFormData.unitCost) || 0;

    if (quantity <= 0) {
      toast({
        title: 'Erro',
        description: 'Quantidade deve ser maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    const itemData: CompositionItem = {
      id: editingItem?.id || '',
      tempId: editingItem?.tempId || `temp-${Date.now()}`,
      description: itemFormData.description.trim(),
      unit: itemFormData.unit,
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      itemType: itemFormData.itemType,
      materialId: itemFormData.materialId || undefined,
      coefficient: itemFormData.coefficient
        ? parseFloat(itemFormData.coefficient)
        : undefined,
      order: editingItem?.order ?? items.length,
    };

    if (editingItem) {
      setItems(
        items.map((item) =>
          item.tempId === editingItem.tempId ? itemData : item
        )
      );
    } else {
      setItems([...items, itemData]);
    }

    setItemDialog(false);
  };

  const handleDeleteItem = (tempId: string) => {
    setItems(items.filter((item) => item.tempId !== tempId));
  };

  const handleMaterialSelect = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    if (material) {
      setItemFormData({
        ...itemFormData,
        materialId,
        description: material.name,
        unit: material.unit,
        unitCost: material.unitCost.toString(),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/composicoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: formData.code.trim(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          unit: formData.unit,
          profitMargin,
          isActive: formData.isActive,
          items: items.map((item, index) => ({
            description: item.description,
            unit: item.unit,
            quantity: item.quantity,
            unitCost: item.unitCost,
            itemType: item.itemType,
            materialId: item.materialId,
            coefficient: item.coefficient,
            order: index,
          })),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Composição criada com sucesso.',
        });
        router.push('/composicoes');
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Não foi possível criar a composição.',
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
        description: 'Erro ao criar composição.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getUnitLabel = (unit: string) => {
    return MEASUREMENT_UNITS.find((u) => u.value === unit)?.label || unit;
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/composicoes">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Composição</h1>
          <p className="text-muted-foreground">
            Crie uma nova composição de preços
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>
                Dados principais da composição
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  placeholder="Ex: COMP-001"
                  className={errors.code ? 'border-destructive' : ''}
                />
                {errors.code && (
                  <p className="text-sm text-destructive">{errors.code}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Alvenaria de Tijolo Cerâmico"
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
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Descrição da composição..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profitMargin">Margem de Lucro (%)</Label>
                <Input
                  id="profitMargin"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.profitMargin}
                  onChange={(e) =>
                    setFormData({ ...formData, profitMargin: e.target.value })
                  }
                  className={errors.profitMargin ? 'border-destructive' : ''}
                />
                {errors.profitMargin && (
                  <p className="text-sm text-destructive">
                    {errors.profitMargin}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Composição Ativa</Label>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Itens da Composição</CardTitle>
                  <CardDescription>
                    Adicione materiais, mão de obra, equipamentos e serviços
                  </CardDescription>
                </div>
                <Button type="button" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum item adicionado</p>
                  <p className="text-sm">
                    Clique em &quot;Adicionar Item&quot; para começar
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Custo Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.tempId}>
                        <TableCell>
                          <GripVertical className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.description}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {ITEM_TYPES.find((t) => t.value === item.itemType)
                              ?.label || item.itemType}
                          </Badge>
                        </TableCell>
                        <TableCell>{getUnitLabel(item.unit)}</TableCell>
                        <TableCell className="text-right">
                          {item.quantity.toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitCost)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.totalCost)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditItem(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(item.tempId)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Totals */}
              {items.length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Custo Total:</span>
                    <span className="font-medium">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Margem de Lucro:</span>
                    <span>{profitMargin}%</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-green-600">
                    <span>Preço de Venda:</span>
                    <span>{formatCurrency(totalPrice)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 mt-6">
          <Button type="button" variant="outline" asChild>
            <Link href="/composicoes">Cancelar</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar Composição
          </Button>
        </div>
      </form>

      {/* Item Dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Item' : 'Adicionar Item'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do item da composição
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Item</Label>
              <Select
                value={itemFormData.itemType}
                onValueChange={(value: typeof itemFormData.itemType) =>
                  setItemFormData({ ...itemFormData, itemType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {itemFormData.itemType === 'material' && (
              <div className="space-y-2">
                <Label>Selecionar Material</Label>
                <Select onValueChange={handleMaterialSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um material" />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.code} - {material.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="itemDescription">
                Descrição <span className="text-destructive">*</span>
              </Label>
              <Input
                id="itemDescription"
                value={itemFormData.description}
                onChange={(e) =>
                  setItemFormData({
                    ...itemFormData,
                    description: e.target.value,
                  })
                }
                placeholder="Descrição do item"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="itemUnit">Unidade</Label>
                <Select
                  value={itemFormData.unit}
                  onValueChange={(value) =>
                    setItemFormData({ ...itemFormData, unit: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEASUREMENT_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemQuantity">
                  Quantidade <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="itemQuantity"
                  type="number"
                  step="0.001"
                  min="0"
                  value={itemFormData.quantity}
                  onChange={(e) =>
                    setItemFormData({
                      ...itemFormData,
                      quantity: e.target.value,
                    })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="itemUnitCost">
                  Custo Unitário <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="itemUnitCost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={itemFormData.unitCost}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        unitCost: e.target.value,
                      })
                    }
                    placeholder="0,00"
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemCoefficient">Coeficiente</Label>
                <Input
                  id="itemCoefficient"
                  type="number"
                  step="0.0001"
                  value={itemFormData.coefficient}
                  onChange={(e) =>
                    setItemFormData({
                      ...itemFormData,
                      coefficient: e.target.value,
                    })
                  }
                  placeholder="Opcional"
                />
              </div>
            </div>

            {itemFormData.quantity && itemFormData.unitCost && (
              <div className="rounded-lg bg-muted p-3">
                <div className="flex justify-between text-sm">
                  <span>Total:</span>
                  <span className="font-medium">
                    {formatCurrency(
                      (parseFloat(itemFormData.quantity) || 0) *
                        (parseFloat(itemFormData.unitCost) || 0)
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setItemDialog(false)}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveItem}>
              {editingItem ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
