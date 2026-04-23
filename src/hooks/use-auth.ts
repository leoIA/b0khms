// =============================================================================
// ConstrutorPro - Hooks de Autenticação
// =============================================================================

'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import type { UserRole } from '@/types';

export interface UseAuthReturn {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    companyId: string | null;
    companyName?: string;
    companyPlan?: string;
    avatar?: string;
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isMasterAdmin: boolean;
  isCompanyAdmin: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  canAccessModule: (module: string) => boolean;
}

const MODULE_PERMISSIONS: Record<string, UserRole[]> = {
  admin: ['master_admin'],
  companies: ['master_admin'],
  users: ['company_admin', 'master_admin'],
  projects: ['manager', 'company_admin', 'master_admin', 'engineer', 'operations'],
  clients: ['manager', 'company_admin', 'master_admin', 'procurement', 'finance'],
  suppliers: ['manager', 'company_admin', 'master_admin', 'procurement', 'finance'],
  budgets: ['manager', 'company_admin', 'master_admin', 'engineer', 'finance'],
  compositions: ['manager', 'company_admin', 'master_admin', 'engineer', 'procurement'],
  materials: ['manager', 'company_admin', 'master_admin', 'engineer', 'procurement'],
  schedule: ['manager', 'company_admin', 'master_admin', 'engineer', 'operations'],
  dailyLogs: ['manager', 'company_admin', 'master_admin', 'engineer', 'operations'],
  finance: ['finance', 'company_admin', 'master_admin'],
  reports: ['manager', 'company_admin', 'master_admin', 'finance', 'engineer'],
  ai: ['manager', 'company_admin', 'master_admin', 'engineer', 'finance', 'procurement'],
};

const ROLE_LEVELS: Record<UserRole, number> = {
  master_admin: 100,
  company_admin: 90,
  manager: 70,
  engineer: 50,
  finance: 50,
  procurement: 50,
  operations: 30,
  viewer: 10,
};

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const user = session?.user ?? null;
  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading' || isLoggingIn;

  const isMasterAdmin = user?.role === 'master_admin';
  const isCompanyAdmin = user?.role === 'company_admin' || isMasterAdmin;

  const login = useCallback(async (email: string, password: string) => {
    setIsLoggingIn(true);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        return { success: false, error: 'Email ou senha inválidos' };
      }

      router.push('/dashboard');
      router.refresh();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Erro ao fazer login. Tente novamente.' };
    } finally {
      setIsLoggingIn(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    await signOut({ redirect: false });
    router.push('/login');
    router.refresh();
  }, [router]);

  const hasRole = useCallback((role: UserRole) => {
    if (!user) return false;
    return ROLE_LEVELS[user.role] >= ROLE_LEVELS[role];
  }, [user]);

  const hasAnyRole = useCallback((roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  }, [user]);

  const canAccessModule = useCallback((module: string) => {
    if (!user) return false;
    const allowedRoles = MODULE_PERMISSIONS[module];
    if (!allowedRoles) return false;
    return allowedRoles.includes(user.role);
  }, [user]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isMasterAdmin,
    isCompanyAdmin,
    login,
    logout,
    hasRole,
    hasAnyRole,
    canAccessModule,
  };
}
