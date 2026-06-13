import { FastifyInstance } from 'fastify'
import * as financialController from '../controllers/financial.controller'
import { authenticate } from '../middlewares/auth'

export async function financialRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/summary', financialController.getSummary)
  app.get('/daily', financialController.getDaily)
  app.get('/by-court', financialController.getByCourt)
  app.get('/by-method', financialController.getByMethod)
}
