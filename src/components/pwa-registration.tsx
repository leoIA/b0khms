'use client'

// =============================================================================
// ConstrutorPro - PWA Registration Component
// Registers service worker and handles offline/online status
// =============================================================================

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Wifi, WifiOff, RefreshCw, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function PWARegistration() {
  const [isOnline, setIsOnline] = useState(true)
  const [isInstalled, setIsInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null)

  useEffect(() => {
    // Check if already installed
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      setIsInstalled(isStandalone || (navigator as any).standalone === true)
    }

    // Online/offline status
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Conexão restaurada', {
        description: 'Seus dados serão sincronizados automaticamente.',
      })
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      toast.warning('Modo offline', {
        description: 'Você está trabalhando offline. Os dados serão salvos localmente.',
      })
    }

    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registered:', reg)
          setRegistration(reg)

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true)
                  toast.info('Atualização disponível', {
                    description: 'Uma nova versão está disponível.',
                    action: {
                      label: 'Atualizar',
                      onClick: () => {
                        newWorker.postMessage({ type: 'SKIP_WAITING' })
                        window.location.reload()
                      },
                    },
                  })
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })

      // Handle service worker updates
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })

      // Handle sync messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_COMPLETE') {
          toast.success('Sincronização completa', {
            description: `Dados sincronizados: ${event.data.url}`,
          })
        }
      })
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setIsInstalled(true)
      toast.success('App instalado!', {
        description: 'ConstrutorPro foi instalado com sucesso.',
      })
    }
    
    setDeferredPrompt(null)
    setCanInstall(false)
  }

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  // Don't render anything if not needed
  if (isOnline && !canInstall && !updateAvailable) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {/* Offline indicator */}
      {!isOnline && (
        <Badge 
          variant="destructive" 
          className="flex items-center gap-2 px-3 py-2"
        >
          <WifiOff className="h-4 w-4" />
          <span>Offline</span>
        </Badge>
      )}

      {/* Install prompt */}
      {canInstall && !isInstalled && (
        <div className="flex items-center gap-2 rounded-lg border bg-background p-3 shadow-lg">
          <Download className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Instalar App</p>
            <p className="text-xs text-muted-foreground">
              Acesse offline e mais rápido
            </p>
          </div>
          <Button size="sm" onClick={handleInstall}>
            Instalar
          </Button>
        </div>
      )}

      {/* Update available */}
      {updateAvailable && (
        <div className="flex items-center gap-2 rounded-lg border bg-background p-3 shadow-lg">
          <RefreshCw className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">Atualização disponível</p>
            <p className="text-xs text-muted-foreground">
              Nova versão pronta para instalar
            </p>
          </div>
          <Button size="sm" onClick={handleUpdate}>
            Atualizar
          </Button>
        </div>
      )}
    </div>
  )
}

export default PWARegistration
