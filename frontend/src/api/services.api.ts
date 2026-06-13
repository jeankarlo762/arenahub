import api from './axios'

export interface Service {
  name: string
  description?: string
  defaultPrice: number
  active: boolean
}

export async function listServices(): Promise<Service[]> {
  const res = await api.get<Service[]>('/services')
  return res.data
}

export async function createService(data: Omit<Service, 'active'>): Promise<Service> {
  const res = await api.post<Service>('/services', data)
  return res.data
}

export async function updateService(name: string, data: Partial<Service>): Promise<Service> {
  const res = await api.put<Service>(`/services/${encodeURIComponent(name)}`, data)
  return res.data
}
