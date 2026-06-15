import api from './axios'
import type { Tenant, CreateTenantInput, TenantUser, CreateTenantUserInput, FinancialOverview } from '../types/tenant'

// ---------- Tenants ----------
export async function listTenants(): Promise<Tenant[]> {
  const res = await api.get<Tenant[]>('/superadmin/tenants')
  return res.data
}

export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const res = await api.post<Tenant>('/superadmin/tenants', input)
  return res.data
}

export async function toggleTenant(id: string, active: boolean): Promise<Tenant> {
  const res = await api.patch<Tenant>(`/superadmin/tenants/${id}`, { active })
  return res.data
}

export async function updateTenantPlan(id: string, plan: Tenant['plan']): Promise<Tenant> {
  const res = await api.patch<Tenant>(`/superadmin/tenants/${id}`, { plan })
  return res.data
}

export async function deleteTenant(id: string): Promise<void> {
  await api.delete(`/superadmin/tenants/${id}`)
}

// ---------- Tenant Users ----------
export async function listTenantUsers(tenantId: string): Promise<TenantUser[]> {
  const res = await api.get<TenantUser[]>(`/superadmin/tenants/${tenantId}/users`)
  return res.data
}

export async function createTenantUser(tenantId: string, input: CreateTenantUserInput): Promise<TenantUser> {
  const res = await api.post<TenantUser>(`/superadmin/tenants/${tenantId}/users`, input)
  return res.data
}

export async function toggleTenantUser(tenantId: string, userId: string, active: boolean): Promise<TenantUser> {
  const res = await api.patch<TenantUser>(`/superadmin/tenants/${tenantId}/users/${userId}`, { active })
  return res.data
}

// ---------- Financeiro ----------
export async function getFinancialOverview(): Promise<FinancialOverview> {
  const res = await api.get<FinancialOverview>('/superadmin/financial')
  return res.data
}
