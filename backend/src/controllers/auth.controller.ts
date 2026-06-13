import { FastifyRequest, FastifyReply } from 'fastify'
import * as authService from '../services/auth.service'
import { loginSchema, refreshSchema } from '../schemas/auth.schema'

export async function login(request: FastifyRequest, reply: FastifyReply) {
  const input = loginSchema.parse(request.body)
  const result = await authService.login(input)
  return reply.send(result)
}

export async function refresh(request: FastifyRequest, reply: FastifyReply) {
  const { refreshToken } = refreshSchema.parse(request.body)
  const result = await authService.refresh(refreshToken)
  return reply.send(result)
}

export async function logout(request: FastifyRequest, reply: FastifyReply) {
  const { refreshToken } = refreshSchema.parse(request.body)
  authService.logout(refreshToken)
  return reply.send({ success: true })
}

export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const result = await authService.getMe(request.user.id)
  return reply.send(result)
}
