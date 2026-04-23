'use client';

/**
 * Componente de Visualização de Logs de Auditoria
 * 
 * Recursos:
 * - Filtros por data, ação, entidade, usuário
 * - Paginação
 * - Detalhes do log com diff visual
 * - Exportação
 * - Verificação de integridade
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  FileText,
  Search,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Activity,
  Database,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';

// Tipos
interface AuditLogEntry {
  id: string;
  companyId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  hash: string;
  previousHash: string | null;
  sequenceNumber: number;
  timestamp: string;
}

interface AuditStats {
  totalLogs: number;
  logsToday: number;
  logsThisMonth: number;
  byAction: Record<string, number>;
  byEntityType: Record<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
}

// Mapeamento de ações
const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  login: { label: 'Login', color: 'bg-green-500' },
  logout: { label: 'Logout', color: 'bg-gray-500' },
  login_failed: { label: 'Login Falhou', color: 'bg-red-500' },
  create: { label: 'Criar', color: 'bg-blue-500' },
  update: { label: 'Atualizar', color: 'bg-amber-500' },
  delete: { label: 'Excluir', color: 'bg-red-500' },
  export: { label: 'Exportar', color: 'bg-purple-500' },
  import: { label: 'Importar', color: 'bg-indigo-500' },
  approve: { label: 'Aprovar', color: 'bg-green-500' },
  reject: { label: 'Rejeitar', color: 'bg-red-500' },
  project_create: { label: 'Projeto Criado', color: 'bg-blue-500' },
  project_update: { label: 'Projeto Atualizado', color: 'bg-amber-500' },
  budget_approve: { label: 'Orçamento Aprovado', color: 'bg-green-500' },
  nfe_emit: { label: 'NF-e Emitida', color: 'bg-blue-500' },
  data_export: { label: 'Dados Exportados', color: 'bg-purple-500' },
  data_delete: { label: 'Dados Excluídos', color: 'bg-red-500' },
};

// Mapeamento de entidades
const ENTITY_LABELS: Record<string, string> = {
  users: 'Usuários',
  projects: 'Projetos',
  budgets: 'Orçamentos',
  schedules: 'Cronogramas',
  purchase_orders: 'Pedidos de Compra',
  transactions: 'Transações',
  invoices: 'Faturas',
  patrimonios: 'Patrimônio',
  viagens: 'Viagens',
  notas_fiscais: 'Notas Fiscais',
  companies: 'Empresas',
  api_keys: 'Chaves API',
};

export function AuditLogsViewer() {
  // Estados
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filtros
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    userId: '',
    startDate: '',
    endDate: '',
    search: '',
  });
  
  // Dialogs
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    valid: boolean;
    errors: string[];
    verifiedCount: number;
  } | null>(null);

  // Carregar dados
  useEffect(() => {
    loadLogs();
    loadStats();
  }, [page, filters.action, filters.entityType, filters.startDate, filters.endDate]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', '50');
      
      if (filters.action) params.append('action', filters.action);
      if (filters.entityType) params.append('entityType', filters.entityType);
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      const data = await response.json();

      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast.error('Erro ao carregar logs de auditoria');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs?stats=true');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const verifyChain = async () => {
    try {
      const response = await fetch('/api/admin/audit-logs?verify=true');
      const data = await response.json();
      setVerifyResult(data);
      setShowVerifyDialog(true);
    } catch (error) {
      console.error('Erro ao verificar cadeia:', error);
      toast.error('Erro ao verificar integridade');
    }
  };

  const exportLogs = async (format: 'json' | 'csv') => {
    try {
      const params = new URLSearchParams();
      params.append('export', format);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      const content = await response.text();

      const blob = new Blob([content], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Logs exportados com sucesso');
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
      toast.error('Erro ao exportar logs');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR');
  };

  const getActionBadge = (action: string) => {
    const info = ACTION_LABELS[action] || { label: action, color: 'bg-gray-500' };
    return (
      <Badge className={`${info.color} text-white text-xs`}>
        {info.label}
      </Badge>
    );
  };

  const getEntityLabel = (entityType: string) => {
    return ENTITY_LABELS[entityType] || entityType;
  };

  const truncateHash = (hash: string) => {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Logs de Auditoria</h2>
          <p className="text-muted-foreground">
            Rastreamento imutável de todas as ações do sistema (LGPD/Lei 14.133/2021)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={verifyChain}>
            <Shield className="h-4 w-4 mr-2" />
            Verificar Integridade
          </Button>
          <Button variant="outline" onClick={() => exportLogs('csv')}>
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
                  <p className="text-sm text-muted-foreground">Total de Logs</p>
                  <p className="text-2xl font-bold">{stats.totalLogs.toLocaleString()}</p>
                </div>
                <Database className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Logs Hoje</p>
                  <p className="text-2xl font-bold">{stats.logsToday.toLocaleString()}</p>
                </div>
                <Clock className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Este Mês</p>
                  <p className="text-2xl font-bold">{stats.logsThisMonth.toLocaleString()}</p>
                </div>
                <Activity className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tipos de Ação</p>
                  <p className="text-2xl font-bold">{Object.keys(stats.byAction).length}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ação</label>
              <Select
                value={filters.action}
                onValueChange={(value) => setFilters({ ...filters, action: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(ACTION_LABELS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Entidade</label>
              <Select
                value={filters.entityType}
                onValueChange={(value) => setFilters({ ...filters, entityType: value === 'all' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {Object.entries(ENTITY_LABELS).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Início</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Fim</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">&nbsp;</label>
              <Button onClick={loadLogs} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Hash</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum log encontrado
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getEntityLabel(log.entityType)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {log.description}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.ipAddress || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {truncateHash(log.hash)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Mostrando {((page - 1) * 50) + 1} a {Math.min(page * 50, total)} de {total} registros
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
            <DialogDescription>
              Seq: #{selectedLog?.sequenceNumber} | {formatDate(selectedLog?.timestamp || '')}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Ação</label>
                    <p>{getActionBadge(selectedLog.action)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Entidade</label>
                    <p>{getEntityLabel(selectedLog.entityType)}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">ID da Entidade</label>
                    <p className="font-mono text-sm">{selectedLog.entityId || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">IP Address</label>
                    <p className="font-mono text-sm">{selectedLog.ipAddress || '-'}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs text-muted-foreground">Descrição</label>
                  <p className="text-sm mt-1">{selectedLog.description}</p>
                </div>

                {/* Hash Info */}
                <div className="bg-muted p-3 rounded-lg space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Hash</label>
                    <p className="font-mono text-xs break-all">{selectedLog.hash}</p>
                  </div>
                  {selectedLog.previousHash && (
                    <div>
                      <label className="text-xs text-muted-foreground">Hash Anterior</label>
                      <p className="font-mono text-xs break-all">{selectedLog.previousHash}</p>
                    </div>
                  )}
                </div>

                {/* Old Value */}
                {selectedLog.oldValue && (
                  <div>
                    <label className="text-xs text-muted-foreground">Valor Anterior</label>
                    <pre className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg text-xs overflow-auto">
                      {JSON.stringify(selectedLog.oldValue, null, 2)}
                    </pre>
                  </div>
                )}

                {/* New Value */}
                {selectedLog.newValue && (
                  <div>
                    <label className="text-xs text-muted-foreground">Valor Novo</label>
                    <pre className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg text-xs overflow-auto">
                      {JSON.stringify(selectedLog.newValue, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Metadata */}
                {selectedLog.metadata && (
                  <div>
                    <label className="text-xs text-muted-foreground">Metadados</label>
                    <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}

                {/* User Agent */}
                {selectedLog.userAgent && (
                  <div>
                    <label className="text-xs text-muted-foreground">User Agent</label>
                    <p className="text-xs text-muted-foreground">{selectedLog.userAgent}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Verify Dialog */}
      <Dialog open={showVerifyDialog} onOpenChange={setShowVerifyDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Verificação de Integridade
            </DialogTitle>
            <DialogDescription>
              Verificação da cadeia de hash dos logs de auditoria
            </DialogDescription>
          </DialogHeader>

          {verifyResult && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg flex items-center gap-3 ${
                verifyResult.valid
                  ? 'bg-green-50 dark:bg-green-950/20'
                  : 'bg-red-50 dark:bg-red-950/20'
              }`}>
                {verifyResult.valid ? (
                  <>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                    <div>
                      <p className="font-semibold text-green-700 dark:text-green-400">
                        Cadeia Íntegra
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-500">
                        Todos os {verifyResult.verifiedCount} registros verificados com sucesso
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="font-semibold text-red-700 dark:text-red-400">
                        Cadeia Comprometida
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-500">
                        {verifyResult.errors.length} erro(s) encontrado(s)
                      </p>
                    </div>
                  </>
                )}
              </div>

              {verifyResult.errors.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-red-600">Erros:</label>
                  <ScrollArea className="h-48 border rounded-lg p-2">
                    {verifyResult.errors.map((error, index) => (
                      <div key={index} className="text-xs text-red-600 mb-1">
                        {error}
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AuditLogsViewer;
