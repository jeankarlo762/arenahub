import api from './axios'
import type {
  Tenant, CreateTenantInput, TenantUser, GlobalUser,
  CreateTenantUserInput, UpdateUserInput, FinancialOverview,
} from '../types/tenant'

// ---------- Tenants ----------
export async function listTenants(): Promise<Tenant[]> {
  const res = await api.get<Tenant[]>('/superadmin/tenants')
  return res.data
}

export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const res = await api.post<Tenant>('/superadmin/tenants', input)
  return res.data
}

export async function updateTenant(id: string, data: Partial<Pick<Tenant, 'name' | 'phone' | 'mrrValue' | 'setupFee' | 'active'>>): Promise<Tenant> {
  const res = await api.patch<Tenant>(`/superadmin/tenants/${id}`, data)
  return res.data
}

export async function toggleTenant(id: string, active: boolean): Promise<Tenant> {
  const res = await api.patch<Tenant>(`/superadmin/tenants/${id}`, { active })
  return res.data
}

export async function deleteTenant(id: string): Promise<void> {
  await api.delete(`/superadmin/tenants/${id}`)
}

// ---------- Users ----------
export async function listAllUsers(): Promise<GlobalUser[]> {
  const res = await api.get<GlobalUser[]>('/superadmin/users')
  return res.data
}

export async function listTenantUsers(tenantId: string): Promise<TenantUser[]> {
  const res = await api.get<TenantUser[]>(`/superadmin/tenants/${tenantId}/users`)
  return res.data
}

export async function createTenantUser(tenantId: string, input: CreateTenantUserInput): Promise<TenantUser> {
  const res = await api.post<TenantUser>(`/superadmin/tenants/${tenantId}/users`, input)
  return res.data
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<TenantUser> {
  const res = await api.patch<TenantUser>(`/superadmin/users/${userId}`, input)
  return res.data
}

// ---------- Financeiro ----------
export async function getFinancialOverview(params?: { startDate?: string; endDate?: string }): Promise<FinancialOverview> {
  const res = await api.get<FinancialOverview>('/superadmin/financial', { params })
  return res.data
}
