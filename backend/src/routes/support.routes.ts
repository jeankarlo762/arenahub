import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database'
import { authenticate } from '../middlewares/auth'

const createTicketSchema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(200),
  description: z.string().min(1, 'Descrição obrigatória').max(5000),
  attachmentBase64: z.string().optional().nullable(),
  attachmentName: z.string().optional().nullable(),
})

export async function supportRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.post('/tickets', async (req: FastifyRequest, reply: FastifyReply) => {
    const input = createTicketSchema.parse(req.body)

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, tenantId: true, tenant: { select: { name: true } } },
    })

    const ticket = await prisma.supportTicket.create({
      data: {
        tenantId: user?.tenantId ?? null,
        tenantName: user?.tenant?.name ?? null,
        userId: req.user.id,
        userName: user?.name ?? null,
        userEmail: user?.email ?? null,
        title: input.title,
        description: input.description,
        attachmentBase64: input.attachmentBase64 ?? null,
        attachmentName: input.attachmentName ?? null,
        status: 'OPEN',
      },
    })

    return reply.status(201).send(ticket)
  })
}
