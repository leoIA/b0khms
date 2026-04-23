// =============================================================================
// ConstrutorPro - Detalhes do Cliente Page
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
  Building2,
  FolderKanban,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CLIENT_STATUS, PROJECT_STATUS } from '@/lib/constants';
import { formatCurrency } from '@/lib/api';
import type { Client, ClientStatus, Project } from '@/types';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface ClientWithRelations extends Client {
  projects: Pick<Project, 'id' | 'name' | 'status' | 'estimatedValue' | 'physicalProgress' | 'startDate' | 'endDate'>[];
  _count: {
    projects: number;
    transactions: number;
  };
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export default function ClienteDetalhesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const [client, setClient] = useState<ClientWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clientId = params.id as string;

  // Fetch client
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    const fetchClient = async () => {
      if (!session) return;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/clientes/${clientId}`);
        const data = await response.json();

        if (data.success) {
          setClient(data.data);
        } else {
          toast({
            title: 'Erro',
            description: data.error || 'Erro ao carregar cliente.',
            variant: 'destructive',
          });
          router.push('/clientes');
        }
      } catch {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar cliente.',
          variant: 'destructive',
        });
        router.push('/clientes');
      } finally {
        setIsLoading(false);
      }
    };

    if (session && clientId) {
      fetchClient();
    }
  }, [session, clientId, router, toast]);

  // Format CPF/CNPJ
  const formatCpfCnpj = (value?: string) => {
    if (!value) return '-';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
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
  const getStatusBadge = (clientStatus: ClientStatus) => {
    const config = CLIENT_STATUS[clientStatus];
    return (
      <Badge variant="secondary" className={`${config.color} text-white`}>
        {config.label}
      </Badge>
    );
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

  if (!client) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/clientes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
              {getStatusBadge(client.status)}
            </div>
            <p className="text-muted-foreground">
              Detalhes do cliente
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/clientes/${client.id}/editar`}>
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
                      {client.email || '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Telefone</p>
                    <p className="text-sm text-muted-foreground">
                      {formatPhone(client.phone || client.mobile)}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">CPF/CNPJ</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCpfCnpj(client.cpfCnpj)}
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
                    {[client.address, client.city, client.state]
                      .filter(Boolean)
                      .join(' - ')}
                  </p>
                  {client.zipCode && (
                    <p className="text-sm text-muted-foreground">
                      CEP: {client.zipCode.replace(/(\d{5})(\d{3})/, '$1-$2')}
                    </p>
                  )}
                  {!client.address && !client.city && (
                    <p className="text-sm text-muted-foreground">
                      Endereço não informado
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Projetos Relacionados
              </CardTitle>
              <CardDescription>
                {client._count.projects} projeto(s) vinculado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {client.projects.length > 0 ? (
                <div className="space-y-3">
                  {client.projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {PROJECT_STATUS[project.status]?.label || project.status}
                            {project.startDate && (
                              <> • Início: {new Date(project.startDate).toLocaleDateString('pt-BR')}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(Number(project.estimatedValue))}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {project.physicalProgress}% concluído
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FolderKanban className="h-12 w-12 mx-auto mb-2" />
                  <p>Nenhum projeto vinculado</p>
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
                <span className="text-sm text-muted-foreground">Projetos</span>
                <span className="font-bold text-lg">{client._count.projects}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Transações</span>
                <span className="font-bold text-lg">{client._count.transactions}</span>
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
                  {new Date(client.createdAt).toLocaleDateString('pt-BR', {
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
                  {new Date(client.updatedAt).toLocaleDateString('pt-BR', {
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
