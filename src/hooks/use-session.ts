// =============================================================================
// ConstrutorPro - Session Hooks
// =============================================================================

'use client';

import { useSession as useNextAuthSession, signIn, signOut } from 'next-auth/react';
import type { ReactNode } from 'react';
import type { UserRole } from '@/types';

// Re-export SessionProvider
export { SessionProvider } from 'next-auth/react';

// Types
export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  companyName?: string;
  companyPlan?: string;
  avatar?: string;
}

export interface UseSessionReturn {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: typeof signIn;
  signOut: typeof signOut;
}

/**
 * Hook to access the current session
 */
export function useSession(): UseSessionReturn {
  const { data: session, status } = useNextAuthSession();

  const user = session?.user ?? null;
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';

  return {
    user,
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
  };
}
