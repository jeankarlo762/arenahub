export interface RentalSlot {
  startTime: string
  endTime: string
  price: number
}

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
  notes?: string
  active: boolean
  createdAt: string
  updatedAt: string
}
