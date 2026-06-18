import { FastifyRequest, FastifyReply } from 'fastify'
import * as settingsService from '../services/settings.service'
import { z } from 'zod'

const feeSchema = z.object({ feePercent: z.number().min(0).max(100) })

const brandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida').optional(),
  logoUrl: z.string().nullable().optional(),
  companyName: z.string().max(80).nullable().optional(),
})

export async function getPaymentFees(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send(await settingsService.getPaymentFees())
}

export async function upsertPaymentFee(
  request: FastifyRequest<{ Params: { method: string } }>,
  reply: FastifyReply,
) {
  const { feePercent } = feeSchema.parse(request.body)
  return reply.send(await settingsService.upsertPaymentFee(request.params.method, feePercent))
}

export async function getBranding(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send(await settingsService.getBranding())
}

export async function upsertBranding(request: FastifyRequest, reply: FastifyReply) {
  const data = brandingSchema.parse(request.body)
  return reply.send(await settingsService.upsertBranding(data))
}
