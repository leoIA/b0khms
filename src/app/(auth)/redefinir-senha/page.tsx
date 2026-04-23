import { Suspense } from 'react';
import RedefinirSenhaForm from './redefinir-senha-form';

export const metadata = {
  title: 'Redefinir Senha - ConstrutorPro',
  description: 'Redefina sua senha de acesso',
};

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    }>
      <RedefinirSenhaForm />
    </Suspense>
  );
}
