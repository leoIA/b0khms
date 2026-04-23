'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Algo deu errado!</h2>
      <p className="text-muted-foreground mb-4 text-center max-w-md">
        {error.message || 'Ocorreu um erro inesperado. Por favor, tente novamente.'}
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
