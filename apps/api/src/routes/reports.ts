import { FastifyInstance } from 'fastify'
import { authorizeRoles } from '../middleware/auth'

export default async function reportRoutes(fastify: FastifyInstance) {

  // GET /reports/daily
  fastify.get('/reports/daily', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  }, async (request, reply) => {
    const { date, branchId } = request.query as { date?: string; branchId?: string }

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

    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {}
    for (const t of transactions) {
      for (const item of t.items) {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.product.name, qty: 0, revenue: 0 }
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
      totalRevenue, totalTransactions, totalItems, topProducts, transactions
    })
  })

  // GET /reports/monthly
  fastify.get('/reports/monthly', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  }, async (request, reply) => {
    const { month, branchId } = request.query as { month?: string; branchId?: string }

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

    const dailySummary: Record<string, { revenue: number; transactions: number }> = {}
    for (const t of transactions) {
      const day = t.createdAt.toISOString().slice(0, 10)
      if (!dailySummary[day]) dailySummary[day] = { revenue: 0, transactions: 0 }
      dailySummary[day].revenue += t.total
      dailySummary[day].transactions += 1
    }

    return reply.send({ month: targetMonth, totalRevenue, totalTransactions, dailySummary })
  })

  // GET /reports/profit-loss
  // period: 'daily' | 'weekly' | 'monthly'
  // date: YYYY-MM-DD (untuk daily & weekly)
  // month: YYYY-MM (untuk monthly)
  fastify.get('/reports/profit-loss', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  }, async (request, reply) => {
    const { period = 'monthly', date, month, branchId } = request.query as {
      period?: 'daily' | 'weekly' | 'monthly'
      date?: string
      month?: string
      branchId?: string
    }

    let start: Date, end: Date, prevStart: Date, prevEnd: Date, label: string

    if (period === 'daily') {
      const d = date ? new Date(date) : new Date()
      start = new Date(d); start.setHours(0, 0, 0, 0)
      end = new Date(d); end.setHours(23, 59, 59, 999)
      // Hari sebelumnya
      prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 1)
      prevEnd = new Date(end); prevEnd.setDate(prevEnd.getDate() - 1)
      label = d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    } else if (period === 'weekly') {
      const d = date ? new Date(date) : new Date()
      // Cari Senin minggu ini
      const day = d.getDay()
      const diffToMonday = (day === 0 ? -6 : 1 - day)
      start = new Date(d)
      start.setDate(d.getDate() + diffToMonday)
      start.setHours(0, 0, 0, 0)
      end = new Date(start)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      // Minggu sebelumnya
      prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 7)
      prevEnd = new Date(end); prevEnd.setDate(prevEnd.getDate() - 7)
      label = `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`

    } else {
      // monthly (default)
      const targetMonth = month || new Date().toISOString().slice(0, 7)
      const [year, monthNum] = targetMonth.split('-').map(Number)
      start = new Date(year, monthNum - 1, 1)
      end = new Date(year, monthNum, 0, 23, 59, 59, 999)
      prevStart = new Date(year, monthNum - 2, 1)
      prevEnd = new Date(year, monthNum - 1, 0, 23, 59, 59, 999)
      label = new Date(year, monthNum - 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
    }

    const [transactions, prevTransactions] = await Promise.all([
      fastify.prisma.transaction.findMany({
        where: {
          createdAt: { gte: start, lte: end },
          status: 'COMPLETED',
          ...(branchId && { branchId })
        },
        include: { items: { include: { product: true } } }
      }),
      fastify.prisma.transaction.findMany({
        where: {
          createdAt: { gte: prevStart, lte: prevEnd },
          status: 'COMPLETED',
          ...(branchId && { branchId })
        }
      })
    ])

    // ===== HITUNGAN REAL BERDASARKAN FIELD TRANSAKSI =====
    // subtotal = harga sebelum diskon & pajak
    // discount = potongan harga
    // tax      = pajak 11%
    // total    = subtotal - discount + tax (yang dibayar pelanggan)

    const grossSubtotal = transactions.reduce((s, t) => s + t.subtotal, 0)  // subtotal semua item
    const totalDiscount  = transactions.reduce((s, t) => s + t.discount, 0) // total diskon
    const totalTax       = transactions.reduce((s, t) => s + t.tax, 0)      // total pajak
    const grossRevenue   = transactions.reduce((s, t) => s + t.total, 0)    // total yang diterima

    // Pendapatan setelah diskon, sebelum pajak
    const revenueAfterDiscount = grossSubtotal - totalDiscount

    // Laba kotor = pendapatan setelah diskon (pajak bukan keuntungan kita, dikembalikan ke negara)
    const grossProfit = revenueAfterDiscount
    const grossProfitMargin = grossRevenue > 0 ? (grossProfit / grossRevenue) * 100 : 0

    // Laba bersih = total yang diterima dikurangi pajak (pajak bukan milik kita)
    const netProfit = revenueAfterDiscount - totalTax
    const netProfitMargin = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0

    // Growth vs periode sebelumnya
    const prevRevenue = prevTransactions.reduce((s, t) => s + t.total, 0)
    const revenueGrowth = prevRevenue > 0 ? ((grossRevenue - prevRevenue) / prevRevenue) * 100 : 0

    // Avg transaksi
    const avgTransactionValue = transactions.length > 0 ? grossRevenue / transactions.length : 0

    // Payment breakdown
    const paymentBreakdown: Record<string, { count: number; total: number }> = {}
    for (const t of transactions) {
      const method = t.paymentMethod
      if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, total: 0 }
      paymentBreakdown[method].count += 1
      paymentBreakdown[method].total += t.total
    }

    // Top produk
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {}
    for (const t of transactions) {
      for (const item of t.items) {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.product.name, qty: 0, revenue: 0 }
        }
        productSales[item.productId].qty += item.quantity
        productSales[item.productId].revenue += item.subtotal
      }
    }
    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Timeline chart (per jam kalau daily, per hari kalau weekly/monthly)
    const timeline: Record<string, { revenue: number; transactions: number }> = {}
    for (const t of transactions) {
      let key: string
      if (period === 'daily') {
        key = `${t.createdAt.getHours().toString().padStart(2, '0')}:00`
      } else if (period === 'weekly') {
        key = t.createdAt.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })
      } else {
        key = t.createdAt.toISOString().slice(8, 10) // hari
      }
      if (!timeline[key]) timeline[key] = { revenue: 0, transactions: 0 }
      timeline[key].revenue += t.total
      timeline[key].transactions += 1
    }

    return reply.send({
      period, label,
      // Revenue
      grossSubtotal,
      totalDiscount,
      totalTax,
      grossRevenue,
      revenueAfterDiscount,
      // Profit (real, tanpa estimasi)
      grossProfit,
      grossProfitMargin,
      netProfit,
      netProfitMargin,
      // Stats
      totalTransactions: transactions.length,
      avgTransactionValue,
      revenueGrowth,
      prevRevenue,
      // Breakdown
      paymentBreakdown,
      topProducts,
      timeline,
    })
  })

  // GET /reports/cashier-performance
  fastify.get('/reports/cashier-performance', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  }, async (request, reply) => {
    const { period = 'monthly', date, month, branchId } = request.query as {
      period?: 'daily' | 'weekly' | 'monthly'
      date?: string; month?: string; branchId?: string
    }

    let start: Date, end: Date

    if (period === 'daily') {
      const d = date ? new Date(date) : new Date()
      start = new Date(d); start.setHours(0, 0, 0, 0)
      end = new Date(d); end.setHours(23, 59, 59, 999)
    } else if (period === 'weekly') {
      const d = date ? new Date(date) : new Date()
      const day = d.getDay()
      const diffToMonday = (day === 0 ? -6 : 1 - day)
      start = new Date(d); start.setDate(d.getDate() + diffToMonday); start.setHours(0, 0, 0, 0)
      end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
    } else {
      const targetMonth = month || new Date().toISOString().slice(0, 7)
      const [year, monthNum] = targetMonth.split('-').map(Number)
      start = new Date(year, monthNum - 1, 1)
      end = new Date(year, monthNum, 0, 23, 59, 59, 999)
    }

    const transactions = await fastify.prisma.transaction.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: 'COMPLETED',
        ...(branchId && { branchId })
      },
      include: {
        user: { select: { id: true, name: true } },
        items: true
      }
    })

    const cashierStats: Record<string, {
      id: string; name: string;
      transactions: number; revenue: number; items: number
    }> = {}

    for (const t of transactions) {
      const uid = t.userId
      if (!cashierStats[uid]) {
        cashierStats[uid] = {
          id: uid, name: t.user?.name || 'Unknown',
          transactions: 0, revenue: 0, items: 0
        }
      }
      cashierStats[uid].transactions += 1
      cashierStats[uid].revenue += t.total
      cashierStats[uid].items += t.items.reduce((s, i) => s + i.quantity, 0)
    }

    const cashiers = Object.values(cashierStats)
      .map(c => ({
        ...c,
        avgTransaction: c.transactions > 0 ? c.revenue / c.transactions : 0
      }))
      .sort((a, b) => b.revenue - a.revenue)

    return reply.send({ period, cashiers })
  })

  // GET /reports/summary
  fastify.get('/reports/summary', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CASHIER')
  }, async (request, reply) => {
    const { branchId } = request.query as { branchId?: string }

    const today = new Date()
    const startOfToday = new Date(today); startOfToday.setHours(0, 0, 0, 0)
    const endOfToday = new Date(today); endOfToday.setHours(23, 59, 59, 999)

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

    const [todayRevenue, totalProducts, lowStockProducts, totalBranches, recentTransactions] =
      await Promise.all([
        fastify.prisma.transaction.aggregate({
          where: {
            createdAt: { gte: startOfToday, lte: endOfToday },
            status: 'COMPLETED',
            ...(branchId && { branchId })
          },
          _sum: { total: true },
          _count: true
        }),
        fastify.prisma.product.count({ where: { ...(branchId && { branchId }) } }),
        fastify.prisma.product.count({ where: { stock: { lte: 5 }, ...(branchId && { branchId }) } }),
        fastify.prisma.branch.count(),
        fastify.prisma.transaction.findMany({
          where: { status: 'COMPLETED', ...(branchId && { branchId }) },
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            user: { select: { name: true } },
            branch: { select: { name: true } },
            items: { take: 3, include: { product: { select: { name: true } } } }
          }
        })
      ])

    return reply.send({
      todayRevenue: todayRevenue._sum.total || 0,
      todayTransactions: todayRevenue._count,
      totalProducts, lowStockProducts, totalBranches,
      recentTransactions, monthlyData
    })
  })
}