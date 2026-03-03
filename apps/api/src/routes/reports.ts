import { FastifyInstance } from 'fastify'
import { authenticate, authorizeRoles } from '../middleware/auth'

export default async function reportRoutes(fastify: FastifyInstance) {

  // GET /reports/daily?date=2024-01-01&branchId=xxx
  fastify.get('/reports/daily', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  }, async (request, reply) => {
    const { date, branchId } = request.query as {
      date?: string
      branchId?: string
    }

    const targetDate = date ? new Date(date) : new Date()
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0))
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999))

    const transactions = await fastify.prisma.transaction.findMany({
      where: {
        createdAt: { gte: startOfDay, lte: endOfDay },
        status: 'COMPLETED',
        ...(branchId && { branchId })
      },
      include: {
        items: { include: { product: true } },
        branch: { select: { id: true, name: true } }
      }
    })

    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0)
    const totalTransactions = transactions.length
    const totalItems = transactions.reduce(
      (sum, t) => sum + t.items.reduce((s, i) => s + i.quantity, 0), 0
    )

    // Top produk terlaris
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {}
    for (const t of transactions) {
      for (const item of t.items) {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.product.name,
            qty: 0,
            revenue: 0
          }
        }
        productSales[item.productId].qty += item.quantity
        productSales[item.productId].revenue += item.subtotal
      }
    }

    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)

    return reply.send({
      date: date || new Date().toISOString().slice(0, 10),
      totalRevenue,
      totalTransactions,
      totalItems,
      topProducts,
      transactions
    })
  })

  // GET /reports/monthly?month=2024-01&branchId=xxx
  fastify.get('/reports/monthly', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  }, async (request, reply) => {
    const { month, branchId } = request.query as {
      month?: string
      branchId?: string
    }

    const targetMonth = month || new Date().toISOString().slice(0, 7)
    const [year, monthNum] = targetMonth.split('-').map(Number)
    const startOfMonth = new Date(year, monthNum - 1, 1)
    const endOfMonth = new Date(year, monthNum, 0, 23, 59, 59, 999)

    const transactions = await fastify.prisma.transaction.findMany({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        status: 'COMPLETED',
        ...(branchId && { branchId })
      }
    })

    const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0)
    const totalTransactions = transactions.length

    // Group by hari
    const dailySummary: Record<string, { revenue: number; transactions: number }> = {}
    for (const t of transactions) {
      const day = t.createdAt.toISOString().slice(0, 10)
      if (!dailySummary[day]) {
        dailySummary[day] = { revenue: 0, transactions: 0 }
      }
      dailySummary[day].revenue += t.total
      dailySummary[day].transactions += 1
    }

    return reply.send({
      month: targetMonth,
      totalRevenue,
      totalTransactions,
      dailySummary
    })
  })

  // GET /reports/summary — dashboard summary
fastify.get('/reports/summary', {
  preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
}, async (request, reply) => {
  const { branchId } = request.query as { branchId?: string }

  const today = new Date()
  const startOfToday = new Date(today)
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(today)
  endOfToday.setHours(23, 59, 59, 999)

  // Ambil monthly data 6 bulan terakhir
  const monthlyData = await Promise.all(
    Array.from({ length: 6 }, async (_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - (5 - i))
      const start = new Date(d.getFullYear(), d.getMonth(), 1)
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      const result = await fastify.prisma.transaction.aggregate({
        where: {
          createdAt: { gte: start, lte: end },
          status: 'COMPLETED',
          ...(branchId && { branchId })
        },
        _sum: { total: true },
        _count: true
      })
      const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
      return {
        month: months[d.getMonth()],
        revenue: result._sum.total || 0,
        transactions: result._count
      }
    })
  )

  const [
    todayRevenue,
    totalProducts,
    lowStockProducts,
    totalBranches,
    recentTransactions
  ] = await Promise.all([
    fastify.prisma.transaction.aggregate({
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        status: 'COMPLETED',
        ...(branchId && { branchId })
      },
      _sum: { total: true },
      _count: true
    }),
    fastify.prisma.product.count({
      where: { ...(branchId && { branchId }) }
    }),
    fastify.prisma.product.count({
      where: {
        stock: { lte: 5 },
        ...(branchId && { branchId })
      }
    }),
    fastify.prisma.branch.count(),
    fastify.prisma.transaction.findMany({
      where: {
        status: 'COMPLETED',
        ...(branchId && { branchId })
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: { select: { name: true } },
        branch: { select: { name: true } },
        items: {
          take: 3,
          include: { product: { select: { name: true } } }
        }
      }
    })
  ])

  return reply.send({
    todayRevenue: todayRevenue._sum.total || 0,
    todayTransactions: todayRevenue._count,
    totalProducts,
    lowStockProducts,
    totalBranches,
    recentTransactions,
    monthlyData
  })
})
}