// =============================================================================
// ConstrutorPro - Propostas Comerciais - Detalhes
// =============================================================================

'use client';

import { useState } from 'react';
import { useSession } from '@/hooks/use-session';
import { redirect, useRouter } from 'next/navigation';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Pencil,
  MoreHorizontal,
  Send,
  Copy,
  FileSignature,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  FileText,
  Users,
  Building2,
  MapPin,
  Mail,
  Phone,
  Ban,
  History,
  MessageSquare,
  Plus,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/api';

// Status configuration
const PROPOSAL_STATUS: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-500' },
  review: { label: 'Em Revisão', color: 'bg-blue-500' },
  sent: { label: 'Enviada', color: 'bg-yellow-500' },
  viewed: { label: 'Visualizada', color: 'bg-indigo-500' },
  accepted: { label: 'Aceita', color: 'bg-green-500' },
  rejected: { label: 'Rejeitada', color: 'bg-red-500' },
  expired: { label: 'Expirada', color: 'bg-orange-500' },
  cancelled: { label: 'Cancelada', color: 'bg-gray-400' },
};

// Types
interface ProposalItem {
  id: string;
  code: string | null;
  title: string;
  description: string | null;
  category: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes: string | null;
  order: number;
}

interface ProposalVersion {
  id: string;
  version: number;
  changeLog: string | null;
  changeReason: string | null;
  changedAt: string;
  users: {
    id: string;
    name: string;
    email: string;
  };
}

interface ProposalFollowup {
  id: string;
  type: string;
  title: string;
  content: string | null;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
  users: {
    id: string;
    name: string;
  };
}

interface Proposal {
  id: string;
  number: string;
  title: string;
  objective: string | null;
  status: string;
  internalStatus: string | null;
  version: number;
  subtotal: number;
  discountType: string | null;
  discountValue: number | null;
  discountReason: string | null;
  totalValue: number;
  paymentTerms: string | null;
  deliveryTime: string | null;
  warrantyTerms: string | null;
  validUntil: string | null;
  deliveryAddress: string | null;
  terms: string | null;
  notes: string | null;
  clientNotes: string | null;
  includeCover: boolean;
  includeSummary: boolean;
  includeTimeline: boolean;
  includeTeam: boolean;
  includePortfolio: boolean;
  customIntroduction: string | null;
  requiresSignature: boolean;
  sentAt: string | null;
  viewedAt: string | null;
  viewedCount: number;
  respondedAt: string | null;
  acceptedAt: string | null;
  acceptedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  clients: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    mobile: string | null;
    cpfCnpj: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
  } | null;
  projects: {
    id: string;
    name: string;
    code: string | null;
    status: string;
  } | null;
  budgets: {
    id: string;
    name: string;
    code: string | null;
    totalValue: number;
  } | null;
  proposal_items: ProposalItem[];
  proposal_versions: ProposalVersion[];
  proposal_followups: ProposalFollowup[];
  users_proposals_sentBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  users_proposals_approvedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

// Fetch proposal
async function fetchProposal(id: string): Promise<Proposal> {
  const response = await fetch(`/api/propostas/${id}`);
  if (!response.ok) throw new Error('Erro ao carregar proposta');
  return response.json().then(r => r.data);
}

// Status badge
function StatusBadge({ status }: { status: string }) {
  const config = PROPOSAL_STATUS[status] || PROPOSAL_STATUS.draft;
  return (
    <Badge variant="outline" className={`${config.color} text-white border-0 text-base px-4 py-1`}>
      {config.label}
    </Badge>
  );
}

export default function PropostaDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const { isAuthenticated, isLoading: sessionLoading } = useSession();
  const router = useRouter();
  const [paramsResolved, setParamsResolved] = useState<{ id: string } | null>(null);

  // Resolve params
  if (!paramsResolved) {
    params.then(p => setParamsResolved(p));
    return null;
  }

  const { id } = paramsResolved;

  // Redirect if not authenticated
  if (!sessionLoading && !isAuthenticated) {
    redirect('/login');
  }

  // Fetch proposal
  const { data: proposal, isLoading, error, refetch } = useQuery({
    queryKey: ['proposal', id],
    queryFn: () => fetchProposal(id),
    enabled: isAuthenticated && !!id,
  });

  // Actions
  const handleSend = async () => {
    if (!confirm('Deseja enviar esta proposta para o cliente?')) return;

    try {
      const response = await fetch(`/api/propostas/${id}/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Erro ao enviar proposta');

      alert('Proposta enviada com sucesso!');
      refetch();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleApprove = async (approved: boolean) => {
    if (!confirm(approved ? 'Deseja aprovar esta proposta?' : 'Deseja rejeitar esta proposta?')) return;

    try {
      const response = await fetch(`/api/propostas/${id}/aprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved, notes: '' }),
      });

      if (!response.ok) throw new Error('Erro ao processar aprovação');

      alert(approved ? 'Proposta aprovada!' : 'Proposta rejeitada');
      refetch();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Deseja cancelar esta proposta?')) return;

    try {
      const response = await fetch(`/api/propostas/${id}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: '' }),
      });

      if (!response.ok) throw new Error('Erro ao cancelar proposta');

      alert('Proposta cancelada');
      refetch();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDuplicate = async () => {
    try {
      const response = await fetch(`/api/propostas/${id}/duplicar`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Erro ao duplicar proposta');

      const result = await response.json();
      router.push(`/propostas/${result.data.id}`);
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (sessionLoading || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive">
          <CardContent className="p-4 text-destructive">
            Erro ao carregar proposta. Tente novamente.
          </CardContent>
        </Card>
      </div>
    );
  }

  const canEdit = ['draft', 'review'].includes(proposal.status);
  const canSend = proposal.status === 'draft' || proposal.status === 'review';
  const canApprove = proposal.internalStatus === 'internal_review' || proposal.internalStatus === 'pending_approval';
  const canCancel = !['accepted', 'cancelled', 'expired'].includes(proposal.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/propostas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <p className="font-mono text-muted-foreground">{proposal.number}</p>
              <StatusBadge status={proposal.status} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{proposal.title}</h1>
            {proposal.objective && (
              <p className="text-muted-foreground max-w-2xl">{proposal.objective}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" asChild>
              <Link href={`/propostas/${id}/editar`}>
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="h-4 w-4 mr-2" />
                Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canSend && (
                <DropdownMenuItem onClick={handleSend}>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar para Cliente
                </DropdownMenuItem>
              )}
              {canApprove && (
                <>
                  <DropdownMenuItem onClick={() => handleApprove(true)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Aprovar Internamente
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleApprove(false)} className="text-destructive">
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar Internamente
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar Proposta
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FileSignature className="h-4 w-4 mr-2" />
                Gerar PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canCancel && (
                <DropdownMenuItem onClick={handleCancel} className="text-destructive">
                  <Ban className="h-4 w-4 mr-2" />
                  Cancelar Proposta
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Itens da Proposta</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposal.proposal_items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{item.title}</p>
                          {item.code && (
                            <p className="text-xs text-muted-foreground font-mono">{item.code}</p>
                          )}
                          {item.description && (
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.category || '-'}</TableCell>
                      <TableCell className="text-center">
                        {item.quantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.totalPrice)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(proposal.subtotal)}</span>
                </div>

                {proposal.discountValue && proposal.discountValue > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>
                      Desconto {proposal.discountType === 'percentage' ? `(${proposal.discountValue}%)` : ''}
                      {proposal.discountReason && <span className="text-xs ml-1">({proposal.discountReason})</span>}
                    </span>
                    <span>-{formatCurrency(proposal.discountType === 'percentage' ? proposal.subtotal * (proposal.discountValue / 100) : proposal.discountValue)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-green-600">{formatCurrency(proposal.totalValue)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Commercial Conditions */}
          <Card>
            <CardHeader>
              <CardTitle>Condições Comerciais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {proposal.paymentTerms && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Condições de Pagamento</p>
                    <p>{proposal.paymentTerms}</p>
                  </div>
                )}

                {proposal.deliveryTime && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Prazo de Execução</p>
                    <p>{proposal.deliveryTime}</p>
                  </div>
                )}

                {proposal.warrantyTerms && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Garantia</p>
                    <p>{proposal.warrantyTerms}</p>
                  </div>
                )}

                {proposal.validUntil && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Validade</p>
                    <p>Até {formatDate(proposal.validUntil)}</p>
                  </div>
                )}
              </div>

              {proposal.terms && (
                <div className="space-y-1 pt-4">
                  <p className="text-sm font-medium text-muted-foreground">Termos e Condições</p>
                  <p className="whitespace-pre-wrap text-sm">{proposal.terms}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline / History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Versões
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {proposal.proposal_versions.map((version) => (
                  <div key={version.id} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold">v{version.version}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Versão {version.version}</p>
                        <span className="text-xs text-muted-foreground">
                          por {version.users.name}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(version.changedAt)}
                      </p>
                      {version.changeReason && (
                        <p className="text-sm mt-1">{version.changeReason}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={proposal.status} />
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Versão</span>
                <span className="font-medium">{proposal.version}</span>
              </div>

              <Separator />

              <div className="flex justify-between">
                <span className="text-muted-foreground">Criada em</span>
                <span>{formatDate(proposal.createdAt)}</span>
              </div>

              {proposal.sentAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Enviada em</span>
                  <span>{formatDate(proposal.sentAt)}</span>
                </div>
              )}

              {proposal.viewedCount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visualizações</span>
                  <span>{proposal.viewedCount}</span>
                </div>
              )}

              {proposal.acceptedAt && (
                <div className="flex justify-between text-green-600">
                  <span>Aceita em</span>
                  <span>{formatDate(proposal.acceptedAt)}</span>
                </div>
              )}

              {proposal.rejectedAt && (
                <div className="flex justify-between text-red-600">
                  <span>Rejeitada em</span>
                  <span>{formatDate(proposal.rejectedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Client */}
          {proposal.clients && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-medium">{proposal.clients.name}</p>
                {proposal.clients.cpfCnpj && (
                  <p className="text-sm text-muted-foreground">{proposal.clients.cpfCnpj}</p>
                )}
                {proposal.clients.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${proposal.clients.email}`} className="hover:underline">
                      {proposal.clients.email}
                    </a>
                  </div>
                )}
                {(proposal.clients.phone || proposal.clients.mobile) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{proposal.clients.mobile || proposal.clients.phone}</span>
                  </div>
                )}
                {proposal.clients.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span>
                      {proposal.clients.address}
                      {proposal.clients.city && `, ${proposal.clients.city}`}
                      {proposal.clients.state && ` - ${proposal.clients.state}`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Project */}
          {proposal.projects && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Projeto
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/projetos/${proposal.projects.id}`} className="hover:underline">
                  <p className="font-medium">{proposal.projects.name}</p>
                </Link>
                {proposal.projects.code && (
                  <p className="text-sm text-muted-foreground font-mono">{proposal.projects.code}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Follow-ups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {proposal.proposal_followups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum follow-up registrado</p>
              ) : (
                proposal.proposal_followups.map((followup) => (
                  <div key={followup.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{followup.type}</Badge>
                      <span className="font-medium">{followup.title}</span>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {followup.users.name} • {formatDate(followup.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
