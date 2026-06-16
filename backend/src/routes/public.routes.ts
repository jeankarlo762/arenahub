import { FastifyInstance } from 'fastify'
import { prisma } from '../config/database'
import * as courtsApi from '../services/court.service'

export async function publicRoutes(app: FastifyInstance) {
  // GET /api/public/booking/:slug — tenant info + courts for self-booking page
  app.get('/booking/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const tenant = await prisma.tenant.findUnique({
      where: { bookingSlug: slug },
      select: { id: true, name: true, active: true },
    })
    if (!tenant || !tenant.active) return reply.status(404).send({ message: 'Página não encontrada' })

    const courts = await prisma.court.findMany({
      where: { tenantId: tenant.id, active: true },
      select: { id: true, name: true, type: true, pricePerSlot: true, slotMinutes: true, imageUrl: true, description: true },
      orderBy: { name: 'asc' },
    })

    return reply.send({ tenant: { name: tenant.name }, courts })
  })

  // GET /api/public/booking/:slug/availability — available slots for a court on a date
  app.get('/booking/:slug/availability', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const { courtId, date } = request.query as { courtId?: string; date?: string }

    if (!courtId || !date) return reply.status(400).send({ message: 'courtId e date são obrigatórios' })

    const tenant = await prisma.tenant.findUnique({ where: { bookingSlug: slug }, select: { id: true, active: true } })
    if (!tenant || !tenant.active) return reply.status(404).send({ message: 'Não encontrado' })

    const court = await prisma.court.findFirst({ where: { id: courtId, tenantId: tenant.id, active: true } })
    if (!court) return reply.status(404).send({ message: 'Quadra não encontrada' })

    const availability = await courtsApi.getCourtAvailability(courtId, date)
    return reply.send(availability)
  })

  // POST /api/public/booking/:slug — create a booking without auth
  app.post('/booking/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }
    const body = request.body as {
      courtId: string
      date: string
      startTime: string
      endTime: string
      customerName: string
      customerPhone: string
      customerEmail?: string
      totalPrice: number
      notes?: string
    }

    const tenant = await prisma.tenant.findUnique({ where: { bookingSlug: slug }, select: { id: true, active: true } })
    if (!tenant || !tenant.active) return reply.status(404).send({ message: 'Não encontrado' })

    const court = await prisma.court.findFirst({ where: { id: body.courtId, tenantId: tenant.id, active: true } })
    if (!court) return reply.status(404).send({ message: 'Quadra não encontrada' })

    // Check for conflicts
    const conflict = await prisma.booking.findFirst({
      where: {
        courtId: body.courtId,
        date: new Date(body.date + 'T00:00:00'),
        startTime: body.startTime,
        status: { in: ['CONFIRMED', 'COMPLETED'] },
      },
    })
    if (conflict) return reply.status(409).send({ message: 'Horário já reservado' })

    const booking = await prisma.booking.create({
      data: {
        tenantId: tenant.id,
        courtId: body.courtId,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail ?? null,
        date: new Date(body.date + 'T00:00:00'),
        startTime: body.startTime,
        endTime: body.endTime,
        totalPrice: body.totalPrice,
        notes: body.notes,
        status: 'CONFIRMED',
      },
    })

    return reply.status(201).send(booking)
  })
}
