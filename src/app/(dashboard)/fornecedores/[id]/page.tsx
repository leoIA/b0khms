// =============================================================================
// ConstrutorPro - Detalhes do Fornecedor Page
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
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Pencil,
  Mail,
  Phone,
  MapPin,
  FileText,
  User,
  Package,
  Truck,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SUPPLIER_STATUS } from '@/lib/constants';
import { formatCurrency } from '@/lib/api';
import type { Supplier, SupplierStatus, Material } from '@/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface SupplierWithRelations extends Supplier {
  materials: Pick<Material, 'id' | 'code' | 'name' | 'unit' | 'unitCost' | 'category' | 'isActive'>[];
  _count: {
    materials: number;
    transactions: number;
  };
}

// Supplier categories
const SUPPLIER_CATEGORIES: Record<string, string> = {
  construcao: 'Construção',
  eletrico: 'Elétrico',
  hidraulico: 'Hidráulico',
  acabamento: 'Acabamento',
  pintura: 'Pintura',
  movel: 'Móveis e Decoração',
  ferragem: 'Ferragem',
  ferramentas: 'Ferramentas',
  seguranca: 'Segurança',
  locacao: 'Locação de Equipamentos',
  servicos: 'Serviços',
  outros: 'Outros',
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function FornecedorDetalhesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const [supplier, setSupplier] = useState<SupplierWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          setSupplier(data.data);
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

  // Format CNPJ
  const formatCnpj = (value?: string) => {
    if (!value) return '-';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  // Format phone
  const formatPhone = (value?: string) => {
    if (!value) return '-';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return value;
  };

  // Get status badge
  const getStatusBadge = (supplierStatus: SupplierStatus) => {
    const config = SUPPLIER_STATUS[supplierStatus];
    return (
      <Badge variant="secondary" className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
  };

  // Get category label
  const getCategoryLabel = (category?: string) => {
    if (!category) return '-';
    return SUPPLIER_CATEGORIES[category] || category;
  };

  // Loading state
  if (status === 'loading' || isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/fornecedores">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{supplier.name}</h1>
              {getStatusBadge(supplier.status)}
            </div>
            {supplier.tradeName && (
              <p className="text-muted-foreground">{supplier.tradeName}</p>
            )}
          </div>
        </div>
        <Button asChild>
          <Link href={`/fornecedores/${supplier.id}/editar`}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">
                      {supplier.email || '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Telefone</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPhone(supplier.phone || supplier.mobile)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">CNPJ</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCnpj(supplier.cnpj)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Pessoa de Contato</p>
                    <p className="text-sm text-muted-foreground">
                      {supplier.contactPerson || '-'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm">
                    {[supplier.address, supplier.city, supplier.state]
                      .filter(Boolean)
                      .join(' - ')}
                  </p>
                  {supplier.zipCode && (
                    <p className="text-sm text-muted-foreground">
                      CEP: {supplier.zipCode.replace(/(\d{5})(\d{3})/, '$1-$2')}
                    </p>
                  )}
                  {!supplier.address && !supplier.city && (
                    <p className="text-sm text-muted-foreground">
                      Endereço não informado
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {supplier.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Materials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Materiais Fornecidos
              </CardTitle>
              <CardDescription>
                {supplier._count.materials} material(is) vinculado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {supplier.materials.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {supplier.materials.map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{material.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {material.code} • {material.unit}
                            {material.category && ` • ${material.category}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(Number(material.unitCost))}
                        </p>
                        <Badge variant={material.isActive ? 'default' : 'secondary'}>
                          {material.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2" />
                  <p>Nenhum material vinculado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Categoria</span>
                <span className="font-medium">{getCategoryLabel(supplier.category)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Materiais</span>
                <span className="font-bold text-lg">{supplier._count.materials}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Transações</span>
                <span className="font-bold text-lg">{supplier._count.transactions}</span>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Criado em</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(supplier.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium">Última atualização</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(supplier.updatedAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
