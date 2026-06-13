import { FastifyRequest, FastifyReply } from 'fastify'
import * as bookingService from '../services/booking.service'
import {
  createBookingSchema,
  updateBookingSchema,
  bookingStatusSchema,
  createPaymentSchema,
  updatePaymentSchema,
  bookingFiltersSchema,
} from '../schemas/booking.schema'

export async function list(request: FastifyRequest, reply: FastifyReply) {
  const filters = bookingFiltersSchema.parse(request.query)
  return reply.send(await bookingService.listBookings(filters))
}

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await bookingService.getBooking(request.params.id))
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const input = createBookingSchema.parse(request.body)
  return reply.status(201).send(await bookingService.createBooking(input))
}

export async function update(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const input = updateBookingSchema.parse(request.body)
  return reply.send(await bookingService.updateBooking(request.params.id, input))
}

export async function updateStatus(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { status } = bookingStatusSchema.parse(request.body)
  return reply.send(await bookingService.updateBookingStatus(request.params.id, status))
}

export async function createPayment(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const input = createPaymentSchema.parse(request.body)
  return reply.status(201).send(await bookingService.createPayment(request.params.id, input))
}

export async function updatePayment(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const input = updatePaymentSchema.parse(request.body)
  return reply.send(await bookingService.updatePayment(request.params.id, input))
}
