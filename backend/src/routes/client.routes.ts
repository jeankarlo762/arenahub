import { FastifyInstance } from 'fastify'
import * as clientController from '../controllers/client.controller'
import { authenticate } from '../middlewares/auth'

export async function clientRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)
  app.get('/clients', clientController.listClients)
  app.get('/clients/:id', clientController.getClient)
  app.post('/clients', clientController.createClient)
  app.put('/clients/:id', clientController.updateClient)
  app.delete('/clients/:id', clientController.deleteClient)
}
