// =============================================================================
// ConstrutorPro - Realtime Toast Notifications
// Componente para exibir notificações toast em tempo real
// =============================================================================

'use client';

import { useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { toast, Toaster } from 'sonner';
import { useWebSocketOptional } from './websocket-provider';

// =============================================================================
// Tipos
// =============================================================================

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface ToastNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
}

// =============================================================================
// Ícones por tipo
// =============================================================================

const icons: Record<NotificationType, React.ReactNode> = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  success: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
};

// =============================================================================
// Componente
// =============================================================================

export function RealtimeToast() {
  const wsContext = useWebSocketOptional();

  // Handler para novas notificações
  const handleNotification = useCallback(
    (notification: ToastNotification) => {
      const { type, title, message, actionUrl } = notification;

      // Configurações do toast baseadas no tipo
      const toastOptions = {
        icon: icons[type],
        action: actionUrl
          ? {
              label: 'Ver',
              onClick: () => {
                window.location.href = actionUrl;
              },
            }
          : undefined,
        duration: type === 'error' ? 10000 : 5000,
      };

      // Exibir toast
      switch (type) {
        case 'success':
          toast.success(title, {
            description: message,
            ...toastOptions,
          });
          break;
        case 'error':
          toast.error(title, {
            description: message,
            ...toastOptions,
          });
          break;
        case 'warning':
          toast.warning(title, {
            description: message,
            ...toastOptions,
          });
          break;
        default:
          toast.info(title, {
            description: message,
            ...toastOptions,
          });
      }
    },
    []
  );

  // Observer para notificações
  useEffect(() => {
    if (!wsContext) return;

    // Inscrever-se para novas notificações
    wsContext.subscribe?.({ eventTypes: ['notification:new'] });

    return () => {
      wsContext.unsubscribe?.('notification:new');
    };
  }, [wsContext]);

  // Exibir notificação quando o contexto receber uma nova
  useEffect(() => {
    if (!wsContext?.notifications.length) return;

    // Pegar a notificação mais recente
    const latestNotification = wsContext.notifications[0];
    handleNotification({
      id: latestNotification.id,
      type: latestNotification.type,
      title: latestNotification.title,
      message: latestNotification.message,
      actionUrl: latestNotification.actionUrl,
    });
  }, [wsContext?.notifications, handleNotification]);

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        unstyled: false,
        classNames: {
          toast: 'group-[.toaster]:pr-6',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          closeButton: 'group-[.toast]:right-1 group-[.toast]:top-1/2 group-[.toast]:-translate-y-1/2',
        },
      }}
      richColors
      closeButton
    />
  );
}

// =============================================================================
// Função helper para disparar notificações manualmente
// =============================================================================

export function showRealtimeToast(
  type: NotificationType,
  title: string,
  message?: string,
  options?: {
    actionUrl?: string;
    duration?: number;
  }
) {
  const toastOptions = {
    icon: icons[type],
    action: options?.actionUrl
      ? {
          label: 'Ver',
          onClick: () => {
            window.location.href = options.actionUrl!;
          },
        }
      : undefined,
    duration: options?.duration || (type === 'error' ? 10000 : 5000),
  };

  switch (type) {
    case 'success':
      return toast.success(title, {
        description: message,
        ...toastOptions,
      });
    case 'error':
      return toast.error(title, {
        description: message,
        ...toastOptions,
      });
    case 'warning':
      return toast.warning(title, {
        description: message,
        ...toastOptions,
      });
    default:
      return toast.info(title, {
        description: message,
        ...toastOptions,
      });
  }
}
