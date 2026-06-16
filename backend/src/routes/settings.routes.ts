import { FastifyInstance } from 'fastify'
import * as settingsController from '../controllers/settings.controller'
import { authenticate } from '../middlewares/auth'

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/booking-slug', settingsController.getBookingSlug)
  app.put('/booking-slug', settingsController.setBookingSlug)
  app.get('/payment-fees', settingsController.getPaymentFees)
  app.put('/payment-fees/:method', settingsController.upsertPaymentFee)
}
