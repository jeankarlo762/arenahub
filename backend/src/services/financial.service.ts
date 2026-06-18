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

async function getRentalRevenueSummary(startDate?: string, endDate?: string) {
  const dateFilter = startDate || endDate ? buildDateFilter(startDate, endDate) : undefined
  const paidPayments = await prisma.rentalPayment.findMany({
    where: { status: 'PAID', ...(dateFilter ? { paidAt: dateFilter } : {}) },
    select: { amount: true },
  })
  const pendingPayments = await prisma.rentalPayment.findMany({
    where: { status: 'PENDING', ...(dateFilter ? { dueDate: dateFilter } : {}) },
    select: { amount: true },
  })
  const received = paidPayments.reduce((s, p) => s + Number(p.amount), 0)
  const pending = pendingPayments.reduce((s, p) => s + Number(p.amount), 0)
  return { total: received + pending, received, pending, paymentCount: paidPayments.length + pendingPayments.length }
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
    const rentalPayments = await prisma.rentalPayment.findMany({
      where: { status: 'PAID', paidAt: { gte: start, lt: endExclusive } },
      select: { amount: true, paidAt: true },
    })
    for (const p of rentalPayments) {
      if (!p.paidAt) continue
      const key = p.paidAt.toISOString().slice(0, 10)
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(p.amount))
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

export async function getRevenueByMethod({ startDate, endDate, source = 'courts' }: DateRange) {
  const dateFilter = buildDateFilter(startDate, endDate)
  const methodMap = new Map<string, { revenue: number; count: number }>()
  const add = (method: string, amount: number, count = 1) => {
    const key = method || 'UNKNOWN'
    const existing = methodMap.get(key) ?? { revenue: 0, count: 0 }
    existing.revenue += amount
    existing.count += count
    methodMap.set(key, existing)
  }

  // Court payments
  if (source === 'courts' || source === 'all') {
    const payments = await prisma.payment.findMany({
      where: { status: 'PAID', ...(dateFilter ? { paidAt: dateFilter } : {}) },
      select: { amount: true, method: true },
    })
    for (const p of payments) add(p.method, Number(p.amount))
  }

  // Bar payments (per-transaction model, fallback to legacy CLOSED orders)
  if (source === 'bar' || source === 'all') {
    try {
      const barTx = await (prisma as unknown as { barTransaction: { findMany: (args: unknown) => Promise<unknown[]> } }).barTransaction.findMany({
        where: dateFilter ? { createdAt: dateFilter } : {},
        select: { amount: true, paymentMethod: true },
      }) as Array<{ amount: number; paymentMethod: string }>
      for (const t of barTx) add(t.paymentMethod, Number(t.amount))
    } catch {
      const orders = await prisma.barOrder.findMany({
        where: { status: 'CLOSED', ...(dateFilter ? { createdAt: dateFilter } : {}) },
        select: { total: true, paymentMethod: true },
      })
      for (const o of orders) add(o.paymentMethod ?? 'UNKNOWN', Number(o.total))
    }
  }

  // Rentals — only count PAID RentalPayment records, grouped by rental.paymentMethod
  if (source === 'rentals' || source === 'all') {
    const rentalPayments = await prisma.rentalPayment.findMany({
      where: { status: 'PAID', ...(dateFilter ? { paidAt: dateFilter } : {}) },
      include: { rental: { select: { paymentMethod: true } } },
    })
    for (const p of rentalPayments) {
      add(p.rental.paymentMethod ?? 'UNKNOWN', Number(p.amount))
    }
  }

  return Array.from(methodMap.entries()).map(([method, data]) => ({ method, ...data }))
}
