// =============================================================================
// ConstrutorPro - Progress Indicator
// Componente para exibir progresso de operações em tempo real
// =============================================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Upload,
  Download,
  FileText,
  Database,
  X,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useWebSocketOptional } from './websocket-provider';
import type { ProgressPayload } from '@/lib/realtime/websocket';

// =============================================================================
// Tipos
// =============================================================================

interface ProgressIndicatorProps {
  className?: string;
  maxItems?: number;
  showCompleted?: boolean;
  autoHideCompleted?: boolean;
  autoHideDelay?: number;
}

type OperationIcon = 'upload' | 'download' | 'import' | 'export' | 'process';

// =============================================================================
// Ícones por operação
// =============================================================================

const operationIcons: Record<OperationIcon, React.ReactNode> = {
  upload: <Upload className="h-4 w-4" />,
  download: <Download className="h-4 w-4" />,
  import: <Database className="h-4 w-4" />,
  export: <FileText className="h-4 w-4" />,
  process: <Loader2 className="h-4 w-4 animate-spin" />,
};

// =============================================================================
// Helper para obter ícone da operação
// =============================================================================

function getOperationIcon(operation: string): React.ReactNode {
  const normalizedOp = operation.toLowerCase();

  if (normalizedOp.includes('upload')) return operationIcons.upload;
  if (normalizedOp.includes('download')) return operationIcons.download;
  if (normalizedOp.includes('import')) return operationIcons.import;
  if (normalizedOp.includes('export')) return operationIcons.export;

  return operationIcons.process;
}

// =============================================================================
// Componente de item de progresso
// =============================================================================

interface ProgressItemProps {
  progress: ProgressPayload;
  onDismiss?: () => void;
}

function ProgressItem({ progress, onDismiss }: ProgressItemProps) {
  const { progressId, operation, status, progress: percentage, message, error } = progress;

  const isCompleted = status === 'completed';
  const isError = status === 'error';
  const isInProgress = status === 'in_progress' || status === 'started';

  return (
    <Card
      className={cn(
        'p-3 transition-all duration-300',
        isCompleted && 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
        isError && 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Ícone */}
        <div
          className={cn(
            'flex-shrink-0 mt-0.5',
            isCompleted && 'text-green-500',
            isError && 'text-red-500',
            isInProgress && 'text-blue-500'
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : isError ? (
            <XCircle className="h-5 w-5" />
          ) : (
            getOperationIcon(operation)
          )}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium truncate">{operation}</h4>
            {onDismiss && (isCompleted || isError) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={onDismiss}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {message && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{message}</p>
          )}

          {isInProgress && (
            <div className="mt-2">
              <Progress value={percentage} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {percentage}%
              </p>
            </div>
          )}

          {isError && error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// Componente Principal
// =============================================================================

export function ProgressIndicator({
  className,
  maxItems = 3,
  showCompleted = true,
  autoHideCompleted = true,
  autoHideDelay = 5000,
}: ProgressIndicatorProps) {
  const wsContext = useWebSocketOptional();
  const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());
  const [hiddenItems, setHiddenItems] = useState<Set<string>>(new Set());

  // Obter progressos ativos
  const activeProgress = wsContext?.activeProgress || [];

  // Filtrar progressos
  const visibleProgress = activeProgress
    .filter(p => {
      // Ignorar itens dispensados
      if (dismissedItems.has(p.progressId)) return false;

      // Ignorar itens ocultos automaticamente
      if (hiddenItems.has(p.progressId)) return false;

      // Filtrar completos se necessário
      if (!showCompleted && p.status === 'completed') return false;

      return true;
    })
    .slice(0, maxItems);

  // Auto-ocultar itens completos
  useEffect(() => {
    if (!autoHideCompleted) return;

    const completedItems = activeProgress.filter(
      p => p.status === 'completed' || p.status === 'error'
    );

    const timers: NodeJS.Timeout[] = [];

    completedItems.forEach(item => {
      if (!hiddenItems.has(item.progressId) && !dismissedItems.has(item.progressId)) {
        const timer = setTimeout(() => {
          setHiddenItems(prev => new Set([...prev, item.progressId]));
        }, autoHideDelay);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [activeProgress, autoHideCompleted, autoHideDelay, hiddenItems, dismissedItems]);

  // Dispensar item
  const handleDismiss = useCallback((progressId: string) => {
    setDismissedItems(prev => new Set([...prev, progressId]));
  }, []);

  // Não renderizar se não houver progressos visíveis
  if (visibleProgress.length === 0) {
    return null;
  }

  return (
    <div className={cn('fixed bottom-4 right-4 z-50 space-y-2 w-80', className)}>
      {visibleProgress.map(progress => (
        <ProgressItem
          key={progress.progressId}
          progress={progress}
          onDismiss={() => handleDismiss(progress.progressId)}
        />
      ))}
    </div>
  );
}

// =============================================================================
// Componente de Progresso Inline
// =============================================================================

interface InlineProgressProps {
  progressId: string;
  className?: string;
}

export function InlineProgress({ progressId, className }: InlineProgressProps) {
  const wsContext = useWebSocketOptional();

  // Use useMemo instead of useState + useEffect for derived state
  const progress = wsContext?.activeProgress?.find(p => p.progressId === progressId) ?? null;

  if (!progress) {
    return null;
  }

  const { operation, status, progress: percentage, message } = progress;
  const isInProgress = status === 'in_progress' || status === 'started';

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{operation}</span>
        <span className="text-muted-foreground">{percentage}%</span>
      </div>

      {isInProgress && (
        <Progress value={percentage} className="h-2" />
      )}

      {message && (
        <p className="text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
