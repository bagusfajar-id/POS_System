import { FastifyInstance } from 'fastify'
import { authenticate } from '../middleware/auth'
import { generateInvoiceNo } from '../utils/helpers'

export default async function transactionRoutes(fastify: FastifyInstance) {

  // GET /transactions
  fastify.get('/transactions', { preHandler: authenticate }, async (request, reply) => {
    const { branchId, startDate, endDate, page = '1', limit = '20' } = request.query as {
      branchId?: string
      startDate?: string
      endDate?: string
      page?: string
      limit?: string
    }

    const user = request.user as { role: string; branchId?: string }
    const effectiveBranchId = user.role === 'CASHIER' ? user.branchId : branchId

    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = {
      ...(effectiveBranchId && { branchId: effectiveBranchId }),
      ...(startDate && endDate && {
        createdAt: { gte: new Date(startDate), lte: new Date(endDate) }
      })
    }

    const [transactions, total] = await Promise.all([
      fastify.prisma.transaction.findMany({
        where,
        include: {
          user: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          items: {
            include: { product: { select: { id: true, name: true } } }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      fastify.prisma.transaction.count({ where })
    ])

    return reply.send({
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    })
  })

  // GET /transactions/:id
  fastify.get('/transactions/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const transaction = await fastify.prisma.transaction.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, barcode: true } }
          }
        }
      }
    })

    if (!transaction) return reply.status(404).send({ error: 'Transaction not found' })
    return reply.send(transaction)
  })

  // POST /transactions
  fastify.post('/transactions', { preHandler: authenticate }, async (request, reply) => {
    const {
      items,
      discount = 0,
      paymentMethod = 'CASH',
      amountPaid,
      branchId,
      invoiceNo: customInvoiceNo  // ← dari QRIS Midtrans
    } = request.body as {
      items: { productId: string; quantity: number }[]
      discount?: number
      paymentMethod?: string
      amountPaid: number
      branchId: string
      invoiceNo?: string
    }

    const user = request.user as { id: string; branchId?: string }

    if (!items || items.length === 0) {
      return reply.status(400).send({ error: 'Items are required' })
    }

    const effectiveBranchId = branchId || user.branchId
    if (!effectiveBranchId) {
      return reply.status(400).send({ error: 'Branch is required' })
    }

    const productIds = items.map(i => i.productId)
    const products = await fastify.prisma.product.findMany({
      where: { id: { in: productIds } }
    })

    for (const item of items) {
      const product = products.find(p => p.id === item.productId)
      if (!product) return reply.status(404).send({ error: `Product ${item.productId} not found` })
      if (product.stock < item.quantity) {
        return reply.status(400).send({
          error: `Stok ${product.name} tidak cukup. Tersisa: ${product.stock}`
        })
      }
    }

    const transactionItems = items.map(item => {
      const product = products.find(p => p.id === item.productId)!
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        subtotal: product.price * item.quantity
      }
    })

    const subtotal = transactionItems.reduce((sum, item) => sum + item.subtotal, 0)
    const tax = (subtotal - discount) * 0.11
    const total = subtotal - discount + tax
    const change = amountPaid - total

    if (amountPaid < total - 0.01) {
      return reply.status(400).send({ error: 'Jumlah bayar kurang' })
    }

    const branch = await fastify.prisma.branch.findUnique({
      where: { id: effectiveBranchId }
    })

    // Pakai invoiceNo dari QRIS kalau ada, kalau tidak generate baru
    const invoiceNo = customInvoiceNo || generateInvoiceNo(branch?.name.slice(0, 3) || 'POS')

    // Cek duplikat invoiceNo (kalau webhook sudah proses duluan)
    const existing = await fastify.prisma.transaction.findUnique({
      where: { invoiceNo }
    })
    if (existing) return reply.send(existing)

    const transaction = await fastify.prisma.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          invoiceNo,
          userId: user.id,
          branchId: effectiveBranchId,
          subtotal,
          discount,
          tax,
          total,
          paymentMethod: paymentMethod as any,
          amountPaid,
          change,
          items: { create: transactionItems }
        },
        include: {
          items: { include: { product: true } },
          user: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } }
        }
      })

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        })
      }

      return newTransaction
    })

    return reply.status(201).send(transaction)
  })

  // PATCH /transactions/:id/cancel
  fastify.patch('/transactions/:id/cancel', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const transaction = await fastify.prisma.transaction.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!transaction) return reply.status(404).send({ error: 'Transaction not found' })
    if (transaction.status !== 'COMPLETED') {
      return reply.status(400).send({ error: 'Only completed transactions can be cancelled' })
    }

    await fastify.prisma.$transaction(async (tx) => {
      await tx.transaction.update({ where: { id }, data: { status: 'CANCELLED' } })
      for (const item of transaction.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } }
        })
      }
    })

    return reply.send({ message: 'Transaction cancelled successfully' })
  })
}