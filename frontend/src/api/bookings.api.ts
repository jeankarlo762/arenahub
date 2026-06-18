import api from './axios'
import type { Booking, CreateBookingPayload, PaymentMethod, PaymentStatus } from '../types/booking'

export async function listBookings(params?: {
  date?: string
  startDate?: string
  endDate?: string
  courtId?: string
  status?: string
}): Promise<Booking[]> {
  const res = await api.get<Booking[]>('/bookings', { params })
  return res.data
}

export async function getBooking(id: string): Promise<Booking> {
  const res = await api.get<Booking>(`/bookings/${id}`)
  return res.data
}

export async function createBooking(data: CreateBookingPayload): Promise<Booking> {
  const res = await api.post<Booking>('/bookings', data)
  return res.data
}

export async function updateBookingStatus(id: string, status: string): Promise<Booking> {
  const res = await api.patch<Booking>(`/bookings/${id}/status`, { status })
  return res.data
}

export async function createPayment(
  bookingId: string,
  data: { amount: number; method: PaymentMethod; paidAt?: string; notes?: string },
) {
  const res = await api.post(`/bookings/${bookingId}/payment`, data)
  return res.data
}

export async function updatePayment(
  bookingId: string,
  data: { status: PaymentStatus; paidAt?: string; notes?: string },
) {
  const res = await api.patch(`/bookings/${bookingId}/payment`, data)
  return res.data
}

export async function getNotifications(): Promise<Booking[]> {
  const res = await api.get<Booking[]>('/bookings/notifications')
  return res.data
}
