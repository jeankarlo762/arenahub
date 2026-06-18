import { prisma } from '../config/database'
import { timesOverlap } from '../utils/date'
import {
  CreateBookingInput,
  UpdateBookingInput,
  CreatePaymentInput,
  UpdatePaymentInput,
} from '../schemas/booking.schema'

export async function listBookings(filters: {
  date?: string
  startDate?: string
  endDate?: string
  courtId?: string
  customerName?: string
  customerPhone?: string
  status?: string
  search?: string
}) {
  const where: Record<string, unknown> = {}

  if (filters.startDate && filters.endDate) {
    const start = new Date(filters.startDate + 'T00:00:00')
    const end = new Date(filters.endDate + 'T00:00:00')
    end.setDate(end.getDate() + 1)
    where.date = { gte: start, lt: end }
  } else if (filters.date) {
    const d = new Date(filters.date + 'T00:00:00')
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    where.date = { gte: d, lt: next }
  }

  if (filters.courtId) where.courtId = filters.courtId
  if (filters.status) where.status = filters.status

  // Full-text search across name and phone
  if (filters.search) {
    where.OR = [
      { customerName: { contains: filters.search } },
      { customerPhone: { contains: filters.search } },
    ]
  } else {
    if (filters.customerName) where.customerName = { contains: filters.customerName }
    if (filters.customerPhone) where.customerPhone = { contains: filters.customerPhone }
  }

  return prisma.booking.findMany({
    where,
    include: { court: { select: { id: true, name: true } }, payment: true },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  })
}

export async function getRecentBookings(tenantId: string | null) {
  const since = new Date()
  since.setHours(since.getHours() - 24)
  return prisma.booking.findMany({
    where: {
      ...(tenantId ? { tenantId } : {}),
      createdAt: { gte: since },
    },
    include: { court: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
}

export async function getBooking(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: {
      court: { select: { id: true, name: true, type: true } },
      payment: true,
    },
  })

  if (!booking) {
    throw Object.assign(new Error('Agendamento não encontrado'), { statusCode: 404 })
  }

  return booking
}

export async function createBooking(input: CreateBookingInput) {
  const court = await prisma.court.findUnique({ where: { id: input.courtId } })
  if (!court || !court.active) {
    throw Object.assign(new Error('Quadra não encontrada ou inativa'), { statusCode: 404 })
  }

  const bookingDate = new Date(input.date + 'T00:00:00')
  const dayOfWeek = bookingDate.getDay()

  const schedule = await prisma.schedule.findFirst({
    where: { courtId: input.courtId, dayOfWeek, active: true },
  })

  if (!schedule) {
    throw Object.assign(new Error('Quadra fechada neste dia'), { statusCode: 400 })
  }

  const conflicts = await prisma.booking.findMany({
    where: {
      courtId: input.courtId,
      date: bookingDate,
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
    select: { startTime: true, endTime: true },
  })

  const hasConflict = conflicts.some((b) =>
    timesOverlap(input.startTime, input.endTime, b.startTime, b.endTime),
  )

  if (hasConflict) {
    throw Object.assign(new Error('Horário já está ocupado'), { statusCode: 409 })
  }

  return prisma.booking.create({
    data: {
      courtId: input.courtId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail || null,
      date: bookingDate,
      startTime: input.startTime,
      endTime: input.endTime,
      totalPrice: input.totalPrice,
      notes: input.notes,
    },
    include: { court: { select: { id: true, name: true } } },
  })
}

export async function updateBooking(id: string, input: UpdateBookingInput) {
  await getBooking(id)
  return prisma.booking.update({ where: { id }, data: input })
}

export async function updateBookingStatus(id: string, status: string) {
  await getBooking(id)
  return prisma.booking.update({ where: { id }, data: { status: status as never } })
}

export async function createPayment(bookingId: string, input: CreatePaymentInput) {
  const booking = await getBooking(bookingId)

  if (booking.payment) {
    throw Object.assign(new Error('Pagamento já registrado para este agendamento'), { statusCode: 409 })
  }

  return prisma.payment.create({
    data: {
      bookingId,
      amount: input.amount,
      method: input.method,
      paidAt: input.paidAt ? new Date(input.paidAt) : null,
      status: input.paidAt ? 'PAID' : 'PENDING',
      notes: input.notes,
    },
  })
}

export async function updatePayment(bookingId: string, input: UpdatePaymentInput) {
  const booking = await getBooking(bookingId)

  if (!booking.payment) {
    throw Object.assign(new Error('Pagamento não encontrado'), { statusCode: 404 })
  }

  return prisma.payment.update({
    where: { bookingId },
    data: {
      status: input.status,
      paidAt: input.paidAt ? new Date(input.paidAt) : undefined,
      notes: input.notes,
    },
  })
}
