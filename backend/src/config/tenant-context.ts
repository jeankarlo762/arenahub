import { AsyncLocalStorage } from 'node:async_hooks'

interface TenantStore {
  tenantId: string | null
}

export const tenantStore = new AsyncLocalStorage<TenantStore>()

/**
 * Establish a fresh (empty) tenant store for the current request. Must be
 * called from an `onRequest` hook using `tenantStore.run(...)` so the context
 * reliably propagates to every async operation in the request — including the
 * Prisma middleware. (enterWith() in a preHandler does NOT propagate reliably
 * in Fastify.)
 */
export function createStore(): TenantStore {
  return { tenantId: null }
}

/** Set the current request's tenant. Mutates the store established at onRequest. */
export function setTenant(tenantId: string): void {
  const store = tenantStore.getStore()
  if (store) store.tenantId = tenantId
}

/** Returns the current tenant id, or undefined outside a tenant context
 *  (superadmin routes, login, seed script). */
export function getTenantId(): string | undefined {
  return tenantStore.getStore()?.tenantId ?? undefined
}
