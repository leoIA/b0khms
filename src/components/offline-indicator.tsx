'use client';

import { useOfflineStatus } from '@/hooks/use-offline';
import { Wifi, WifiOff } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline } = useOfflineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">Você está offline</span>
    </div>
  );
}

export function ConnectionStatus() {
  const { isOnline } = useOfflineStatus();

  return (
    <div className="flex items-center gap-2">
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <span className="text-xs text-green-600">Online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <span className="text-xs text-red-600">Offline</span>
        </>
      )}
    </div>
  );
}

export function OfflineQueueIndicator({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg">
      <WifiOff className="h-4 w-4" />
      <span className="text-sm font-medium">{count} requisição(ões) pendente(s)</span>
    </div>
  );
}
