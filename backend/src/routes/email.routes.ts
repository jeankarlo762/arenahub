import { FastifyInstance } from 'fastify'
import { env } from '../config/env'
import { handleGoogleCallback } from '../services/email.service'

// Rotas PÚBLICAS da integração de e-mail. O callback do OAuth do Google é
// aberto pelo navegador (redirect), então não pode exigir o header de auth.
// A proteção contra CSRF vem do parâmetro `state` assinado (validado no serviço).
export async function emailRoutes(app: FastifyInstance) {
  app.get('/oauth/callback', async (request, reply) => {
    const { code, state, error } = request.query as { code?: string; state?: string; error?: string }
    const panel = `${env.FRONTEND_URL.replace(/\/$/, '')}/superadmin/email`

    if (error || !code || !state) {
      return reply.redirect(`${panel}?email_error=${encodeURIComponent(error || 'missing_code')}`)
    }

    try {
      await handleGoogleCallback(code, state)
      return reply.redirect(`${panel}?email_connected=1`)
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? 'callback_failed'
      return reply.redirect(`${panel}?email_error=${encodeURIComponent(msg)}`)
    }
  })
}
