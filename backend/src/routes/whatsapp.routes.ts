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

  app.get('/config', async (_, reply) => {
    return reply.send(await settings.getWhatsAppConfig())
  })

  app.put('/config', { preHandler: requireAdmin }, async (request, reply) => {
    const body = request.body as {
      confirmation?: string
      reminder?: string
      owner?: string
      ownerNumber?: string
    }
    const clean = (v?: string) => (typeof v === 'string' ? v.trim() : undefined)
    return reply.send(
      await settings.setWhatsAppConfig({
        confirmation: clean(body.confirmation),
        reminder: clean(body.reminder),
        owner: clean(body.owner),
        ownerNumber: body.ownerNumber !== undefined ? body.ownerNumber.trim() : undefined,
      }),
    )
  })
}
