import { FastifyInstance } from 'fastify'
import * as settingsController from '../controllers/settings.controller'
import { authenticate, requireAdmin } from '../middlewares/auth'

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/booking-slug', settingsController.getBookingSlug)
  app.put('/booking-slug', { preHandler: requireAdmin }, settingsController.setBookingSlug)
  app.get('/payment-fees', settingsController.getPaymentFees)
  app.put('/payment-fees/:method', { preHandler: requireAdmin }, settingsController.upsertPaymentFee)
}
