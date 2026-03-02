import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Buat branch
  const branch = await prisma.branch.create({
    data: {
      name: 'Cabang Utama',
      address: 'Jl. Utama No. 1',
      phone: '021-12345678'
    }
  })

  // Buat super admin
  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@pos.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'SUPER_ADMIN',
      branchId: branch.id
    }
  })

  // Buat kasir
  await prisma.user.create({
    data: {
      name: 'Kasir 1',
      email: 'kasir@pos.com',
      password: await bcrypt.hash('kasir123', 10),
      role: 'CASHIER',
      branchId: branch.id
    }
  })

  // Buat kategori
  const categories = await Promise.all([
    prisma.category.create({ data: { name: 'Makanan' } }),
    prisma.category.create({ data: { name: 'Minuman' } }),
    prisma.category.create({ data: { name: 'Snack' } }),
  ])

  // Buat produk
  await prisma.product.createMany({
    data: [
      { name: 'Nasi Goreng', price: 25000, stock: 100, categoryId: categories[0].id, branchId: branch.id },
      { name: 'Mie Goreng', price: 20000, stock: 100, categoryId: categories[0].id, branchId: branch.id },
      { name: 'Es Teh', price: 5000, stock: 200, categoryId: categories[1].id, branchId: branch.id },
      { name: 'Es Jeruk', price: 7000, stock: 150, categoryId: categories[1].id, branchId: branch.id },
      { name: 'Keripik', price: 10000, stock: 50, categoryId: categories[2].id, branchId: branch.id },
    ]
  })

  console.log('✅ Seed data berhasil dibuat!')
  console.log('📧 Admin: admin@pos.com | Password: admin123')
  console.log('📧 Kasir: kasir@pos.com | Password: kasir123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())