// =============================================================================
// ConstrutorPro - Página de Registro
// =============================================================================

import type { Metadata } from 'next';
import RegistroForm from './registro-form';

export const metadata: Metadata = {
  title: 'Criar Conta | ConstrutorPro',
  description: 'Crie sua conta gratuita no ConstrutorPro e comece a gerenciar suas obras de forma profissional. Teste grátis por 14 dias.',
};

export default function RegistroPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <RegistroForm />
      </div>
    </div>
  );
}
