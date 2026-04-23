// =============================================================================
// ConstrutorPro - MS Project Import Component
// Interface para importação de cronogramas do Microsoft Project
// =============================================================================

'use client';

import { useState, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Users,
  Target,
  Clock,
  ArrowRight,
  Download,
  FileSpreadsheet,
} from 'lucide-react';

// =============================================================================
// Tipos
// =============================================================================

interface ImportStatistics {
  totalTasks: number;
  summaryTasks: number;
  milestones: number;
  criticalTasks: number;
  totalDuration: number;
  totalWork: number;
  totalResources: number;
}

interface ImportProject {
  name: string;
  startDate: string;
  finishDate: string;
  calendar: string;
  currency: string;
  company: string | null;
  manager: string | null;
}

interface PreviewTask {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  duration: number;
  progress: number;
  status: string;
  isCritical: boolean;
  dependencies: Array<{ dependsOnId: string; type: string; lag: number }>;
}

interface ImportResult {
  project: ImportProject;
  statistics: ImportStatistics;
  warnings: string[];
  errors?: string[];
}

interface MSProjectImportProps {
  projectId?: string;
  onImportComplete?: (scheduleId: string) => void;
}

// =============================================================================
// Componente Principal
// =============================================================================

export function MSProjectImport({ projectId, onImportComplete }: MSProjectImportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewTasks, setPreviewTasks] = useState<PreviewTask[]>([]);
  const [scheduleName, setScheduleName] = useState('');

  // Handler de seleção de arquivo
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.xml')) {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione um arquivo XML do MS Project.',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      setScheduleName(`${selectedFile.name.replace('.xml', '')} (Importado)`);
    }
  }

  // Preview da importação
  async function handlePreview() {
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/cronograma/importar-ms-project', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setImportResult(data.data.importResult);
        setPreviewTasks(data.data.tasks || []);
        setPreviewOpen(true);
      } else {
        toast({
          title: 'Erro na importação',
          description: data.error || 'Erro ao processar arquivo.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao conectar com o servidor.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  // Confirmar importação
  async function handleConfirmImport() {
    if (!file || !projectId) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);
      formData.append('scheduleName', scheduleName || importResult?.project.name || 'Cronograma Importado');

      const response = await fetch('/api/cronograma/importar-ms-project', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Importação concluída',
          description: `Cronograma importado com ${data.data.importResult.statistics.totalTasks} tarefas.`,
        });
        setPreviewOpen(false);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onImportComplete?.(data.data.scheduleId);
      } else {
        toast({
          title: 'Erro na importação',
          description: data.error || 'Erro ao importar cronograma.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao conectar com o servidor.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  // Formatar data
  function formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString('pt-BR');
  }

  // Formatar status
  function getStatusBadge(status: string) {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      in_progress: { label: 'Em andamento', variant: 'default' },
      completed: { label: 'Concluído', variant: 'outline' },
    };
    const c = config[status] || { label: status, variant: 'outline' };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar MS Project
          </CardTitle>
          <CardDescription>
            Importe cronogramas do Microsoft Project em formato XML
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Area */}
          <div className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="ms-project-file">Arquivo XML</Label>
              <Input
                id="ms-project-file"
                type="file"
                accept=".xml"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
            </div>

            {file && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <FileText className="h-8 w-8 text-blue-500" />
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  Remover
                </Button>
              </div>
            )}

            {/* Info Alert */}
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertTitle>Como exportar do MS Project</AlertTitle>
              <AlertDescription>
                <ol className="list-decimal list-inside space-y-1 text-sm mt-2">
                  <li>Abra o projeto no Microsoft Project</li>
                  <li>Vá em Arquivo {'>'} Salvar Como</li>
                  <li>Selecione o formato "XML (*.xml)"</li>
                  <li>Salve o arquivo e faça upload aqui</li>
                </ol>
              </AlertDescription>
            </Alert>

            {/* Action Button */}
            <Button
              onClick={handlePreview}
              disabled={!file || loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Visualizar Importação
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Prévia da Importação
            </DialogTitle>
            <DialogDescription>
              Revise os dados antes de confirmar a importação
            </DialogDescription>
          </DialogHeader>

          {importResult && (
            <div className="space-y-6">
              {/* Project Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{importResult.project.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Início</p>
                      <p className="font-medium">{formatDate(importResult.project.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Término</p>
                      <p className="font-medium">{formatDate(importResult.project.finishDate)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gestor</p>
                      <p className="font-medium">{importResult.project.manager || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Empresa</p>
                      <p className="font-medium">{importResult.project.company || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-500" />
                    <span className="text-2xl font-bold">{importResult.statistics.totalTasks}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Total de Tarefas</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold">{importResult.statistics.milestones}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Marcos</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    <span className="text-2xl font-bold">{importResult.statistics.totalDuration}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Dias de Duração</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    <span className="text-2xl font-bold">{importResult.statistics.totalResources}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Recursos</p>
                </div>
              </div>

              {/* Warnings */}
              {importResult.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Avisos ({importResult.warnings.length})</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                      {importResult.warnings.slice(0, 5).map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                      {importResult.warnings.length > 5 && (
                        <li>... e mais {importResult.warnings.length - 5} avisos</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Tasks Preview Table */}
              <div>
                <h4 className="font-medium mb-3">Tarefas (primeiras 20)</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-8">#</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Duração</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Crítica</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewTasks.slice(0, 20).map((task, index) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-mono text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell className={task.isCritical ? 'text-red-600 font-medium' : ''}>
                            {task.name}
                          </TableCell>
                          <TableCell>{formatDate(task.startDate)}</TableCell>
                          <TableCell>{task.duration} dias</TableCell>
                          <TableCell>{getStatusBadge(task.status)}</TableCell>
                          <TableCell>
                            {task.isCritical ? (
                              <Badge variant="destructive">Sim</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {previewTasks.length > 20 && (
                  <p className="text-sm text-muted-foreground text-center mt-2">
                    Mostrando 20 de {previewTasks.length} tarefas
                  </p>
                )}
              </div>

              {/* Schedule Name Input */}
              {projectId && (
                <div className="space-y-2">
                  <Label htmlFor="schedule-name">Nome do Cronograma</Label>
                  <Input
                    id="schedule-name"
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                    placeholder="Nome do cronograma"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Cancelar
            </Button>
            {projectId && (
              <Button onClick={handleConfirmImport} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirmar Importação
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
