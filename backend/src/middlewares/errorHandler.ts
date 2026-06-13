import { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

export function errorHandler(
  error: FastifyError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
): void {
  if (error instanceof ZodError) {
    reply.status(400).send({
      error: true,
      message: 'Dados inválidos',
      code: 'VALIDATION_ERROR',
      details: error.flatten().fieldErrors,
    })
    return
  }

  const statusCode = 'statusCode' in error ? (error.statusCode ?? 500) : 500

  if (statusCode === 400) {
    reply.status(400).send({ error: true, message: error.message, code: 'BAD_REQUEST' })
    return
  }

  if (statusCode === 401) {
    reply.status(401).send({ error: true, message: error.message, code: 'UNAUTHORIZED' })
    return
  }

  if (statusCode === 403) {
    reply.status(403).send({ error: true, message: error.message, code: 'FORBIDDEN' })
    return
  }

  if (statusCode === 404) {
    reply.status(404).send({ error: true, message: error.message, code: 'NOT_FOUND' })
    return
  }

  if (statusCode === 409) {
    reply.status(409).send({ error: true, message: error.message, code: 'CONFLICT' })
    return
  }

  console.error(error)
  reply.status(500).send({ error: true, message: 'Erro interno do servidor', code: 'INTERNAL_ERROR' })
}
