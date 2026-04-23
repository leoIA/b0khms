// =============================================================================
// ConstrutorPro - Soft Delete Service
// Serviço para exclusão lógica e restauração de entidades
// =============================================================================

// =============================================================================
// Types
// =============================================================================

export type EntityType =
  | 'project'
  | 'client'
  | 'supplier'
  | 'material'
  | 'composition'
  | 'budget'
  | 'schedule'
  | 'transaction'
  | 'quotation'
  | 'daily_log'

export interface SoftDeletedEntity {
  id: string
  entityType: EntityType
  entityId: string
  entityName: string
  companyId: string
  deletedBy: string
  deletedAt: Date
  expiresAt: Date // Data em que será permanentemente removido
  snapshot: string // JSON snapshot da entidade
  canRestore: boolean
}

export interface SoftDeleteOptions {
  permanent?: boolean // Se true, remove permanentemente
  retentionDays?: number // Dias até exclusão permanente (default 30)
}

// =============================================================================
// In-Memory Soft Delete Store
// Em produção, usar tabela no banco de dados
// =============================================================================

class InMemorySoftDeleteStore {
  private deleted = new Map<string, SoftDeletedEntity>()
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor() {
    // Limpeza automática a cada hora
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(() => {
        this.cleanupExpired()
      }, 60 * 60 * 1000)
    }
  }

  private cleanupExpired(): number {
    const now = Date.now()
    let removed = 0
    for (const [key, entity] of this.deleted.entries()) {
      if (entity.expiresAt.getTime() < now) {
        this.deleted.delete(key)
        removed++
      }
    }
    return removed
  }

  add(entity: SoftDeletedEntity): void {
    const key = `${entity.entityType}:${entity.entityId}`
    this.deleted.set(key, entity)
  }

  get(entityType: EntityType, entityId: string): SoftDeletedEntity | undefined {
    return this.deleted.get(`${entityType}:${entityId}`)
  }

  getByCompany(companyId: string, entityType?: EntityType): SoftDeletedEntity[] {
    return Array.from(this.deleted.values())
      .filter(
        (e) =>
          e.companyId === companyId &&
          (!entityType || e.entityType === entityType)
      )
      .sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime())
  }

  getByUser(userId: string): SoftDeletedEntity[] {
    return Array.from(this.deleted.values())
      .filter((e) => e.deletedBy === userId)
      .sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime())
  }

  remove(entityType: EntityType, entityId: string): boolean {
    return this.deleted.delete(`${entityType}:${entityId}`)
  }

  clear(): void {
    this.deleted.clear()
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    this.deleted.clear()
  }
}

// =============================================================================
// Soft Delete Service
// =============================================================================

class SoftDeleteService {
  private store: InMemorySoftDeleteStore
  private defaultRetentionDays: number

  constructor() {
    this.store = new InMemorySoftDeleteStore()
    this.defaultRetentionDays = 30
  }

  /**
   * Registra uma entidade como excluída (soft delete)
   */
  softDelete(
    entityType: EntityType,
    entityId: string,
    entityName: string,
    companyId: string,
    deletedBy: string,
    snapshot: Record<string, unknown>,
    retentionDays?: number
  ): SoftDeletedEntity {
    const retention = retentionDays || this.defaultRetentionDays
    const now = new Date()

    const entity: SoftDeletedEntity = {
      id: `softdel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      entityType,
      entityId,
      entityName,
      companyId,
      deletedBy,
      deletedAt: now,
      expiresAt: new Date(now.getTime() + retention * 24 * 60 * 60 * 1000),
      snapshot: JSON.stringify(snapshot),
      canRestore: true,
    }

    this.store.add(entity)

    console.log(
      `[SoftDelete] Entity ${entityType}:${entityId} marked as deleted by ${deletedBy}`
    )

    return entity
  }

  /**
   * Restaura uma entidade excluída
   */
  restore(entityType: EntityType, entityId: string): Record<string, unknown> | null {
    const deleted = this.store.get(entityType, entityId)

    if (!deleted) {
      console.warn(`[SoftDelete] Entity not found: ${entityType}:${entityId}`)
      return null
    }

    if (!deleted.canRestore) {
      console.warn(`[SoftDelete] Entity cannot be restored: ${entityType}:${entityId}`)
      return null
    }

    const snapshot = JSON.parse(deleted.snapshot) as Record<string, unknown>

    // Remover do store de excluídos
    this.store.remove(entityType, entityId)

    console.log(
      `[SoftDelete] Entity ${entityType}:${entityId} restored by ${deleted.deletedBy}`
    )

    return snapshot
  }

  /**
   * Remove permanentemente uma entidade
   */
  permanentDelete(entityType: EntityType, entityId: string): boolean {
    const deleted = this.store.get(entityType, entityId)

    if (deleted) {
      this.store.remove(entityType, entityId)
      console.log(
        `[SoftDelete] Entity ${entityType}:${entityId} permanently deleted`
      )
      return true
    }

    return false
  }

  /**
   * Verifica se uma entidade está excluída
   */
  isDeleted(entityType: EntityType, entityId: string): boolean {
    return this.store.get(entityType, entityId) !== undefined
  }

  /**
   * Obtém detalhes de uma entidade excluída
   */
  getDeletedEntity(
    entityType: EntityType,
    entityId: string
  ): SoftDeletedEntity | undefined {
    return this.store.get(entityType, entityId)
  }

  /**
   * Lista entidades excluídas de uma empresa
   */
  listDeleted(
    companyId: string,
    entityType?: EntityType
  ): SoftDeletedEntity[] {
    return this.store.getByCompany(companyId, entityType)
  }

  /**
   * Lista exclusões de um usuário
   */
  listDeletedByUser(userId: string): SoftDeletedEntity[] {
    return this.store.getByUser(userId)
  }

  /**
   * Obtém o snapshot de uma entidade excluída
   */
  getSnapshot(
    entityType: EntityType,
    entityId: string
  ): Record<string, unknown> | null {
    const deleted = this.store.get(entityType, entityId)
    if (!deleted) return null
    return JSON.parse(deleted.snapshot) as Record<string, unknown>
  }

  /**
   * Conta entidades excluídas
   */
  countDeleted(companyId: string, entityType?: EntityType): number {
    return this.listDeleted(companyId, entityType).length
  }

  /**
   * Limpa entidades expiradas
   */
  cleanupExpired(): number {
    // Na implementação com banco de dados, isso seria um DELETE
    return 0 // InMemoryStore já faz cleanup automático
  }

  /**
   * Estatísticas de exclusões
   */
  getStats(companyId: string): {
    total: number
    byType: Record<EntityType, number>
    expiringIn7Days: number
  } {
    const deleted = this.listDeleted(companyId)
    const now = Date.now()
    const sevenDays = 7 * 24 * 60 * 60 * 1000

    const byType = {} as Record<EntityType, number>
    for (const entity of deleted) {
      byType[entity.entityType] = (byType[entity.entityType] || 0) + 1
    }

    const expiringIn7Days = deleted.filter(
      (e) => e.expiresAt.getTime() - now < sevenDays
    ).length

    return {
      total: deleted.length,
      byType,
      expiringIn7Days,
    }
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const softDeleteService = new SoftDeleteService()

// =============================================================================
// Helper para usar em APIs
// =============================================================================

/**
 * Wrapper para exclusão segura de entidades
 */
export async function safeDelete(
  entityType: EntityType,
  entityId: string,
  options: {
    entityName: string
    companyId: string
    userId: string
    snapshot: Record<string, unknown>
    permanent?: boolean
    deleteFn?: () => Promise<void> // Função de exclusão real no banco
  }
): Promise<{ success: boolean; permanent: boolean; error?: string }> {
  const { permanent = false } = options

  try {
    if (permanent && options.deleteFn) {
      // Exclusão permanente
      await options.deleteFn()
      return { success: true, permanent: true }
    } else {
      // Soft delete
      softDeleteService.softDelete(
        entityType,
        entityId,
        options.entityName,
        options.companyId,
        options.userId,
        options.snapshot
      )

      // Marcar como inativo no banco (se aplicável)
      // Isso seria feito pelo caller

      return { success: true, permanent: false }
    }
  } catch (error) {
    console.error(`[SafeDelete] Error:`, error)
    return {
      success: false,
      permanent: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}
