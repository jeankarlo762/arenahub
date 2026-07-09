import api from './axios'
import type { BrandingData } from '../store/branding.store'

export interface PaymentFee {
  method: string
  feePercent: number
}

export async function getPaymentFees(): Promise<PaymentFee[]> {
  const res = await api.get<PaymentFee[]>('/settings/payment-fees')
  return res.data
}

export async function upsertPaymentFee(method: string, feePercent: number): Promise<PaymentFee> {
  const res = await api.put<PaymentFee>(`/settings/payment-fees/${method}`, { feePercent })
  return res.data
}

export async function getBranding(): Promise<BrandingData> {
  const res = await api.get<BrandingData>('/settings/branding')
  return res.data
}

export async function upsertBranding(data: Partial<BrandingData>): Promise<BrandingData> {
  const res = await api.put<BrandingData>('/settings/branding', data)
  return res.data
}

export interface DayHours {
  dayOfWeek: number
  openTime: string
  closeTime: string
  active: boolean
}

export async function getBusinessHours(): Promise<DayHours[]> {
  const res = await api.get<DayHours[]>('/settings/business-hours')
  return res.data
}

export async function saveBusinessHours(hours: DayHours[]): Promise<DayHours[]> {
  const res = await api.put<DayHours[]>('/settings/business-hours', { hours })
  return res.data
}
