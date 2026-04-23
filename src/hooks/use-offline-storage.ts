// =============================================================================
// ConstrutorPro - Offline Storage Hook
// IndexedDB-based offline data management with sync support
// =============================================================================

import { useState, useEffect, useCallback } from 'react'

const DB_NAME = 'ConstrutorProOffline'
const DB_VERSION = 1

// Store names
export const STORES = {
  PENDING_REQUESTS: 'pendingRequests',
  OFFLINE_DATA: 'offlineData',
  SYNC_QUEUE: 'syncQueue',
} as const

// Open database connection
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(STORES.PENDING_REQUESTS)) {
        db.createObjectStore(STORES.PENDING_REQUESTS, { 
          keyPath: 'id', 
          autoIncrement: true 
        })
      }
      
      if (!db.objectStoreNames.contains(STORES.OFFLINE_DATA)) {
        db.createObjectStore(STORES.OFFLINE_DATA, { keyPath: 'key' })
      }
      
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { 
          keyPath: 'id', 
          autoIncrement: true 
        })
        syncStore.createIndex('entityType', 'entityType', { unique: false })
        syncStore.createIndex('timestamp', 'timestamp', { unique: false })
      }
    }
  })
}

// Generic database operations
export async function dbAdd<T>(storeName: string, data: T): Promise<number> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.add(data)
    request.onsuccess = () => resolve(request.result as number)
    request.onerror = () => reject(request.error)
  })
}

export async function dbGet<T>(storeName: string, key: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly')
    const store = transaction.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function dbPut(storeName: string, data: unknown): Promise<string> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.put(data)
    request.onsuccess = () => resolve(request.result as string)
    request.onerror = () => reject(request.error)
  })
}

export async function dbDelete(storeName: string, key: string | number): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function dbClear(storeName: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite')
    const store = transaction.objectStore(storeName)
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// Offline data types
export interface OfflineProject {
  key: string
  data: {
    id: string
    name: string
    code: string
    description?: string
    address?: string
    city?: string
    status: string
    createdAt: string
    updatedAt: string
  }
  synced: boolean
  lastModified: number
}

export interface OfflineDiarioObra {
  key: string
  data: {
    id: string
    date: string
    projectId: string
    summary: string
    weather?: string
    activities?: Array<{
      description: string
      workersCount: number
    }>
  }
  synced: boolean
  lastModified: number
}

export interface SyncQueueItem {
  id?: number
  entityType: 'project' | 'diario' | 'material' | 'orcamento'
  entityId: string
  action: 'create' | 'update' | 'delete'
  data: Record<string, unknown>
  timestamp: number
  retryCount: number
}

// Hook for offline storage management
export function useOfflineStorage<T>(
  storeName: string,
  key?: string
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    setIsOnline(navigator.onLine)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const load = useCallback(async () => {
    if (!key) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      const result = await dbGet<T>(storeName, key)
      setData(result || null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load data'))
    } finally {
      setLoading(false)
    }
  }, [storeName, key])

  const save = useCallback(async (value: T & { key?: string }) => {
    try {
      const dataToSave = {
        ...value,
        key: key || value.key || `offline-${Date.now()}`,
        lastModified: Date.now(),
        synced: false,
      }
      await dbPut(storeName, dataToSave)
      
      // Add to sync queue
      await dbAdd(STORES.SYNC_QUEUE, {
        entityType: storeName.replace('offline-', ''),
        entityId: dataToSave.key,
        action: 'update',
        data: dataToSave,
        timestamp: Date.now(),
        retryCount: 0,
      })
      
      setData(dataToSave as T)
      return dataToSave.key
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save data'))
      throw err
    }
  }, [storeName, key])

  const remove = useCallback(async () => {
    if (!key) return
    
    try {
      await dbDelete(storeName, key)
      setData(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete data'))
    }
  }, [storeName, key])

  useEffect(() => {
    load()
  }, [load])

  return {
    data,
    loading,
    error,
    isOnline,
    save,
    remove,
    reload: load,
  }
}

// Hook for managing offline projects
export function useOfflineProjects() {
  const [projects, setProjects] = useState<OfflineProject[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)
      const allProjects = await dbGetAll<OfflineProject>(STORES.OFFLINE_DATA)
      const projectList = allProjects.filter(p => p.key.startsWith('project-'))
      setProjects(projectList)
      setPendingCount(projectList.filter(p => !p.synced).length)
    } catch (err) {
      console.error('Failed to load offline projects:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const saveProject = useCallback(async (project: OfflineProject['data']) => {
    const key = `project-${project.id || Date.now()}`
    const offlineProject: OfflineProject = {
      key,
      data: project,
      synced: false,
      lastModified: Date.now(),
    }
    await dbPut(STORES.OFFLINE_DATA, offlineProject)
    await loadProjects()
    return key
  }, [loadProjects])

  const deleteProject = useCallback(async (projectId: string) => {
    await dbDelete(STORES.OFFLINE_DATA, `project-${projectId}`)
    await loadProjects()
  }, [loadProjects])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return {
    projects,
    loading,
    pendingCount,
    saveProject,
    deleteProject,
    refresh: loadProjects,
  }
}

// Hook for sync queue management
export function useSyncQueue() {
  const [queue, setQueue] = useState<SyncQueueItem[]>([])
  const [isSyncing, setIsSyncing] = useState(false)

  const loadQueue = useCallback(async () => {
    const items = await dbGetAll<SyncQueueItem>(STORES.SYNC_QUEUE)
    setQueue(items)
  }, [])

  const processQueue = useCallback(async () => {
    if (queue.length === 0 || !navigator.onLine) return
    
    setIsSyncing(true)
    
    for (const item of queue) {
      try {
        const response = await fetch(`/api/${item.entityType}s/${item.entityId}`, {
          method: item.action === 'create' ? 'POST' : item.action === 'update' ? 'PUT' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        })
        
        if (response.ok) {
          await dbDelete(STORES.SYNC_QUEUE, item.id!)
        } else {
          // Update retry count
          await dbPut(STORES.SYNC_QUEUE, {
            ...item,
            retryCount: item.retryCount + 1,
          })
        }
      } catch (err) {
        console.error('Failed to sync item:', item, err)
      }
    }
    
    await loadQueue()
    setIsSyncing(false)
  }, [queue, loadQueue])

  useEffect(() => {
    loadQueue()
  }, [loadQueue])

  useEffect(() => {
    const handleOnline = () => {
      if (queue.length > 0) {
        processQueue()
      }
    }
    
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [queue, processQueue])

  return {
    queue,
    queueLength: queue.length,
    isSyncing,
    processQueue,
    refresh: loadQueue,
  }
}

export default {
  openDB,
  dbAdd,
  dbGet,
  dbGetAll,
  dbPut,
  dbDelete,
  dbClear,
  STORES,
  useOfflineStorage,
  useOfflineProjects,
  useSyncQueue,
}
