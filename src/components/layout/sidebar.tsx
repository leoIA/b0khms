// =============================================================================
// ConstrutorPro - Sidebar Navigation Component
// =============================================================================

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Truck,
  FolderKanban,
  FileText,
  Layers,
  Package,
  Calendar,
  ClipboardList,
  DollarSign,
  BarChart3,
  Bot,
  Settings,
  Server,
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  HardHat,
  FileSpreadsheet,
  Copy,
  Database,
  ShoppingCart,
  Crown,
  Webhook,
  Shield,
  CheckCircle,
  UserCog,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSession } from '@/hooks/use-session';
import type { UserRole } from '@/types';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
  badge?: string;
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['master_admin', 'company_admin', 'manager', 'engineer', 'finance', 'procurement', 'operations', 'viewer'],
  },
  {
    title: 'Projetos',
    href: '/projetos',
    icon: FolderKanban,
    roles: ['master_admin', 'company_admin', 'manager', 'engineer', 'operations'],
  },
  {
    title: 'Clientes',
    href: '/clientes',
    icon: Building2,
    roles: ['master_admin', 'company_admin', 'manager', 'procurement', 'finance'],
  },
  {
    title: 'Fornecedores',
    href: '/fornecedores',
    icon: Truck,
    roles: ['master_admin', 'company_admin', 'manager', 'procurement', 'finance'],
  },
  {
    title: 'Orçamentos',
    href: '/orcamentos',
    icon: FileText,
    roles: ['master_admin', 'company_admin', 'manager', 'engineer', 'finance'],
  },
  {
    title: 'Cotações',
    href: '/cotacoes',
    icon: FileSpreadsheet,
    roles: ['master_admin', 'company_admin', 'manager', 'procurement'],
    badge: 'Novo',
  },
  {
    title: 'Modelos',
    href: '/modelos-orcamento',
    icon: Copy,
    roles: ['master_admin', 'company_admin', 'manager', 'engineer'],
  },
  {
    title: 'Composições',
    href: '/composicoes',
    icon: Layers,
    roles: ['master_admin', 'company_admin', 'manager', 'engineer', 'procurement'],
  },
  {
    title: 'SINAPI',
    href: '/sinapi',
    icon: Database,
    roles: ['master_admin', 'company_admin', 'manager', 'engineer', 'procurement'],
    badge: 'Novo',
  },
  {
    title: 'Materiais',
    href: '/materiais',
    icon: Package,
    roles: ['master_admin', 'company_admin', 'manager', 'engineer', 'procurement'],
  },
  {
    title: 'Cronograma',
    href: '/cronograma',
    icon: Calendar,
    roles: ['master_admin', 'company_admin', 'manager', 'engineer', 'operations'],
  },
  {
    title: 'Diário de Obra',
    href: '/diario-obra',
    icon: ClipboardList,
    roles: ['master_admin', 'company_admin', 'manager', 'engineer', 'operations'],
  },
  {
    title: 'Compras',
    href: '/compras',
    icon: ShoppingCart,
    roles: ['master_admin', 'company_admin', 'manager', 'procurement'],
    badge: 'Novo',
  },
  {
    title: 'Financeiro',
    href: '/financeiro',
    icon: DollarSign,
    roles: ['master_admin', 'company_admin', 'manager', 'finance'],
  },
  {
    title: 'RH',
    href: '/rh',
    icon: UserCog,
    roles: ['master_admin', 'company_admin', 'manager', 'finance'],
    badge: 'Novo',
  },
  {
    title: 'Relatórios',
    href: '/relatorios',
    icon: BarChart3,
    roles: ['master_admin', 'company_admin', 'manager', 'engineer', 'finance'],
  },
  {
    title: 'Aprovações',
    href: '/aprovacoes',
    icon: CheckCircle,
    roles: ['master_admin', 'company_admin', 'manager', 'engineer', 'finance', 'procurement'],
    badge: 'Novo',
  },
  {
    title: 'Assistente IA',
    href: '/ia',
    icon: Bot,
    roles: ['master_admin', 'company_admin', 'manager', 'engineer', 'finance', 'procurement'],
    badge: 'Novo',
  },
];

const adminNavigation: NavItem[] = [
  {
    title: 'Painel Master',
    href: '/admin',
    icon: ShieldCheck,
    roles: ['master_admin'],
  },
  {
    title: 'Empresas',
    href: '/admin/empresas',
    icon: Building2,
    roles: ['master_admin'],
  },
  {
    title: 'Usuários',
    href: '/admin/usuarios',
    icon: Users,
    roles: ['master_admin', 'company_admin'],
  },
  {
    title: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: Shield,
    roles: ['master_admin'],
  },
  {
    title: 'Sistema',
    href: '/admin/sistema',
    icon: Server,
    roles: ['master_admin'],
  },
  {
    title: 'Webhooks',
    href: '/webhooks',
    icon: Webhook,
    roles: ['master_admin', 'company_admin'],
    badge: 'Novo',
  },
  {
    title: 'Assinatura',
    href: '/assinatura',
    icon: Crown,
    roles: ['master_admin', 'company_admin'],
  },
  {
    title: 'Backup',
    href: '/backup',
    icon: Database,
    roles: ['master_admin', 'company_admin'],
    badge: 'Novo',
  },
  {
    title: 'Configurações',
    href: '/configuracoes',
    icon: Settings,
    roles: ['master_admin', 'company_admin'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  if (!isAuthenticated || !user) {
    return null;
  }

  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(user.role)
  );

  const filteredAdminNavigation = adminNavigation.filter((item) =>
    item.roles.includes(user.role)
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <HardHat className="h-8 w-8 text-primary" />
            <span className="font-bold text-lg">ConstrutorPro</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" className="flex items-center justify-center w-full">
            <HardHat className="h-8 w-8 text-primary" />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn('h-8 w-8', collapsed && 'mx-auto')}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.title : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.title}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Admin Section */}
        {filteredAdminNavigation.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border">
            {!collapsed && (
              <span className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Administração
              </span>
            )}
            <nav className="mt-2 space-y-1">
              {filteredAdminNavigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      collapsed && 'justify-center px-2'
                    )}
                    title={collapsed ? item.title : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </ScrollArea>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div
          className={cn(
            'flex items-center gap-3',
            collapsed && 'justify-center'
          )}
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {getInitials(user.name)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user.companyName ?? 'Master Admin'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
