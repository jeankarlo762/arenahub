import api from './axios'
import type { Rental, RentalSlot } from '../types/rental'

interface RentalRaw {
  id: string
  courtId: string
  court: { id: string; name: string }
  clientId?: string
  client?: { id: string; firstName: string; lastName: string }
  clientName: string
  weekdays: string
  slots: string
  startDate: string
  endDate?: string
  notes?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

function parseRental(r: RentalRaw): Rental {
  return {
    ...r,
    weekdays: JSON.parse(r.weekdays) as number[],
    slots: JSON.parse(r.slots) as RentalSlot[],
  }
}

export async function listRentals(params?: {
  courtId?: string
  clientId?: string
  active?: boolean
  date?: string
}): Promise<Rental[]> {
  const res = await api.get<RentalRaw[]>('/rentals', { params })
  return res.data.map(parseRental)
}

export async function getRental(id: string): Promise<Rental> {
  const res = await api.get<RentalRaw>(`/rentals/${id}`)
  return parseRental(res.data)
}

export async function createRental(data: {
  courtId?: string
  clientId?: string
  clientName: string
  weekdays: number[]
  slots: RentalSlot[]
  startDate: string
  endDate?: string
  notes?: string
}): Promise<Rental> {
  const res = await api.post<RentalRaw>('/rentals', data)
  return parseRental(res.data)
}

export async function updateRental(id: string, data: Partial<{
  clientName: string
  weekdays: number[]
  slots: RentalSlot[]
  startDate: string
  endDate: string
  notes: string
  active: boolean
}>): Promise<Rental> {
  const res = await api.put<RentalRaw>(`/rentals/${id}`, data)
  return parseRental(res.data)
}

export async function deleteRental(id: string): Promise<void> {
  await api.delete(`/rentals/${id}`)
}

export interface RentalReport {
  activeCount: number
  inactiveCount: number
  totalCount: number
  estimatedRevenue: number
  topCourts: { courtName: string; rentalCount: number; estimatedRevenue: number }[]
  weekdayActivity: { weekday: number; rentalCount: number }[]
}

export async function getRentalReport(params?: { startDate?: string; endDate?: string }): Promise<RentalReport> {
  const res = await api.get<RentalReport>('/rentals/report', { params })
  return res.data
}
