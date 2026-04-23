// =============================================================================
// ConstrutorPro - Sessions Manager Component
// UI for managing active sessions
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
  Globe,
  Clock,
  LogOut,
  Loader2,
  Shield,
  AlertTriangle,
  MoreVertical,
  CheckCircle2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDateTime } from '@/lib/api';

// Types
interface Session {
  id: string;
  sessionToken: string;
  expires: string;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  lastActive: string | null;
  createdAt: string;
  isCurrent: boolean;
}

interface SessionsResponse {
  success: boolean;
  data: Session[];
  meta: {
    total: number;
    currentSessionId: string;
  };
}

// Helper to get device icon
function getDeviceIcon(device: string | null, isCurrent: boolean) {
  const deviceLower = (device || '').toLowerCase();
  
  if (deviceLower.includes('mobile') || deviceLower.includes('iphone') || deviceLower.includes('android')) {
    return <Smartphone className={`h-5 w-5 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />;
  }
  if (deviceLower.includes('tablet') || deviceLower.includes('ipad')) {
    return <Tablet className={`h-5 w-5 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />;
  }
  return <Monitor className={`h-5 w-5 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />;
}

// Helper to get browser name
function getBrowserDisplay(browser: string | null): string {
  if (!browser) return 'Navegador desconhecido';
  
  const browserLower = browser.toLowerCase();
  if (browserLower.includes('chrome')) return 'Google Chrome';
  if (browserLower.includes('firefox')) return 'Mozilla Firefox';
  if (browserLower.includes('safari')) return 'Safari';
  if (browserLower.includes('edge')) return 'Microsoft Edge';
  if (browserLower.includes('opera') || browserLower.includes('opr')) return 'Opera';
  
  return browser;
}

// Helper to get OS display
function getOSDisplay(os: string | null): string {
  if (!os) return '';
  
  const osLower = os.toLowerCase();
  if (osLower.includes('windows')) return 'Windows';
  if (osLower.includes('mac') || osLower.includes('darwin')) return 'macOS';
  if (osLower.includes('linux')) return 'Linux';
  if (osLower.includes('android')) return 'Android';
  if (osLower.includes('ios') || osLower.includes('iphone') || osLower.includes('ipad')) return 'iOS';
  
  return os;
}

export function SessionsManager() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [revokingAll, setRevokingAll] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Fetch sessions
  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/usuarios/sessoes');
      const data: SessionsResponse = await response.json();

      if (data.success) {
        setSessions(data.data);
      } else {
        toast({
          title: 'Erro',
          description: 'Erro ao carregar sessões.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar sessões.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Revoke a single session
  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      const response = await fetch(`/api/usuarios/sessoes/${sessionId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Sessão revogada com sucesso.',
        });
        await fetchSessions();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao revogar sessão.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao revogar sessão.',
        variant: 'destructive',
      });
    } finally {
      setRevokingId(null);
    }
  };

  // Revoke all other sessions
  const handleRevokeAll = async () => {
    setRevokingAll(true);
    try {
      const response = await fetch('/api/usuarios/sessoes', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Sucesso',
          description: data.message || 'Todas as outras sessões foram revogadas.',
        });
        await fetchSessions();
      } else {
        toast({
          title: 'Erro',
          description: data.error || 'Erro ao revogar sessões.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Erro ao revogar sessões.',
        variant: 'destructive',
      });
    } finally {
      setRevokingAll(false);
    }
  };

  // Get other sessions count
  const otherSessionsCount = sessions.filter(s => !s.isCurrent).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Sessões Ativas
          </CardTitle>
          <CardDescription>
            Gerencie os dispositivos conectados à sua conta
          </CardDescription>
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
              <Shield className="h-5 w-5" />
              Sessões Ativas
            </CardTitle>
            <CardDescription>
              Gerencie os dispositivos conectados à sua conta
            </CardDescription>
          </div>
          {otherSessionsCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={revokingAll}>
                  {revokingAll ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  Revogar Outras ({otherSessionsCount})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revogar todas as outras sessões?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso irá desconectar todos os outros dispositivos da sua conta. 
                    Você continuará logado apenas neste dispositivo.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRevokeAll}>
                    Revogar Todas
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
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma sessão ativa encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  session.isCurrent 
                    ? 'bg-primary/5 border-primary/20' 
                    : 'bg-card'
                }`}
              >
                {/* Device Icon */}
                <div className="flex-shrink-0">
                  {getDeviceIcon(session.device, session.isCurrent)}
                </div>

                {/* Session Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {getBrowserDisplay(session.browser)}
                    </span>
                    {session.isCurrent && (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Sessão Atual
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {session.os && (
                      <span className="flex items-center gap-1">
                        <Monitor className="h-3 w-3" />
                        {getOSDisplay(session.os)}
                      </span>
                    )}
                    {session.ipAddress && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {session.ipAddress}
                      </span>
                    )}
                    {session.location && (
                      <span>{session.location}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {session.lastActive && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Ativo {formatDateTime(session.lastActive)}
                      </span>
                    )}
                    <span>
                      Criado {formatDateTime(session.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {!session.isCurrent && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        disabled={revokingId === session.id}
                      >
                        {revokingId === session.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreVertical className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem className="text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            Revogar Sessão
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              Revogar esta sessão?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              O dispositivo será desconectado da sua conta imediatamente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleRevokeSession(session.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Revogar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Security Tips */}
        <div className="mt-6 p-4 rounded-lg bg-muted/50">
          <h4 className="font-medium text-sm mb-2">Dicas de Segurança</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Revogue sessões que você não reconhece imediatamente</li>
            <li>• Sempre faça logout em dispositivos públicos</li>
            <li>• Ative a autenticação de dois fatores quando disponível</li>
            <li>• Altere sua senha se notar atividade suspeita</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
