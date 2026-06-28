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
  modulesConfig: z.string().optional().nullable(),
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
        modulesConfig: input.modulesConfig ?? null,
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
      modulesConfig: z.string().nullable().optional(),
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
    const tenantId = req.params.id
    await prisma.$transaction([
      prisma.barOrderItem.deleteMany({ where: { tenantId } }),
      prisma.barTransaction.deleteMany({ where: { tenantId } }),
      prisma.barOrder.deleteMany({ where: { tenantId } }),
      prisma.barProduct.deleteMany({ where: { tenantId } }),
      prisma.barCategory.deleteMany({ where: { tenantId } }),
      prisma.payment.deleteMany({ where: { tenantId } }),
      prisma.booking.deleteMany({ where: { tenantId } }),
      prisma.tournamentTeam.deleteMany({ where: { tenantId } }),
      prisma.tournament.deleteMany({ where: { tenantId } }),
      prisma.rentalPayment.deleteMany({ where: { tenantId } }),
      prisma.rental.deleteMany({ where: { tenantId } }),
      prisma.schedule.deleteMany({ where: { tenantId } }),
      prisma.court.deleteMany({ where: { tenantId } }),
      prisma.paymentFee.deleteMany({ where: { tenantId } }),
      prisma.client.deleteMany({ where: { tenantId } }),
      prisma.player.deleteMany({ where: { tenantId } }),
      prisma.auditLog.deleteMany({ where: { tenantId } }),
      prisma.user.deleteMany({ where: { tenantId } }),
      prisma.tenantBranding.deleteMany({ where: { tenantId } }),
      prisma.tenant.delete({ where: { id: tenantId } }),
    ])
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

  // ---------- Master Key ----------
  // Senha mestra que permite o super admin acessar qualquer conta (suporte).
  app.get('/master-key', async (_req: FastifyRequest, reply: FastifyReply) => {
    const mk = await prisma.masterKey.findFirst({ orderBy: { createdAt: 'desc' } })
    return reply.send({ configured: !!mk, updatedAt: mk?.updatedAt ?? null })
  })

  app.put('/master-key', async (req: FastifyRequest, reply: FastifyReply) => {
    const { key } = z.object({ key: z.string().min(8, 'A senha mestra deve ter no mínimo 8 caracteres') }).parse(req.body)
    const keyHash = await hashPassword(key)
    await prisma.$transaction([
      prisma.masterKey.deleteMany({}),
      prisma.masterKey.create({ data: { keyHash, createdBy: req.user.id } }),
    ])
    return reply.send({ configured: true })
  })

  app.delete('/master-key', async (_req: FastifyRequest, reply: FastifyReply) => {
    await prisma.masterKey.deleteMany({})
    return reply.status(204).send()
  })

  // ---------- Suporte (tickets enviados pelos tenants) ----------
  app.get('/support/tickets', async (req: FastifyRequest<{ Querystring: {
    status?: string; page?: string; pageSize?: string
  } }>, reply: FastifyReply) => {
    const q = req.query
    const page = Math.max(1, parseInt(q.page ?? '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize ?? '20', 10) || 20))
    const where: Record<string, unknown> = {}
    if (q.status) where.status = q.status

    const [total, tickets] = await Promise.all([
      prisma.supportTicket.count({ where }),
      prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return reply.send({ tickets, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  })

  app.patch<{ Params: { id: string } }>('/support/tickets/:id', async (req, reply: FastifyReply) => {
    const { status } = z.object({
      status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
    }).parse(req.body)

    const ticket = await prisma.supportTicket.update({
      where: { id: req.params.id },
      data: { status },
    })
    return reply.send(ticket)
  })

  // ---------- Auditoria global (todas as arenas) ----------
  app.get('/audit', async (req: FastifyRequest<{ Querystring: {
    page?: string; pageSize?: string; tenantId?: string; entity?: string; action?: string; search?: string; startDate?: string; endDate?: string
  } }>, reply: FastifyReply) => {
    const q = req.query
    const page = Math.max(1, parseInt(q.page ?? '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize ?? '50', 10) || 50))

    const where: Record<string, unknown> = {}
    if (q.tenantId) where.tenantId = q.tenantId
    if (q.entity) where.entity = q.entity
    if (q.action) where.action = q.action
    if (q.search) {
      where.OR = [
        { userName: { contains: q.search } },
        { userEmail: { contains: q.search } },
        { summary: { contains: q.search } },
      ]
    }
    if (q.startDate || q.endDate) {
      where.createdAt = {
        ...(q.startDate ? { gte: new Date(q.startDate + 'T00:00:00') } : {}),
        ...(q.endDate ? { lte: new Date(q.endDate + 'T23:59:59') } : {}),
      }
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
    ])

    // Resolve tenant names for display
    const tenantIds = [...new Set(logs.map((l) => l.tenantId).filter((x): x is string => !!x))]
    const tenantsList = tenantIds.length
      ? await prisma.tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true } })
      : []
    const nameMap = new Map(tenantsList.map((t) => [t.id, t.name]))

    return reply.send({
      logs: logs.map((l) => ({ ...l, tenantName: l.tenantId ? (nameMap.get(l.tenantId) ?? '—') : '—' })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  })
}
