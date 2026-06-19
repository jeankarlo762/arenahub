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

    // Reject bookings for dates already in the past (UTC-date compare is
    // tolerant enough — customers can never book a clearly elapsed day).
    const todayStr = new Date().toISOString().slice(0, 10)
    if (body.date < todayStr) {
      return reply.status(400).send({ message: 'Não é possível agendar em uma data passada' })
    }

    const tenant = await prisma.tenant.findUnique({ where: { bookingSlug: slug }, select: { id: true, active: true } })
    if (!tenant || !tenant.active) return reply.status(404).send({ message: 'Não encontrado' })

    const court = await prisma.court.findFirst({ where: { id: body.courtId, tenantId: tenant.id, active: true } })
    if (!court) return reply.status(404).send({ message: 'Quadra não encontrada' })

    const totalPrice = Number(court.pricePerSlot)
    const bookingDate = new Date(body.date + 'T00:00:00')
    const dayOfWeek = bookingDate.getDay()

    try {
      const booking = await prisma.$transaction(async (tx) => {
        // 1) Court must be open on this weekday and the slot inside its hours
        const schedule = await tx.schedule.findFirst({
          where: { courtId: body.courtId, dayOfWeek, active: true },
        })
        if (!schedule) {
          throw Object.assign(new Error('Quadra fechada neste dia'), { statusCode: 400 })
        }
        if (body.startTime < schedule.openTime || body.endTime > schedule.closeTime) {
          throw Object.assign(new Error('Horário fora do funcionamento da quadra'), { statusCode: 400 })
        }

        // 2) Slot must not collide with an active fixed rental for this weekday
        const rentals = await tx.rental.findMany({
          where: {
            courtId: body.courtId,
            active: true,
            startDate: { lte: bookingDate },
            OR: [{ endDate: null }, { endDate: { gte: bookingDate } }],
          },
          select: { weekdays: true, slots: true },
        })
        const rentalConflict = rentals.some((r) => {
          let wds: number[] = []
          let rSlots: { startTime: string; endTime: string }[] = []
          try { wds = JSON.parse(r.weekdays); rSlots = JSON.parse(r.slots) } catch { return false }
          if (!wds.includes(dayOfWeek)) return false
          return rSlots.some((rs) => timesOverlap(body.startTime, body.endTime, rs.startTime, rs.endTime))
        })
        if (rentalConflict) {
          throw Object.assign(new Error('Horário reservado para locação fixa'), { statusCode: 409 })
        }

        // 3) Slot must not collide with another booking
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
