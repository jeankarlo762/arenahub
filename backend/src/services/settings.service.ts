import { prisma } from '../config/database'

const PAYMENT_METHODS = ['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'TRANSFER']

export async function getPaymentFees() {
  const fees = await prisma.paymentFee.findMany()
  return PAYMENT_METHODS.map((method) => ({
    method,
    feePercent: Number(fees.find((f) => f.method === method)?.feePercent ?? 0),
  }))
}

export async function upsertPaymentFee(method: string, feePercent: number) {
  if (!PAYMENT_METHODS.includes(method)) {
    throw Object.assign(new Error('Método inválido'), { statusCode: 400 })
  }
  return prisma.paymentFee.upsert({
    where: { method },
    create: { method, feePercent },
    update: { feePercent },
  })
}
