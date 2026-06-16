import { FastifyRequest, FastifyReply } from 'fastify'
import * as settingsService from '../services/settings.service'
import { z } from 'zod'

const feeSchema = z.object({ feePercent: z.number().min(0).max(100) })
const slugSchema = z.object({ slug: z.string().min(3).max(60).regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífen').optional() })

export async function getBookingSlug(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send(await settingsService.getBookingSlug())
}

export async function setBookingSlug(request: FastifyRequest, reply: FastifyReply) {
  const { slug } = slugSchema.parse(request.body ?? {})
  return reply.send(await settingsService.setBookingSlug(slug))
}

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
