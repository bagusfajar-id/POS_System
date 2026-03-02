import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import dotenv from 'dotenv'
import prismaPlugin from './plugins/prisma'
import authRoutes from './routes/auth'
import branchRoutes from './routes/branches'
import categoryRoutes from './routes/categories'
import productRoutes from './routes/products'
import transactionRoutes from './routes/transactions'
import reportRoutes from './routes/reports'

dotenv.config()

const app = Fastify({ logger: true })

// Plugins
app.register(cors, {
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
})

app.register(jwt, {
  secret: process.env.JWT_SECRET || 'pos-secret-key'
})

app.register(prismaPlugin)

// Routes
app.register(authRoutes)
app.register(branchRoutes)
app.register(categoryRoutes)
app.register(productRoutes)
app.register(transactionRoutes)
app.register(reportRoutes)

// Health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Start
const start = async () => {
  try {
    await app.listen({ port: Number(process.env.PORT) || 3001, host: '0.0.0.0' })
    console.log('🚀 API Server running on http://localhost:3001')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()