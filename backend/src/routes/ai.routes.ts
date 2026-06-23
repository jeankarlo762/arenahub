import { FastifyInstance } from 'fastify'
import { authenticate, requireAdmin } from '../middlewares/auth'
import { generateTournamentConcept } from '../services/ai.service'

export async function aiRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authenticate)

  app.post('/tournament-concept', { preHandler: [requireAdmin] }, async (request, reply) => {
    const body = request.body as {
      name: string
      sport: string
      startDate: string
      endDate: string
      maxTeams: number
      matchType: string
      prizeInfo?: string
      description?: string
      companyName?: string
    }
    const concept = await generateTournamentConcept(body)
    return reply.send(concept)
  })
}
