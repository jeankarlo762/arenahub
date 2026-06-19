import { PrismaClient, Prisma } from '@prisma/client'
import { getTenantId, getUser } from './tenant-context'

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
})

// Models that are owned by a tenant and must be isolated. User, Tenant and
// PaymentFee are intentionally excluded (handled explicitly elsewhere).
const TENANT_MODELS = new Set<string>([
  'Court',
  'Schedule',
  'Booking',
  'Payment',
  'Tournament',
  'TournamentTeam',
  'BarProduct',
  'BarOrder',
  'BarOrderItem',
  'BarCategory',
  'Client',
  'Rental',
  'RentalPayment',
  'Player',
])

function delegateFor(model: string) {
  const key = model.charAt(0).toLowerCase() + model.slice(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as any)[key]
}

/**
 * Automatic tenant isolation. Every read/write on a tenant-owned model is
 * scoped to the current request's tenant (from AsyncLocalStorage). Requests
 * without a tenant context (login, superadmin, seed) pass through unscoped.
 *
 * Fail-closed: if a query forgets to filter, the tenant filter is injected
 * here, so cross-tenant data can never leak.
 */
prisma.$use(async (params, next) => {
  const tenantId = getTenantId()
  const model = params.model

  if (!tenantId || !model || !TENANT_MODELS.has(model)) {
    return next(params)
  }

  const action = params.action
  const args = params.args ?? (params.args = {})

  switch (action) {
    case 'findUnique':
    case 'findUniqueOrThrow':
      // findUnique only accepts unique fields in `where`; rewrite to findFirst
      // so we can add the tenant filter.
      params.action = action === 'findUnique' ? 'findFirst' : 'findFirstOrThrow'
      args.where = { ...(args.where ?? {}), tenantId }
      break

    case 'findFirst':
    case 'findFirstOrThrow':
    case 'findMany':
    case 'count':
    case 'aggregate':
    case 'groupBy':
    case 'updateMany':
    case 'deleteMany':
      args.where = { ...(args.where ?? {}), tenantId }
      break

    case 'create':
      args.data = { ...(args.data ?? {}), tenantId }
      break

    case 'createMany':
      if (Array.isArray(args.data)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        args.data = args.data.map((d: any) => ({ ...d, tenantId }))
      } else {
        args.data = { ...(args.data ?? {}), tenantId }
      }
      break

    case 'update':
    case 'delete': {
      // `where` is a unique selector, so we can't append tenantId to it.
      // Verify ownership first, then run the original operation untouched.
      const owned = await delegateFor(model).findFirst({
        where: { ...(args.where ?? {}), tenantId },
        select: { id: true },
      })
      if (!owned) {
        throw Object.assign(new Error('Registro não encontrado'), { statusCode: 404 })
      }
      break
    }

    case 'upsert':
      // where must remain a unique selector — do not inject tenantId into it
      args.create = { ...(args.create ?? {}), tenantId }
      break

    default:
      break
  }

  return next(params)
})

// ─── Audit trail ───────────────────────────────────────────────────────────
// Records every create/update/delete on business models, capturing who did it
// (from the request context), what, where (entity) and when. Best-effort: a
// failure to write the audit log never breaks the original operation.

const AUDITABLE_MODELS = new Set<string>([
  'Court', 'Schedule', 'Booking', 'Payment', 'Tournament', 'TournamentTeam',
  'BarProduct', 'BarOrder', 'BarOrderItem', 'BarCategory', 'BarTransaction',
  'Client', 'Rental', 'RentalPayment', 'Player', 'User', 'Tenant', 'PaymentFee',
])

const ENTITY_LABELS: Record<string, string> = {
  Court: 'Quadra', Schedule: 'Horário', Booking: 'Agendamento', Payment: 'Pagamento',
  Tournament: 'Torneio', TournamentTeam: 'Time de torneio', BarProduct: 'Produto do bar',
  BarOrder: 'Comanda', BarOrderItem: 'Item de comanda', BarCategory: 'Categoria do bar',
  BarTransaction: 'Transação do bar', Client: 'Cliente', Rental: 'Locação',
  RentalPayment: 'Pagamento de locação', Player: 'Jogador', User: 'Usuário',
  Tenant: 'Arena', PaymentFee: 'Taxa de pagamento',
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'criou', UPDATE: 'editou', DELETE: 'excluiu',
  UPDATE_MANY: 'editou em lote', DELETE_MANY: 'excluiu em lote', UPSERT: 'salvou',
}

function auditActionFor(action: string): string | null {
  switch (action) {
    case 'create':
    case 'createMany': return 'CREATE'
    case 'update': return 'UPDATE'
    case 'delete': return 'DELETE'
    case 'updateMany': return 'UPDATE_MANY'
    case 'deleteMany': return 'DELETE_MANY'
    case 'upsert': return 'UPSERT'
    default: return null
  }
}

prisma.$use(async (params, next) => {
  const result = await next(params)

  const model = params.model
  const auditAction = model ? auditActionFor(params.action) : null
  if (!model || model === 'AuditLog' || !auditAction || !AUDITABLE_MODELS.has(model)) {
    return result
  }

  try {
    const user = getUser()
    const tenantId = getTenantId() ?? null
    const entityLabel = ENTITY_LABELS[model] ?? model

    // Extract the affected record id when available
    let entityId: string | null = null
    const r = result as { id?: string; count?: number } | null
    if (r && typeof r === 'object' && 'id' in r && typeof r.id === 'string') {
      entityId = r.id
    }

    const who = user?.name ?? 'Sistema'
    const verb = ACTION_LABELS[auditAction] ?? auditAction.toLowerCase()
    const countSuffix = r && typeof r === 'object' && typeof r.count === 'number' ? ` (${r.count} registro(s))` : ''
    const summary = `${who} ${verb} ${entityLabel}${countSuffix}`

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: user?.id ?? null,
        userName: user?.name ?? null,
        userEmail: user?.email ?? null,
        userRole: user?.role ?? null,
        action: auditAction,
        entity: model,
        entityId,
        summary,
      },
    })
  } catch {
    // Never let an audit failure break the real operation
  }

  return result
})

export { Prisma }
