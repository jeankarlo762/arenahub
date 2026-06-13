export interface FinancialSummary {
  total: number
  received: number
  pending: number
  bookingCount: number
  paymentCount: number
}

export interface DailyRevenue {
  date: string
  revenue: number
}

export interface RevenueItem {
  id?: string
  name?: string
  method?: string
  revenue: number
  count: number
}
