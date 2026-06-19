import api from './axios'

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
