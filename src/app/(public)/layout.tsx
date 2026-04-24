'use client';

// =============================================================================
// ConstrutorPro - Public Layout
// Layout para páginas públicas (landing page, preços, etc.)
// =============================================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  HardHat,
  Menu,
  X,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Instagram,
  Facebook,
} from 'lucide-react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <div className={cn('min-h-screen bg-background')}>
        {/* Header */}
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <HardHat className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl">ConstrutorPro</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/#recursos" className={cn(
                "text-sm font-medium transition-colors",
                pathname === '/' ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}>
                Recursos
              </Link>
              <Link href="/precos" className={cn(
                "text-sm font-medium transition-colors",
                pathname === '/precos' ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}>
                Preços
              </Link>
              <Link href="/sobre" className={cn(
                "text-sm font-medium transition-colors",
                pathname === '/sobre' ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}>
                Sobre
              </Link>
              <Link href="/contato" className={cn(
                "text-sm font-medium transition-colors",
                pathname === '/contato' ? "text-primary" : "text-muted-foreground hover:text-primary"
              )}>
                Contato
              </Link>
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Entrar</Button>
              </Link>
              <Link href="/login">
                <Button>Começar Grátis</Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div id="mobile-menu" className="md:hidden border-t bg-background">
              <nav className="container py-4 space-y-4">
                <Link href="/#recursos" className={cn(
                  "block text-sm font-medium",
                  pathname === '/' ? "text-primary" : "text-muted-foreground"
                )} onClick={() => setMobileMenuOpen(false)}>
                  Recursos
                </Link>
                <Link href="/precos" className={cn(
                  "block text-sm font-medium",
                  pathname === '/precos' ? "text-primary" : "text-muted-foreground"
                )} onClick={() => setMobileMenuOpen(false)}>
                  Preços
                </Link>
                <Link href="/sobre" className={cn(
                  "block text-sm font-medium",
                  pathname === '/sobre' ? "text-primary" : "text-muted-foreground"
                )} onClick={() => setMobileMenuOpen(false)}>
                  Sobre
                </Link>
                <Link href="/contato" className={cn(
                  "block text-sm font-medium",
                  pathname === '/contato' ? "text-primary" : "text-muted-foreground"
                )} onClick={() => setMobileMenuOpen(false)}>
                  Contato
                </Link>
                <div className="pt-4 border-t space-y-2">
                  <Link href="/login" className="block">
                    <Button variant="outline" className="w-full">Entrar</Button>
                  </Link>
                  <Link href="/login" className="block">
                    <Button className="w-full">Começar Grátis</Button>
                  </Link>
                </div>
              </nav>
            </div>
          )}
        </header>

        <main>{children}</main>

        {/* Footer */}
        <footer className="border-t bg-muted/30">
          <div className="container py-12">
            <div className="grid gap-8 md:grid-cols-4">
              {/* Company Info */}
              <div className="space-y-4">
                <Link href="/" className="flex items-center gap-2">
                  <HardHat className="h-6 w-6 text-primary" />
                  <span className="font-bold text-lg">ConstrutorPro</span>
                </Link>
                <p className="text-sm text-muted-foreground">
                  A plataforma completa para gestão de obras e construção.
                  Feito para o mercado brasileiro.
                </p>
                <div className="flex gap-4">
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-muted-foreground hover:text-foreground">
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-muted-foreground hover:text-foreground">
                    <Instagram className="h-5 w-5" />
                  </a>
                  <a href="#" onClick={(e) => e.preventDefault()} className="text-muted-foreground hover:text-foreground">
                    <Facebook className="h-5 w-5" />
                  </a>
                </div>
              </div>

              {/* Product */}
              <div className="space-y-4">
                <h3 className="font-semibold">Produto</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/#recursos" className="text-muted-foreground hover:text-foreground">Recursos</Link></li>
                  <li><Link href="/precos" className="text-muted-foreground hover:text-foreground">Preços</Link></li>
                  <li><Link href="#" onClick={(e) => e.preventDefault()} className="text-muted-foreground hover:text-foreground">Integrações</Link></li>
                  <li><Link href="#" onClick={(e) => e.preventDefault()} className="text-muted-foreground hover:text-foreground">API</Link></li>
                </ul>
              </div>

              {/* Company */}
              <div className="space-y-4">
                <h3 className="font-semibold">Empresa</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link href="/sobre" className="text-muted-foreground hover:text-foreground">Sobre</Link></li>
                  <li><Link href="#" onClick={(e) => e.preventDefault()} className="text-muted-foreground hover:text-foreground">Blog</Link></li>
                  <li><Link href="#" onClick={(e) => e.preventDefault()} className="text-muted-foreground hover:text-foreground">Carreiras</Link></li>
                  <li><Link href="/contato" className="text-muted-foreground hover:text-foreground">Contato</Link></li>
                </ul>
              </div>

              {/* Legal */}
              <div className="space-y-4">
                <h3 className="font-semibold">Legal</h3>
                <ul className="space-y-2 text-sm">
                  <li><Link href="#" onClick={(e) => e.preventDefault()} className="text-muted-foreground hover:text-foreground">Termos de Uso</Link></li>
                  <li><Link href="#" onClick={(e) => e.preventDefault()} className="text-muted-foreground hover:text-foreground">Política de Privacidade</Link></li>
                  <li><Link href="#" onClick={(e) => e.preventDefault()} className="text-muted-foreground hover:text-foreground">LGPD</Link></li>
                </ul>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} ConstrutorPro. Todos os direitos reservados.
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  contato@construtorpro.com
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  (11) 99999-9999
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
