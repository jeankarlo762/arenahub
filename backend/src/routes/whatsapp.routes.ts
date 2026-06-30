import { FastifyInstance } from 'fastify'
import { authenticate, requireAdmin } from '../middlewares/auth'
import * as baileys from '../services/baileys.service'
import * as settings from '../services/settings.service'

export async function whatsappRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/status', async (_, reply) => {
    return reply.send(baileys.getInfo())
  })

  app.post('/connect', { preHandler: requireAdmin }, async (_, reply) => {
    await baileys.connect()
    return reply.send({ ok: true })
  })

  app.post('/disconnect', { preHandler: requireAdmin }, async (_, reply) => {
    await baileys.disconnect()
    return reply.send({ ok: true })
  })

  app.get('/template', async (_, reply) => {
    return reply.send(await settings.getWhatsAppTemplate())
  })

  app.put('/template', { preHandler: requireAdmin }, async (request, reply) => {
    const { template } = request.body as { template?: string }
    if (!template || typeof template !== 'string' || !template.trim()) {
      return reply.status(400).send({ message: 'Template inválido' })
    }
    return reply.send(await settings.setWhatsAppTemplate(template.trim()))
  })
}
