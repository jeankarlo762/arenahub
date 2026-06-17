import { FastifyInstance, RouteHandlerMethod } from 'fastify'
import * as tournamentController from '../controllers/tournament.controller'
import { authenticate, requireAdmin } from '../middlewares/auth'

const admin = { preHandler: requireAdmin }

export async function tournamentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', tournamentController.list)
  app.get('/ranking', tournamentController.getPlayerRanking)
  app.post('/', admin, tournamentController.create as RouteHandlerMethod)
  app.get('/:id', tournamentController.getById as RouteHandlerMethod)
  app.put('/:id', admin, tournamentController.update as RouteHandlerMethod)
  app.patch('/:id/status', admin, tournamentController.updateStatus as RouteHandlerMethod)
  app.post('/:id/teams', admin, tournamentController.addTeam as RouteHandlerMethod)
  app.delete('/:id/teams/:teamId', admin, tournamentController.removeTeam as RouteHandlerMethod)
  app.patch('/:id/champion', admin, tournamentController.setChampion as RouteHandlerMethod)
  app.post('/:id/draw', admin, tournamentController.performDraw as RouteHandlerMethod)
  app.post('/:id/draw/pairs', admin, tournamentController.drawPairs as RouteHandlerMethod)
  app.post('/:id/draw/teams', admin, tournamentController.drawTeamGroups as RouteHandlerMethod)
  app.patch('/:id/bracket', admin, tournamentController.saveBracket as RouteHandlerMethod)
  app.patch('/:id/teams/:teamId/position', admin, tournamentController.updateTeamPosition as RouteHandlerMethod)
}
