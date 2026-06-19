import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../config/database'
import { authenticate, requireAdmin } from '../middlewares/auth'

interface AuditQuery {
  page?: string
  pageSize?: string
  entity?: string
  action?: string
  search?: string
  startDate?: string
  endDate?: string
}

export async function auditRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.addHook('preHandler', requireAdmin)

  // GET /api/audit — paginated audit trail for the current tenant
  app.get('/', async (req: FastifyRequest<{ Querystring: AuditQuery }>, reply: FastifyReply) => {
    const q = req.query
    const page = Math.max(1, parseInt(q.page ?? '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize ?? '50', 10) || 50))

    // AuditLog is not a TENANT_MODEL, so scope it explicitly.
    const tenantId = req.user.tenantId
    const where: Record<string, unknown> = { tenantId }

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
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return reply.send({
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  })

  // GET /api/audit/entities — distinct entity types present (for filter dropdown)
  app.get('/entities', async (req: FastifyRequest, reply: FastifyReply) => {
    const rows = await prisma.auditLog.findMany({
      where: { tenantId: req.user.tenantId },
      distinct: ['entity'],
      select: { entity: true },
      orderBy: { entity: 'asc' },
    })
    return reply.send(rows.map((r) => r.entity))
  })
}
