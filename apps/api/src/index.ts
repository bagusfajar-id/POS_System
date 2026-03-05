import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import multipart from '@fastify/multipart'
import dotenv from 'dotenv'
import prismaPlugin from './plugins/prisma'
import authRoutes from './routes/auth'
import branchRoutes from './routes/branches'
import categoryRoutes from './routes/categories'
import productRoutes from './routes/products'
import transactionRoutes from './routes/transactions'
import reportRoutes from './routes/reports'
import customerDisplayRoutes from './routes/customerDisplay'
import midtransRoutes from './routes/midtrans'

dotenv.config()

const app = Fastify({ logger: true })

app.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
})

app.register(jwt, {
  secret: process.env.JWT_SECRET || 'pos-secret-key'
})

app.register(multipart, {
  limits: { fileSize: 5 * 1024 * 1024 }
})

app.register(websocket)
app.register(prismaPlugin)

app.register(authRoutes)
app.register(branchRoutes)
app.register(categoryRoutes)
app.register(productRoutes)
app.register(transactionRoutes)
app.register(reportRoutes)
app.register(customerDisplayRoutes)
app.register(midtransRoutes)

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

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