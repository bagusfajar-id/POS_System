export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CASHIER'

export type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER' | 'CARD'

export type TransactionStatus = 'COMPLETED' | 'CANCELLED' | 'REFUNDED'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  branchId?: string
  createdAt: string
  updatedAt: string
}

export interface Branch {
  id: string
  name: string
  address?: string
  phone?: string
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  createdAt: string
}

export interface Product {
  id: string
  name: string
  barcode?: string
  price: number
  stock: number
  categoryId?: string
  category?: Category
  branchId?: string
  createdAt: string
  updatedAt: string
}

export interface TransactionItem {
  id: string
  productId: string
  product: Product
  quantity: number
  price: number
  subtotal: number
}

export interface Transaction {
  id: string
  invoiceNo: string
  userId: string
  branchId: string
  items: TransactionItem[]
  subtotal: number
  discount: number
  tax: number
  total: number
  paymentMethod: PaymentMethod
  amountPaid: number
  change: number
  status: TransactionStatus
  createdAt: string
}