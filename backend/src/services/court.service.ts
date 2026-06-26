import { prisma } from '../config/database'
import { CreateCourtInput, UpdateCourtInput, UpdateScheduleInput } from '../schemas/court.schema'
import { generateSlots, timeToMinutes } from '../utils/date'

export async function listCourts(filters: { active?: string; type?: string }) {
  const where: Record<string, unknown> = {}
  if (filters.active !== undefined) where.active = filters.active === 'true'
  if (filters.type) where.type = filters.type

  return prisma.court.findMany({
    where,
    include: {
      schedules: true,
      _count: { select: { bookings: true } },
    },
    orderBy: { name: 'asc' },
  })
}

export async function getCourt(id: string) {
  const court = await prisma.court.findUnique({
    where: { id },
    include: {
      schedules: { orderBy: { dayOfWeek: 'asc' } },
    },
  })

  if (!court) {
    throw Object.assign(new Error('Quadra não encontrada'), { statusCode: 404 })
  }

  return court
}

export async function createCourt(data: CreateCourtInput) {
  return prisma.court.create({ data })
}

export async function updateCourt(id: string, data: UpdateCourtInput) {
  await getCourt(id)
  return prisma.court.update({ where: { id }, data })
}

export async function deactivateCourt(id: string) {
  await getCourt(id)
  return prisma.court.update({ where: { id }, data: { active: false } })
}

export async function getCourtSchedule(courtId: string) {
  await getCourt(courtId)
  return prisma.schedule.findMany({
    where: { courtId },
    orderBy: { dayOfWeek: 'asc' },
  })
}

export async function updateCourtSchedule(courtId: string, input: UpdateScheduleInput) {
  await getCourt(courtId)

  return prisma.$transaction([
    prisma.schedule.deleteMany({ where: { courtId } }),
    prisma.schedule.createMany({ data: input.schedules.map((s) => ({ ...s, courtId })) }),
  ])
}

export async function getCurrentBooking(courtId: string) {
  await getCourt(courtId)

  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const today = `${y}-${m}-${d}`
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const startOfDay = new Date(`${today}T00:00:00`)
  const endOfDay = new Date(`${today}T23:59:59`)

  const booking = await prisma.booking.findFirst({
    where: {
      courtId,
      date: { gte: startOfDay, lte: endOfDay },
      status: 'CONFIRMED',
      startTime: { lte: currentTime },
      endTime: { gt: currentTime },
    },
    select: {
      id: true,
      customerName: true,
      startTime: true,
      endTime: true,
    },
  })

  return { booking, currentTime }
}

export async function getCourtAvailability(courtId: string, date: string, options: { publicMode?: boolean } = {}) {
  const court = await getCourt(courtId)

  const dateObj = new Date(date + 'T00:00:00')
  const dayOfWeek = dateObj.getDay()

  const schedule = await prisma.schedule.findFirst({
    where: { courtId, dayOfWeek, active: true },
  })

  if (!schedule) {
    return { available: false, reason: 'Quadra fechada neste dia', slots: [] }
  }

  const slotMinutes = court.slotMinutes
  const allSlots = generateSlots(schedule.openTime, schedule.closeTime, slotMinutes)

  const existingBookings = await prisma.booking.findMany({
    where: {
      courtId,
      date: new Date(date + 'T00:00:00'),
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
    select: { id: true, startTime: true, endTime: true, customerName: true, customerPhone: true },
  })

  // Check active rentals for this date
  const dateObj2 = new Date(date + 'T00:00:00')
  const activeRentals = await prisma.rental.findMany({
    where: {
      courtId,
      active: true,
      startDate: { lte: dateObj2 },
      OR: [{ endDate: null }, { endDate: { gte: dateObj2 } }],
    },
    select: { clientName: true, weekdays: true, slots: true },
  })
  const dayOfWeek2 = dateObj2.getDay()
  // Filter rentals matching today's weekday
  const todayRentals = activeRentals.filter((r) => {
    try {
      const wds: number[] = JSON.parse(r.weekdays)
      return wds.includes(dayOfWeek2)
    } catch {
      return false
    }
  })

  const slotsWithStatus = allSlots.map((slotStart) => {
    const slotStartMin = timeToMinutes(slotStart)
    const slotEndMin = slotStartMin + slotMinutes
    const endTime = `${String(Math.floor(slotEndMin / 60)).padStart(2, '0')}:${String(slotEndMin % 60).padStart(2, '0')}`

    const occupiedBy = existingBookings.find(
      (b) => slotStartMin < timeToMinutes(b.endTime) && slotEndMin > timeToMinutes(b.startTime),
    )

    if (!occupiedBy) {
      // Check if a rental covers this slot
      const rentedBy = todayRentals.find((r) => {
        try {
          const rSlots: { startTime: string; endTime: string }[] = JSON.parse(r.slots)
          return rSlots.some(
            (rs) => slotStartMin < timeToMinutes(rs.endTime) && slotEndMin > timeToMinutes(rs.startTime),
          )
        } catch {
          return false
        }
      })
      if (rentedBy) {
        return { startTime: slotStart, endTime, available: false, price: Number(court.pricePerSlot), rental: { clientName: rentedBy.clientName } }
      }
    }

    return {
      startTime: slotStart,
      endTime,
      available: !occupiedBy,
      price: Number(court.pricePerSlot),
      ...(occupiedBy ? {
        booking: {
          id: occupiedBy.id,
          customerName: occupiedBy.customerName,
          ...(options.publicMode ? {} : { customerPhone: occupiedBy.customerPhone }),
        },
      } : {}),
    }
  })

  return {
    available: true,
    court: { id: court.id, name: court.name },
    date,
    slotMinutes,
    pricePerSlot: Number(court.pricePerSlot),
    slots: slotsWithStatus,
  }
}
