import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { prisma } from '../config/database'
import { authenticate, requireSuperAdmin } from '../middlewares/auth'
import { hashPassword } from '../utils/password'

const createTenantSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  phone: z.string().optional(),
  mrrValue: z.coerce.number().min(0).default(0),
  setupFee: z.coerce.number().min(0).default(0),
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
        mrrValue: input.mrrValue,
        setupFee: input.setupFee,
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
    const data = z.object({
      active: z.boolean().optional(),
      name: z.string().min(1).optional(),
      phone: z.string().optional(),
      mrrValue: z.coerce.number().min(0).optional(),
      setupFee: z.coerce.number().min(0).optional(),
    }).parse(req.body)

    const tenant = await prisma.tenant.update({
      where: { id: req.params.id },
      data,
    })
    return reply.send(tenant)
  })

  app.post<{ Params: { id: string } }>('/tenants/:id/booking-slug', async (req, reply: FastifyReply) => {
    const { slug } = req.body as { slug?: string }
    const finalSlug = (slug ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') || null
    try {
      const tenant = await prisma.tenant.update({
        where: { id: req.params.id },
        data: { bookingSlug: finalSlug },
      })
      return reply.send(tenant)
    } catch {
      return reply.status(409).send({ message: 'Slug já está em uso por outra arena' })
    }
  })

  app.delete<{ Params: { id: string } }>('/tenants/:id', async (req, reply: FastifyReply) => {
    await prisma.user.deleteMany({ where: { tenantId: req.params.id } })
    await prisma.tenant.delete({ where: { id: req.params.id } })
    return reply.status(204).send()
  })

  // ---------- Users (across all tenants) ----------
  app.get('/users', async (_req: FastifyRequest, reply: FastifyReply) => {
    const users = await prisma.user.findMany({
      where: { role: { not: 'SUPERADMIN' } },
      select: {
        id: true, name: true, email: true, role: true, active: true, createdAt: true,
        tenant: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      active: u.active,
      createdAt: u.createdAt,
      tenantId: u.tenant?.id ?? null,
      tenantName: u.tenant?.name ?? '—',
    })))
  })

  // Users of a specific tenant
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

  // Edit any tenant user
  app.patch<{ Params: { id: string } }>('/users/:id', async (req, reply: FastifyReply) => {
    const input = z.object({
      name: z.string().min(1).optional(),
      role: z.enum(['ADMIN', 'OPERATOR']).optional(),
      active: z.boolean().optional(),
      password: z.string().min(6).optional(),
    }).parse(req.body)

    const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } })
    if (!target || target.role === 'SUPERADMIN') {
      return reply.status(404).send({ error: true, message: 'Usuário não encontrado', code: 'NOT_FOUND' })
    }

    const data: Record<string, unknown> = {}
    if (input.name !== undefined) data.name = input.name
    if (input.role !== undefined) data.role = input.role
    if (input.active !== undefined) data.active = input.active
    if (input.password) data.passwordHash = await hashPassword(input.password)

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, active: true },
    })
    return reply.send(user)
  })

  // ---------- Financeiro ----------
  app.get<{ Querystring: { startDate?: string; endDate?: string } }>('/financial', async (req, reply: FastifyReply) => {
    const { startDate, endDate } = req.query

    const tenants = await prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } })

    // MRR is recurring (all active tenants). Setup revenue is one-time, counted
    // by tenant creation date — filtered by the requested period when provided.
    let start: Date | null = null
    let end: Date | null = null
    if (startDate) start = new Date(startDate + 'T00:00:00')
    if (endDate) { end = new Date(endDate + 'T00:00:00'); end.setDate(end.getDate() + 1) }

    const inPeriod = (d: Date) => (!start || d >= start) && (!end || d < end)

    let mrr = 0
    let setupRevenue = 0
    let newTenantsInPeriod = 0

    for (const t of tenants) {
      if (t.active) mrr += Number(t.mrrValue)
      if (inPeriod(t.createdAt)) {
        setupRevenue += Number(t.setupFee)
        newTenantsInPeriod += 1
      }
    }

    const tenantsBilling = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      active: t.active,
      mrrValue: Number(t.mrrValue),
      setupFee: Number(t.setupFee),
      createdAt: t.createdAt,
    }))

    return reply.send({
      totalTenants: tenants.length,
      activeTenants: tenants.filter((t) => t.active).length,
      mrr,
      arr: mrr * 12,
      setupRevenue,
      newTenantsInPeriod,
      tenants: tenantsBilling,
    })
  })
}
