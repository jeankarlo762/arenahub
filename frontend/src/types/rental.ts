export interface RentalSlot {
  startTime: string
  endTime: string
  price: number
}

export type RentalPlan = '1M' | '3M' | '6M' | '12M' | 'CUSTOM'
export type RentalPaymentMethod = 'CASH' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER'
export type RentalPaymentFrequency = 'DAILY' | 'MONTHLY'

export interface RentalPayment {
  id: string
  rentalId: string
  dueDate: string
  amount: number
  status: 'PENDING' | 'PAID'
  paidAt?: string | null
}

export interface Rental {
  id: string
  courtId?: string
  court?: { id: string; name: string }
  clientId?: string
  client?: { id: string; firstName: string; lastName: string }
  clientName: string
  clientPhone?: string | null
  weekdays: number[]
  slots: RentalSlot[]
  startDate: string
  endDate?: string
  plan?: RentalPlan | null
  paymentMethod?: RentalPaymentMethod | null
  paymentDay?: number | null
  paymentFrequency?: RentalPaymentFrequency | null
  notes?: string
  active: boolean
  createdAt: string
  updatedAt: string
}
