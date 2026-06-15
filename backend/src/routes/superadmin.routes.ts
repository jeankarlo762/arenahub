import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database'
import { authenticate, requireSuperAdmin } from '../middlewares/auth'
import { hashPassword } from '../utils/password'

const createTenantSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']).default('BASIC'),
  adminName: z.string().min(1, 'Nome do admin obrigatório'),
  adminEmail: z.string().email('Email do admin inválido'),
  adminPassword: z.string().min(6, 'Senha mínima 6 caracteres'),
})

export async function superAdminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireSuperAdmin)

  app.get('/tenants', async (_req: FastifyRequest, reply: FastifyReply) => {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(tenants)
  })

  app.post('/tenants', async (req: FastifyRequest, reply: FastifyReply) => {
    const input = createTenantSchema.parse(req.body)

    const existing = await prisma.tenant.findUnique({ where: { email: input.email } })
    if (existing) {
      return reply.status(409).send({ error: true, message: 'Email já cadastrado', code: 'CONFLICT' })
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        plan: input.plan,
      },
    })

    const passwordHash = await hashPassword(input.adminPassword)
    await prisma.user.create({
      data: {
        name: input.adminName,
        email: input.adminEmail,
        passwordHash,
        role: 'ADMIN',
      },
    })

    return reply.status(201).send(tenant)
  })

  app.patch<{ Params: { id: string } }>('/tenants/:id', async (req, reply: FastifyReply) => {
    const { active, plan } = z.object({
      active: z.boolean().optional(),
      plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']).optional(),
    }).parse(req.body)

    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data: { ...(active !== undefined && { active }), ...(plan && { plan }) },
    })
    return reply.send(tenant)
  })

  app.delete<{ Params: { id: string } }>('/tenants/:id', async (req, reply: FastifyReply) => {
    await prisma.tenant.delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })
}
