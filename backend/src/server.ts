import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { env } from './config/env'
import { registerRoutes } from './routes'
import { errorHandler } from './middlewares/errorHandler'
import { prisma } from './config/database'

const app = Fastify({ logger: env.NODE_ENV === 'development' })

app.register(cors, {
  origin: env.FRONTEND_URL,
  credentials: true,
})

registerRoutes(app)

app.setErrorHandler(errorHandler)

app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

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
