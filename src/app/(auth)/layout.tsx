// =============================================================================
// ConstrutorPro - Auth Layout (Login, Register, etc.)
// =============================================================================

import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <div className="min-h-screen flex flex-col bg-background">
        {children}
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
