import { prisma } from '../config/database'
import { getTenantId } from '../config/tenant-context'

const PAYMENT_METHODS = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'TRANSFER']

export async function getBranding() {
  const tenantId = getTenantId()
  if (!tenantId) return { primaryColor: '#f97316', logoUrl: null, companyName: null }
  const b = await prisma.tenantBranding.findUnique({ where: { tenantId } })
  return b ?? { primaryColor: '#f97316', logoUrl: null, companyName: null }
}

export async function upsertBranding(data: { primaryColor?: string; logoUrl?: string | null; companyName?: string | null }) {
  const tenantId = getTenantId()
  if (!tenantId) throw Object.assign(new Error('Arena não identificada'), { statusCode: 403 })
  return prisma.tenantBranding.upsert({
    where: { tenantId },
    create: { tenantId, ...data },
    update: data,
  })
}

export async function getPaymentFees() {
  const tenantId = getTenantId()
  const fees = tenantId ? await prisma.paymentFee.findMany({ where: { tenantId } }) : []
  return PAYMENT_METHODS.map((method) => ({
    method,
    feePercent: Number(fees.find((f) => f.method === method)?.feePercent ?? 0),
  }))
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
