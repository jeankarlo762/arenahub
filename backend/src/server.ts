import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { env } from './config/env'
import { registerRoutes } from './routes'
import { errorHandler } from './middlewares/errorHandler'
import { prisma } from './config/database'
import { tenantStore, createStore } from './config/tenant-context'
import { initSeedIfNeeded } from './seed'
import { startReminderScheduler } from './services/reminder.service'

// bodyLimit raised to 8MB so base64 image payloads (player/team photos) fit.
// trustProxy: 1 — confia apenas no primeiro proxy (a borda do Railway) para
// obter o IP real do cliente. Não usar `true` para não confiar em headers
// X-Forwarded-For forjados pelo cliente (evita burlar o rate limit por IP).
const app = Fastify({
  logger: env.NODE_ENV === 'development',
  bodyLimit: 8 * 1024 * 1024,
  trustProxy: 1,
})

// Establish the tenant context at the very root of every request so it
// reliably propagates to all hooks, handlers and the Prisma middleware.
// The auth middleware later fills in the tenantId via setTenant().
app.addHook('onRequest', (_request, _reply, done) => {
  tenantStore.run(createStore(), done)
})

// Cabeçalhos de segurança (HSTS, X-Frame-Options, etc.). CSP desligado para
// não bloquear respostas de API/JSON consumidas pelo frontend.
app.register(helmet, { contentSecurityPolicy: false })

// Rate limit global (proteção contra flood). Endpoints sensíveis (login,
// reset de senha, agendamento público) têm limites mais rígidos por rota.
app.register(rateLimit, {
  global: true,
  max: 300,
  timeWindow: '1 minute',
  // Usa o IP real quando atrás de proxy (Railway) — configurado via trustProxy.
})

// CORS: se CORS_ORIGINS estiver definido, restringe às origens listadas;
// caso contrário libera (dev). A API usa token Bearer, não cookies.
const allowedOrigins = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : null
app.register(cors, {
  credentials: true,
  origin: allowedOrigins ?? true,
})

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
