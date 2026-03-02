// Format currency ke Rupiah
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

// Hitung pajak
export const calculateTax = (subtotal: number, taxRate: number = 0.11): number => {
  return subtotal * taxRate
}

// Hitung total
export const calculateTotal = (subtotal: number, discount: number = 0, tax: number = 0): number => {
  return subtotal - discount + tax
}

// Generate invoice number
export const generateInvoiceNo = (branchCode: string): string => {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 9000) + 1000
  return `INV-${branchCode}-${dateStr}-${random}`
}

// Types
export type { Role, PaymentMethod, TransactionStatus } from './types'
export type { User, Branch, Category, Product, Transaction, TransactionItem } from './types'