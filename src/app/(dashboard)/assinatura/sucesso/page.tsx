'use client';

import { Suspense } from 'react';
import { PagamentoSucessoContent } from './content';

export default function PagamentoSucessoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900">
        <div className="animate-pulse">Carregando...</div>
      </div>
    }>
      <PagamentoSucessoContent />
    </Suspense>
  );
}
