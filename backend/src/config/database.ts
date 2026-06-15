import { PrismaClient, Prisma } from '@prisma/client'
import { getTenantId } from './tenant-context'

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
  'Client',
  'Rental',
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
      args.where = { ...(args.where ?? {}), tenantId }
      args.create = { ...(args.create ?? {}), tenantId }
      break

    default:
      break
  }

  return next(params)
})

export { Prisma }
