export interface Schedule {
  id: string
  courtId: string
  dayOfWeek: number
  openTime: string
  closeTime: string
  active: boolean
}

export interface Court {
  id: string
  name: string
  type: string
  description?: string
  capacity?: number | null
  active: boolean
  imageUrl?: string
  pricePerSlot: number
  slotMinutes: number
  schedules: Schedule[]
  _count?: { bookings: number }
  createdAt: string
  updatedAt: string
}

export interface SlotBookingInfo {
  id: string
  customerName: string
  customerPhone: string
}

export interface AvailabilitySlot {
  startTime: string
  endTime: string
  available: boolean
  booking?: SlotBookingInfo
}

export interface CourtAvailability {
  available: boolean
  reason?: string
  court?: { id: string; name: string }
  date?: string
  slotMinutes?: number
  pricePerSlot?: number
  slots: AvailabilitySlot[]
}
