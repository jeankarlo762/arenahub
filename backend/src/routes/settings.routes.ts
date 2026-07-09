import { FastifyInstance, RouteHandlerMethod } from 'fastify'
import * as settingsController from '../controllers/settings.controller'
import { authenticate, requireAdmin } from '../middlewares/auth'

const admin = { preHandler: requireAdmin }

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/booking-slug', settingsController.getBookingSlug)
  app.put('/booking-slug', admin, settingsController.setBookingSlug as RouteHandlerMethod)
  app.get('/payment-fees', settingsController.getPaymentFees)
  app.put('/payment-fees/:method', admin, settingsController.upsertPaymentFee as RouteHandlerMethod)

  app.get('/branding', settingsController.getBranding)
  app.put('/branding', admin, settingsController.upsertBranding)

  app.get('/business-hours', settingsController.getBusinessHours)
  app.put('/business-hours', admin, settingsController.setBusinessHours as RouteHandlerMethod)
}
