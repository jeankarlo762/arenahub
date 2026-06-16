import { prisma } from '../config/database'
import { getTenantId } from '../config/tenant-context'
import { randomBytes } from 'crypto'

const PAYMENT_METHODS = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'TRANSFER']

export async function getPaymentFees() {
  const tenantId = getTenantId()
  const fees = tenantId ? await prisma.paymentFee.findMany({ where: { tenantId } }) : []
  return PAYMENT_METHODS.map((method) => ({
    method,
    feePercent: Number(fees.find((f) => f.method === method)?.feePercent ?? 0),
  }))
}

export async function getBookingSlug() {
  const tenantId = getTenantId()
  if (!tenantId) throw Object.assign(new Error('Arena não identificada'), { statusCode: 403 })
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { bookingSlug: true } })
  return { slug: tenant?.bookingSlug ?? null }
}

export async function setBookingSlug(slug?: string) {
  const tenantId = getTenantId()
  if (!tenantId) throw Object.assign(new Error('Arena não identificada'), { statusCode: 403 })
  const newSlug = slug?.trim() || randomBytes(6).toString('hex')
  try {
    await prisma.tenant.update({ where: { id: tenantId }, data: { bookingSlug: newSlug } })
    return { slug: newSlug }
  } catch (err: unknown) {
    const e = err as { code?: string }
    if (e.code === 'P2002') {
      throw Object.assign(new Error('Este slug já está em uso'), { statusCode: 409 })
    }
    throw err
  }
}

export async function upsertPaymentFee(method: string, feePercent: number) {
  if (!PAYMENT_METHODS.includes(method)) {
    throw Object.assign(new Error('Método inválido'), { statusCode: 400 })
  }
  const tenantId = getTenantId()
  if (!tenantId) {
    throw Object.assign(new Error('Arena não identificada'), { statusCode: 403 })
  }
  return prisma.paymentFee.upsert({
    where: { tenantId_method: { tenantId, method } },
    create: { tenantId, method, feePercent },
    update: { feePercent },
  })
}
