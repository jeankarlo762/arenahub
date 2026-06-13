import { FastifyRequest, FastifyReply } from 'fastify'
import * as courtService from '../services/court.service'
import {
  createCourtSchema,
  updateCourtSchema,
  updateScheduleSchema,
  availabilityQuerySchema,
  courtFiltersSchema,
} from '../schemas/court.schema'

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const filters = courtFiltersSchema.parse(request.query)
  return reply.send(await courtService.listCourts(filters))
}

export async function getById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  return reply.send(await courtService.getCourt(request.params.id))
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const input = createCourtSchema.parse(request.body)
  return reply.status(201).send(await courtService.createCourt(input))
}

export async function update(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const input = updateCourtSchema.parse(request.body)
  return reply.send(await courtService.updateCourt(request.params.id, input))
}

export async function deactivate(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await courtService.deactivateCourt(request.params.id))
}

export async function getCurrentBooking(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await courtService.getCurrentBooking(request.params.id))
}

export async function getAvailability(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { date } = availabilityQuerySchema.parse(request.query)
  return reply.send(await courtService.getCourtAvailability(request.params.id, date))
}

export async function getSchedule(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await courtService.getCourtSchedule(request.params.id))
}

export async function updateSchedule(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const input = updateScheduleSchema.parse(request.body)
  return reply.send(await courtService.updateCourtSchedule(request.params.id, input))
}
