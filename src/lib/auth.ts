// =============================================================================
// ConstrutorPro - Configuração de Autenticação
// =============================================================================

import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import type { UserRole, CompanyPlan } from '@/types';
import { accountLockout } from '@/lib/account-lockout';
import { auditLogger } from '@/lib/audit-logger';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      companyId: string | null;
      companyName?: string;
      companyPlan?: CompanyPlan;
      avatar?: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    companyId: string | null;
    companyName?: string;
    companyPlan?: CompanyPlan;
    avatar?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email?: string;
    name?: string;
    role?: UserRole;
    companyId?: string | null;
    companyName?: string;
    companyPlan?: CompanyPlan;
    avatar?: string;
    lastRoleCheck?: number;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (String(process.env.NODE_ENV) === 'development') {
          console.log('[Auth] === AUTHORIZE CHAMADO ===');
        }
        
        try {
          if (!credentials?.email || !credentials?.password) {
            if (String(process.env.NODE_ENV) === 'development') {
              console.log('[Auth] Missing credentials');
            }
            return null;
          }

          const emailLower = credentials.email.toLowerCase();
          
          // Check if account is locked
          const isAdmin = credentials.email.includes('admin@');
          const lockStatus = accountLockout.checkLockStatus(emailLower, isAdmin);
          
          if (lockStatus.locked) {
            if (String(process.env.NODE_ENV) === 'development') {
              console.log('[Auth] Account locked:', emailLower);
            }
            // Log blocked login attempt
            await auditLogger.log({
              action: 'login_failed',
              category: 'authentication',
              status: 'blocked',
              severity: 'warning',
              userId: undefined,
              companyId: undefined,
              errorMessage: 'Account locked',
              metadata: { email: emailLower, reason: 'account_locked', lockedUntil: lockStatus.lockedUntil },
            });
            return null;
          }
          
          const user = await db.users.findUnique({
            where: { email: emailLower },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              password: true,
              isActive: true,
              companyId: true,
              avatar: true,
              companies: {
                select: {
                  id: true,
                  name: true,
                  plan: true,
                  isActive: true,
                },
              },
            },
          });

          console.log('[Auth] User found:', !!user);

          if (!user || !user.password) {
            // Record failed login attempt
            accountLockout.recordLoginFailure(emailLower, isAdmin);
            if (String(process.env.NODE_ENV) === 'development') {
              console.log('[Auth] User not found or no password');
            }
            return null;
          }

          if (!user.isActive) {
            accountLockout.recordLoginFailure(emailLower, isAdmin);
            if (String(process.env.NODE_ENV) === 'development') {
              console.log('[Auth] User inactive');
            }
            return null;
          }

          if (user.companies && !user.companies.isActive) {
            accountLockout.recordLoginFailure(emailLower, isAdmin);
            if (String(process.env.NODE_ENV) === 'development') {
              console.log('[Auth] Company inactive');
            }
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            // Record failed login attempt
            const lockResult = accountLockout.recordLoginFailure(emailLower, user.role === 'master_admin');
            
            if (String(process.env.NODE_ENV) === 'development') {
              console.log('[Auth] Invalid password, attempts remaining:', lockResult.remaining);
            }
            
            // Log failed login
            await auditLogger.log({
              action: 'login_failed',
              category: 'authentication',
              status: 'failure',
              severity: 'warning',
              userId: user.id,
              companyId: user.companyId ?? undefined,
              errorMessage: 'Invalid password',
              metadata: { email: emailLower, reason: 'invalid_password', remaining: lockResult.remaining },
            });
            
            return null;
          }

          // Clear failed attempts on successful login
          accountLockout.recordLoginSuccess(emailLower, user.role === 'master_admin');

          if (String(process.env.NODE_ENV) === 'development') {
            console.log('[Auth] Login successful for:', user.email);
          }

          // Log successful login
          await auditLogger.log({
            action: 'login',
            category: 'authentication',
            status: 'success',
            severity: 'info',
            userId: user.id,
            companyId: user.companyId ?? undefined,
            metadata: { email: user.email, role: user.role },
          });

          const result = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as UserRole,
            companyId: user.companyId,
            companyName: user.companies?.name,
            companyPlan: user.companies?.plan as CompanyPlan,
            avatar: user.avatar ?? undefined,
          };

          return result;
        } catch (error) {
          console.error('[Auth] Error in authorize:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: String(process.env.NODE_ENV) === 'production' 
        ? `__Secure-next-auth.session-token`
        : `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: String(process.env.NODE_ENV) === 'production',
      },
    },
  },
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    newUser: '/dashboard',
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
        token.companyPlan = user.companyPlan;
        token.avatar = user.avatar;
        token.lastRoleCheck = Date.now();
      }

      // Revalidate role from DB every hour
      if (token.id && (!token.lastRoleCheck || Date.now() - (token.lastRoleCheck as number) > 3600000)) {
        const dbUser = await db.users.findUnique({
          where: { id: token.id },
          select: { role: true, companyId: true, isActive: true },
        });
        if (dbUser) {
          token.role = dbUser.role as UserRole;
          token.companyId = dbUser.companyId;
          token.lastRoleCheck = Date.now();
        }
      }

      if (trigger === 'update' && session) {
        token.name = session.user.name;
        token.avatar = session.user.avatar;
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email ?? '';
        session.user.name = token.name ?? '';
        session.user.role = token.role ?? 'viewer';
        session.user.companyId = token.companyId ?? null;
        session.user.companyName = token.companyName;
        session.user.companyPlan = token.companyPlan;
        session.user.avatar = token.avatar;
      }
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (String(process.env.NODE_ENV) === 'development') {
        console.log(`[Auth] User signed in: ${user.id}`);
      }
    },
    async signOut({ token }) {
      if (String(process.env.NODE_ENV) === 'development') {
        console.log(`[Auth] User signed out: ${token?.id}`);
      }
    },
  },
  debug: String(process.env.NODE_ENV) === 'development',
};

// Helper para obter a sessão no servidor
export { getServerSession } from 'next-auth';
