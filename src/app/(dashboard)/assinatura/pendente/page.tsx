'use client';

import { Suspense } from 'react';
import { PagamentoPendenteContent } from './content';

export default function PagamentoPendentePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950 dark:to-amber-900">
        <div className="animate-pulse">Carregando...</div>
      </div>
    }>
      <PagamentoPendenteContent />
    </Suspense>
  );
}
