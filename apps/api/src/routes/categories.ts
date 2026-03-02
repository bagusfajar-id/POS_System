import { FastifyInstance } from 'fastify'
import { authenticate, authorizeRoles } from '../middleware/auth'

export default async function categoryRoutes(fastify: FastifyInstance) {

  // GET /categories
  fastify.get('/categories', { preHandler: authenticate }, async (request, reply) => {
    const categories = await fastify.prisma.category.findMany({
      orderBy: { name: 'asc' }
    })
    return reply.send(categories)
  })

  // POST /categories
  fastify.post('/categories', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  }, async (request, reply) => {
    const { name } = request.body as { name: string }

    if (!name) {
      return reply.status(400).send({ error: 'Category name is required' })
    }

    const category = await fastify.prisma.category.create({
      data: { name }
    })

    return reply.status(201).send(category)
  })

  // PUT /categories/:id
  fastify.put('/categories/:id', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { name } = request.body as { name: string }

    const category = await fastify.prisma.category.update({
      where: { id },
      data: { name }
    })

    return reply.send(category)
  })

  // DELETE /categories/:id
  fastify.delete('/categories/:id', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN')
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    await fastify.prisma.category.delete({ where: { id } })

    return reply.send({ message: 'Category deleted successfully' })
  })
}