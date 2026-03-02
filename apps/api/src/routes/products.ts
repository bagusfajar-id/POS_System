import { FastifyInstance } from 'fastify'
import { authenticate, authorizeRoles } from '../middleware/auth'

export default async function productRoutes(fastify: FastifyInstance) {

  // GET /products
  fastify.get('/products', { preHandler: authenticate }, async (request, reply) => {
    const { search, categoryId, branchId } = request.query as {
      search?: string
      categoryId?: string
      branchId?: string
    }

    const user = request.user as { role: string; branchId?: string }

    // Kasir hanya bisa lihat produk di cabangnya
    const effectiveBranchId =
      user.role === 'CASHIER' ? user.branchId : branchId

    const products = await fastify.prisma.product.findMany({
      where: {
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(categoryId && { categoryId }),
        ...(effectiveBranchId && { branchId: effectiveBranchId })
      },
      include: {
        category: true,
        branch: { select: { id: true, name: true } }
      },
      orderBy: { name: 'asc' }
    })

    return reply.send(products)
  })

  // GET /products/:id
  fastify.get('/products/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const product = await fastify.prisma.product.findUnique({
      where: { id },
      include: { category: true, branch: true }
    })

    if (!product) {
      return reply.status(404).send({ error: 'Product not found' })
    }

    return reply.send(product)
  })

  // GET /products/barcode/:barcode
  fastify.get('/products/barcode/:barcode', { preHandler: authenticate }, async (request, reply) => {
    const { barcode } = request.params as { barcode: string }

    const product = await fastify.prisma.product.findUnique({
      where: { barcode },
      include: { category: true }
    })

    if (!product) {
      return reply.status(404).send({ error: 'Product not found' })
    }

    return reply.send(product)
  })

  // POST /products
  fastify.post('/products', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  }, async (request, reply) => {
    const { name, barcode, price, stock, categoryId, branchId } = request.body as {
      name: string
      barcode?: string
      price: number
      stock?: number
      categoryId?: string
      branchId?: string
    }

    if (!name || price === undefined) {
      return reply.status(400).send({ error: 'Name and price are required' })
    }

    const product = await fastify.prisma.product.create({
      data: {
        name,
        barcode,
        price,
        stock: stock || 0,
        categoryId,
        branchId
      },
      include: { category: true }
    })

    return reply.status(201).send(product)
  })

  // PUT /products/:id
  fastify.put('/products/:id', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { name, barcode, price, stock, categoryId, branchId } = request.body as {
      name?: string
      barcode?: string
      price?: number
      stock?: number
      categoryId?: string
      branchId?: string
    }

    const product = await fastify.prisma.product.update({
      where: { id },
      data: { name, barcode, price, stock, categoryId, branchId },
      include: { category: true }
    })

    return reply.send(product)
  })

  // PATCH /products/:id/stock
  fastify.patch('/products/:id/stock', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { stock } = request.body as { stock: number }

    const product = await fastify.prisma.product.update({
      where: { id },
      data: { stock }
    })

    return reply.send(product)
  })

  // DELETE /products/:id
  fastify.delete('/products/:id', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN')
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    await fastify.prisma.product.delete({ where: { id } })

    return reply.send({ message: 'Product deleted successfully' })
  })
}