// =============================================================================
// ConstrutorPro - Contato Layout (for metadata)
// =============================================================================

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contato | ConstrutorPro',
  description: 'Entre em contato com nossa equipe. Estamos aqui para ajudar com dúvidas, suporte ou informações comerciais.',
  keywords: ['contato', 'suporte', 'construção', 'gestão', 'projetos', 'Brasil'],
};

export default function ContatoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
