export interface Tenant {
  id: string
  name: string
  email: string
  phone?: string
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE'
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateTenantInput {
  name: string
  email: string
  phone?: string
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE'
  adminName: string
  adminEmail: string
  adminPassword: string
}
