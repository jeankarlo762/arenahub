import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './config/env'
import { registerRoutes } from './routes'
import { errorHandler } from './middlewares/errorHandler'
import { prisma } from './config/database'
import { tenantStore, createStore } from './config/tenant-context'
import { initSeedIfNeeded } from './seed'
import { startReminderScheduler } from './services/reminder.service'

// bodyLimit raised to 8MB so base64 image payloads (player/team photos) fit
const app = Fastify({ logger: env.NODE_ENV === 'development', bodyLimit: 8 * 1024 * 1024 })

// Establish the tenant context at the very root of every request so it
// reliably propagates to all hooks, handlers and the Prisma middleware.
// The auth middleware later fills in the tenantId via setTenant().
app.addHook('onRequest', (_request, _reply, done) => {
  tenantStore.run(createStore(), done)
})

// Public booking routes must be reachable from any browser/device — customers
// open shared links from anywhere. Authenticated routes are secured by JWT;
// CORS origin restrictions add no meaningful security on top of that.
app.register(cors, { origin: true, credentials: true })

registerRoutes(app)

app.setErrorHandler(errorHandler)

app.get('/health', async () => ({ status: 'ok', version: 'als-onrequest-2', timestamp: new Date().toISOString() }))

async function start() {
  try {
    await initSeedIfNeeded(prisma)
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    console.log(`Server running on http://localhost:${env.PORT}`)
    startReminderScheduler()
  } catch (err) {
    app.log.error(err)
    await prisma.$disconnect()
    process.exit(1)
  }
}

process.on('SIGINT', async () => {
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await app.close()
  await prisma.$disconnect()
  process.exit(0)
})

start()
