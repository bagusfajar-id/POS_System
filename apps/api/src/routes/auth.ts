import { FastifyInstance } from 'fastify'
import { hashPassword, comparePassword } from '../utils/helpers'

export default async function authRoutes(fastify: FastifyInstance) {

  // POST /auth/login
  fastify.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as {
      email: string
      password: string
    }

    if (!email || !password) {
      return reply.status(400).send({ error: 'Email and password are required' })
    }

    const user = await fastify.prisma.user.findUnique({
      where: { email },
      include: { branch: true }
    })

    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const isValid = await comparePassword(password, user.password)
    if (!isValid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = fastify.jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        name: user.name
      },
      { expiresIn: '8h' }
    )

    const refreshToken = fastify.jwt.sign(
      { id: user.id },
      { expiresIn: '7d' }
    )

    return reply.send({
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branch: user.branch
      }
    })
  })

  // POST /auth/refresh
  fastify.post('/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body as { refreshToken: string }

    if (!refreshToken) {
      return reply.status(400).send({ error: 'Refresh token is required' })
    }

    try {
      const decoded = fastify.jwt.verify(refreshToken) as { id: string }

      const user = await fastify.prisma.user.findUnique({
        where: { id: decoded.id },
        include: { branch: true }
      })

      if (!user) {
        return reply.status(401).send({ error: 'User not found' })
      }

      const token = fastify.jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          branchId: user.branchId,
          name: user.name
        },
        { expiresIn: '8h' }
      )

      return reply.send({ token })
    } catch {
      return reply.status(401).send({ error: 'Invalid refresh token' })
    }
  })

  // POST /auth/register (hanya SUPER_ADMIN)
  fastify.post('/auth/register', async (request, reply) => {
    const { name, email, password, role, branchId } = request.body as {
      name: string
      email: string
      password: string
      role?: string
      branchId?: string
    }

    if (!name || !email || !password) {
      return reply.status(400).send({ error: 'Name, email and password are required' })
    }

    const existing = await fastify.prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(400).send({ error: 'Email already registered' })
    }

    const hashed = await hashPassword(password)

    const user = await fastify.prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: (role as any) || 'CASHIER',
        branchId: branchId || null
      }
    })

    return reply.status(201).send({
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  })

  // GET /auth/me
  fastify.get('/auth/me', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify()
      } catch {
        reply.status(401).send({ error: 'Unauthorized' })
      }
    }
  }, async (request, reply) => {
    const { id } = request.user as { id: string }

    const user = await fastify.prisma.user.findUnique({
      where: { id },
      include: { branch: true }
    })

    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    return reply.send({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branch: user.branch
    })
  })
}