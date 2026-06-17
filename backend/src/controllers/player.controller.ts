import { FastifyRequest, FastifyReply } from 'fastify'
import * as playerService from '../services/player.service'
import { createPlayerSchema, updatePlayerSchema } from '../schemas/player.schema'

export async function listPlayers(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send(await playerService.listPlayers())
}

export async function createPlayer(request: FastifyRequest, reply: FastifyReply) {
  const input = createPlayerSchema.parse(request.body)
  return reply.status(201).send(await playerService.createPlayer(input))
}

export async function updatePlayer(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const input = updatePlayerSchema.parse(request.body)
  return reply.send(await playerService.updatePlayer(request.params.id, input))
}

export async function deletePlayer(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  await playerService.deletePlayer(request.params.id)
  return reply.status(204).send()
}
