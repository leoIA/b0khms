// =============================================================================
// ConstrutorPro - Root Page
// Redireciona usuários autenticados para o dashboard,
// mostra landing page para usuários não autenticados
// =============================================================================

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import LandingPageContent from './landing-page-content';

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Se autenticado, redirecionar para o dashboard
  if (session) {
    redirect('/dashboard');
  }

  // Mostrar landing page para usuários não autenticados
  return <LandingPageContent />;
}
