// =============================================================================
// ConstrutorPro - Visualizar Composição Page
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Pencil,
  DollarSign,
  Layers,
} from 'lucide-react';
import { MEASUREMENT_UNITS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CompositionItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  itemType: string;
  coefficient: number | null;
  order: number;
}

interface Composition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  totalCost: number;
  totalPrice: number;
  profitMargin: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: CompositionItem[];
}

const ITEM_TYPES = [
  { value: 'material', label: 'Material' },
  { value: 'labor', label: 'Mão de Obra' },
  { value: 'equipment', label: 'Equipamento' },
  { value: 'service', label: 'Serviço' },
  { value: 'other', label: 'Outro' },
];

export default function VisualizarComposicaoPage() {
  const router = useRouter();
  const params = useParams();
  const compositionId = params.id as string;
  const { toast } = useToast();
  
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/login');
    },
  });

  const [loading, setLoading] = useState(true);
  const [composition, setComposition] = useState<Composition | null>(null);

  useEffect(() => {
    if (session && compositionId) {
      fetchComposition();
    }
  }, [session, compositionId]);

  const fetchComposition = async () => {
    try {
      const response = await fetch(`/api/composicoes/${compositionId}`);
      const data = await response.json();

      if (response.ok && data.data) {
        setComposition(data.data);
      } else {
        toast({
          title: 'Erro',
          description: 'Composição não encontrada.',
          variant: 'destructive',
        });
        router.push('/composicoes');
      }
    } catch (error) {
      console.error('Error fetching composition:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar composição.',
        variant: 'destructive',
      });
      router.push('/composicoes');
    } finally {
      setLoading(false);
    }
  };

  const getUnitLabel = (unit: string) => {
    return MEASUREMENT_UNITS.find((u) => u.value === unit)?.label || unit;
  };

  const getItemTypeLabel = (type: string) => {
    return ITEM_TYPES.find((t) => t.value === type)?.label || type;
  };

  // Group items by type
  const groupedItems = composition?.items.reduce(
    (acc, item) => {
      const type = item.itemType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(item);
      return acc;
    },
    {} as Record<string, CompositionItem[]>
  );

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
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="lg:col-span-2 h-64" />
        </div>
      </div>
    );
  }

  if (!composition) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/composicoes">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {composition.name}
              </h1>
              <Badge
                variant={composition.isActive ? 'default' : 'secondary'}
              >
                {composition.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Código: {composition.code} | Unidade: {getUnitLabel(composition.unit)}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/composicoes/${composition.id}/editar`}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Informações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Descrição</p>
              <p className="mt-1">
                {composition.description || 'Sem descrição'}
              </p>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total de Itens</span>
                <span className="font-medium">{composition.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margem de Lucro</span>
                <span className="font-medium">{composition.profitMargin}%</span>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Custo Total</span>
                <span className="font-medium">
                  {formatCurrency(composition.totalCost)}
                </span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-medium">Preço de Venda</span>
                <span className="font-bold text-green-600">
                  {formatCurrency(composition.totalPrice)}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t text-xs text-muted-foreground">
              <p>Criado em: {formatDate(composition.createdAt)}</p>
              <p>Atualizado em: {formatDate(composition.updatedAt)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Items Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Itens da Composição
            </CardTitle>
            <CardDescription>
              Detalhamento dos custos por item
            </CardDescription>
          </CardHeader>
          <CardContent>
            {composition.items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum item cadastrado</p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedItems &&
                  Object.entries(groupedItems).map(([type, items]) => (
                    <div key={type}>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Badge variant="outline">{getItemTypeLabel(type)}</Badge>
                        <span className="text-sm text-muted-foreground">
                          ({items.length} {items.length === 1 ? 'item' : 'itens'})
                        </span>
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Unidade</TableHead>
                            <TableHead className="text-right">Qtd</TableHead>
                            <TableHead className="text-right">
                              Custo Unit.
                            </TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">
                                {item.description}
                                {item.coefficient && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    (coef: {item.coefficient})
                                  </span>
                                )}
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
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="flex justify-end mt-2 text-sm">
                        <span className="text-muted-foreground">
                          Subtotal {getItemTypeLabel(type)}:
                        </span>
                        <span className="font-medium ml-2">
                          {formatCurrency(
                            items.reduce((sum, item) => sum + item.totalCost, 0)
                          )}
                        </span>
                      </div>
                    </div>
                  ))}

                {/* Grand Total */}
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Custo Total:</span>
                    <span className="font-medium">
                      {formatCurrency(composition.totalCost)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Margem de Lucro ({composition.profitMargin}%):</span>
                    <span>
                      {formatCurrency(
                        composition.totalCost * (composition.profitMargin / 100)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-green-600">
                    <span>Preço de Venda:</span>
                    <span>{formatCurrency(composition.totalPrice)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
