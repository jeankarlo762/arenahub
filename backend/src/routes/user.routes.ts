import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database'
import { hashPassword } from '../utils/password'
import { authenticate, requireAdmin } from '../middlewares/auth'

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['ADMIN', 'OPERATOR']).default('OPERATOR'),
})

const updateUserSchema = z.object({
  active: z.boolean().optional(),
  name: z.string().optional(),
  role: z.enum(['ADMIN', 'OPERATOR']).optional(),
})

export async function userRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', { preHandler: [requireAdmin] }, async (_req: FastifyRequest, reply: FastifyReply) => {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true },
      orderBy: { name: 'asc' },
    })
    return reply.send(users)
  })

  app.post('/', { preHandler: [requireAdmin] }, async (req: FastifyRequest, reply: FastifyReply) => {
    const input = createUserSchema.parse(req.body)
    const existing = await prisma.user.findUnique({ where: { email: input.email } })
    if (existing) {
      reply.status(409).send({ error: true, message: 'Email já cadastrado', code: 'CONFLICT' })
      return
    }
    const passwordHash = await hashPassword(input.password)
    const user = await prisma.user.create({
      data: { name: input.name, email: input.email, passwordHash, role: input.role },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    })
    return reply.status(201).send(user)
  })

  app.patch<{ Params: { id: string } }>('/:id', { preHandler: [requireAdmin] }, async (req, reply: FastifyReply) => {
    const input = updateUserSchema.parse(req.body)
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: input,
      select: { id: true, name: true, email: true, role: true, active: true },
    })
    return reply.send(user)
  })
}
