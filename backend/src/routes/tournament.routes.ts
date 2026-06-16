import { FastifyInstance } from 'fastify'
import * as tournamentController from '../controllers/tournament.controller'
import { authenticate, requireAdmin } from '../middlewares/auth'

export async function tournamentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', tournamentController.list)
  app.get('/ranking', tournamentController.getPlayerRanking)
  app.post('/', { preHandler: requireAdmin }, tournamentController.create)
  app.get('/:id', tournamentController.getById)
  app.put('/:id', { preHandler: requireAdmin }, tournamentController.update)
  app.patch('/:id/status', { preHandler: requireAdmin }, tournamentController.updateStatus)
  app.post('/:id/teams', { preHandler: requireAdmin }, tournamentController.addTeam)
  app.delete('/:id/teams/:teamId', { preHandler: requireAdmin }, tournamentController.removeTeam)
  app.patch('/:id/champion', { preHandler: requireAdmin }, tournamentController.setChampion)
  app.post('/:id/draw', { preHandler: requireAdmin }, tournamentController.performDraw)
  app.post('/:id/draw/pairs', { preHandler: requireAdmin }, tournamentController.drawPairs)
  app.post('/:id/draw/teams', { preHandler: requireAdmin }, tournamentController.drawTeamGroups)
  app.patch('/:id/bracket', { preHandler: requireAdmin }, tournamentController.saveBracket)
  app.patch('/:id/teams/:teamId/position', { preHandler: requireAdmin }, tournamentController.updateTeamPosition)
}
