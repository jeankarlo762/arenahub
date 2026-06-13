import { FastifyInstance } from 'fastify'
import { authRoutes } from './auth.routes'
import { courtRoutes } from './court.routes'
import { bookingRoutes } from './booking.routes'
import { tournamentRoutes } from './tournament.routes'
import { financialRoutes } from './financial.routes'
import { userRoutes } from './user.routes'
import { barRoutes } from './bar.routes'
import { settingsRoutes } from './settings.routes'
import { clientRoutes } from './client.routes'
import { rentalRoutes } from './rental.routes'

export async function registerRoutes(app: FastifyInstance) {
  app.register(authRoutes, { prefix: '/api/auth' })
  app.register(courtRoutes, { prefix: '/api/courts' })
  app.register(bookingRoutes, { prefix: '/api/bookings' })
  app.register(tournamentRoutes, { prefix: '/api/tournaments' })
  app.register(financialRoutes, { prefix: '/api/financial' })
  app.register(userRoutes, { prefix: '/api/users' })
  app.register(barRoutes, { prefix: '/api/bar' })
  app.register(settingsRoutes, { prefix: '/api/settings' })
  app.register(clientRoutes, { prefix: '/api' })
  app.register(rentalRoutes, { prefix: '/api' })
}
