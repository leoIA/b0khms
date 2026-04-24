// =============================================================================
// ConstrutorPro - CPM (Critical Path Method) Algorithm
// Algoritmo de Caminho Crítico para cronogramas de construção civil
// =============================================================================

import { DateTime } from 'luxon';

// Tipos de dependência
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

// Interface para tarefa com dados CPM
export interface CPMTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  duration: number; // em dias
  parentId?: string | null;
  progress?: number;
}

// Interface para dependência
export interface CPMDependency {
  taskId: string;
  dependsOnId: string;
  type: DependencyType;
  lag: number; // em dias (pode ser negativo para lead)
}

// Interface para resultado do cálculo CPM
export interface CPMResult {
  taskId: string;
  earlyStart: Date;
  earlyFinish: Date;
  lateStart: Date;
  lateFinish: Date;
  totalFloat: number; // em dias
  freeFloat: number; // em dias
  isCritical: boolean;
}

// Interface para o caminho crítico
export interface CriticalPathResult {
  tasks: CPMResult[];
  criticalPath: string[]; // IDs das tarefas críticas
  projectDuration: number; // duração total em dias
  projectStartDate: Date;
  projectEndDate: Date;
}

/**
 * Calcula o Caminho Crítico (CPM) de um cronograma
 * Implementa o algoritmo de cálculo forward pass e backward pass
 */
export function calculateCriticalPath(
  tasks: CPMTask[],
  dependencies: CPMDependency[],
  projectStartDate?: Date
): CriticalPathResult {
  if (tasks.length === 0) {
    return {
      tasks: [],
      criticalPath: [],
      projectDuration: 0,
      projectStartDate: projectStartDate || new Date(),
      projectEndDate: projectStartDate || new Date(),
    };
  }

  // Criar mapa de tarefas
  const taskMap = new Map<string, CPMTask>();
  tasks.forEach((task) => taskMap.set(task.id, task));

  // Criar grafo de dependências (sucessores)
  const successors = new Map<string, { dep: CPMDependency; taskId: string }[]>();
  const predecessors = new Map<string, { dep: CPMDependency; taskId: string }[]>();

  tasks.forEach((task) => {
    successors.set(task.id, []);
    predecessors.set(task.id, []);
  });

  dependencies.forEach((dep) => {
    const succ = successors.get(dep.dependsOnId) || [];
    succ.push({ dep, taskId: dep.taskId });
    successors.set(dep.dependsOnId, succ);

    const pred = predecessors.get(dep.taskId) || [];
    pred.push({ dep, taskId: dep.dependsOnId });
    predecessors.set(dep.taskId, pred);
  });

  // Encontrar tarefas raiz (sem predecessores)
  const rootTasks = tasks.filter(
    (task) => !predecessors.get(task.id) || predecessors.get(task.id)!.length === 0
  );

  // Data base do projeto
  const baseDate = projectStartDate
    ? DateTime.fromJSDate(projectStartDate)
    : rootTasks.reduce((min, task) => {
        const d = DateTime.fromJSDate(task.startDate);
        return d < min ? d : min;
      }, DateTime.fromJSDate(rootTasks[0].startDate));

  // ========================================
  // FORWARD PASS - Calcular Early Start/Finish
  // ========================================
  const earlyStart = new Map<string, DateTime>();
  const earlyFinish = new Map<string, DateTime>();

  // Ordenar tarefas topologicamente
  const sortedTasks = topologicalSort(tasks, dependencies);

  sortedTasks.forEach((task) => {
    const preds = predecessors.get(task.id) || [];

    let es: DateTime;

    if (preds.length === 0) {
      // Tarefa sem predecessores - início no dia base
      es = baseDate;
    } else {
      // Calcular ES baseado nos predecessores
      const dates = preds.map(({ dep, taskId: predId }) => {
        const predTask = taskMap.get(predId)!;
        const predEF = earlyFinish.get(predId)!;
        const predES = earlyStart.get(predId)!;
        const lag = dep.lag;

        switch (dep.type) {
          case 'FS': // Finish-to-Start: sucessor inicia após predecessor terminar
            return predEF.plus({ days: lag + 1 });
          case 'SS': // Start-to-Start: sucessor inicia após predecessor iniciar
            return predES.plus({ days: lag });
          case 'FF': // Finish-to-Finish: sucessor termina quando predecessor terminar
            // ES = EF_pred - duration + lag
            return predEF.plus({ days: lag - task.duration + 1 });
          case 'SF': // Start-to-Finish: sucessor termina quando predecessor iniciar
            return predES.plus({ days: lag - task.duration + 1 });
          default:
            return predEF.plus({ days: lag + 1 });
        }
      });

      es = dates.reduce((max, d) => (d > max ? d : max), dates[0]);
    }

    earlyStart.set(task.id, es);
    earlyFinish.set(task.id, es.plus({ days: task.duration - 1 }));
  });

  // ========================================
  // BACKWARD PASS - Calcular Late Start/Finish
  // ========================================
  const lateStart = new Map<string, DateTime>();
  const lateFinish = new Map<string, DateTime>();

  // Encontrar a data de término mais tardia do projeto
  const projectEnd = Array.from(earlyFinish.values()).reduce(
    (max, d) => (d > max ? d : max),
    earlyFinish.values().next().value
  );

  // Inicializar tarefas finais (sem sucessores)
  const finalTasks = tasks.filter(
    (task) => !successors.get(task.id) || successors.get(task.id)!.length === 0
  );

  finalTasks.forEach((task) => {
    lateFinish.set(task.id, projectEnd);
    lateStart.set(task.id, projectEnd.minus({ days: task.duration - 1 }));
  });

  // Processar em ordem reversa topológica
  const reverseSorted = [...sortedTasks].reverse();

  reverseSorted.forEach((task) => {
    const succs = successors.get(task.id) || [];

    if (succs.length === 0) {
      // Já inicializado acima
      return;
    }

    // Calcular LF baseado nos sucessores
    const dates = succs.map(({ dep, taskId: succId }) => {
      const succTask = taskMap.get(succId)!;
      const succLS = lateStart.get(succId)!;
      const succLF = lateFinish.get(succId)!;
      const lag = dep.lag;

      switch (dep.type) {
        case 'FS': // Finish-to-Start
          return succLS.minus({ days: lag + 1 });
        case 'SS': // Start-to-Start
          return succLS.minus({ days: lag });
        case 'FF': // Finish-to-Finish
          return succLF.minus({ days: lag });
        case 'SF': // Start-to-Finish
          return succLS.minus({ days: lag });
        default:
          return succLS.minus({ days: lag + 1 });
      }
    });

    const lf = dates.reduce((min, d) => (d < min ? d : min), dates[0]);
    const ls = lf.minus({ days: task.duration - 1 });

    lateFinish.set(task.id, lf);
    lateStart.set(task.id, ls);
  });

  // ========================================
  // Calcular Float e Identificar Caminho Crítico
  // ========================================
  const results: CPMResult[] = [];
  const criticalPath: string[] = [];

  tasks.forEach((task) => {
    const es = earlyStart.get(task.id)!;
    const ef = earlyFinish.get(task.id)!;
    const ls = lateStart.get(task.id)!;
    const lf = lateFinish.get(task.id)!;

    // Total Float = LS - ES = LF - EF (em dias)
    const totalFloat = Math.round(ls.diff(es, 'days').days);

    // Free Float = ES do sucessor - EF atual - lag
    let freeFloat = totalFloat;
    const succs = successors.get(task.id) || [];
    if (succs.length > 0) {
      const minSuccES = succs.reduce((min, { dep, taskId: succId }) => {
        const succES = earlyStart.get(succId)!;
        const adjustedES = succES.minus({ days: dep.lag });
        return adjustedES < min ? adjustedES : min;
      }, earlyStart.get(succs[0].taskId)!);

      freeFloat = Math.round(minSuccES.diff(ef, 'days').days) - 1;
    }

    const isCritical = totalFloat === 0 || totalFloat < 0;

    const result: CPMResult = {
      taskId: task.id,
      earlyStart: es.toJSDate(),
      earlyFinish: ef.toJSDate(),
      lateStart: ls.toJSDate(),
      lateFinish: lf.toJSDate(),
      totalFloat: Math.max(0, totalFloat),
      freeFloat: Math.max(0, freeFloat),
      isCritical,
    };

    results.push(result);

    if (isCritical) {
      criticalPath.push(task.id);
    }
  });

  // Duração total do projeto
  const projectDuration = Math.round(projectEnd.diff(baseDate, 'days').days) + 1;

  return {
    tasks: results,
    criticalPath,
    projectDuration,
    projectStartDate: baseDate.toJSDate(),
    projectEndDate: projectEnd.toJSDate(),
  };
}

/**
 * Ordenação topológica das tarefas usando Kahn's Algorithm
 */
function topologicalSort(tasks: CPMTask[], dependencies: CPMDependency[]): CPMTask[] {
  const taskMap = new Map<string, CPMTask>();
  tasks.forEach((task) => taskMap.set(task.id, task));

  // Calcular grau de entrada
  const inDegree = new Map<string, number>();
  tasks.forEach((task) => inDegree.set(task.id, 0));

  dependencies.forEach((dep) => {
    const current = inDegree.get(dep.taskId) || 0;
    inDegree.set(dep.taskId, current + 1);
  });

  // Fila de tarefas sem predecessores
  const queue: string[] = [];
  inDegree.forEach((degree, taskId) => {
    if (degree === 0) queue.push(taskId);
  });

  const sorted: CPMTask[] = [];

  while (queue.length > 0) {
    const taskId = queue.shift()!;
    sorted.push(taskMap.get(taskId)!);

    // Reduzir grau dos sucessores
    dependencies.forEach((dep) => {
      if (dep.dependsOnId === taskId) {
        const newDegree = (inDegree.get(dep.taskId) || 1) - 1;
        inDegree.set(dep.taskId, newDegree);
        if (newDegree === 0) {
          queue.push(dep.taskId);
        }
      }
    });
  }

  // Se não processou todas as tarefas, há ciclo
  if (sorted.length !== tasks.length) {
    console.warn('Ciclo detectado nas dependências do cronograma');
    // Retornar tarefas não processadas também
    tasks.forEach((task) => {
      if (!sorted.find((t) => t.id === task.id)) {
        sorted.push(task);
      }
    });
  }

  return sorted;
}

/**
 * Detecta ciclos nas dependências
 */
export function detectCycles(dependencies: CPMDependency[]): string[] {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const cycles: string[] = [];

  const graph = new Map<string, string[]>();
  dependencies.forEach((dep) => {
    const succs = graph.get(dep.dependsOnId) || [];
    succs.push(dep.taskId);
    graph.set(dep.dependsOnId, succs);
  });

  function dfs(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);

    const succs = graph.get(node) || [];
    for (const succ of succs) {
      if (!visited.has(succ)) {
        if (dfs(succ)) return true;
      } else if (recursionStack.has(succ)) {
        cycles.push(`${node} -> ${succ}`);
        return true;
      }
    }

    recursionStack.delete(node);
    return false;
  }

  dependencies.forEach((dep) => {
    if (!visited.has(dep.dependsOnId)) {
      dfs(dep.dependsOnId);
    }
    if (!visited.has(dep.taskId)) {
      dfs(dep.taskId);
    }
  });

  return cycles;
}

/**
 * Calcula métricas EVM baseadas no cronograma
 */
export function calculateScheduleMetrics(
  tasks: CPMTask[],
  cpmResult: CriticalPathResult
): {
  plannedValue: number;
  earnedValue: number;
  schedulePerformanceIndex: number;
  scheduleVariance: number;
} {
  const today = DateTime.now();

  let plannedValue = 0;
  let earnedValue = 0;

  tasks.forEach((task) => {
    const cpm = cpmResult.tasks.find((t) => t.taskId === task.id);
    if (!cpm) return;

    const es = DateTime.fromJSDate(cpm.earlyStart);
    const ef = DateTime.fromJSDate(cpm.earlyFinish);

    // Se a tarefa deveria ter terminado
    if (today > ef) {
      plannedValue += 100; // 100% planejado
      earnedValue += (task.progress || 0); // Progresso real
    }
    // Se a tarefa está em andamento
    else if (today >= es) {
      const totalDays = ef.diff(es, 'days').days + 1;
      const elapsedDays = today.diff(es, 'days').days + 1;
      const plannedPercent = (elapsedDays / totalDays) * 100;

      plannedValue += plannedPercent;
      earnedValue += (task.progress || 0);
    }
  });

  const schedulePerformanceIndex = plannedValue > 0 ? earnedValue / plannedValue : 1;
  const scheduleVariance = earnedValue - plannedValue;

  return {
    plannedValue,
    earnedValue,
    schedulePerformanceIndex,
    scheduleVariance,
  };
}

/**
 * Gera alertas baseados no CPM
 */
export function generateCPMAlerts(
  tasks: CPMTask[],
  cpmResult: CriticalPathResult
): Array<{
  taskId: string;
  taskName: string;
  type: 'critical' | 'negative_float' | 'near_critical' | 'delayed';
  message: string;
  severity: 'high' | 'medium' | 'low';
}> {
  const alerts: Array<{
    taskId: string;
    taskName: string;
    type: 'critical' | 'negative_float' | 'near_critical' | 'delayed';
    message: string;
    severity: 'high' | 'medium' | 'low';
  }> = [];

  const today = DateTime.now();

  tasks.forEach((task) => {
    const cpm = cpmResult.tasks.find((t) => t.taskId === task.id);
    if (!cpm) return;

    const taskMap = new Map<string, CPMTask>();
    tasks.forEach((t) => taskMap.set(t.id, t));
    const taskData = taskMap.get(task.id)!;

    // Tarefa crítica
    if (cpm.isCritical) {
      alerts.push({
        taskId: task.id,
        taskName: task.name,
        type: 'critical',
        message: `Tarefa "${task.name}" está no caminho crítico`,
        severity: 'high',
      });
    }

    // Float negativo (atraso)
    const originalTotalFloat = cpmResult.projectDuration - task.duration;
    const actualFloat = cpm.totalFloat;
    if (actualFloat < 0) {
      alerts.push({
        taskId: task.id,
        taskName: task.name,
        type: 'negative_float',
        message: `Tarefa "${task.name}" tem folga negativa de ${Math.abs(actualFloat)} dias`,
        severity: 'high',
      });
    }

    // Quase crítica (folga <= 3 dias)
    if (!cpm.isCritical && actualFloat > 0 && actualFloat <= 3) {
      alerts.push({
        taskId: task.id,
        taskName: task.name,
        type: 'near_critical',
        message: `Tarefa "${task.name}" está próxima do caminho crítico (folga: ${actualFloat} dias)`,
        severity: 'medium',
      });
    }

    // Tarefa atrasada
    const ef = DateTime.fromJSDate(cpm.earlyFinish);
    if (today > ef && (task.progress || 0) < 100) {
      alerts.push({
        taskId: task.id,
        taskName: task.name,
        type: 'delayed',
        message: `Tarefa "${task.name}" está atrasada (deveria terminar em ${ef.toFormat('dd/MM/yyyy')})`,
        severity: 'high',
      });
    }
  });

  return alerts.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
