// =============================================================================
// ConstrutorPro - Sessions Section Component
// Seção de gerenciamento de sessões ativas
// =============================================================================

'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  LogOut,
  MoreVertical,
  Loader2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Types
interface UserSession {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  browser: string;
  os: string;
  ip: string;
  location?: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

function getDeviceIcon(type: string) {
  switch (type) {
    case 'mobile':
      return <Smartphone className="h-5 w-5" />;
    case 'tablet':
      return <Tablet className="h-5 w-5" />;
    default:
      return <Monitor className="h-5 w-5" />;
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Agora mesmo';
  if (diffMins < 60) return `${diffMins} minuto(s) atrás`;
  if (diffHours < 24) return `${diffHours} hora(s) atrás`;
  if (diffDays < 7) return `${diffDays} dia(s) atrás`;

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function SessionsSection() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  async function fetchSessions() {
    try {
      const response = await fetch('/api/sessoes');
      const data = await response.json();

      if (data.success) {
        setSessions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function revokeSession(sessionId: string) {
    setRevoking(sessionId);
    try {
      const response = await fetch('/api/sessoes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (data.success) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        toast({
          title: 'Sessão revogada',
          description: 'A sessão foi encerrada com sucesso.',
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao revogar sessão.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao revogar sessão.',
        variant: 'destructive',
      });
    } finally {
      setRevoking(null);
    }
  }

  async function revokeOtherSessions() {
    setRevoking('others');
    try {
      const response = await fetch('/api/sessoes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revokeOthers: true }),
      });

      const data = await response.json();

      if (data.success) {
        setSessions((prev) => prev.filter((s) => s.isCurrent));
        toast({
          title: 'Sessões revogadas',
          description: data.message || 'Outras sessões foram encerradas.',
        });
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao revogar sessões.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao revogar sessões.',
        variant: 'destructive',
      });
    } finally {
      setRevoking(null);
    }
  }

  const currentSession = sessions.find((s) => s.isCurrent);
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Sessões Ativas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Sessões Ativas
            </CardTitle>
            <CardDescription>
              Gerencie os dispositivos conectados à sua conta
            </CardDescription>
          </div>
          {otherSessions.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <LogOut className="mr-2 h-4 w-4" />
                  Encerrar Outras
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Encerrar outras sessões?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso irá desconectar todos os outros dispositivos da sua
                    conta. Você continuará conectado neste dispositivo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={revokeOtherSessions}
                    disabled={revoking === 'others'}
                  >
                    {revoking === 'others' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Encerrando...
                      </>
                    ) : (
                      'Encerrar'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShieldCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma sessão ativa</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Session */}
            {currentSession && (
              <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/50">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {getDeviceIcon(currentSession.deviceType)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">
                      {currentSession.deviceName}
                    </p>
                    <Badge variant="default" className="text-xs">
                      Sessão Atual
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {currentSession.ip}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Ativo {formatRelativeTime(currentSession.lastActivityAt)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Other Sessions */}
            {otherSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-4 p-4 rounded-lg border"
              >
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    {getDeviceIcon(session.deviceType)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{session.deviceName}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {session.ip}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Ativo {formatRelativeTime(session.lastActivityAt)}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => revokeSession(session.id)}
                      disabled={revoking === session.id}
                    >
                      {revoking === session.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                      )}
                      Encerrar sessão
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
