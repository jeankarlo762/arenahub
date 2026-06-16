import { FastifyRequest, FastifyReply } from 'fastify'
import * as rentalService from '../services/rental.service'
import { createRentalSchema, updateRentalSchema, rentalFiltersSchema } from '../schemas/rental.schema'

export async function listRentals(request: FastifyRequest, reply: FastifyReply) {
  const filters = rentalFiltersSchema.parse(request.query)
  return reply.send(await rentalService.listRentals(filters))
}

export async function getRental(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  return reply.send(await rentalService.getRental(request.params.id))
}

export async function createRental(request: FastifyRequest, reply: FastifyReply) {
  const input = createRentalSchema.parse(request.body)
  return reply.status(201).send(await rentalService.createRental(input))
}

export async function updateRental(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const input = updateRentalSchema.parse(request.body)
  return reply.send(await rentalService.updateRental(request.params.id, input))
}

export async function deleteRental(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  await rentalService.deleteRental(request.params.id)
  return reply.status(204).send()
}

export async function getRentalReport(request: FastifyRequest, reply: FastifyReply) {
  const { startDate, endDate } = request.query as { startDate?: string; endDate?: string }
  return reply.send(await rentalService.getRentalReport(startDate, endDate))
}
