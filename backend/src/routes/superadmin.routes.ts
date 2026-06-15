import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database'
import { authenticate, requireSuperAdmin } from '../middlewares/auth'
import { hashPassword } from '../utils/password'

// Monthly recurring revenue per plan (R$)
const PLAN_PRICES: Record<string, number> = {
  BASIC: 99,
  PRO: 199,
  ENTERPRISE: 399,
}

const createTenantSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  plan: z.enum(['BASIC', 'PRO', 'ENTERPRISE']).default('BASIC'),
  adminName: z.string().min(1, 'Nome do admin obrigatório'),
  adminEmail: z.string().email('Email do admin inválido'),
  adminPassword: z.string().min(6, 'Senha mínima 6 caracteres'),
})

const createTenantUserSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha mínima 6 caracteres'),
  role: z.enum(['ADMIN', 'OPERATOR']).default('OPERATOR'),
})

export async function superAdminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireSuperAdmin)

  // ---------- Tenants ----------
  app.get('/tenants', async (_req: FastifyRequest, reply: FastifyReply) => {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true } } },
    })
    return reply.send(tenants)
  })

  app.post('/tenants', async (req: FastifyRequest, reply: FastifyReply) => {
    const input = createTenantSchema.parse(req.body)

    const existingTenant = await prisma.tenant.findUnique({ where: { email: input.email } })
    if (existingTenant) {
      return reply.status(409).send({ error: true, message: 'Email da arena já cadastrado', code: 'CONFLICT' })
    }

    const existingUser = await prisma.user.findUnique({ where: { email: input.adminEmail } })
    if (existingUser) {
      return reply.status(409).send({ error: true, message: 'Email do admin já está em uso', code: 'CONFLICT' })
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
        tenantId: tenant.id,
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
    await prisma.user.deleteMany({ where: { tenantId: req.params.id } })
    await prisma.tenant.delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })

  // ---------- Tenant Users ----------
  app.get<{ Params: { id: string } }>('/tenants/:id/users', async (req, reply: FastifyReply) => {
    const users = await prisma.user.findMany({
      where: { tenantId: req.params.id },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(users)
  })

  app.post<{ Params: { id: string } }>('/tenants/:id/users', async (req, reply: FastifyReply) => {
    const input = createTenantUserSchema.parse(req.body)

    const tenant = await prisma.tenant.findUnique({ where: { id: req.params.id } })
    if (!tenant) {
      return reply.status(404).send({ error: true, message: 'Tenant não encontrado', code: 'NOT_FOUND' })
    }

    const existing = await prisma.user.findUnique({ where: { email: input.email } })
    if (existing) {
      return reply.status(409).send({ error: true, message: 'Email já está em uso', code: 'CONFLICT' })
    }

    const passwordHash = await hashPassword(input.password)
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        tenantId: tenant.id,
      },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    })
    return reply.status(201).send(user)
  })

  app.patch<{ Params: { id: string; userId: string } }>('/tenants/:id/users/:userId', async (req, reply: FastifyReply) => {
    const { active } = z.object({ active: z.boolean() }).parse(req.body)
    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: { active },
      select: { id: true, name: true, email: true, role: true, active: true },
    })
    return reply.send(user)
  })

  // ---------- Financeiro ----------
  app.get('/financial', async (_req: FastifyRequest, reply: FastifyReply) => {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const planCounts: Record<string, number> = { BASIC: 0, PRO: 0, ENTERPRISE: 0 }
    let mrr = 0
    let activeMrr = 0

    for (const t of tenants) {
      planCounts[t.plan] = (planCounts[t.plan] ?? 0) + 1
      const price = PLAN_PRICES[t.plan] ?? 0
      mrr += price
      if (t.active) activeMrr += price
    }

    const byPlan = (['BASIC', 'PRO', 'ENTERPRISE'] as const).map((plan) => ({
      plan,
      price: PLAN_PRICES[plan],
      count: planCounts[plan],
      revenue: PLAN_PRICES[plan] * planCounts[plan],
    }))

    const tenantsBilling = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      plan: t.plan,
      active: t.active,
      monthlyValue: PLAN_PRICES[t.plan] ?? 0,
    }))

    return reply.send({
      totalTenants: tenants.length,
      activeTenants: tenants.filter((t) => t.active).length,
      mrr,
      activeMrr,
      arr: activeMrr * 12,
      byPlan,
      tenants: tenantsBilling,
    })
  })
}
