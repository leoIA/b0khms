// =============================================================================
// ConstrutorPro - Página Pública de Visualização de Proposta
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  DollarSign,
  FileText,
  Building2,
  MapPin,
  Mail,
  Phone,
  AlertCircle,
  FileSignature,
  Eye,
  Check,
  X,
} from 'lucide-react';
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
}

interface Company {
  id: string;
  name: string;
  tradingName: string | null;
  cnpj: string;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  logo: string | null;
}

interface Proposal {
  id: string;
  number: string;
  title: string;
  objective: string | null;
  status: string;
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
  clientNotes: string | null;
  customIntroduction: string | null;
  coverImage: string | null;
  includeCover: boolean;
  includeSummary: boolean;
  requiresSignature: boolean;
  signatureUrl: string | null;
  signedAt: string | null;
  signedBy: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  acceptedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  companies: Company;
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
    address: string | null;
    city: string | null;
    state: string | null;
  } | null;
  proposal_items: ProposalItem[];
}

// Fetch proposal by token
async function fetchProposalByToken(token: string): Promise<Proposal> {
  const response = await fetch(`/api/public/proposta/${token}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Proposta não encontrada ou expirada');
    }
    if (response.status === 410) {
      throw new Error('Esta proposta expirou');
    }
    throw new Error('Erro ao carregar proposta');
  }
  return response.json().then(r => r.data);
}

// Mark proposal as viewed
async function markAsViewed(token: string): Promise<void> {
  await fetch(`/api/public/proposta/${token}/visualizar`, {
    method: 'POST',
  });
}

// Accept proposal
async function acceptProposal(token: string, data: { name: string; notes?: string }): Promise<void> {
  const response = await fetch(`/api/public/proposta/${token}/aceitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao aceitar proposta');
  }
}

// Reject proposal
async function rejectProposal(token: string, data: { name: string; reason: string }): Promise<void> {
  const response = await fetch(`/api/public/proposta/${token}/rejeitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao rejeitar proposta');
  }
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

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
              <Skeleton className="h-16 w-32" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Error display
function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h1 className="text-xl font-bold mb-2">Erro</h1>
          <p className="text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PublicProposalPage() {
  const params = useParams();
  const token = params.token as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionCompleted, setActionCompleted] = useState<'accepted' | 'rejected' | null>(null);

  // Fetch proposal on mount
  useEffect(() => {
    if (!token) return;

    const loadProposal = async () => {
      try {
        setLoading(true);
        const data = await fetchProposalByToken(token);
        setProposal(data);

        // Mark as viewed if status is 'sent'
        if (data.status === 'sent') {
          markAsViewed(token).catch(console.error);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadProposal();
  }, [token]);

  // Handle accept
  const handleAccept = async () => {
    if (!signerName.trim()) {
      alert('Por favor, informe seu nome para aceitar a proposta.');
      return;
    }

    setSubmitting(true);
    try {
      await acceptProposal(token, { name: signerName, notes });
      setActionCompleted('accepted');
      setAcceptDialogOpen(false);
      // Refresh proposal
      const data = await fetchProposalByToken(token);
      setProposal(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle reject
  const handleReject = async () => {
    if (!signerName.trim()) {
      alert('Por favor, informe seu nome para rejeitar a proposta.');
      return;
    }
    if (!rejectionReason.trim()) {
      alert('Por favor, informe o motivo da rejeição.');
      return;
    }

    setSubmitting(true);
    try {
      await rejectProposal(token, { name: signerName, reason: rejectionReason });
      setActionCompleted('rejected');
      setRejectDialogOpen(false);
      // Refresh proposal
      const data = await fetchProposalByToken(token);
      setProposal(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (error || !proposal) {
    return <ErrorDisplay message={error || 'Proposta não encontrada'} />;
  }

  // Check if proposal can be responded to
  const canRespond = ['sent', 'viewed'].includes(proposal.status);
  const isValid = !proposal.validUntil || new Date(proposal.validUntil) > new Date();
  const isExpired = proposal.validUntil && new Date(proposal.validUntil) <= new Date();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover */}
      {proposal.includeCover && proposal.coverImage && (
        <div
          className="h-48 md:h-64 bg-cover bg-center"
          style={{ backgroundImage: `url(${proposal.coverImage})` }}
        />
      )}

      <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2">
                {/* Company Logo/Name */}
                <div className="flex items-center gap-3">
                  {proposal.companies.logo ? (
                    <img
                      src={proposal.companies.logo}
                      alt={proposal.companies.name}
                      className="h-12 w-12 object-contain"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{proposal.companies.name}</p>
                    {proposal.companies.tradingName && (
                      <p className="text-sm text-muted-foreground">{proposal.companies.tradingName}</p>
                    )}
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground font-mono">{proposal.number}</p>
                  <CardTitle className="text-2xl">{proposal.title}</CardTitle>
                  {proposal.objective && (
                    <CardDescription className="text-base">{proposal.objective}</CardDescription>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={proposal.status} />
                {proposal.version > 1 && (
                  <Badge variant="outline">v{proposal.version}</Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Action Completed Notice */}
        {actionCompleted && (
          <Card className={actionCompleted === 'accepted' ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
            <CardContent className="p-6 flex items-center gap-4">
              {actionCompleted === 'accepted' ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-green-600" />
                  <div>
                    <h3 className="font-semibold text-green-800">Proposta Aceita!</h3>
                    <p className="text-green-700">Obrigado por aceitar nossa proposta. Entraremos em contato em breve.</p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="h-12 w-12 text-red-600" />
                  <div>
                    <h3 className="font-semibold text-red-800">Proposta Rejeitada</h3>
                    <p className="text-red-700">Agradecemos seu feedback. Ficaremos à disposição para futuras oportunidades.</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Expired Notice */}
        {isExpired && (
          <Card className="border-orange-500 bg-orange-50">
            <CardContent className="p-6 flex items-center gap-4">
              <AlertCircle className="h-12 w-12 text-orange-600" />
              <div>
                <h3 className="font-semibold text-orange-800">Proposta Expirada</h3>
                <p className="text-orange-700">Esta proposta expirou em {formatDate(proposal.validUntil!)}. Entre em contato para uma nova proposta.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Custom Introduction */}
        {proposal.customIntroduction && (
          <Card>
            <CardContent className="p-6">
              <p className="whitespace-pre-wrap">{proposal.customIntroduction}</p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {canRespond && isValid && !actionCompleted && (
          <Card className="border-primary">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileSignature className="h-8 w-8 text-primary" />
                  <div>
                    <h3 className="font-semibold">Responda esta Proposta</h3>
                    <p className="text-sm text-muted-foreground">Você pode aceitar ou rejeitar esta proposta</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="border-red-500 text-red-600 hover:bg-red-50"
                    onClick={() => setRejectDialogOpen(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setAcceptDialogOpen(true)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Aceitar Proposta
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Items */}
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
                      <p className="text-sm font-medium text-muted-foreground">Validade da Proposta</p>
                      <p className={isExpired ? 'text-red-600 font-medium' : ''}>
                        Até {formatDate(proposal.validUntil)}
                        {isExpired && ' (Expirada)'}
                      </p>
                    </div>
                  )}
                </div>

                {proposal.terms && (
                  <div className="space-y-1 pt-4">
                    <p className="text-sm font-medium text-muted-foreground">Termos e Condições</p>
                    <p className="whitespace-pre-wrap text-sm">{proposal.terms}</p>
                  </div>
                )}

                {proposal.clientNotes && (
                  <div className="space-y-1 pt-4 bg-primary/5 p-4 rounded-lg">
                    <p className="text-sm font-medium">Observações</p>
                    <p className="whitespace-pre-wrap text-sm">{proposal.clientNotes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Signature */}
            {proposal.signedAt && proposal.signedBy && (
              <Card className="border-green-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100">
                      <FileSignature className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold">Proposta Assinada Digitalmente</p>
                      <p className="text-sm text-muted-foreground">
                        Assinada por {proposal.signedBy} em {formatDate(proposal.signedAt)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Total</span>
                  <span className="font-bold text-green-600 text-lg">{formatCurrency(proposal.totalValue)}</span>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data de Envio</span>
                  <span>{proposal.sentAt ? formatDate(proposal.sentAt) : '-'}</span>
                </div>

                {proposal.viewedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visualizada em</span>
                    <span>{formatDate(proposal.viewedAt)}</span>
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
                    <Building2 className="h-5 w-5" />
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
                      <span>{proposal.clients.email}</span>
                    </div>
                  )}
                  {(proposal.clients.phone || proposal.clients.mobile) && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{proposal.clients.mobile || proposal.clients.phone}</span>
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
                    <FileText className="h-5 w-5" />
                    Projeto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium">{proposal.projects.name}</p>
                  {proposal.projects.code && (
                    <p className="text-sm text-muted-foreground font-mono">{proposal.projects.code}</p>
                  )}
                  {(proposal.projects.address || proposal.projects.city) && (
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 mt-0.5" />
                      <span>
                        {proposal.projects.address}
                        {proposal.projects.city && `, ${proposal.projects.city}`}
                        {proposal.projects.state && ` - ${proposal.projects.state}`}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Company Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Nossos Contatos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-medium">{proposal.companies.name}</p>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${proposal.companies.email}`} className="hover:underline text-primary">
                    {proposal.companies.email}
                  </a>
                </div>
                {proposal.companies.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{proposal.companies.phone}</span>
                  </div>
                )}
                {(proposal.companies.address || proposal.companies.city) && (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <span>
                      {proposal.companies.address}
                      {proposal.companies.city && `, ${proposal.companies.city}`}
                      {proposal.companies.state && ` - ${proposal.companies.state}`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <Card className="bg-gray-100">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            <p>
              Esta proposta foi enviada por {proposal.companies.name} • CNPJ: {proposal.companies.cnpj}
            </p>
            <p className="mt-1">
              Documento gerado eletronicamente pelo ConstrutorPro
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accept Dialog */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Aceitar Proposta
            </DialogTitle>
            <DialogDescription>
              Ao aceitar esta proposta, você concorda com todos os termos e condições apresentados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seu Nome *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Digite seu nome completo"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações (opcional)</label>
              <Textarea
                placeholder="Alguma observação ou comentário?"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleAccept}
              disabled={submitting || !signerName.trim()}
            >
              {submitting ? 'Processando...' : 'Confirmar Aceite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Rejeitar Proposta
            </DialogTitle>
            <DialogDescription>
              Por favor, informe o motivo da rejeição para que possamos melhorar nossas propostas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Seu Nome *</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Digite seu nome completo"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo da Rejeição *</label>
              <Textarea
                placeholder="Informe o motivo pelo qual está rejeitando esta proposta"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting || !signerName.trim() || !rejectionReason.trim()}
            >
              {submitting ? 'Processando...' : 'Confirmar Rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
