import { FastifyInstance } from 'fastify'
import { authenticate, authorizeRoles } from '../middleware/auth'
import fs from 'fs'
import path from 'path'
import { pipeline } from 'stream/promises'

// Buat folder uploads kalau belum ada
const uploadsDir = path.join(process.cwd(), 'uploads', 'products')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

export default async function productRoutes(fastify: FastifyInstance) {

  // Serve static files — gambar produk
  fastify.get('/uploads/products/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string }
    const filePath = path.join(uploadsDir, filename)
    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ error: 'Image not found' })
    }
    const stream = fs.createReadStream(filePath)
    const ext = path.extname(filename).toLowerCase()
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif'
    }
    reply.header('Content-Type', mimeMap[ext] || 'image/jpeg')
    reply.header('Cache-Control', 'public, max-age=31536000')
    return reply.send(stream)
  })

  // POST /products/:id/image — upload gambar produk
  fastify.post('/products/:id/image', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const data = await request.file()
    if (!data) return reply.status(400).send({ error: 'No file uploaded' })

    // Validasi tipe file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(data.mimetype)) {
      return reply.status(400).send({ error: 'File harus berupa gambar (jpg, png, webp)' })
    }

    // Hapus gambar lama kalau ada
    const existing = await fastify.prisma.product.findUnique({ where: { id } })
    if (existing?.image) {
      const oldFile = path.join(uploadsDir, path.basename(existing.image))
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile)
    }

    // Simpan file baru
    const ext = path.extname(data.filename) || '.jpg'
    const filename = `${id}-${Date.now()}${ext}`
    const filePath = path.join(uploadsDir, filename)
    await pipeline(data.file, fs.createWriteStream(filePath))

    // Update database
    const imageUrl = `/uploads/products/${filename}`
    const product = await fastify.prisma.product.update({
      where: { id },
      data: { image: imageUrl },
      include: { category: true, branch: true }
    })

    return reply.send(product)
  })

  // DELETE /products/:id/image — hapus gambar
  fastify.delete('/products/:id/image', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const existing = await fastify.prisma.product.findUnique({ where: { id } })
    if (existing?.image) {
      const filePath = path.join(uploadsDir, path.basename(existing.image))
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    }
    const product = await fastify.prisma.product.update({
      where: { id },
      data: { image: null },
      include: { category: true }
    })
    return reply.send(product)
  })

  // GET /products
  fastify.get('/products', { preHandler: authenticate }, async (request, reply) => {
    const { search, categoryId, branchId } = request.query as {
      search?: string; categoryId?: string; branchId?: string
    }
    const user = request.user as { role: string; branchId?: string }
    const effectiveBranchId = user.role === 'CASHIER' ? user.branchId : branchId

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
    if (!product) return reply.status(404).send({ error: 'Product not found' })
    return reply.send(product)
  })

  // GET /products/barcode/:barcode
  fastify.get('/products/barcode/:barcode', { preHandler: authenticate }, async (request, reply) => {
    const { barcode } = request.params as { barcode: string }
    const product = await fastify.prisma.product.findUnique({
      where: { barcode },
      include: { category: true }
    })
    if (!product) return reply.status(404).send({ error: 'Product not found' })
    return reply.send(product)
  })

  // POST /products
  fastify.post('/products', {
    preHandler: authorizeRoles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  }, async (request, reply) => {
    const { name, barcode, price, stock, categoryId, branchId } = request.body as {
      name: string; barcode?: string; price: number; stock?: number
      categoryId?: string; branchId?: string
    }
    if (!name || price === undefined) {
      return reply.status(400).send({ error: 'Name and price are required' })
    }
    const product = await fastify.prisma.product.create({
      data: {
        name,
        // Kalau barcode kosong, simpan null agar tidak conflict unique constraint
        barcode: barcode && barcode.trim() !== '' ? barcode.trim() : null,
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
      name?: string; barcode?: string; price?: number; stock?: number
      categoryId?: string; branchId?: string
    }

    // Cek apakah barcode yang dikirim sudah dipakai produk lain
    const normalizedBarcode = barcode && barcode.trim() !== '' ? barcode.trim() : null
    if (normalizedBarcode) {
      const conflict = await fastify.prisma.product.findUnique({
        where: { barcode: normalizedBarcode }
      })
      if (conflict && conflict.id !== id) {
        return reply.status(400).send({ error: `Barcode "${normalizedBarcode}" sudah digunakan produk lain` })
      }
    }

    const product = await fastify.prisma.product.update({
      where: { id },
      data: {
        name,
        // Kalau barcode kosong, simpan null agar tidak conflict unique constraint
        barcode: normalizedBarcode,
        price,
        stock,
        categoryId,
        branchId
      },
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