'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Componente que verifica se o sistema está configurado
 * Redireciona para /setup se não estiver configurado
 */
export function SetupCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);

  useEffect(() => {
    async function checkSetup() {
      // Não verificar se já está na página de setup
      if (pathname.startsWith('/setup')) {
        setIsChecking(false);
        return;
      }

      try {
        const response = await fetch('/api/setup/status');
        const data = await response.json();

        if (!data.configured) {
          // Sistema não configurado, redirecionar para setup
          setIsConfigured(false);
          router.push('/setup');
        } else {
          setIsConfigured(true);
        }
      } catch (error) {
        console.error('Erro ao verificar configuração:', error);
        // Em caso de erro, assumir que está configurado para não bloquear
        setIsConfigured(true);
      } finally {
        setIsChecking(false);
      }
    }

    checkSetup();
  }, [pathname, router]);

  // Mostrar nada enquanto verifica (evita flash)
  if (isChecking && !pathname.startsWith('/setup')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não está configurado e não está no setup, não renderizar nada
  // (vai redirecionar)
  if (!isConfigured && !pathname.startsWith('/setup')) {
    return null;
  }

  return <>{children}</>;
}
