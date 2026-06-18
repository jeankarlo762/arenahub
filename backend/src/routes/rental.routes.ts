import { FastifyInstance } from 'fastify'
import * as rentalController from '../controllers/rental.controller'
import { authenticate } from '../middlewares/auth'

export async function rentalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.get('/rentals', rentalController.listRentals)
  app.get('/rentals/report', rentalController.getRentalReport)
  app.get('/rentals/:id', rentalController.getRental)
  app.post('/rentals', rentalController.createRental)
  app.put('/rentals/:id', rentalController.updateRental)
  app.delete('/rentals/:id', rentalController.deleteRental)
  app.get('/rentals/:id/payments', rentalController.listPayments)
  app.patch('/rentals/:id/payments/:pid', rentalController.updatePayment)
}
