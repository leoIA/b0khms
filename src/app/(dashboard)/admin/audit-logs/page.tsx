// =============================================================================
// ConstrutorPro - Audit Logs Admin Page
// Página de visualização de logs de auditoria
// =============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield,
  Search,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
  AlertCircle,
  User,
  Building,
  Monitor,
  Globe,
  Eye,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDateTime } from '@/lib/api';

// Types
interface AuditLog {
  id: string;
  companyId: string | null;
  userId: string | null;
  action: string;
  category: string;
  severity: string;
  resourceType: string | null;
  resourceId: string | null;
  resourceName: string | null;
  ipAddress: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  oldValue: string | null;
  newValue: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  users?: { id: string; name: string; email: string } | null;
  companies?: { id: string; name: string } | null;
}

interface AuditStats {
  totalEvents: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  recentFailures: number;
}

// Constants
const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  login_failed: 'Falha no Login',
  password_change: 'Alteração de Senha',
  '2fa_enabled': '2FA Ativado',
  '2fa_disabled': '2FA Desativado',
  user_created: 'Usuário Criado',
  user_deleted: 'Usuário Excluído',
  user_role_changed: 'Role Alterada',
  company_created: 'Empresa Criada',
  security_alert: 'Alerta de Segurança',
};

const CATEGORY_LABELS: Record<string, string> = {
  authentication: 'Autenticação',
  authorization: 'Autorização',
  data_access: 'Acesso a Dados',
  data_modification: 'Modificação de Dados',
  user_management: 'Gestão de Usuários',
  system: 'Sistema',
};

const SEVERITY_COLORS: Record<string, string> = {
  info: 'bg-blue-500',
  warning: 'bg-yellow-500',
  critical: 'bg-red-500',
};

const SEVERITY_LABELS: Record<string, string> = {
  info: 'Info',
  warning: 'Aviso',
  critical: 'Crítico',
};

export default function AuditLogsPage() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      if (search) params.append('search', search);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (severityFilter !== 'all') params.append('severity', severityFilter);

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data.logs);
        setPagination(data.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({ title: 'Erro', description: 'Erro ao carregar logs.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [session, pagination.page, pagination.limit, search, categoryFilter, severityFilter, toast]);

  const fetchStats = useCallback(async () => {
    if (!session?.user) return;
    try {
      const response = await fetch('/api/admin/audit-logs?stats=true');
      const data = await response.json();
      if (data.success) setStats(data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, [session]);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [fetchLogs, fetchStats]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', '1000');
      if (categoryFilter !== 'all') params.append('category', categoryFilter);

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await response.json();

      if (data.success) {
        const headers = ['Data', 'Ação', 'Severidade', 'Usuário', 'IP'];
        const rows = data.data.logs.map((log: AuditLog) => [
          formatDateTime(log.createdAt),
          ACTION_LABELS[log.action] || log.action,
          log.severity,
          log.users?.email || '-',
          log.ipAddress || '-',
        ]);

        const csv = [headers.join(';'), ...rows.map((r: string[]) => r.join(';'))].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Sucesso', description: 'Logs exportados.' });
      }
    } catch {
      toast({ title: 'Erro', description: 'Erro ao exportar.', variant: 'destructive' });
    }
  };

  const getSeverityIcon = (severity: string) => {
    if (severity === 'critical') return <AlertCircle className="h-4 w-4" />;
    if (severity === 'warning') return <AlertTriangle className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Logs de Auditoria
          </h1>
          <p className="text-muted-foreground">
            Visualize eventos de segurança e conformidade
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { fetchLogs(); fetchStats(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Eventos</p>
                  <p className="text-2xl font-bold">{stats.totalEvents}</p>
                </div>
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Falhas Recentes</p>
                  <p className="text-2xl font-bold text-destructive">{stats.recentFailures}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Críticos</p>
                  <p className="text-2xl font-bold">{stats.bySeverity['critical'] || 0}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Autenticação</p>
                  <p className="text-2xl font-bold">{stats.byCategory['authentication'] || 0}</p>
                </div>
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
              />
              <Button onClick={fetchLogs}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      {formatDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{ACTION_LABELS[log.action] || log.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[log.category] || log.category}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${SEVERITY_COLORS[log.severity] || 'bg-gray-500'} text-white`}>
                        {getSeverityIcon(log.severity)}
                        <span className="ml-1">{SEVERITY_LABELS[log.severity] || log.severity}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.users?.name || '-'}</p>
                        <p className="text-xs text-muted-foreground">{log.users?.email || ''}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.ipAddress || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedLog(log); setShowDetail(true); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {pagination.total} registros
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="flex items-center px-4">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
            <DialogDescription>
              Informações completas do evento
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Ação</p>
                    <p className="font-medium">{ACTION_LABELS[selectedLog.action] || selectedLog.action}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Categoria</p>
                    <p className="font-medium">{CATEGORY_LABELS[selectedLog.category] || selectedLog.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data/Hora</p>
                    <p className="font-medium">{formatDateTime(selectedLog.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Severidade</p>
                    <Badge className={`${SEVERITY_COLORS[selectedLog.severity] || 'bg-gray-500'} text-white`}>
                      {SEVERITY_LABELS[selectedLog.severity] || selectedLog.severity}
                    </Badge>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <User className="h-4 w-4" />
                    Usuário
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p>{selectedLog.users?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p>{selectedLog.users?.email || '-'}</p>
                    </div>
                  </div>
                </div>

                {selectedLog.companies && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <Building className="h-4 w-4" />
                      Empresa
                    </h4>
                    <p>{selectedLog.companies.name}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <Monitor className="h-4 w-4" />
                    Contexto
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        IP
                      </p>
                      <p className="font-mono text-sm">{selectedLog.ipAddress || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dispositivo</p>
                      <p>{selectedLog.device || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Navegador</p>
                      <p>{selectedLog.browser || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Sistema</p>
                      <p>{selectedLog.os || '-'}</p>
                    </div>
                  </div>
                </div>

                {selectedLog.errorMessage && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-destructive flex items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      Erro
                    </h4>
                    <p className="text-sm bg-destructive/10 p-2 rounded">{selectedLog.errorMessage}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
