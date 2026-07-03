import { FastifyInstance } from 'fastify'
import * as authController from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth'

// Limite rígido para endpoints sensíveis a força bruta (login/OTP).
const strictLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', strictLimit, authController.login)
  app.post('/refresh', authController.refresh)
  app.post('/logout', authController.logout)
  app.get('/me', { preHandler: [authenticate] }, authController.getMe)
  app.patch('/me', { preHandler: [authenticate] }, authController.updateMe)
  app.post('/forgot-password', strictLimit, authController.forgotPassword)
  app.post('/verify-reset-code', strictLimit, authController.verifyResetCode)
  app.post('/reset-password', strictLimit, authController.resetPassword)

}
