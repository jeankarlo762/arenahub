import { prisma } from '../config/database'
import { CreateRentalInput, UpdateRentalInput } from '../schemas/rental.schema'

export async function listRentals(filters: {
  courtId?: string
  clientId?: string
  active?: string
  date?: string
}) {
  const where: Record<string, unknown> = {}
  if (filters.courtId) where.courtId = filters.courtId
  if (filters.clientId) where.clientId = filters.clientId
  if (filters.active !== undefined) where.active = filters.active === 'true'

  if (filters.date) {
    const d = new Date(filters.date + 'T00:00:00')
    where.startDate = { lte: d }
    where.OR = [{ endDate: null }, { endDate: { gte: d } }]
  }

  return prisma.rental.findMany({
    where,
    include: {
      court: { select: { id: true, name: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getRental(id: string) {
  const rental = await prisma.rental.findUnique({
    where: { id },
    include: {
      court: { select: { id: true, name: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
    },
  })
  if (!rental) throw Object.assign(new Error('Locação não encontrada'), { statusCode: 404 })
  return rental
}

function countWeekdayOccurrences(weekday: number, start: Date, end: Date): number {
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    if (cur.getDay() === weekday) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

async function generateRentalPayments(
  rentalId: string,
  input: {
    weekdays: number[]
    slots: { price: number }[]
    startDate: string
    endDate?: string
    paymentDay?: number | null
    paymentFrequency?: string | null
  }
) {
  if (input.weekdays.length === 0) return

  const slotRevenue = input.slots.reduce((s, sl) => s + (sl.price || 0), 0)
  const startDate = new Date(input.startDate + 'T00:00:00')
  const endDate = input.endDate
    ? new Date(input.endDate + 'T00:00:00')
    : new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate())

  const frequency = input.paymentFrequency ?? 'MONTHLY'
  const payments: { dueDate: Date; amount: number }[] = []

  if (frequency === 'DAILY') {
    const cur = new Date(startDate)
    while (cur <= endDate) {
      if (input.weekdays.includes(cur.getDay())) {
        payments.push({ dueDate: new Date(cur), amount: slotRevenue })
      }
      cur.setDate(cur.getDate() + 1)
    }
  } else {
    // MONTHLY — one payment per calendar month, dueDate always >= startDate
    const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    while (cur <= endDate) {
      const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0)
      const effectiveStart = cur > startDate ? cur : startDate
      const effectiveEnd = monthEnd < endDate ? monthEnd : endDate

      let monthAmount = 0
      for (const wd of input.weekdays) {
        monthAmount += countWeekdayOccurrences(wd, effectiveStart, effectiveEnd) * slotRevenue
      }

      const dueDay = input.paymentDay ?? 1
      const cappedDay = Math.min(dueDay, monthEnd.getDate())
      const dueDate = new Date(cur.getFullYear(), cur.getMonth(), cappedDay)

      // Only add payment if dueDate is on or after startDate
      if (dueDate >= startDate) {
        payments.push({ dueDate, amount: monthAmount })
      }

      cur.setMonth(cur.getMonth() + 1)
    }
  }

  if (payments.length > 0) {
    await prisma.rentalPayment.createMany({
      data: payments.map((p) => ({
        rentalId,
        dueDate: p.dueDate,
        amount: p.amount,
        status: 'PENDING',
      })),
    })
  }
}

export async function createRental(input: CreateRentalInput) {
  const rental = await prisma.rental.create({
    data: {
      courtId: input.courtId ?? null,
      clientId: input.clientId,
      clientName: input.clientName,
      clientPhone: input.clientPhone ?? null,
      weekdays: JSON.stringify(input.weekdays),
      slots: JSON.stringify(input.slots),
      startDate: new Date(input.startDate + 'T00:00:00'),
      endDate: input.endDate ? new Date(input.endDate + 'T00:00:00') : null,
      plan: input.plan ?? null,
      paymentMethod: input.paymentMethod ?? null,
      paymentDay: input.paymentDay ?? null,
      paymentFrequency: input.paymentFrequency ?? 'MONTHLY',
      notes: input.notes,
    },
    include: {
      court: { select: { id: true, name: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  await generateRentalPayments(rental.id, input)

  return rental
}

export async function updateRental(id: string, input: UpdateRentalInput) {
  await getRental(id)

  const updated = await prisma.rental.update({
    where: { id },
    data: {
      ...(input.courtId !== undefined && { courtId: input.courtId || null }),
      ...(input.clientId !== undefined && { clientId: input.clientId }),
      ...(input.clientName && { clientName: input.clientName }),
      ...(input.clientPhone !== undefined && { clientPhone: input.clientPhone ?? null }),
      ...(input.weekdays && { weekdays: JSON.stringify(input.weekdays) }),
      ...(input.slots && { slots: JSON.stringify(input.slots) }),
      ...(input.startDate && { startDate: new Date(input.startDate + 'T00:00:00') }),
      ...(input.endDate !== undefined && { endDate: input.endDate ? new Date(input.endDate + 'T00:00:00') : null }),
      ...(input.plan !== undefined && { plan: input.plan ?? null }),
      ...(input.paymentMethod !== undefined && { paymentMethod: input.paymentMethod ?? null }),
      ...(input.paymentDay !== undefined && { paymentDay: input.paymentDay ?? null }),
      ...(input.paymentFrequency !== undefined && { paymentFrequency: input.paymentFrequency ?? null }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.active !== undefined && { active: input.active }),
    },
    include: {
      court: { select: { id: true, name: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  // Regenerate payments when financial structure changes
  const needsRegen = input.weekdays || input.slots || input.startDate || input.endDate !== undefined
    || input.paymentFrequency !== undefined || input.paymentDay !== undefined
  if (needsRegen) {
    // Only delete PENDING payments — PAID payments represent real money received and must be preserved
    await prisma.rentalPayment.deleteMany({ where: { rentalId: id, status: 'PENDING' } })
    const full = await prisma.rental.findFirst({ where: { id } })
    if (full) {
      await generateRentalPayments(id, {
        weekdays: JSON.parse(full.weekdays),
        slots: JSON.parse(full.slots),
        startDate: full.startDate.toISOString().slice(0, 10),
        endDate: full.endDate?.toISOString().slice(0, 10),
        paymentDay: full.paymentDay,
        paymentFrequency: full.paymentFrequency,
      })
    }
  }

  return updated
}

export async function deleteRental(id: string) {
  await getRental(id)
  const paidCount = await prisma.rentalPayment.count({ where: { rentalId: id, status: 'PAID' } })
  if (paidCount > 0)
    throw Object.assign(
      new Error('Locação com pagamentos registrados não pode ser excluída. Desative-a.'),
      { statusCode: 409 },
    )
  return prisma.rental.delete({ where: { id } })
}

export async function listRentalPayments(rentalId: string) {
  const existing = await prisma.rentalPayment.findMany({
    where: { rentalId },
    orderBy: { dueDate: 'asc' },
  })

  // Backfill for rentals created before the payments system
  if (existing.length === 0) {
    const rental = await prisma.rental.findFirst({ where: { id: rentalId } })
    if (rental) {
      await generateRentalPayments(rentalId, {
        weekdays: JSON.parse(rental.weekdays),
        slots: JSON.parse(rental.slots),
        startDate: rental.startDate.toISOString().slice(0, 10),
        endDate: rental.endDate?.toISOString().slice(0, 10),
        paymentDay: rental.paymentDay,
        paymentFrequency: rental.paymentFrequency,
      })
      return prisma.rentalPayment.findMany({ where: { rentalId }, orderBy: { dueDate: 'asc' } })
    }
  }

  return existing
}

export async function toggleRentalPayment(paymentId: string, paid: boolean) {
  const updated = await prisma.rentalPayment.update({
    where: { id: paymentId },
    data: {
      status: paid ? 'PAID' : 'PENDING',
      paidAt: paid ? new Date() : null,
    },
  })

  // Auto-inactivate rental when all payments are paid
  if (paid) {
    const all = await prisma.rentalPayment.findMany({
      where: { rentalId: updated.rentalId },
      select: { status: true },
    })
    if (all.length > 0 && all.every(p => p.status === 'PAID')) {
      await prisma.rental.update({ where: { id: updated.rentalId }, data: { active: false } })
    }
  }

  return updated
}

export async function getOverdueRentalPayments() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return prisma.rentalPayment.findMany({
    where: { status: 'PENDING', dueDate: { lt: today } },
    include: {
      rental: { select: { id: true, clientName: true, active: true } },
    },
    orderBy: { dueDate: 'asc' },
    take: 20,
  })
}

export async function getRentalReport(startDate?: string, endDate?: string) {
  const allRentals = await prisma.rental.findMany({
    include: { court: { select: { id: true, name: true } } },
  })

  const periodStart = startDate ? new Date(startDate + 'T00:00:00') : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const periodEnd = endDate ? new Date(endDate + 'T23:59:59') : new Date()

  let totalEstimatedRevenue = 0
  const courtMap = new Map<string, { name: string; count: number; revenue: number }>()
  const weekdayCount: number[] = Array(7).fill(0)

  for (const rental of allRentals) {
    if (!rental.active) continue
    const rentalStart = rental.startDate > periodStart ? rental.startDate : periodStart
    const rentalEnd = rental.endDate ? (rental.endDate < periodEnd ? rental.endDate : periodEnd) : periodEnd
    if (rentalStart > rentalEnd) continue

    const weekdays: number[] = JSON.parse(rental.weekdays)
    const slots: { startTime: string; endTime: string; price: number }[] = JSON.parse(rental.slots)
    const slotRevenue = slots.reduce((s, sl) => s + (sl.price || 0), 0)

    for (const wd of weekdays) {
      const occurrences = countWeekdayOccurrences(wd, rentalStart, rentalEnd)
      totalEstimatedRevenue += occurrences * slotRevenue
      weekdayCount[wd] += occurrences
    }

    if (rental.courtId && rental.court) {
      const existing = courtMap.get(rental.courtId) ?? { name: rental.court.name, count: 0, revenue: 0 }
      existing.count += weekdays.length
      courtMap.set(rental.courtId, existing)
    }
  }

  const activeCount = allRentals.filter(r => r.active).length
  const inactiveCount = allRentals.filter(r => !r.active).length

  return {
    activeCount,
    inactiveCount,
    totalCount: allRentals.length,
    estimatedRevenue: totalEstimatedRevenue,
    topCourts: Array.from(courtMap.entries())
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    weekdayActivity: weekdayCount.map((count, day) => ({ day, count })),
  }
}

export async function getRentalsForDate(courtId: string, date: string) {
  const d = new Date(date + 'T00:00:00')
  return prisma.rental.findMany({
    where: {
      courtId,
      active: true,
      startDate: { lte: d },
      OR: [{ endDate: null }, { endDate: { gte: d } }],
    },
    select: { clientName: true, weekdays: true, slots: true },
  })
}
