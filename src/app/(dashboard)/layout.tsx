// =============================================================================
// ConstrutorPro - Dashboard Layout
// =============================================================================

'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebSocketProvider, RealtimeToast, ProgressIndicator } from '@/components/realtime';

// QueryClient factory with proper SSR handling
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  }
  // Browser: make a new query client if we don't already have one
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WebSocketProvider>
            <div className="flex h-screen bg-background">
              <aside aria-label="Menu lateral" className="flex-shrink-0">
                <Sidebar />
              </aside>
              <div className="flex-1 flex flex-col overflow-hidden">
                <header role="banner">
                  <Header />
                </header>
                <main
                  id="main-content"
                  role="main"
                  aria-label="Conteúdo principal"
                  className="flex-1 overflow-auto p-6"
                  tabIndex={-1}
                >
                  {children}
                </main>
              </div>
            </div>
            {/* Real-time components */}
            <RealtimeToast />
            <ProgressIndicator />
            <Toaster />
          </WebSocketProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
