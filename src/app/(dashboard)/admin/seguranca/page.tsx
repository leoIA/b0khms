// =============================================================================
// ConstrutorPro - Security Analytics Dashboard
// Dashboard de analytics de segurança com visualizações avançadas
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  AlertTriangle,
  AlertCircle,
  Activity,
  Users,
  Globe,
  Monitor,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Lock,
  Key,
  Database,
  FileText,
  BarChart3,
  PieChart,
  LineChart,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/api';

// Types
interface SecurityStats {
  totalAlerts: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  recentAlerts: SecurityAlert[];
  topOffenders: Array<{ userId: string; alertCount: number }>;
}

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  userId?: string;
  companyId?: string;
  ipAddress?: string;
  createdAt: string;
  acknowledged: boolean;
  metadata?: Record<string, unknown>;
}

interface AuditStats {
  totalEvents: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  recentFailures: number;
  topActions: Array<{ action: string; count: number }>;
}

interface TimelineEvent {
  id: string;
  type: string;
  action: string;
  actionLabel: string;
  timestamp: string;
  ipAddress: string | null;
  device: string | null;
  browser: string | null;
  status: string;
  severity: string;
}

// Constants
const SEVERITY_COLORS = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

const SEVERITY_LABELS = {
  critical: 'Crítico',
  high: 'Alto',
  medium: 'Médio',
  low: 'Baixo',
};

const ALERT_TYPE_LABELS: Record<string, string> = {
  multiple_failed_logins: 'Múltiplas Falhas de Login',
  unusual_login_location: 'Localização de Login Incomum',
  unusual_login_time: 'Horário de Login Incomum',
  multiple_sessions: 'Múltiplas Sessões',
  privilege_escalation: 'Escalação de Privilégios',
  mass_data_export: 'Exportação Massiva',
  mass_data_deletion: 'Exclusão Massiva',
  api_abuse: 'Abuso de API',
  suspicious_pattern: 'Padrão Suspeito',
  account_takeover_attempt: 'Tentativa de Tomada de Conta',
  brute_force_attempt: 'Tentativa de Força Bruta',
  credential_stuffing: 'Credential Stuffing',
  impossible_travel: 'Viagem Impossível',
  new_device_login: 'Novo Dispositivo',
  sensitive_action_spike: 'Pico de Ações Sensíveis',
};

const PERIOD_OPTIONS = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'custom', label: 'Personalizado' },
];

export default function SecurityDashboardPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [showAlertDetail, setShowAlertDetail] = useState(false);
  const [period, setPeriod] = useState('30d');

  const fetchData = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      // Fetch audit stats
      const auditResponse = await fetch('/api/admin/audit-logs?stats=true');
      const auditData = await auditResponse.json();
      if (auditData.success) {
        setStats(auditData.data);
      }

      // Fetch security alerts
      const alertsResponse = await fetch('/api/admin/security-alerts');
      const alertsData = await alertsResponse.json();
      if (alertsData.success) {
        setAlerts(alertsData.data.alerts);
        setSecurityStats(alertsData.data.stats);
      }
    } catch (error) {
      console.error('Error fetching security data:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar dados.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [session, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/admin/security-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Sucesso', description: 'Alerta reconhecido.' });
        fetchData();
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro ao reconhecer alerta.', variant: 'destructive' });
    }
  };

  const handleExportReport = async () => {
    try {
      const response = await fetch('/api/admin/compliance?format=csv');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Sucesso', description: 'Relatório exportado.' });
    } catch {
      toast({ title: 'Erro', description: 'Erro ao exportar relatório.', variant: 'destructive' });
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="h-4 w-4" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Dashboard de Segurança
          </h1>
          <p className="text-muted-foreground">
            Monitoramento e analytics de segurança em tempo real
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={handleExportReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Eventos</p>
                <p className="text-2xl font-bold">{stats?.totalEvents || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas Ativos</p>
                <p className="text-2xl font-bold text-destructive">
                  {securityStats?.totalAlerts || 0}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Falhas Recentes</p>
                <p className="text-2xl font-bold text-orange-500">
                  {stats?.recentFailures || 0}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Eventos Críticos</p>
                <p className="text-2xl font-bold text-red-500">
                  {stats?.bySeverity?.['critical'] || 0}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="categories">Por Categoria</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Severity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribuição por Severidade
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {['critical', 'warning', 'info'].map(severity => {
                      const count = stats?.bySeverity?.[severity] || 0;
                      const total = stats?.totalEvents || 1;
                      const percentage = Math.round((count / total) * 100);
                      
                      return (
                        <div key={severity} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize">
                              {severity === 'critical' ? 'Crítico' : 
                               severity === 'warning' ? 'Aviso' : 'Info'}
                            </span>
                            <span>{count} ({percentage}%)</span>
                          </div>
                          <Progress 
                            value={percentage} 
                            className={`h-2 ${severity === 'critical' ? '[&>div]:bg-red-500' : 
                              severity === 'warning' ? '[&>div]:bg-yellow-500' : '[&>div]:bg-blue-500'}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Ações Mais Frequentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats?.topActions?.slice(0, 5).map((action, index) => (
                      <div key={action.action} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm">
                            <span className="truncate">{action.action}</span>
                            <span className="text-muted-foreground">{action.count}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Atividade Recente
              </CardTitle>
              <CardDescription>Últimos eventos registrados</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  {securityStats?.recentAlerts?.slice(0, 5).map(alert => (
                    <div 
                      key={alert.id} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => { setSelectedAlert(alert); setShowAlertDetail(true); }}
                    >
                      <div className={`p-2 rounded-full ${SEVERITY_COLORS[alert.severity]} text-white`}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(alert.createdAt)}
                        </p>
                      </div>
                      <Badge variant={alert.acknowledged ? 'secondary' : 'destructive'}>
                        {alert.acknowledged ? 'Reconhecido' : 'Pendente'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {/* Active Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alertas de Segurança Ativos
              </CardTitle>
              <CardDescription>
                Alertas que requerem atenção imediata
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>Nenhum alerta ativo</p>
                  <p className="text-sm">O sistema está funcionando normalmente</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map(alert => (
                    <div 
                      key={alert.id}
                      className="p-4 rounded-lg border border-l-4"
                      style={{ borderLeftColor: alert.severity === 'critical' ? '#ef4444' : 
                        alert.severity === 'high' ? '#f97316' : 
                        alert.severity === 'medium' ? '#eab308' : '#3b82f6' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`${SEVERITY_COLORS[alert.severity]} text-white`}>
                              {SEVERITY_LABELS[alert.severity]}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {ALERT_TYPE_LABELS[alert.type] || alert.type}
                            </span>
                          </div>
                          <p className="font-medium">{alert.title}</p>
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                          {alert.ipAddress && (
                            <p className="text-xs font-mono text-muted-foreground">
                              IP: {alert.ipAddress}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(alert.createdAt)}
                          </span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleAcknowledgeAlert(alert.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Reconhecer
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alerts by Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Tipo de Alerta</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(securityStats?.byType || {}).map(([type, count]) => (
                    <div key={type} className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        {ALERT_TYPE_LABELS[type] || type}
                      </p>
                      <p className="text-2xl font-bold">{count}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'authentication', label: 'Autenticação', icon: Lock },
              { key: 'user_management', label: 'Gestão de Usuários', icon: Users },
              { key: 'data_access', label: 'Acesso a Dados', icon: Database },
              { key: 'data_modification', label: 'Modificação de Dados', icon: FileText },
              { key: 'system', label: 'Sistema', icon: Shield },
              { key: 'company_management', label: 'Gestão de Empresas', icon: Globe },
            ].map(category => {
              const count = stats?.byCategory?.[category.key] || 0;
              const total = stats?.totalEvents || 1;
              const percentage = Math.round((count / total) * 100);
              
              return (
                <Card key={category.key}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-primary/10">
                        <category.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{category.label}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">{count}</span>
                          <span className="text-sm text-muted-foreground">
                            ({percentage}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Tendência de Eventos
              </CardTitle>
              <CardDescription>
                Evolução dos eventos ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                    <p>Visualização de timeline em desenvolvimento</p>
                    <p className="text-sm">Use a API /api/admin/audit-logs/timeline para dados</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Alert Detail Dialog */}
      <Dialog open={showAlertDetail} onOpenChange={setShowAlertDetail}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Alerta</DialogTitle>
            <DialogDescription>
              Informações completas do alerta de segurança
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={`${SEVERITY_COLORS[selectedAlert.severity]} text-white`}>
                    {SEVERITY_LABELS[selectedAlert.severity]}
                  </Badge>
                  <span className="font-medium">{selectedAlert.title}</span>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Descrição</p>
                  <p>{selectedAlert.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo</p>
                    <p>{ALERT_TYPE_LABELS[selectedAlert.type] || selectedAlert.type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data/Hora</p>
                    <p>{formatDateTime(selectedAlert.createdAt)}</p>
                  </div>
                </div>

                {selectedAlert.ipAddress && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      Endereço IP
                    </p>
                    <p className="font-mono">{selectedAlert.ipAddress}</p>
                  </div>
                )}

                {selectedAlert.metadata && Object.keys(selectedAlert.metadata).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Metadados</p>
                    <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                      {JSON.stringify(selectedAlert.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      handleAcknowledgeAlert(selectedAlert.id);
                      setShowAlertDetail(false);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Reconhecer Alerta
                  </Button>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
