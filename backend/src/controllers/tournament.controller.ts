import { FastifyRequest, FastifyReply } from 'fastify'
import * as tournamentService from '../services/tournament.service'
import {
  createTournamentSchema,
  updateTournamentSchema,
  tournamentStatusSchema,
  addTeamSchema,
  drawSchema,
  setChampionSchema,
  drawTeamGroupsSchema,
} from '../schemas/tournament.schema'

export async function list(_request: FastifyRequest, reply: FastifyReply) {
  return reply.send(await tournamentService.listTournaments())
}

export async function getById(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await tournamentService.getTournament(request.params.id))
}

export async function create(request: FastifyRequest, reply: FastifyReply) {
  const input = createTournamentSchema.parse(request.body)
  return reply.status(201).send(await tournamentService.createTournament(input))
}

export async function update(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const input = updateTournamentSchema.parse(request.body)
  return reply.send(await tournamentService.updateTournament(request.params.id, input))
}

export async function updateStatus(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { status } = tournamentStatusSchema.parse(request.body)
  return reply.send(await tournamentService.updateTournamentStatus(request.params.id, status))
}

export async function addTeam(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const input = addTeamSchema.parse(request.body)
  return reply.status(201).send(await tournamentService.addTeam(request.params.id, input))
}

export async function removeTeam(
  request: FastifyRequest<{ Params: { id: string; teamId: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await tournamentService.removeTeam(request.params.id, request.params.teamId))
}

export async function setChampion(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const input = setChampionSchema.parse(request.body)
  return reply.send(await tournamentService.setChampion(request.params.id, input))
}

export async function performDraw(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const input = drawSchema.parse(request.body)
  return reply.send(await tournamentService.performDraw(request.params.id, input))
}

export async function drawPairs(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  return reply.send(await tournamentService.drawPairs(request.params.id))
}

export async function drawTeamGroups(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const { playersPerTeam } = drawTeamGroupsSchema.parse(request.body)
  return reply.send(await tournamentService.drawTeamGroups(request.params.id, playersPerTeam))
}
