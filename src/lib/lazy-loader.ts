// =============================================================================
// ConstrutorPro - Dynamic Imports and Lazy Loading Utilities
// Optimized component loading for better bundle splitting
// =============================================================================

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

/**
 * Higher-order function to create dynamically imported components with consistent loading state
 * Use this to lazy-load heavy components and reduce initial bundle size
 * 
 * @example
 * ```tsx
 * const HeavyChart = createLazyComponent(
 *   () => import('@/components/charts/heavy-chart').then(mod => ({ default: mod.HeavyChart }))
 * );
 * ```
 */
export function createLazyComponent<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    ssr?: boolean;
  } = {}
): T {
  return dynamic(importFn, {
    ssr: options.ssr ?? false,
  }) as T;
}

/**
 * Preload hints for critical components
 * Call these functions to prefetch components that will likely be needed soon
 * 
 * @example
 * // In a parent component or on hover
 * useEffect(() => {
 *   PreloadHints.dashboard();
 * }, []);
 */
export const PreloadHints = {
  dashboard: () => {
    // Preload dashboard components
    import('@/components/ui/card');
    import('@/components/ui/chart');
  },
  
  projectDetail: () => {
    // Preload project detail components
    import('@/components/ui/tabs');
    import('@/components/ui/table');
  },
  
  budgetEditor: () => {
    // Preload budget editor components
    import('@/components/ui/input');
    import('@/components/ui/select');
  },
  
  schedule: () => {
    // Preload schedule components
    import('@/components/ui/calendar');
  },
};

/**
 * Utility to track component load times (development only)
 */
export function trackComponentLoad(componentName: string): {
  start: () => void;
  end: () => number;
} {
  if (String(process.env.NODE_ENV) !== 'development') {
    return {
      start: () => {},
      end: () => 0,
    };
  }
  
  let startTime = 0;
  
  return {
    start: () => {
      startTime = performance.now();
    },
    end: () => {
      const duration = performance.now() - startTime;
      console.log(`[LazyLoad] ${componentName} loaded in ${duration.toFixed(2)}ms`);
      return duration;
    },
  };
}

// Export types
export type { ComponentType };
