// =============================================================================
// ConstrutorPro - Accessibility Utilities
// WCAG 2.1 compliant accessibility components and hooks
// =============================================================================

'use client';

import { useEffect, useState, useRef, useCallback, useSyncExternalStore } from 'react';

/**
 * Hook to detect user's reduced motion preference
 * Respects prefers-reduced-motion media query
 */
function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

function subscribeToReducedMotion(callback: () => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );
}

/**
 * Hook to detect user's high contrast preference
 * Respects prefers-contrast media query
 */
function getHighContrastSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-contrast: more)').matches;
}

function getHighContrastServerSnapshot(): boolean {
  return false;
}

function subscribeToHighContrast(callback: () => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-contrast: more)');
  mediaQuery.addEventListener('change', callback);
  return () => mediaQuery.removeEventListener('change', callback);
}

export function useHighContrast(): boolean {
  return useSyncExternalStore(
    subscribeToHighContrast,
    getHighContrastSnapshot,
    getHighContrastServerSnapshot
  );
}

/**
 * Hook to manage focus trap for modals and dialogs
 */
export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element when trap activates
    firstElement?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return containerRef;
}

/**
 * Hook for managing focus restoration
 * Saves the previously focused element and restores it when needed
 */
export function useFocusRestore(shouldRestore: boolean) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (shouldRestore) {
      previousFocus.current = document.activeElement as HTMLElement;
    } else if (previousFocus.current) {
      previousFocus.current.focus();
      previousFocus.current = null;
    }
  }, [shouldRestore]);
}

/**
 * Generate unique IDs for accessibility attributes
 */
let idCounter = 0;
export function generateA11yId(prefix = 'a11y'): string {
  return `${prefix}-${++idCounter}`;
}

/**
 * Common ARIA attribute generators
 */
export const aria = {
  describedBy: (id: string) => ({ 'aria-describedby': id }),
  labelledBy: (id: string) => ({ 'aria-labelledby': id }),
  controls: (id: string) => ({ 'aria-controls': id }),
  expanded: (isExpanded: boolean) => ({ 'aria-expanded': isExpanded }),
  hidden: (isHidden: boolean) => ({ 'aria-hidden': isHidden }),
  
  live: {
    polite: { 'aria-live': 'polite' as const, 'aria-atomic': 'true' as const },
    assertive: { 'aria-live': 'assertive' as const, 'aria-atomic': 'true' as const },
    off: { 'aria-live': 'off' as const },
  },

  current: {
    page: { 'aria-current': 'page' as const },
    step: { 'aria-current': 'step' as const },
    location: { 'aria-current': 'location' as const },
    date: { 'aria-current': 'date' as const },
    time: { 'aria-current': 'time' as const },
    true: { 'aria-current': true },
    false: { 'aria-current': false },
  },
};

/**
 * Keyboard navigation helper
 */
export const keyboard = {
  isActivation: (event: KeyboardEvent): boolean => {
    return event.key === 'Enter' || event.key === ' ';
  },

  isNavigation: (event: KeyboardEvent): boolean => {
    return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key);
  },

  isEscape: (event: KeyboardEvent): boolean => {
    return event.key === 'Escape';
  },

  getNextIndex: (currentIndex: number, total: number, direction: 'next' | 'prev'): number => {
    if (direction === 'next') {
      return (currentIndex + 1) % total;
    }
    return (currentIndex - 1 + total) % total;
  },
};

/**
 * Screen reader announcement utility
 */
export function announceToScreenReader(
  message: string, 
  priority: 'polite' | 'assertive' = 'polite'
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('class', 'sr-only');
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

/**
 * Hook for keyboard accessible dropdown menus
 */
export function useMenuKeyboard(
  isOpen: boolean,
  setIsOpen: (open: boolean) => void,
  itemCount: number
) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        }
        event.preventDefault();
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
      case 'ArrowDown':
        if (isOpen) {
          setFocusedIndex((prev) => (prev + 1) % itemCount);
        } else {
          setIsOpen(true);
          setFocusedIndex(0);
        }
        event.preventDefault();
        break;
      case 'ArrowUp':
        if (isOpen) {
          setFocusedIndex((prev) => (prev - 1 + itemCount) % itemCount);
        }
        event.preventDefault();
        break;
      case 'Home':
        if (isOpen) {
          setFocusedIndex(0);
        }
        event.preventDefault();
        break;
      case 'End':
        if (isOpen) {
          setFocusedIndex(itemCount - 1);
        }
        event.preventDefault();
        break;
    }
  }, [isOpen, setIsOpen, itemCount]);

  return { focusedIndex, setFocusedIndex, handleKeyDown };
}
