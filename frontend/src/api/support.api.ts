import api from './axios'

export interface SupportTicket {
  id: string
  tenantId: string | null
  tenantName: string | null
  userId: string | null
  userName: string | null
  userEmail: string | null
  title: string
  description: string
  attachmentBase64: string | null
  attachmentName: string | null
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  replyText: string | null
  repliedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTicketPayload {
  title: string
  description: string
  attachmentBase64?: string | null
  attachmentName?: string | null
}

export async function createSupportTicket(payload: CreateTicketPayload): Promise<SupportTicket> {
  const res = await api.post<SupportTicket>('/support/tickets', payload)
  return res.data
}

export interface TicketListResponse {
  tickets: SupportTicket[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export async function listSupportTickets(params?: {
  status?: string
  page?: number
  pageSize?: number
}): Promise<TicketListResponse> {
  const res = await api.get<TicketListResponse>('/superadmin/support/tickets', { params })
  return res.data
}

export async function listMyTickets(): Promise<SupportTicket[]> {
  const res = await api.get<SupportTicket[]>('/support/tickets')
  return res.data
}

export async function updateTicketStatus(id: string, status: string): Promise<SupportTicket> {
  const res = await api.patch<SupportTicket>(`/superadmin/support/tickets/${id}`, { status })
  return res.data
}

export async function replyToTicket(id: string, replyText: string): Promise<SupportTicket> {
  const res = await api.patch<SupportTicket>(`/superadmin/support/tickets/${id}`, { replyText })
  return res.data
}
