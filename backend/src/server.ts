import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './config/env'
import { registerRoutes } from './routes'
import { errorHandler } from './middlewares/errorHandler'
import { prisma } from './config/database'
import { tenantStore, createStore } from './config/tenant-context'

const app = Fastify({ logger: env.NODE_ENV === 'development' })

// Establish the tenant context at the very root of every request so it
// reliably propagates to all hooks, handlers and the Prisma middleware.
// The auth middleware later fills in the tenantId via setTenant().
app.addHook('onRequest', (_request, _reply, done) => {
  tenantStore.run(createStore(), done)
})

app.register(cors, {
  origin: (origin, cb) => {
    const allowed = env.FRONTEND_URL.replace(/\/$/, '')
    if (!origin || origin.replace(/\/$/, '') === allowed) {
      cb(null, true)
    } else {
      // In development allow localhost origins
      if (env.NODE_ENV !== 'production' || origin.includes('localhost')) {
        cb(null, true)
      } else {
        cb(new Error('Not allowed by CORS'), false)
      }
    }
  },
  credentials: true,
})

registerRoutes(app)

app.setErrorHandler(errorHandler)

app.get('/health', async () => ({ status: 'ok', version: 'als-onrequest-2', timestamp: new Date().toISOString() }))

async function start() {
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    console.log(`Server running on http://localhost:${env.PORT}`)
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

start()
