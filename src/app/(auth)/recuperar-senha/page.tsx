import { Suspense } from 'react';
import RecuperarSenhaForm from './recuperar-senha-form';

export const metadata = {
  title: 'Recuperar Senha - ConstrutorPro',
  description: 'Recupere sua senha de acesso',
};

export default function RecuperarSenhaPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    }>
      <RecuperarSenhaForm />
    </Suspense>
  );
}
