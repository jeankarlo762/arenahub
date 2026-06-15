import { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../utils/token'
import { prisma } from '../config/database'

declare module 'fastify' {
  interface FastifyRequest {
    user: {
      id: string
      email: string
      role: string
    }
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    reply.status(401).send({ error: true, message: 'Token não fornecido', code: 'UNAUTHORIZED' })
    return
  }

  const token = authHeader.slice(7)

  try {
    const payload = verifyAccessToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, active: true },
    })

    if (!user || !user.active) {
      reply.status(401).send({ error: true, message: 'Usuário inativo ou não encontrado', code: 'UNAUTHORIZED' })
      return
    }

    request.user = { id: user.id, email: user.email, role: user.role }
  } catch {
    reply.status(401).send({ error: true, message: 'Token inválido ou expirado', code: 'TOKEN_EXPIRED' })
  }
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (request.user?.role !== 'ADMIN' && request.user?.role !== 'SUPERADMIN') {
    reply.status(403).send({ error: true, message: 'Permissão insuficiente', code: 'FORBIDDEN' })
  }
}

export async function requireSuperAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (request.user?.role !== 'SUPERADMIN') {
    reply.status(403).send({ error: true, message: 'Acesso restrito ao super administrador', code: 'FORBIDDEN' })
  }
}
