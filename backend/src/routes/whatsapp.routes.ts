import { FastifyInstance } from 'fastify'
import { authenticate } from '../middlewares/auth'
import * as baileys from '../services/baileys.service'

export async function whatsappRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/status', async (_, reply) => {
    return reply.send(baileys.getInfo())
  })

  app.post('/connect', async (_, reply) => {
    await baileys.connect()
    return reply.send({ ok: true })
  })

  app.post('/disconnect', async (_, reply) => {
    await baileys.disconnect()
    return reply.send({ ok: true })
  })
}
