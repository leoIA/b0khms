'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

// Hook for client-side only rendering
function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

// Dynamic import for Swagger UI
export default function ApiDocsPage() {
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando documentação...</p>
        </div>
      </div>
    );
  }

  return <SwaggerUI />;
}

function SwaggerUI() {
  const [SwaggerUIComponent, setSwaggerUIComponent] = useState<React.ComponentType<{ spec: object }> | null>(null);
  const [spec, setSpec] = useState<object | null>(null);

  useEffect(() => {
    // Load Swagger UI dynamically
    import('swagger-ui-react').then((mod) => {
      setSwaggerUIComponent(() => mod.default);
    });

    // Load OpenAPI spec
    fetch('/api/docs')
      .then((res) => res.json())
      .then(setSpec)
      .catch(console.error);
  }, []);

  if (!SwaggerUIComponent || !spec) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando documentação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="swagger-wrapper">
      <style jsx global>{`
        .swagger-wrapper {
          min-height: 100vh;
          background: #fafafa;
        }
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .info .title {
          font-size: 2rem;
        }
        .swagger-ui .opblock-tag {
          font-size: 1.2rem;
        }
        .swagger-ui .opblock .opblock-summary-description {
          font-size: 0.9rem;
        }
        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .swagger-wrapper {
            background: #1a1a1a;
          }
          .swagger-ui {
            background: transparent;
          }
          .swagger-ui .info .title,
          .swagger-ui .opblock-tag,
          .swagger-ui .opblock .opblock-summary-description {
            color: #e0e0e0;
          }
          .swagger-ui .scheme-container {
            background: #2a2a2a;
            box-shadow: 0 1px 2px 0 rgba(0,0,0,.15);
          }
          .swagger-ui .opblock .opblock-summary-header {
            background: #2a2a2a;
          }
          .swagger-ui .opblock .opblock-body {
            background: #1a1a1a;
          }
          .swagger-ui table thead tr th,
          .swagger-ui table thead tr td,
          .swagger-ui .parameters-col_description {
            color: #b0b0b0;
          }
          .swagger-ui .response-col_description {
            color: #b0b0b0;
          }
          .swagger-ui .model-box {
            background: #2a2a2a;
          }
          .swagger-ui .model {
            color: #e0e0e0;
        }
        }
      `}</style>
      <SwaggerUIComponent spec={spec} />
    </div>
  );
}
