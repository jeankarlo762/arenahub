import { prisma } from '../config/database'
import { getTenantId } from '../config/tenant-context'
import { randomBytes } from 'crypto'

export const DEFAULT_WHATSAPP_TEMPLATE =
  `✅ *Agendamento confirmado!*\n\n` +
  `Olá, *{nome}*! Seu agendamento foi realizado com sucesso.\n\n` +
  `🏟️ *Arena:* {arena}\n` +
  `🎾 *Quadra:* {quadra}\n` +
  `📅 *Data:* {data}\n` +
  `⏰ *Horário:* {horario}\n` +
  `💰 *Total:* R$ {total}\n\n` +
  `Qualquer dúvida, entre em contato com a arena. Até lá! 👋`

export const DEFAULT_WHATSAPP_REMINDER_TEMPLATE =
  `⏰ *Lembrete de agendamento*\n\n` +
  `Olá, *{nome}*! Passando para lembrar do seu horário:\n\n` +
  `🏟️ *Arena:* {arena}\n` +
  `🎾 *Quadra:* {quadra}\n` +
  `📅 *Data:* {data}\n` +
  `⏰ *Horário:* {horario}\n\n` +
  `Te esperamos! 👋`

export const DEFAULT_WHATSAPP_OWNER_TEMPLATE =
  `🔔 *Novo agendamento!*\n\n` +
  `Uma nova reserva foi feita pelo link de agendamento:\n\n` +
  `👤 *Cliente:* {nome}\n` +
  `🎾 *Quadra:* {quadra}\n` +
  `📅 *Data:* {data}\n` +
  `⏰ *Horário:* {horario}\n` +
  `💰 *Total:* R$ {total}`

// Substitui as variáveis {nome}/{arena}/{quadra}/{data}/{horario}/{total} no template.
export function fillWhatsAppTemplate(
  template: string,
  vars: { nome: string; arena: string; quadra: string; data: string; horario: string; total: string },
): string {
  return template
    .replace(/\{nome\}/g, vars.nome)
    .replace(/\{arena\}/g, vars.arena)
    .replace(/\{quadra\}/g, vars.quadra)
    .replace(/\{data\}/g, vars.data)
    .replace(/\{horario\}/g, vars.horario)
    .replace(/\{total\}/g, vars.total)
}

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

export async function getWhatsAppConfig() {
  const tenantId = getTenantId()
  const b = tenantId
    ? await prisma.tenantBranding.findUnique({
        where: { tenantId },
        select: {
          whatsappTemplate: true,
          whatsappReminderTemplate: true,
          whatsappOwnerTemplate: true,
          whatsappOwnerNumber: true,
        },
      })
    : null
  return {
    confirmation: b?.whatsappTemplate ?? DEFAULT_WHATSAPP_TEMPLATE,
    reminder: b?.whatsappReminderTemplate ?? DEFAULT_WHATSAPP_REMINDER_TEMPLATE,
    owner: b?.whatsappOwnerTemplate ?? DEFAULT_WHATSAPP_OWNER_TEMPLATE,
    ownerNumber: b?.whatsappOwnerNumber ?? '',
  }
}

export async function setWhatsAppConfig(data: {
  confirmation?: string
  reminder?: string
  owner?: string
  ownerNumber?: string
}) {
  const tenantId = getTenantId()
  if (!tenantId) throw Object.assign(new Error('Arena não identificada'), { statusCode: 403 })
  const update: Record<string, string> = {}
  if (data.confirmation !== undefined) update.whatsappTemplate = data.confirmation
  if (data.reminder !== undefined) update.whatsappReminderTemplate = data.reminder
  if (data.owner !== undefined) update.whatsappOwnerTemplate = data.owner
  if (data.ownerNumber !== undefined) update.whatsappOwnerNumber = data.ownerNumber
  await prisma.tenantBranding.upsert({
    where: { tenantId },
    create: { tenantId, ...update },
    update,
  })
  return getWhatsAppConfig()
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
