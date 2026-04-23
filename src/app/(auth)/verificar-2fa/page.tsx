import { Suspense } from 'react';
import Verificar2FAForm from './verificar-2fa-form';

export const metadata = {
  title: 'Verificação 2FA - ConstrutorPro',
  description: 'Verificação de autenticação em dois fatores',
};

export default function Verificar2FAPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    }>
      <Verificar2FAForm />
    </Suspense>
  );
}
