import { FastifyInstance } from 'fastify'
import * as authController from '../controllers/auth.controller'
import { authenticate } from '../middlewares/auth'

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', authController.login)
  app.post('/refresh', authController.refresh)
  app.post('/logout', authController.logout)
  app.get('/me', { preHandler: [authenticate] }, authController.getMe)
  app.post('/forgot-password', authController.forgotPassword)
  app.post('/verify-reset-code', authController.verifyResetCode)
  app.post('/reset-password', authController.resetPassword)
  app.post('/demo', authController.demoLogin)
}
