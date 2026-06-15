export type Plan = 'BASIC' | 'PRO' | 'ENTERPRISE'

export interface Tenant {
  id: string
  name: string
  email: string
  phone?: string
  plan: Plan
  active: boolean
  createdAt: string
  updatedAt: string
  _count?: { users: number }
}

export interface CreateTenantInput {
  name: string
  email: string
  phone?: string
  plan: Plan
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

export interface CreateTenantUserInput {
  name: string
  email: string
  password: string
  role: 'ADMIN' | 'OPERATOR'
}

export interface FinancialOverview {
  totalTenants: number
  activeTenants: number
  mrr: number
  activeMrr: number
  arr: number
  byPlan: { plan: Plan; price: number; count: number; revenue: number }[]
  tenants: { id: string; name: string; plan: Plan; active: boolean; monthlyValue: number }[]
}
