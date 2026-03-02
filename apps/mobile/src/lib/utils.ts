export const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(date))

export const generateInvoiceNo = (branchCode: string) => {
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 9000) + 1000
  return `INV-${branchCode.toUpperCase()}-${dateStr}-${random}`
}

export const calculateCart = (items: CartItem[]) => {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const tax = subtotal * 0.11
  const total = subtotal + tax
  return { subtotal, tax, total }
}

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  stock: number
}