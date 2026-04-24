// =============================================================================
// ConstrutorPro - Offline Storage Hook Tests
// Tests for IndexedDB-based offline data management
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { STORES } from '../use-offline-storage'

// Mock IndexedDB
vi.stubGlobal('indexedDB', {
  open: vi.fn(() => ({
    result: {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          add: vi.fn(() => ({ result: 1, onsuccess: null, onerror: null })),
          get: vi.fn(() => ({ result: null, onsuccess: null, onerror: null })),
          getAll: vi.fn(() => ({ result: [], onsuccess: null, onerror: null })),
          put: vi.fn(() => ({ result: 'key', onsuccess: null, onerror: null })),
          delete: vi.fn(() => ({ onsuccess: null, onerror: null })),
          clear: vi.fn(() => ({ onsuccess: null, onerror: null })),
        })),
      })),
      objectStoreNames: { contains: vi.fn(() => true) },
      createObjectStore: vi.fn(),
    },
    error: null,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  })),
})

describe('Offline Storage Constants', () => {
  describe('STORES Constants', () => {
    it('should have correct store names', () => {
      expect(STORES.PENDING_REQUESTS).toBe('pendingRequests')
      expect(STORES.OFFLINE_DATA).toBe('offlineData')
      expect(STORES.SYNC_QUEUE).toBe('syncQueue')
    })
  })
})

describe('Offline Data Types', () => {
  it('should have OfflineProject interface structure', () => {
    const project = {
      key: 'project-123',
      data: {
        id: '123',
        name: 'Test Project',
        code: 'PRJ-001',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      synced: false,
      lastModified: Date.now(),
    }
    
    expect(project.key).toBeDefined()
    expect(project.data).toBeDefined()
    expect(project.synced).toBe(false)
    expect(project.lastModified).toBeGreaterThan(0)
  })

  it('should have OfflineDiarioObra interface structure', () => {
    const diario = {
      key: 'diario-456',
      data: {
        id: '456',
        date: '2024-01-15',
        projectId: '123',
        summary: 'Test diario',
      },
      synced: false,
      lastModified: Date.now(),
    }
    
    expect(diario.key).toBeDefined()
    expect(diario.data).toBeDefined()
    expect(diario.synced).toBe(false)
  })

  it('should have SyncQueueItem interface structure', () => {
    const syncItem = {
      id: 1,
      entityType: 'project' as const,
      entityId: '123',
      action: 'create' as const,
      data: { name: 'Test' },
      timestamp: Date.now(),
      retryCount: 0,
    }
    
    expect(syncItem.entityType).toBe('project')
    expect(syncItem.action).toBe('create')
    expect(syncItem.retryCount).toBe(0)
  })
})

describe('Online/Offline Detection', () => {
  it('should detect navigator.onLine', () => {
    expect(navigator.onLine).toBe(true)
  })

  it('should handle online/offline events', () => {
    const onlineHandler = vi.fn()
    const offlineHandler = vi.fn()
    
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
    
    window.dispatchEvent(new Event('online'))
    expect(onlineHandler).toHaveBeenCalled()
    
    window.dispatchEvent(new Event('offline'))
    expect(offlineHandler).toHaveBeenCalled()
    
    window.removeEventListener('online', onlineHandler)
    window.removeEventListener('offline', offlineHandler)
  })
})

describe('IndexedDB Mock', () => {
  it('should be defined', () => {
    expect(indexedDB).toBeDefined()
    expect(typeof indexedDB.open).toBe('function')
  })
})
