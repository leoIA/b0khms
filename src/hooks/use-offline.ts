'use client';

import { useState, useEffect } from 'react';

export interface OfflineRequest {
  id: number;
  url: string;
  method: string;
  body: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  synced: boolean;
}

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setIsOnline]);

  return { isOnline };
}

export function useOfflineQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [requests, setRequests] = useState<OfflineRequest[]>([]);

  useEffect(() => {
    loadOfflineRequests();
  }, []);

  const loadOfflineRequests = async () => {
    try {
      const db = await openOfflineDB();
      const data = await getAllRequests(db);
      setRequests(data);
      setPendingCount(data.length);
    } catch (error) {
      console.error('Failed to load offline requests:', error);
    }
  };

  const queueForSync = async (request: Omit<OfflineRequest, 'id' | 'timestamp' | 'synced'>) => {
    try {
      const db = await openOfflineDB();
      const id = await addRequest(db, {
        ...request,
        timestamp: Date.now(),
        synced: false,
      });
      
      setPendingCount(prev => prev + 1);
      setRequests(prev => [...prev, { ...request, id, timestamp: Date.now(), synced: false }]);
      
      return id;
    } catch (error) {
      console.error('Failed to queue request:', error);
      throw error;
    }
  };

  const syncPendingRequests = async () => {
    const pending = requests.filter(r => !r.synced);
    
    for (const request of pending) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        if (response.ok) {
          const db = await openOfflineDB();
          await deleteRequest(db, request.id);
          setRequests(prev => prev.filter(r => r.id !== request.id));
          setPendingCount(prev => prev - 1);
        }
      } catch (error) {
        console.error('Sync failed for request:', request.id, error);
      }
    }
  };

  return {
    pendingCount,
    requests,
    queueForSync,
    syncPendingRequests,
  };
}

// IndexedDB helpers
function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ConstrutorProOffline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getAllRequests(db: IDBDatabase): Promise<OfflineRequest[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('requests', 'readonly');
    const store = transaction.objectStore('requests');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function addRequest(db: IDBDatabase, request: Omit<OfflineRequest, 'id'>): Promise<number> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('requests', 'readwrite');
    const store = transaction.objectStore('requests');
    const requestToAdd = store.add(request);
    
    requestToAdd.onerror = () => reject(requestToAdd.error);
    requestToAdd.onsuccess = () => resolve(requestToAdd.result as number);
  });
}

function deleteRequest(db: IDBDatabase, id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('requests', 'readwrite');
    const store = transaction.objectStore('requests');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
