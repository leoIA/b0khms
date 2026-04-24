// =============================================================================
// ConstrutorPro - Live Region Announcer
// Screen reader announcement component
// =============================================================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface AnnouncerProps {
  /**
   * Announcement priority level
   * - polite: Waits for user to finish current action (default)
   * - assertive: Interrupts immediately
   */
  politeness?: 'polite' | 'assertive';
  
  /**
   * Clear announcement after this many milliseconds
   */
  clearAfter?: number;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Live Region Announcer Component
 * WCAG 2.1: Status Messages (Level AA) - 4.1.3
 * 
 * Creates a live region for screen reader announcements.
 * Use this for dynamic content updates that should be announced.
 * 
 * @example
 * const { announce } = useAnnouncer();
 * announce('Item adicionado ao carrinho');
 */
export function Announcer({ 
  politeness = 'polite', 
  clearAfter = 5000,
  className 
}: AnnouncerProps) {
  const [announcement, setAnnouncement] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const announce = useCallback((message: string) => {
    setAnnouncement(message);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setAnnouncement('');
    }, clearAfter);
  }, [clearAfter]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className={cn('sr-only', className)}
    >
      {announcement}
    </div>
  );
}

/**
 * Hook to access a global announcer
 * Use this to make announcements from anywhere in the app
 */
let globalAnnounce: ((message: string, priority?: 'polite' | 'assertive') => void) | null = null;

export function useAnnouncer() {
  const politeRef = useRef<HTMLDivElement>(null);
  const assertiveRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const element = priority === 'assertive' ? assertiveRef.current : politeRef.current;
    if (element) {
      // Clear previous announcement
      element.textContent = '';
      // Set new announcement after a brief delay to ensure it's announced
      setTimeout(() => {
        element.textContent = message;
      }, 100);
    }
  }, []);

  // Register global announcer
  useEffect(() => {
    globalAnnounce = announce;
    return () => {
      globalAnnounce = null;
    };
  }, [announce]);

  return {
    announce,
    PoliteRegion: () => (
      <div
        ref={politeRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    ),
    AssertiveRegion: () => (
      <div
        ref={assertiveRef}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    ),
  };
}

/**
 * Make a global announcement
 * Use this for critical announcements that don't require component context
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  if (globalAnnounce) {
    globalAnnounce(message, priority);
  } else {
    // Fallback: create temporary element
    const element = document.createElement('div');
    element.setAttribute('role', priority === 'assertive' ? 'alert' : 'status');
    element.setAttribute('aria-live', priority);
    element.setAttribute('aria-atomic', 'true');
    element.className = 'sr-only';
    element.textContent = message;
    document.body.appendChild(element);
    setTimeout(() => document.body.removeChild(element), 1000);
  }
}

/**
 * Loading Announcer Component
 * Announces loading state changes to screen readers
 */
export function LoadingAnnouncer({ 
  isLoading, 
  loadingMessage = 'Carregando...', 
  completeMessage = 'Carregamento concluído' 
}: { 
  isLoading: boolean;
  loadingMessage?: string;
  completeMessage?: string;
}) {
  const previousLoading = useRef(isLoading);
  
  useEffect(() => {
    // Only announce when state changes
    if (previousLoading.current !== isLoading) {
      announce(isLoading ? loadingMessage : completeMessage);
      previousLoading.current = isLoading;
    }
  }, [isLoading, loadingMessage, completeMessage]);
  
  return null;
}

/**
 * Error Announcer Component
 * Announces errors to screen readers
 */
export function ErrorAnnouncer({ 
  error, 
  clearError 
}: { 
  error: string | null;
  clearError: () => void;
}) {
  useEffect(() => {
    if (error) {
      announce(`Erro: ${error}`, 'assertive');
      // Auto-clear after announcement
      const timeout = setTimeout(clearError, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error, clearError]);
  
  return null;
}
