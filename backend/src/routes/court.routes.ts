import { FastifyInstance } from 'fastify'
import * as courtController from '../controllers/court.controller'
import { authenticate } from '../middlewares/auth'

export async function courtRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', courtController.list)
  app.post('/', courtController.create)
  app.get('/:id', courtController.getById)
  app.put('/:id', courtController.update)
  app.delete('/:id', courtController.deactivate)
  app.get('/:id/current-booking', courtController.getCurrentBooking)
  app.get('/:id/availability', courtController.getAvailability)
  app.get('/:id/schedule', courtController.getSchedule)
  app.put('/:id/schedule', courtController.updateSchedule)
}
