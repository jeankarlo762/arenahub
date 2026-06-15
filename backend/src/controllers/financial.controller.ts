import { FastifyRequest, FastifyReply } from 'fastify'
import * as financialService from '../services/financial.service'
import { financialFiltersSchema, dailyRevenueSchema } from '../schemas/financial.schema'
import { z } from 'zod'

const sourceSchema = z.object({ source: z.enum(['courts', 'bar', 'all']).optional() })

export async function getSummary(request: FastifyRequest, reply: FastifyReply) {
  const filters = financialFiltersSchema.parse(request.query)
  const { source } = sourceSchema.parse(request.query)
  return reply.send(await financialService.getSummary({ ...filters, source }))
}

export async function getDaily(request: FastifyRequest, reply: FastifyReply) {
  const filters = dailyRevenueSchema.parse(request.query)
  const { source } = sourceSchema.parse(request.query)
  return reply.send(await financialService.getDailyRevenue({ ...filters, source }))
}

export async function getByCourt(request: FastifyRequest, reply: FastifyReply) {
  const filters = financialFiltersSchema.parse(request.query)
  return reply.send(await financialService.getRevenueByCourt(filters))
}

export async function getByMethod(request: FastifyRequest, reply: FastifyReply) {
  const filters = financialFiltersSchema.parse(request.query)
  return reply.send(await financialService.getRevenueByMethod(filters))
}

export async function getTransactions(request: FastifyRequest, reply: FastifyReply) {
  const filters = financialFiltersSchema.parse(request.query)
  return reply.send(await financialService.getTransactions(filters))
}
