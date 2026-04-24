// =============================================================================
// ConstrutorPro - Skip Navigation Link
// Allows keyboard users to skip directly to main content
// =============================================================================

'use client';

import { cn } from '@/lib/utils';

interface SkipLinkProps {
  /**
   * The ID of the main content area to skip to
   */
  targetId?: string;
  
  /**
   * Custom label for the skip link
   */
  label?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Skip Navigation Link Component
 * WCAG 2.1: Bypass Blocks (Level A) - 2.4.1
 * 
 * Allows keyboard users to skip repetitive navigation and go directly to main content.
 * This link is visually hidden until focused, then appears prominently.
 * 
 * @example
 * <SkipLink targetId="main-content" />
 * <nav>...</nav>
 * <main id="main-content">...</main>
 */
export function SkipLink({ 
  targetId = 'main-content', 
  label = 'Pular para o conteúdo principal',
  className 
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      // Remove tabIndex after blur to restore natural tab order
      target.addEventListener('blur', () => {
        target.removeAttribute('tabIndex');
      }, { once: true });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        // Visually hidden by default
        'sr-only focus:not-sr-only',
        // When focused, show prominently at top of page
        'focus:fixed focus:top-4 focus:left-4 focus:z-[9999]',
        'focus:bg-primary focus:text-primary-foreground',
        'focus:px-4 focus:py-2 focus:rounded-md',
        'focus:font-medium focus:text-sm',
        'focus:shadow-lg focus:outline-none',
        'focus:ring-2 focus:ring-ring focus:ring-offset-2',
        // Smooth appearance
        'focus:transition-all focus:duration-200',
        className
      )}
    >
      {label}
    </a>
  );
}

/**
 * Multiple Skip Links Component
 * Provides multiple skip targets for complex pages
 * 
 * @example
 * <SkipLinks links={[
 *   { targetId: 'main-content', label: 'Pular para conteúdo' },
 *   { targetId: 'sidebar', label: 'Pular para navegação' },
 *   { targetId: 'search', label: 'Pular para busca' },
 * ]} />
 */
export function SkipLinks({ 
  links = [
    { targetId: 'main-content', label: 'Pular para o conteúdo principal' },
  ] 
}: { 
  links?: Array<{ targetId: string; label: string }>;
}) {
  return (
    <div className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:top-4 focus-within:left-4 focus-within:z-[9999] focus-within:flex focus-within:flex-col focus-within:gap-2">
      {links.map((link, index) => (
        <a
          key={link.targetId}
          href={`#${link.targetId}`}
          onClick={(e) => {
            e.preventDefault();
            const target = document.getElementById(link.targetId);
            if (target) {
              target.tabIndex = -1;
              target.focus();
              target.addEventListener('blur', () => {
                target.removeAttribute('tabIndex');
              }, { once: true });
            }
          }}
          className={cn(
            'bg-primary text-primary-foreground',
            'px-4 py-2 rounded-md',
            'font-medium text-sm',
            'shadow-lg outline-none',
            'ring-2 ring-ring ring-offset-2',
            'transition-all duration-200',
            // Show all links when container is focused
            'opacity-0 focus:opacity-100',
            index === 0 ? 'opacity-100' : ''
          )}
          tabIndex={index === 0 ? 0 : -1}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

export default SkipLink;
