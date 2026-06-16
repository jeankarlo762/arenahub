import { prisma } from '../config/database'

interface DateRange {
  startDate?: string
  endDate?: string
  source?: string // 'courts' | 'bar' | 'rentals' | 'all'
}

function buildDateFilter(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return undefined
  const filter: Record<string, Date> = {}
  if (startDate) filter.gte = new Date(startDate + 'T00:00:00')
  if (endDate) {
    const end = new Date(endDate + 'T00:00:00')
    end.setDate(end.getDate() + 1)
    filter.lt = end
  }
  return filter
}

async function getCourtsSummary(startDate?: string, endDate?: string) {
  const dateFilter = buildDateFilter(startDate, endDate)
  const payments = await prisma.payment.findMany({
    where: dateFilter ? { createdAt: dateFilter } : undefined,
    include: { booking: { select: { status: true } } },
  })
  const total = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const received = payments.filter((p) => p.status === 'PAID').reduce((sum, p) => sum + Number(p.amount), 0)
  const pending = payments.filter((p) => p.status === 'PENDING').reduce((sum, p) => sum + Number(p.amount), 0)
  return { total, received, pending, paymentCount: payments.length }
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

async function getRentalRevenueSummary(startDate?: string, endDate?: string) {
  const periodStart = startDate ? new Date(startDate + 'T00:00:00') : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const periodEnd = endDate ? new Date(endDate + 'T23:59:59') : new Date()

  const rentals = await prisma.rental.findMany({ where: { active: true } })
  let revenue = 0

  for (const rental of rentals) {
    const rentalStart = rental.startDate > periodStart ? rental.startDate : periodStart
    const rentalEnd = rental.endDate ? (rental.endDate < periodEnd ? rental.endDate : periodEnd) : periodEnd
    if (rentalStart > rentalEnd) continue

    const weekdays: number[] = JSON.parse(rental.weekdays)
    const slots: { price: number }[] = JSON.parse(rental.slots)
    const slotRevenue = slots.reduce((s, sl) => s + (sl.price || 0), 0)

    for (const wd of weekdays) {
      revenue += countWeekdayOccurrences(wd, rentalStart, rentalEnd) * slotRevenue
    }
  }

  return { total: revenue, received: revenue, pending: 0, paymentCount: rentals.length }
}

async function getBarRevenueSummary(startDate?: string, endDate?: string) {
  const dateFilter = buildDateFilter(startDate, endDate)
  const orders = await prisma.barOrder.findMany({
    where: { status: 'CLOSED', ...(dateFilter ? { createdAt: dateFilter } : {}) },
    select: { total: true },
  })
  const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0)
  return { total: revenue, received: revenue, pending: 0, paymentCount: orders.length }
}

export async function getSummary({ startDate, endDate, source = 'courts' }: DateRange) {
  const bookingCount = await prisma.booking.count({
    where: startDate || endDate ? { createdAt: buildDateFilter(startDate, endDate) } : undefined,
  })

  if (source === 'bar') {
    const bar = await getBarRevenueSummary(startDate, endDate)
    return { ...bar, bookingCount }
  }

  if (source === 'rentals') {
    const rentals = await getRentalRevenueSummary(startDate, endDate)
    return { ...rentals, bookingCount }
  }

  if (source === 'all') {
    const [courts, bar, rentals] = await Promise.all([
      getCourtsSummary(startDate, endDate),
      getBarRevenueSummary(startDate, endDate),
      getRentalRevenueSummary(startDate, endDate),
    ])
    return {
      total: courts.total + bar.total + rentals.total,
      received: courts.received + bar.received + rentals.received,
      pending: courts.pending,
      paymentCount: courts.paymentCount + bar.paymentCount + rentals.paymentCount,
      bookingCount,
    }
  }

  // 'courts' (default)
  const courts = await getCourtsSummary(startDate, endDate)
  return { ...courts, bookingCount }
}

export async function getDailyRevenue({ startDate, endDate, days = 30, source = 'courts' }: DateRange & { days?: number }) {
  const end = endDate ? new Date(endDate + 'T00:00:00') : new Date()
  // endExclusive = start of the day AFTER endDate so we capture the full endDate
  const endExclusive = new Date(end.getTime() + 24 * 60 * 60 * 1000)
  const start = startDate
    ? new Date(startDate + 'T00:00:00')
    : new Date(end.getTime() - days * 24 * 60 * 60 * 1000)

  const dailyMap = new Map<string, number>()
  const cursor = new Date(start)
  while (cursor <= end) {
    dailyMap.set(cursor.toISOString().slice(0, 10), 0)
    cursor.setDate(cursor.getDate() + 1)
  }

  if (source !== 'bar') {
    const payments = await prisma.payment.findMany({
      where: { status: 'PAID', paidAt: { gte: start, lt: endExclusive } },
      select: { amount: true, paidAt: true },
    })
    for (const p of payments) {
      if (!p.paidAt) continue
      const key = p.paidAt.toISOString().slice(0, 10)
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(p.amount))
    }
  }

  if (source === 'bar' || source === 'all') {
    const orders = await prisma.barOrder.findMany({
      where: { status: 'CLOSED', createdAt: { gte: start, lt: endExclusive } },
      select: { total: true, createdAt: true },
    })
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10)
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(o.total))
    }
  }

  if (source === 'rentals' || source === 'all') {
    const rentals = await prisma.rental.findMany({ where: { active: true } })
    for (const rental of rentals) {
      const weekdays: number[] = JSON.parse(rental.weekdays)
      const slots: { price: number }[] = JSON.parse(rental.slots)
      const slotRevenue = slots.reduce((s, sl) => s + (sl.price || 0), 0)
      if (slotRevenue === 0) continue
      for (const [dateKey] of dailyMap) {
        const d = new Date(dateKey + 'T00:00:00')
        if (weekdays.includes(d.getDay())) {
          const rentalStart = rental.startDate
          const rentalEnd = rental.endDate ?? end
          if (d >= rentalStart && d <= rentalEnd) {
            dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + slotRevenue)
          }
        }
      }
    }
  }

  return Array.from(dailyMap.entries()).map(([date, revenue]) => ({ date, revenue }))
}

export async function getRevenueByCourt({ startDate, endDate }: DateRange) {
  const dateFilter = buildDateFilter(startDate, endDate)
  const payments = await prisma.payment.findMany({
    where: { status: 'PAID', ...(dateFilter ? { paidAt: dateFilter } : {}) },
    include: { booking: { include: { court: { select: { id: true, name: true } } } } },
  })
  const courtMap = new Map<string, { name: string; revenue: number; count: number }>()
  for (const p of payments) {
    const court = p.booking.court
    const existing = courtMap.get(court.id) ?? { name: court.name, revenue: 0, count: 0 }
    existing.revenue += Number(p.amount)
    existing.count += 1
    courtMap.set(court.id, existing)
  }
  return Array.from(courtMap.entries()).map(([id, data]) => ({ id, ...data }))
}

export async function getTransactions({ startDate, endDate }: DateRange) {
  const dateFilter = buildDateFilter(startDate, endDate)
  const transactions: Array<{
    id: string; date: string; type: 'court' | 'bar'; customerName: string;
    description: string; amount: number; method: string; status?: string
  }> = []

  // Court payments
  const payments = await prisma.payment.findMany({
    where: { status: 'PAID', ...(dateFilter ? { paidAt: dateFilter } : {}) },
    include: { booking: { include: { court: { select: { name: true } } } } },
    orderBy: { paidAt: 'desc' },
  })
  for (const p of payments) {
    transactions.push({
      id: p.id,
      date: (p.paidAt ?? p.createdAt).toISOString().slice(0, 10),
      type: 'court',
      customerName: p.booking.customerName,
      description: `Quadra ${p.booking.court.name} · ${p.booking.startTime}–${p.booking.endTime}`,
      amount: Number(p.amount),
      method: p.method,
      status: p.status,
    })
  }

  // Bar transactions (new model - after paidAmount feature)
  try {
    const barTx = await (prisma as unknown as { barTransaction: { findMany: (args: unknown) => Promise<unknown[]> } }).barTransaction.findMany({
      where: dateFilter ? { createdAt: dateFilter } : {},
      include: { order: { select: { customerName: true, number: true } } },
      orderBy: { createdAt: 'desc' },
    }) as Array<{ id: string; createdAt: Date; amount: number; paymentMethod: string; order: { customerName: string; number: number } }>
    for (const t of barTx) {
      transactions.push({
        id: t.id,
        date: t.createdAt.toISOString().slice(0, 10),
        type: 'bar',
        customerName: t.order.customerName,
        description: `Comanda #${t.order.number}`,
        amount: Number(t.amount),
        method: t.paymentMethod,
      })
    }
  } catch {
    // BarTransaction table may not exist yet — fall back to legacy CLOSED orders
    const orders = await prisma.barOrder.findMany({
      where: { status: 'CLOSED', ...(dateFilter ? { createdAt: dateFilter } : {}) },
      orderBy: { createdAt: 'desc' },
    })
    for (const o of orders) {
      transactions.push({
        id: o.id,
        date: o.createdAt.toISOString().slice(0, 10),
        type: 'bar',
        customerName: o.customerName,
        description: `Comanda #${o.number}`,
        amount: Number(o.total),
        method: o.paymentMethod ?? 'UNKNOWN',
      })
    }
  }

  // Sort all by date desc
  return transactions.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getRevenueByMethod({ startDate, endDate }: DateRange) {
  const dateFilter = buildDateFilter(startDate, endDate)
  const payments = await prisma.payment.findMany({
    where: { status: 'PAID', ...(dateFilter ? { paidAt: dateFilter } : {}) },
    select: { amount: true, method: true },
  })
  const methodMap = new Map<string, { revenue: number; count: number }>()
  for (const p of payments) {
    const existing = methodMap.get(p.method) ?? { revenue: 0, count: 0 }
    existing.revenue += Number(p.amount)
    existing.count += 1
    methodMap.set(p.method, existing)
  }
  return Array.from(methodMap.entries()).map(([method, data]) => ({ method, ...data }))
}
