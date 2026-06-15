import api from './axios'
import type { Client } from '../types/client'

export async function listClients(search?: string): Promise<Client[]> {
  const res = await api.get<Client[]>('/clients', { params: search ? { search } : undefined })
  return res.data
}

export async function getClient(id: string): Promise<Client> {
  const res = await api.get<Client>(`/clients/${id}`)
  return res.data
}

export async function createClient(data: { firstName: string; lastName: string; phone?: string }): Promise<Client> {
  const res = await api.post<Client>('/clients', data)
  return res.data
}

export async function updateClient(id: string, data: Partial<{ firstName: string; lastName: string; phone: string }>): Promise<Client> {
  const res = await api.put<Client>(`/clients/${id}`, data)
  return res.data
}

export async function deleteClient(id: string): Promise<void> {
  await api.delete(`/clients/${id}`)
}

export async function getClientHistory(id: string) {
  const res = await api.get(`/clients/${id}/history`)
  return res.data
}
