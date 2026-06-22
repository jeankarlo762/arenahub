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
