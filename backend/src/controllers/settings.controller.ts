import { FastifyRequest, FastifyReply } from 'fastify'
import * as settingsService from '../services/settings.service'
import { z } from 'zod'

const feeSchema = z.object({ feePercent: z.number().min(0).max(100) })

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
