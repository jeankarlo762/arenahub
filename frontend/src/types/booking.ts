export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'TRANSFER'
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED'

export interface Payment {
  id: string
  bookingId: string
  amount: number
  method: PaymentMethod
  paidAt?: string
  status: PaymentStatus
  notes?: string
  createdAt: string
}

export interface Booking {
  id: string
  courtId: string
  court: { id: string; name: string; type?: string }
  customerName: string
  customerPhone: string
  customerEmail?: string
  date: string
  startTime: string
  endTime: string
  totalPrice: number
  status: BookingStatus
  notes?: string
  payment?: Payment
  createdAt: string
  updatedAt: string
}

export interface CreateBookingPayload {
  courtId: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  date: string
  startTime: string
  endTime: string
  totalPrice: number
  notes?: string
}
