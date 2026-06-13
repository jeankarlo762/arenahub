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
  if (!rental) throw Object.assign(new Error('Aluguel não encontrado'), { statusCode: 404 })
  return rental
}

export async function createRental(input: CreateRentalInput) {
  return prisma.rental.create({
    data: {
      courtId: input.courtId ?? null,
      clientId: input.clientId,
      clientName: input.clientName,
      weekdays: JSON.stringify(input.weekdays),
      slots: JSON.stringify(input.slots),
      startDate: new Date(input.startDate + 'T00:00:00'),
      endDate: input.endDate ? new Date(input.endDate + 'T00:00:00') : null,
      notes: input.notes,
    },
    include: {
      court: { select: { id: true, name: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
    },
  })
}

export async function updateRental(id: string, input: UpdateRentalInput) {
  await getRental(id)
  return prisma.rental.update({
    where: { id },
    data: {
      ...(input.courtId && { courtId: input.courtId }),
      ...(input.clientId !== undefined && { clientId: input.clientId }),
      ...(input.clientName && { clientName: input.clientName }),
      ...(input.weekdays && { weekdays: JSON.stringify(input.weekdays) }),
      ...(input.slots && { slots: JSON.stringify(input.slots) }),
      ...(input.startDate && { startDate: new Date(input.startDate + 'T00:00:00') }),
      ...(input.endDate !== undefined && { endDate: input.endDate ? new Date(input.endDate + 'T00:00:00') : null }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.active !== undefined && { active: input.active }),
    },
    include: {
      court: { select: { id: true, name: true } },
      client: { select: { id: true, firstName: true, lastName: true } },
    },
  })
}

export async function deleteRental(id: string) {
  await getRental(id)
  return prisma.rental.delete({ where: { id } })
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
