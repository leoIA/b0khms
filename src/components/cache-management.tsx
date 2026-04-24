'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Server, 
  Trash2, 
  RefreshCw, 
  Activity, 
  HardDrive,
  Cpu,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

// Interfaces
interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  avgResponseTime: number;
}

interface CacheStats {
  provider: 'redis' | 'memory';
  redis: {
    metrics: CacheMetrics;
    stats: {
      totalKeys: number;
      memoryUsage: string;
      connectedClients: number;
      uptime: number;
    };
  } | null;
  memory: {
    metrics: CacheMetrics;
    stats: {
      totalKeys: number;
      keys: string[];
      memoryUsage: number;
    };
  };
  isRedisActive: boolean;
  activeSessions?: number;
}

const DEFAULT_METRICS: CacheMetrics = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0,
  avgResponseTime: 0,
};

export function CacheManagementDashboard() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para ações
  const [selectedAction, setSelectedAction] = useState('');
  const [targetId, setTargetId] = useState('');
  const [pattern, setPattern] = useState('');

  // Carregar estatísticas
  const loadStats = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/cache');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load cache stats:', error);
      toast.error('Erro ao carregar estatísticas do cache');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Atualizar a cada 30 segundos
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // Executar ação de cache
  const executeAction = async (action: string, data?: { targetId?: string; target?: string }) => {
    try {
      const response = await fetch('/api/admin/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message);
        loadStats();
      } else {
        toast.error(result.error || 'Erro ao executar ação');
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
      toast.error('Erro ao executar ação');
    }
  };

  // Calcular taxa de hit
  const calculateHitRate = (metrics: CacheMetrics): number => {
    const total = metrics.hits + metrics.misses;
    if (total === 0) return 0;
    return (metrics.hits / total) * 100;
  };

  // Formatar uptime
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  // Formatar bytes
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciamento de Cache</h2>
          <p className="text-muted-foreground">
            Monitore e gerencie o cache Redis do sistema
          </p>
        </div>
        <Button onClick={loadStats} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Status do Provider */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Provedor</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={stats?.provider === 'redis' ? 'default' : 'secondary'}>
                {stats?.provider?.toUpperCase() || 'N/A'}
              </Badge>
              {stats?.isRedisActive ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.isRedisActive ? 'Redis conectado' : 'Usando cache em memória'}
            </p>
          </CardContent>
        </Card>

        {/* Chaves no Cache */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chaves no Cache</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.redis?.stats.totalKeys || stats?.memory.stats.totalKeys || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.redis?.stats.memoryUsage || formatBytes(stats?.memory.stats.memoryUsage || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Taxa de Hit */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Hit</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateHitRate(stats?.redis?.metrics || stats?.memory.metrics || DEFAULT_METRICS).toFixed(1)}%
            </div>
            <Progress 
              value={calculateHitRate(stats?.redis?.metrics || stats?.memory.metrics || DEFAULT_METRICS)} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        {/* Sessões Ativas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões Ativas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeSessions || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Usuários online
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="stats" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          <TabsTrigger value="actions">Ações</TabsTrigger>
          <TabsTrigger value="redis">Redis</TabsTrigger>
        </TabsList>

        {/* Estatísticas */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Métricas de Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance</CardTitle>
                <CardDescription>Métricas de desempenho do cache</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Hits</p>
                    <p className="text-2xl font-bold text-green-600">
                      {stats?.redis?.metrics.hits || stats?.memory.metrics.hits || 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Misses</p>
                    <p className="text-2xl font-bold text-red-600">
                      {stats?.redis?.metrics.misses || stats?.memory.metrics.misses || 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Sets</p>
                    <p className="text-2xl font-bold">
                      {stats?.redis?.metrics.sets || stats?.memory.metrics.sets || 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Deletes</p>
                    <p className="text-2xl font-bold">
                      {stats?.redis?.metrics.deletes || stats?.memory.metrics.deletes || 0}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Tempo médio de resposta</span>
                    <span className="font-medium">
                      {(stats?.redis?.metrics.avgResponseTime || stats?.memory.metrics.avgResponseTime || 0).toFixed(2)}ms
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Memória */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Memória</CardTitle>
                <CardDescription>Uso de memória do cache</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memória utilizada</span>
                    <span className="font-medium">
                      {stats?.redis?.stats.memoryUsage || formatBytes(stats?.memory.stats.memoryUsage || 0)}
                    </span>
                  </div>
                  <Progress value={30} className="h-2" />
                </div>
                {stats?.redis?.stats && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Clientes conectados</p>
                      <p className="text-lg font-medium">{stats.redis.stats.connectedClients}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Uptime</p>
                      <p className="text-lg font-medium">{formatUptime(stats.redis.stats.uptime)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Erros */}
          {(stats?.redis?.metrics.errors || stats?.memory.metrics.errors) ? (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Avisos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-yellow-800">
                  {(stats?.redis?.metrics.errors || 0) + (stats?.memory.metrics.errors || 0)} erros encontrados
                </p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        {/* Ações */}
        <TabsContent value="actions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Invalidação por Tipo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invalidar por Tipo</CardTitle>
                <CardDescription>Limpe caches específicos por entidade</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo de cache</Label>
                  <Select value={selectedAction} onValueChange={setSelectedAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invalidate_company">Empresa</SelectItem>
                      <SelectItem value="invalidate_project">Projeto</SelectItem>
                      <SelectItem value="invalidate_budget">Orçamento</SelectItem>
                      <SelectItem value="invalidate_user">Usuário</SelectItem>
                      <SelectItem value="invalidate_dashboard">Dashboard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>ID da entidade</Label>
                  <Input
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder="Digite o ID"
                  />
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" disabled={!selectedAction || !targetId}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Invalidar Cache
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar invalidação</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja invalidar o cache selecionado? 
                        Esta ação pode causar lentidão temporária até que o cache seja reconstruído.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => executeAction(selectedAction, { targetId })}>
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>

            {/* Invalidação por Padrão */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Invalidar por Padrão</CardTitle>
                <CardDescription>Limpe caches usando padrões (wildcards)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Padrão de chave</Label>
                  <Input
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    placeholder="Ex: projects:*:company-id"
                  />
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Exemplos de padrões:</p>
                  <ul className="list-disc list-inside">
                    <li><code>projects:*</code> - Todos os projetos</li>
                    <li><code>*:company-id</code> - Por empresa</li>
                    <li><code>dashboard:*</code> - Dashboards</li>
                  </ul>
                </div>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" variant="destructive" disabled={!pattern}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpar por Padrão
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar limpeza</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja limpar todas as chaves que correspondem ao padrão "{pattern}"?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => executeAction('clear_pattern', { target: pattern })}>
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>

          {/* Ação Perigosa */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-lg text-red-700">Zona de Perigo</CardTitle>
              <CardDescription className="text-red-600">
                Ações irreversíveis que afetam todo o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpar Todo o Cache
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>⚠️ Ação Perigosa</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá limpar TODO o cache do sistema. 
                      Isso pode causar lentidão significativa enquanto o cache é reconstruído.
                      Tem certeza que deseja continuar?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => executeAction('clear_all')}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Sim, limpar tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Redis */}
        <TabsContent value="redis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuração Redis</CardTitle>
              <CardDescription>
                Informações sobre a conexão Redis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="flex items-center gap-2">
                    {stats?.isRedisActive ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600 font-medium">Conectado</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-600 font-medium">Desconectado</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Provedor Ativo</p>
                  <Badge variant={stats?.provider === 'redis' ? 'default' : 'secondary'}>
                    {stats?.provider?.toUpperCase()}
                  </Badge>
                </div>
              </div>

              {!stats?.isRedisActive && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Nota:</strong> O Redis não está conectado. O sistema está usando cache em memória.
                    Para usar Redis em produção, configure a variável de ambiente <code className="bg-yellow-100 px-1 rounded">REDIS_URL</code>.
                  </p>
                </div>
              )}

              {stats?.redis?.stats && (
                <div className="grid gap-4 md:grid-cols-3 mt-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Uptime</span>
                    </div>
                    <p className="text-xl font-bold">{formatUptime(stats.redis.stats.uptime)}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Clientes</span>
                    </div>
                    <p className="text-xl font-bold">{stats.redis.stats.connectedClients}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Memória</span>
                    </div>
                    <p className="text-xl font-bold">{stats.redis.stats.memoryUsage}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default CacheManagementDashboard;
