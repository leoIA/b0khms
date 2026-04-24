'use client';

import { Suspense } from 'react';
import { PagamentoErroContent } from './content';

export default function PagamentoErroPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-950 dark:to-rose-900">
        <div className="animate-pulse">Carregando...</div>
      </div>
    }>
      <PagamentoErroContent />
    </Suspense>
  );
}
