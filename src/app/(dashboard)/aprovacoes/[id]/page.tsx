// =============================================================================
// ConstrutorPro - Página de Detalhes da Solicitação de Aprovação
// =============================================================================

'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  DollarSign,
  ShoppingCart,
  Building2,
  Calendar,
  User,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Send,
  History,
  Paperclip,
} from 'lucide-react';
import { formatCurrency } from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// =============================================================================
// Tipos
// =============================================================================

interface ApprovalStep {
  id: string;
  name: string;
  description: string | null;
  order: number;
  approverType: string;
  approverId: string | null;
  approverRole: string | null;
}

interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  entityData: Record<string, unknown> | null;
  title: string;
  description: string | null;
  value: number | null;
  urgency: string;
  status: string;
  currentStep: number;
  createdAt: string;
  dueDate: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  notes: string | null;
  requestedByUser: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  cancelledByUser: {
    id: string;
    name: string;
    email: string;
  } | null;
  approval_workflows: {
    id: string;
    name: string;
    entityType: string;
    allowDelegation: boolean;
    allowRejection: boolean;
    requireComment: boolean;
    approval_steps: ApprovalStep[];
  };
  approval_decisions: Array<{
    id: string;
    decision: string;
    comment: string | null;
    decidedAt: string;
    data: string | null;
    attachments: string | null;
    users: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
    };
    approval_steps: {
      id: string;
      name: string;
      order: number;
    };
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  in_progress: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800', icon: Clock },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: XCircle },
  cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800', icon: AlertCircle },
  expired: { label: 'Expirado', color: 'bg-orange-100 text-orange-800', icon: Clock },
};

const DECISION_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-700', icon: XCircle },
  returned: { label: 'Devolvido', color: 'bg-orange-100 text-orange-700', icon: RotateCcw },
  delegated: { label: 'Delegado', color: 'bg-blue-100 text-blue-700', icon: Send },
};

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'bg-gray-100 text-gray-700' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
};

// =============================================================================
// Componente Principal
// =============================================================================

export default function AprovacaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | 'return' | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRequest();
  }, [resolvedParams.id]);

  const fetchRequest = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/aprovacoes/solicitacoes/${resolvedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setRequest(data);
      } else {
        toast({
          title: 'Erro',
          description: 'Solicitação não encontrada',
          variant: 'destructive',
        });
        router.push('/aprovacoes');
      }
    } catch (error) {
      console.error('Erro ao carregar solicitação:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision: 'approved' | 'rejected' | 'returned') => {
    if (!request) return;

    if (request.approval_workflows.requireComment && !comment.trim()) {
      toast({
        title: 'Comentário obrigatório',
        description: 'Este workflow exige um comentário para a decisão',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const currentStep = request.approval_workflows.approval_steps.find(
        s => s.order === request.currentStep
      );

      if (!currentStep) {
        throw new Error('Etapa atual não encontrada');
      }

      const response = await fetch(`/api/aprovacoes/solicitacoes/${request.id}/decisao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId: currentStep.id,
          decision,
          comment: comment.trim() || undefined,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description:
            decision === 'approved'
              ? 'Solicitação aprovada com sucesso'
              : decision === 'rejected'
                ? 'Solicitação rejeitada'
                : 'Solicitação devolvida',
        });
        fetchRequest();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao processar decisão');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao processar decisão',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setActionDialog(null);
      setComment('');
    }
  };

  const handleCancel = async () => {
    if (!request) return;

    if (!comment.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Informe o motivo do cancelamento',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/aprovacoes/solicitacoes/${request.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: comment.trim() }),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Solicitação cancelada',
        });
        fetchRequest();
      } else {
        throw new Error('Erro ao cancelar solicitação');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao cancelar solicitação',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setActionDialog(null);
      setComment('');
    }
  };

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!request) {
    return null;
  }

  const statusConfig = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
  const urgencyConfig = URGENCY_CONFIG[request.urgency] || URGENCY_CONFIG.normal;
  const StatusIcon = statusConfig.icon;
  const isActive = ['pending', 'in_progress'].includes(request.status);
  const currentStep = request.approval_workflows.approval_steps.find(
    s => s.order === request.currentStep
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{request.title}</h1>
            <Badge className={statusConfig.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
            <Badge className={urgencyConfig.color} variant="outline">
              {urgencyConfig.label}
            </Badge>
          </div>
          <p className="text-muted-foreground">{request.approval_workflows.name}</p>
        </div>
        {isActive && (
          <div className="flex gap-2">
            {request.approval_workflows.allowRejection && (
              <Button
                variant="destructive"
                onClick={() => setActionDialog('reject')}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
            )}
            <Button onClick={() => setActionDialog('approve')}>
              <ThumbsUp className="h-4 w-4 mr-2" />
              Aprovar
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhes da Solicitação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.description && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Descrição</h4>
                  <p>{request.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Tipo de Entidade</h4>
                  <p className="capitalize">{request.entityType.replace('_', ' ')}</p>
                </div>
                {request.value !== null && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Valor</h4>
                    <p className="text-lg font-semibold text-green-600">{formatCurrency(request.value)}</p>
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Criado em</h4>
                  <p>{format(new Date(request.createdAt), "dd 'de' MMMM 'de' yyyy, HH:mm", { locale: ptBR })}</p>
                </div>
                {request.dueDate && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Prazo</h4>
                    <p>{format(new Date(request.dueDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                  </div>
                )}
              </div>

              {request.notes && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Observações</h4>
                  <p className="text-sm">{request.notes}</p>
                </div>
              )}

              {request.cancelledAt && (
                <>
                  <Separator />
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-red-800 mb-1">Cancelado</h4>
                    <p className="text-sm text-red-700">
                      Por {request.cancelledByUser?.name} em{' '}
                      {format(new Date(request.cancelledAt), "dd/MM/yyyy 'às' HH:mm")}
                    </p>
                    {request.cancelReason && (
                      <p className="text-sm text-red-600 mt-2">Motivo: {request.cancelReason}</p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Decision History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Decisões
              </CardTitle>
            </CardHeader>
            <CardContent>
              {request.approval_decisions.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma decisão registrada ainda
                </p>
              ) : (
                <div className="space-y-4">
                  {request.approval_decisions.map((decision, index) => {
                    const config = DECISION_CONFIG[decision.decision] || DECISION_CONFIG.approved;
                    const DecisionIcon = config.icon;

                    return (
                      <div
                        key={decision.id}
                        className="flex items-start gap-3 pb-4 border-b last:border-0"
                      >
                        <div className="p-2 rounded-full bg-muted">
                          <DecisionIcon className={`h-4 w-4 ${decision.decision === 'approved' ? 'text-green-600' : decision.decision === 'rejected' ? 'text-red-600' : 'text-orange-600'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{decision.users.name}</span>
                            <Badge className={config.color} variant="outline">
                              {config.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Etapa {decision.approval_steps.order}: {decision.approval_steps.name}
                            </span>
                          </div>
                          {decision.comment && (
                            <p className="text-sm text-muted-foreground mb-1">
                              {decision.comment}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(decision.decidedAt), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                          {decision.attachments && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Paperclip className="h-3 w-3" />
                              Tem anexos
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Requester Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Solicitante</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{request.requestedByUser.name}</p>
                  <p className="text-sm text-muted-foreground">{request.requestedByUser.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Etapas do Fluxo</CardTitle>
              <CardDescription>
                Etapa atual: {currentStep?.name || 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {request.approval_workflows.approval_steps.map((step, index) => {
                  const isPast = step.order < request.currentStep;
                  const isCurrent = step.order === request.currentStep;
                  const stepDecisions = request.approval_decisions.filter(
                    d => d.approval_steps.id === step.id
                  );

                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        isCurrent
                          ? 'bg-blue-50 border border-blue-200'
                          : isPast
                            ? 'bg-green-50'
                            : 'bg-muted'
                      }`}
                    >
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          isCurrent
                            ? 'bg-blue-500 text-white'
                            : isPast
                              ? 'bg-green-500 text-white'
                              : 'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {step.order}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{step.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {step.approverType === 'user' ? 'Usuário específico' :
                           step.approverType === 'role' ? `Role: ${step.approverRole}` :
                           step.approverType === 'manager' ? 'Gerente' : 'Proprietário'}
                        </p>
                      </div>
                      {stepDecisions.length > 0 && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Cancel Button */}
          {isActive && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setActionDialog('reject')}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Cancelar Solicitação
            </Button>
          )}
        </div>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog === 'approve' ? 'Aprovar Solicitação' :
               actionDialog === 'reject' ? 'Rejeitar Solicitação' :
               'Cancelar Solicitação'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog === 'approve'
                ? 'Confirme a aprovação desta solicitação'
                : actionDialog === 'reject'
                  ? 'Informe o motivo da rejeição'
                  : 'Informe o motivo do cancelamento'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder={
                request.approval_workflows.requireComment
                  ? 'Comentário obrigatório'
                  : 'Comentário (opcional)'
              }
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancelar
            </Button>
            <Button
              variant={actionDialog === 'approve' ? 'default' : 'destructive'}
              onClick={() => {
                if (actionDialog === 'approve') handleDecision('approved');
                else if (actionDialog === 'reject') handleDecision('rejected');
              }}
              disabled={submitting}
            >
              {submitting ? 'Processando...' :
               actionDialog === 'approve' ? 'Confirmar Aprovação' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="flex-1">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
