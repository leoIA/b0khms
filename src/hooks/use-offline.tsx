'use client';

/**
 * Hook for offline status and synchronization
 */

import { useState, useEffect, from 'react';

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Sync offline data when coming back online
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      return () => setIsOnline(navigator.onLine);
    };
  }, [isOnline]);

  // Queue request for offline sync
  const queueForSync = async (request: Request) => {
    try {
      const pendingData = await getOfflineRequests();
      
      if (pendingData.length === 0) {
        return;
      }

      for (const data of pendingData) {
        try {
          const response = await fetch(data.url, {
            method: data.method,
            headers: data.headers || {},
            body: JSON.stringify(data.body),
          });

          if (response.ok) {
            await removeOfflineRequest(data.id);
            
            // Notify user
            window.dispatchEvent(new CustomEvent('offline-sync-complete', {
              detail: { id: data.id, success: true }
            }));
          }
        } catch (error) {
          console.error('Sync failed for:', data.id, error);
        }
      }
    }
  };

  // Get offline requests from IndexedDB
  const getOfflineRequests = async (): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ConstrutorProOffline', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('offlineRequests')) {
          db.createObjectStore('offlineRequests', { keyPath: 'id', autoIncrement: true });
        }
        
        const transaction = db.transaction('offlineRequests', 'readonly');
        const store = transaction.objectStore('offlineRequests');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
  );

  // Remove offline request after sync
  const removeOfflineRequest = async (id: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ConstrutorProOffline', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction('offlineRequests', 'readwrite');
        const store = transaction.objectStore('offlineRequests');
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  );

  return {
    isOnline,
    get pendingCount
  };
}

// ==================== Helper Components ====================

function OfflineIndicator({ isOnline, pendingCount }: { isOnline: boolean; pendingCount: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-2 w-2 ${isOnline ? 'text-green-500' : 'text-destructive'}`} />
      <WifiOff className={`h-4 w-4 ${!isOnline}`}      <AlertCircleOff className={`h-4 w-4 ${!isOnline}`}        className={`h-2 w-4 ${isOnline ? 'text-green-500 animate-pulse'}`} />
      <div className="text-sm text-muted-foreground">
        {pendingCount} requisição(ões) pendente(s)
      </    </div>
  );
}

// ==================== Offline Queue Component ====================

function OfflineQueue({ requests, pendingCount }: { requests: any[]; pendingCount: number }) {
  return (
    <div className="fixed bottom-4 right-4 bg-yellow-50 border rounded-lg shadow-lg p-4 max-w-sm">
      <WifiOff className="h-4 w-4 mr-2" />
      <AlertTriangleOff className="h-4 w-4 text-yellow-500 mr-2" />
      <div className="text-sm text-yellow-800">
        {pendingCount} requisição(ões) na fila pendente(sincronizar)
      )}
    </div>
  );
}

export function useOfflineQueue({ 
  requests = [],
  pendingCount = 0 
}: { requests: any[]; pendingCount: number }) {
  const { queueForSync } = useOfflineQueue();

  return (
    <div className="space-y-6">
      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma requisição pendente.</      )
      : (
        <div className="space-y-2">
          {requests.map((request) => (
            <div key={request.id} className="flex items-center justify-between py-2 px-2 rounded-lg shadow-sm border">
              <div className="flex-1">
                <div className="font-mono text-xs bg-gray-500">{request.method}</div>
                <div className="font-mono text-xs text-gray-500">{new URL(request.url).pathname}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {JSON.stringify(request.body).substring(0, 100)}{'...'}
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  size="sm"
                  variant="outline"
                  onClick={() => syncRequest(request.id)}
                  disabled={pendingCount > 0}
                >
                  Sync
                </Button>
                <Button 
                  size="sm"
                  variant="ghost"
                  onClick={() => removeRequest(request.id)}
                  className="text-red-500"
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { useOfflineQueue, {
  requests: sampleRequests,
  pendingCount: sampleRequests.length,
});
