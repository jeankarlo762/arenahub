import api from './axios'

export interface AuditLog {
  id: string
  tenantId: string | null
  userId: string | null
  userName: string | null
  userEmail: string | null
  userRole: string | null
  action: string
  entity: string
  entityId: string | null
  summary: string | null
  createdAt: string
}

export interface AuditPage {
  logs: AuditLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AuditFilters {
  page?: number
  pageSize?: number
  entity?: string
  action?: string
  search?: string
  startDate?: string
  endDate?: string
}

export async function listAuditLogs(filters: AuditFilters = {}): Promise<AuditPage> {
  const res = await api.get<AuditPage>('/audit', { params: filters })
  return res.data
}

export async function listAuditEntities(): Promise<string[]> {
  const res = await api.get<string[]>('/audit/entities')
  return res.data
}
