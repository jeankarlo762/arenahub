import { FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import * as authService from '../services/auth.service'
import { loginSchema, refreshSchema } from '../schemas/auth.schema'

const updateMeSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  phone: z.string().optional().or(z.literal('')),
})
const forgotPasswordSchema = z.object({ phone: z.string().min(10) })
const verifyResetCodeSchema = z.object({ phone: z.string().min(10), code: z.string().length(6) })
const resetPasswordSchema = z.object({ resetToken: z.string().min(1), password: z.string().min(6) })

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

export async function updateMe(request: FastifyRequest, reply: FastifyReply) {
  const input = updateMeSchema.parse(request.body)
  const result = await authService.updateMe(request.user.id, {
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
  })
  return reply.send(result)
}

export async function forgotPassword(request: FastifyRequest, reply: FastifyReply) {
  const { phone } = forgotPasswordSchema.parse(request.body)
  const result = await authService.forgotPassword(phone)
  return reply.send(result)
}

export async function verifyResetCode(request: FastifyRequest, reply: FastifyReply) {
  const { phone, code } = verifyResetCodeSchema.parse(request.body)
  const result = await authService.verifyResetCode(phone, code)
  return reply.send(result)
}

export async function resetPassword(request: FastifyRequest, reply: FastifyReply) {
  const { resetToken, password } = resetPasswordSchema.parse(request.body)
  await authService.resetPassword(resetToken, password)
  return reply.send({ success: true })
}
