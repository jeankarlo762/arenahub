import { prisma } from '../config/database'
import { CreateClientInput, UpdateClientInput } from '../schemas/client.schema'

export async function listClients(search?: string) {
  return prisma.client.findMany({
    where: search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : undefined,
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  })
}

export async function getClient(id: string) {
  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) throw Object.assign(new Error('Cliente não encontrado'), { statusCode: 404 })
  return client
}

export async function createClient(input: CreateClientInput) {
  return prisma.client.create({ data: input })
}

export async function updateClient(id: string, input: UpdateClientInput) {
  await getClient(id)
  return prisma.client.update({ where: { id }, data: input })
}

export async function deleteClient(id: string) {
  await getClient(id)
  const activeRentals = await prisma.rental.count({ where: { clientId: id, active: true } })
  if (activeRentals > 0)
    throw Object.assign(new Error('Cliente possui locações ativas e não pode ser excluído'), { statusCode: 409 })
  return prisma.client.delete({ where: { id } })
}

export async function getClientHistory(id: string) {
  const client = await getClient(id)

  // Match bookings by phone or name
  const nameQuery = `${client.firstName} ${client.lastName}`
  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        ...(client.phone ? [{ customerPhone: client.phone }] : []),
        { customerName: { contains: nameQuery } },
      ],
    },
    include: { court: { select: { name: true } } },
    orderBy: { date: 'desc' },
    take: 50,
  })

  // Match bar orders by name
  const orders = await prisma.barOrder.findMany({
    where: { customerName: { contains: nameQuery } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const totalBookings = bookings.filter((b) => b.status !== 'CANCELLED').reduce((s, b) => s + Number(b.totalPrice), 0)
  const totalOrders = orders.filter((o) => o.status === 'CLOSED').reduce((s, o) => s + Number(o.total), 0)

  return {
    client,
    bookings: bookings.map((b) => ({
      id: b.id,
      date: b.date.toISOString().slice(0, 10),
      startTime: b.startTime,
      endTime: b.endTime,
      courtName: b.court.name,
      totalPrice: Number(b.totalPrice),
      status: b.status,
    })),
    orders: orders.map((o) => ({
      id: o.id,
      number: o.number,
      total: Number(o.total),
      paymentMethod: o.paymentMethod,
      createdAt: o.createdAt.toISOString().slice(0, 10),
      status: o.status,
    })),
    totalSpent: totalBookings + totalOrders,
    totalBookings: bookings.length,
    totalOrders: orders.length,
  }
}
