export interface Tenant {
  id: string
  name: string
  email: string
  phone?: string
  mrrValue: number
  setupFee: number
  active: boolean
  createdAt: string
  updatedAt: string
  _count?: { users: number }
}

export interface CreateTenantInput {
  name: string
  email: string
  phone?: string
  mrrValue: number
  setupFee: number
  adminName: string
  adminEmail: string
  adminPassword: string
}

export interface TenantUser {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'OPERATOR'
  active: boolean
  createdAt: string
}

export interface GlobalUser extends TenantUser {
  tenantId: string | null
  tenantName: string
}

export interface CreateTenantUserInput {
  name: string
  email: string
  password: string
  role: 'ADMIN' | 'OPERATOR'
}

export interface UpdateUserInput {
  name?: string
  role?: 'ADMIN' | 'OPERATOR'
  active?: boolean
  password?: string
}

export interface FinancialOverview {
  totalTenants: number
  activeTenants: number
  mrr: number
  arr: number
  setupRevenue: number
  newTenantsInPeriod: number
  tenants: {
    id: string
    name: string
    active: boolean
    mrrValue: number
    setupFee: number
    createdAt: string
  }[]
}
