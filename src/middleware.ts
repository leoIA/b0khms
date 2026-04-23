// =============================================================================
// ConstrutorPro - Middleware
// =============================================================================
// NOTE: Next.js 16 warns about middleware convention being deprecated in favor of "proxy".
// This implementation works for Next.js 16 but will need updating for Next.js 17+.
// See: https://nextjs.org/docs/app/building-your-application/routing/middleware

import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import type { UserRole } from '@/types';

// Rotas públicas (não requerem autenticação)
const publicRoutes = ['/', '/precos', '/sobre', '/contato', '/api/auth', '/api/auth-direct', '/api/test-simple', '/api/login-simple', '/api/setup'];

// Rotas que não requerem autenticação (páginas de auth)
const authRoutes = ['/login', '/register', '/registro', '/recuperar-senha', '/redefinir-senha'];

// Rotas de setup (públicas, antes da configuração)
const setupRoutes = ['/setup'];

// Rotas de admin (master admin only)
const masterAdminRoutes = ['/admin'];

// Mapeamento de módulos para roles permitidas
const moduleRoles: Record<string, UserRole[]> = {
  '/dashboard': ['viewer', 'operations', 'procurement', 'finance', 'engineer', 'manager', 'company_admin', 'master_admin'],
  '/projetos': ['operations', 'engineer', 'manager', 'company_admin', 'master_admin'],
  '/clientes': ['procurement', 'finance', 'manager', 'company_admin', 'master_admin'],
  '/fornecedores': ['procurement', 'finance', 'manager', 'company_admin', 'master_admin'],
  '/orcamentos': ['engineer', 'finance', 'manager', 'company_admin', 'master_admin'],
  '/composicoes': ['engineer', 'procurement', 'manager', 'company_admin', 'master_admin'],
  '/materiais': ['engineer', 'procurement', 'manager', 'company_admin', 'master_admin'],
  '/cronograma': ['operations', 'engineer', 'manager', 'company_admin', 'master_admin'],
  '/diario-obra': ['operations', 'engineer', 'manager', 'company_admin', 'master_admin'],
  '/financeiro': ['finance', 'manager', 'company_admin', 'master_admin'],
  '/relatorios': ['engineer', 'finance', 'manager', 'company_admin', 'master_admin'],
  '/ia': ['engineer', 'finance', 'procurement', 'manager', 'company_admin', 'master_admin'],
};

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Log para debug
    if (String(process.env.NODE_ENV) === 'development') {
      console.log(`[Middleware] ${pathname} - Token: ${token ? 'yes' : 'no'}`);
    }

    // Permitir rotas de setup sempre
    if (setupRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Permitir rotas públicas
    if (publicRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Permitir rotas de autenticação (login, registro, etc)
    if (authRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Verificar se está autenticado
    if (!token) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const userRole = token.role as UserRole;

    // Verificar acesso a rotas de master admin
    if (masterAdminRoutes.some(route => pathname.startsWith(route))) {
      if (userRole !== 'master_admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Verificar acesso a módulos específicos
    for (const [path, roles] of Object.entries(moduleRoles)) {
      if (pathname.startsWith(path)) {
        if (!roles.includes(userRole)) {
          return NextResponse.redirect(new URL('/dashboard', req.url));
        }
        break;
      }
    }

    // Verificar se usuário tem empresa (exceto master admin)
    if (userRole !== 'master_admin' && !token.companyId) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('error', 'Empresa não encontrada');
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Sempre permitir rotas de setup (antes de tudo)
        if (setupRoutes.some(route => pathname.startsWith(route))) {
          return true;
        }
        
        // Sempre permitir rotas públicas e de autenticação
        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true;
        }
        if (authRoutes.some(route => pathname.startsWith(route))) {
          return true;
        }
        
        // Para outras rotas, verificar se há token
        return !!token;
      },
    },
    pages: {
      signIn: '/login',
    },
  }
);

export const config = {
  matcher: [
    /*
     * Corresponder a todas as rotas, exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (arquivos de otimização de imagem)
     * - favicon.ico (favicon)
     * - arquivos públicos (imagens, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
