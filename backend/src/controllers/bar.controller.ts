import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import * as barService from '../services/bar.service'
import {
  createProductSchema,
  updateProductSchema,
  createOrderSchema,
  updateOrderSchema,
  orderStatusSchema,
  addItemSchema,
  orderFiltersSchema,
} from '../schemas/bar.schema'

const createCategorySchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
})

// Products
export async function listProducts(request: FastifyRequest, reply: FastifyReply) {
  const { active } = (request.query as { active?: string })
  const activeOnly = active === 'true' ? true : active === 'false' ? false : undefined
  return reply.send(await barService.listProducts(activeOnly))
}

export async function createProduct(request: FastifyRequest, reply: FastifyReply) {
  const input = createProductSchema.parse(request.body)
  return reply.status(201).send(await barService.createProduct(input))
}

export async function updateProduct(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const input = updateProductSchema.parse(request.body)
  return reply.send(await barService.updateProduct(request.params.id, input))
}

export async function deleteProduct(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await barService.deleteProduct(request.params.id))
}

// Orders
export async function listOrders(request: FastifyRequest, reply: FastifyReply) {
  const { status } = orderFiltersSchema.parse(request.query)
  return reply.send(await barService.listOrders(status))
}

export async function getOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await barService.getOrder(request.params.id))
}

export async function createOrder(request: FastifyRequest, reply: FastifyReply) {
  const input = createOrderSchema.parse(request.body)
  return reply.status(201).send(await barService.createOrder(input))
}

export async function updateOrder(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const input = updateOrderSchema.parse(request.body)
  return reply.send(await barService.updateOrder(request.params.id, input))
}

export async function updateOrderStatus(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { status, paymentMethod } = orderStatusSchema.parse(request.body)
  return reply.send(await barService.updateOrderStatus(request.params.id, status, paymentMethod))
}

export async function addItem(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const input = addItemSchema.parse(request.body)
  return reply.status(201).send(await barService.addItem(request.params.id, input))
}

export async function getBarStats(request: FastifyRequest, reply: FastifyReply) {
  const { startDate, endDate } = request.query as { startDate?: string; endDate?: string }
  const today = new Date().toISOString().slice(0, 10)
  return reply.send(await barService.getBarStats(startDate ?? today, endDate ?? today))
}

export async function getTopClients(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send(await barService.getTopClients())
}

export async function getOrderByNumber(
  request: FastifyRequest<{ Params: { number: string } }>,
  reply: FastifyReply,
) {
  const number = parseInt(request.params.number)
  if (!number || number <= 0) return reply.status(400).send({ message: 'Número inválido' })
  const order = await barService.getOrderByNumber(number)
  return reply.send(order ?? null)
}

// Categories
export async function listCategories(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send(await barService.listCategories())
}

export async function createCategory(request: FastifyRequest, reply: FastifyReply) {
  const { name } = createCategorySchema.parse(request.body)
  return reply.status(201).send(await barService.createCategory(name.trim()))
}

export async function deleteCategory(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  await barService.deleteCategory(request.params.id)
  return reply.status(204).send()
}

export async function reopenOrder(
  request: FastifyRequest<{ Params: { id: string }; Body: { clearItems: boolean; newCustomerName?: string } }>,
  reply: FastifyReply,
) {
  const { clearItems, newCustomerName } = request.body as { clearItems: boolean; newCustomerName?: string }
  return reply.send(await barService.reopenOrder(request.params.id, !!clearItems, newCustomerName))
}

export async function removeItem(
  request: FastifyRequest<{ Params: { id: string; itemId: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await barService.removeItem(request.params.id, request.params.itemId))
}
