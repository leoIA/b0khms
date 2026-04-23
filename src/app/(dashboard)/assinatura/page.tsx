// =============================================================================
// ConstrutorPro - Página de Assinatura
// =============================================================================

import { Metadata } from 'next';
import AssinaturaClient from './assinatura-client';

export const metadata: Metadata = {
  title: 'Assinatura | ConstrutorPro',
  description: 'Gerencie sua assinatura do ConstrutorPro',
};

export default function AssinaturaPage() {
  return <AssinaturaClient />;
}
