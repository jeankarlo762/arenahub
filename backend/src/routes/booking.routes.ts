import { FastifyInstance } from 'fastify'
import * as bookingController from '../controllers/booking.controller'
import { authenticate } from '../middlewares/auth'

export async function bookingRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', bookingController.list)
  app.post('/', bookingController.create)
  app.get('/:id', bookingController.getById)
  app.put('/:id', bookingController.update)
  app.patch('/:id/status', bookingController.updateStatus)
  app.post('/:id/payment', bookingController.createPayment)
  app.patch('/:id/payment', bookingController.updatePayment)
}
