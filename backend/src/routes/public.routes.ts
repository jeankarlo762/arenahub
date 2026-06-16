import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database'
import * as courtsApi from '../services/court.service'
import { timesOverlap } from '../utils/date'

const publicBookingBodySchema = z.object({
  courtId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(1).max(20),
  customerEmail: z.string().email().optional().or(z.literal('')),
  notes: z.string().max(500).optional(),
})

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

    const availability = await courtsApi.getCourtAvailability(courtId, date, { publicMode: true })
    return reply.send(availability)
  })

  // POST /api/public/booking/:slug — create a booking without auth
  app.post('/booking/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string }

    let body: z.infer<typeof publicBookingBodySchema>
    try {
      body = publicBookingBodySchema.parse(request.body)
    } catch {
      return reply.status(400).send({ message: 'Dados inválidos' })
    }

    if (body.startTime >= body.endTime) {
      return reply.status(400).send({ message: 'Horário de início deve ser anterior ao término' })
    }

    const tenant = await prisma.tenant.findUnique({ where: { bookingSlug: slug }, select: { id: true, active: true } })
    if (!tenant || !tenant.active) return reply.status(404).send({ message: 'Não encontrado' })

    const court = await prisma.court.findFirst({ where: { id: body.courtId, tenantId: tenant.id, active: true } })
    if (!court) return reply.status(404).send({ message: 'Quadra não encontrada' })

    const totalPrice = Number(court.pricePerSlot)
    const bookingDate = new Date(body.date + 'T00:00:00')

    try {
      const booking = await prisma.$transaction(async (tx) => {
        const conflicts = await tx.booking.findMany({
          where: {
            courtId: body.courtId,
            date: bookingDate,
            status: { in: ['CONFIRMED', 'COMPLETED'] },
          },
          select: { startTime: true, endTime: true },
        })
        const hasConflict = conflicts.some((b) =>
          timesOverlap(body.startTime, body.endTime, b.startTime, b.endTime),
        )
        if (hasConflict) {
          throw Object.assign(new Error('Horário já reservado'), { statusCode: 409 })
        }

        return tx.booking.create({
          data: {
            tenantId: tenant.id,
            courtId: body.courtId,
            customerName: body.customerName,
            customerPhone: body.customerPhone,
            customerEmail: body.customerEmail || null,
            date: bookingDate,
            startTime: body.startTime,
            endTime: body.endTime,
            totalPrice,
            notes: body.notes,
            status: 'CONFIRMED',
          },
        })
      })

      return reply.status(201).send(booking)
    } catch (err: unknown) {
      const e = err as { code?: string; statusCode?: number; message?: string }
      if (e.code === 'P2034') {
        return reply.status(409).send({ message: 'Horário já reservado' })
      }
      return reply.status(e.statusCode ?? 500).send({ message: e.message ?? 'Erro interno' })
    }
  })
}
