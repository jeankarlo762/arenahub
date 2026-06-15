import api from './axios'
import type { Tenant, CreateTenantInput } from '../types/tenant'

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
