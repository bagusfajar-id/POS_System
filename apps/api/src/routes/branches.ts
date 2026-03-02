import { FastifyInstance } from 'fastify'
import { authenticate, authorizeRoles } from '../middleware/auth'

export default async function branchRoutes(fastify: FastifyInstance) {

  // GET /branches
  fastify.get('/branches', { preHandler: authenticate }, async (request, reply) => {
    const branches = await fastify.prisma.branch.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return reply.send(branches)
  })

  // GET /branches/:id
  fastify.get('/branches/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const branch = await fastify.prisma.branch.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, name: true, email: true, role: true } }
      }
    })

    if (!branch) {
      return reply.status(404).send({ error: 'Branch not found' })
    }

    return reply.send(branch)
  })

  // POST /branches
  fastify.post('/branches', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN')
  }, async (request, reply) => {
    const { name, address, phone } = request.body as {
      name: string
      address?: string
      phone?: string
    }

    if (!name) {
      return reply.status(400).send({ error: 'Branch name is required' })
    }

    const branch = await fastify.prisma.branch.create({
      data: { name, address, phone }
    })

    return reply.status(201).send(branch)
  })

  // PUT /branches/:id
  fastify.put('/branches/:id', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN')
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { name, address, phone } = request.body as {
      name?: string
      address?: string
      phone?: string
    }

    const branch = await fastify.prisma.branch.update({
      where: { id },
      data: { name, address, phone }
    })

    return reply.send(branch)
  })

  // DELETE /branches/:id
  fastify.delete('/branches/:id', {
    preHandler: authorizeRoles('SUPER_ADMIN')
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    await fastify.prisma.branch.delete({ where: { id } })

    return reply.send({ message: 'Branch deleted successfully' })
  })
}