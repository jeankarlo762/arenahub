import { FastifyInstance } from 'fastify'
import * as tournamentController from '../controllers/tournament.controller'
import { authenticate } from '../middlewares/auth'

export async function tournamentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.get('/', tournamentController.list)
  app.post('/', tournamentController.create)
  app.get('/:id', tournamentController.getById)
  app.put('/:id', tournamentController.update)
  app.patch('/:id/status', tournamentController.updateStatus)
  app.post('/:id/teams', tournamentController.addTeam)
  app.delete('/:id/teams/:teamId', tournamentController.removeTeam)
  app.patch('/:id/champion', tournamentController.setChampion)
  app.post('/:id/draw', tournamentController.performDraw)
  app.post('/:id/draw/pairs', tournamentController.drawPairs)
  app.post('/:id/draw/teams', tournamentController.drawTeamGroups)
  app.patch('/:id/bracket', tournamentController.saveBracket)
  app.patch('/:id/teams/:teamId/position', tournamentController.updateTeamPosition)
  app.get('/ranking', tournamentController.getPlayerRanking)
}
