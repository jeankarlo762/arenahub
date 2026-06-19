import { FastifyInstance, RouteHandlerMethod } from 'fastify'
import * as playerController from '../controllers/player.controller'
import { authenticate, requireAdmin } from '../middlewares/auth'

const admin = { preHandler: requireAdmin }

export async function playerRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/players', playerController.listPlayers)
  app.post('/players', admin, playerController.createPlayer as RouteHandlerMethod)
  app.put('/players/:id', admin, playerController.updatePlayer as RouteHandlerMethod)
  app.delete('/players/:id', admin, playerController.deletePlayer as RouteHandlerMethod)
}
