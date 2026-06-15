import { AsyncLocalStorage } from 'node:async_hooks'

interface TenantStore {
  tenantId: string
}

export const tenantStore = new AsyncLocalStorage<TenantStore>()

/** Set the current request's tenant. Call inside the auth middleware. */
export function setTenant(tenantId: string): void {
  tenantStore.enterWith({ tenantId })
}

/** Returns the current tenant id, or undefined when running outside a tenant
 *  context (superadmin routes, login, seed script). */
export function getTenantId(): string | undefined {
  return tenantStore.getStore()?.tenantId
}
