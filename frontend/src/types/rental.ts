export interface RentalSlot {
  startTime: string
  endTime: string
  price: number
}

export type RentalPlan = '1M' | '3M' | '6M' | '12M' | 'CUSTOM'
export type RentalPaymentMethod = 'CASH' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'TRANSFER'

export interface Rental {
  id: string
  courtId?: string
  court?: { id: string; name: string }
  clientId?: string
  client?: { id: string; firstName: string; lastName: string }
  clientName: string
  weekdays: number[]   // parsed from JSON string
  slots: RentalSlot[]  // parsed from JSON string
  startDate: string
  endDate?: string
  plan?: RentalPlan | null
  paymentMethod?: RentalPaymentMethod | null
  paymentDay?: number | null
  notes?: string
  active: boolean
  createdAt: string
  updatedAt: string
}
