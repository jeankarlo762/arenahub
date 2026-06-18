import api from './axios'
import type { Rental, RentalSlot, RentalPayment } from '../types/rental'

interface RentalRaw {
  id: string
  courtId: string
  court: { id: string; name: string }
  clientId?: string
  client?: { id: string; firstName: string; lastName: string }
  clientName: string
  clientPhone?: string | null
  weekdays: string
  slots: string
  startDate: string
  endDate?: string
  plan?: string | null
  paymentMethod?: string | null
  paymentDay?: number | null
  paymentFrequency?: string | null
  notes?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

function parseRental(r: RentalRaw): Rental {
  let weekdays: number[] = []
  let slots: RentalSlot[] = []
  try { weekdays = JSON.parse(r.weekdays) } catch { weekdays = [] }
  try { slots = JSON.parse(r.slots) } catch { slots = [] }
  return {
    ...r,
    weekdays,
    slots,
    plan: (r.plan as Rental['plan']) ?? null,
    paymentMethod: (r.paymentMethod as Rental['paymentMethod']) ?? null,
    paymentDay: r.paymentDay ?? null,
    paymentFrequency: (r.paymentFrequency as Rental['paymentFrequency']) ?? null,
    clientPhone: r.clientPhone ?? null,
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
  clientPhone?: string
  weekdays: number[]
  slots: RentalSlot[]
  startDate: string
  endDate?: string
  plan?: string
  paymentMethod?: string
  paymentDay?: number | null
  paymentFrequency?: string
  notes?: string
}): Promise<Rental> {
  const res = await api.post<RentalRaw>('/rentals', data)
  return parseRental(res.data)
}

export async function updateRental(id: string, data: Partial<{
  courtId: string
  clientId: string
  clientName: string
  clientPhone: string
  weekdays: number[]
  slots: RentalSlot[]
  startDate: string
  endDate: string
  plan: string
  paymentMethod: string
  paymentDay: number | null
  paymentFrequency: string
  notes: string
  active: boolean
}>): Promise<Rental> {
  const res = await api.put<RentalRaw>(`/rentals/${id}`, data)
  return parseRental(res.data)
}

export async function deleteRental(id: string): Promise<void> {
  await api.delete(`/rentals/${id}`)
}

export async function listRentalPayments(rentalId: string): Promise<RentalPayment[]> {
  const res = await api.get<RentalPayment[]>(`/rentals/${rentalId}/payments`)
  return res.data
}

export async function toggleRentalPayment(rentalId: string, paymentId: string, paid: boolean): Promise<RentalPayment> {
  const res = await api.patch<RentalPayment>(`/rentals/${rentalId}/payments/${paymentId}`, { paid })
  return res.data
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
