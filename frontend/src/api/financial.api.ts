import api from './axios'
import type { FinancialSummary, DailyRevenue, RevenueItem } from '../types/financial'

type Source = 'courts' | 'bar' | 'all'

interface DateRange {
  startDate?: string
  endDate?: string
  source?: Source
}

export async function getSummary(params?: DateRange): Promise<FinancialSummary> {
  const res = await api.get<FinancialSummary>('/financial/summary', { params })
  return res.data
}

export async function getDailyRevenue(params?: DateRange & { days?: number }): Promise<DailyRevenue[]> {
  const res = await api.get<DailyRevenue[]>('/financial/daily', { params })
  return res.data
}

export async function getRevenueByCourt(params?: DateRange): Promise<RevenueItem[]> {
  const res = await api.get<RevenueItem[]>('/financial/by-court', { params })
  return res.data
}

export async function getRevenueByMethod(params?: DateRange): Promise<RevenueItem[]> {
  const res = await api.get<RevenueItem[]>('/financial/by-method', { params })
  return res.data
}

export interface FinancialTransaction {
  id: string
  date: string
  type: 'court' | 'bar'
  customerName: string
  description: string
  amount: number
  method: string
  status?: string
}

export async function getTransactions(params?: { startDate?: string; endDate?: string }): Promise<FinancialTransaction[]> {
  const res = await api.get<FinancialTransaction[]>('/financial/transactions', { params })
  return res.data
}
