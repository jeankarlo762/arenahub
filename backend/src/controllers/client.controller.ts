import { FastifyRequest, FastifyReply } from 'fastify'
import * as clientService from '../services/client.service'
import { createClientSchema, updateClientSchema } from '../schemas/client.schema'

export async function listClients(request: FastifyRequest, reply: FastifyReply) {
  const { search } = request.query as { search?: string }
  return reply.send(await clientService.listClients(search))
}

export async function getClient(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  return reply.send(await clientService.getClient(request.params.id))
}

export async function createClient(request: FastifyRequest, reply: FastifyReply) {
  const input = createClientSchema.parse(request.body)
  return reply.status(201).send(await clientService.createClient(input))
}

export async function updateClient(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const input = updateClientSchema.parse(request.body)
  return reply.send(await clientService.updateClient(request.params.id, input))
}

export async function deleteClient(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  await clientService.deleteClient(request.params.id)
  return reply.status(204).send()
}
