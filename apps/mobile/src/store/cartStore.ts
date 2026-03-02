import { create } from 'zustand'
import type { CartItem } from '../lib/utils'

type AddItemInput = Omit<CartItem, 'quantity'> & { quantity?: number }

interface CartStore {
  items: CartItem[]
  discount: number
  paymentMethod: string
  addItem: (product: AddItemInput) => void
  removeItem: (id: string) => void
  updateQty: (id: string, qty: number) => void
  setDiscount: (discount: number) => void
  setPaymentMethod: (method: string) => void
  clearCart: () => void
  subtotal: () => number
  tax: () => number
  total: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  discount: 0,
  paymentMethod: 'CASH',

  addItem: (product) => {
    const items = get().items
    const existing = items.find(i => i.id === product.id)
    if (existing) {
      if (existing.quantity >= product.stock) return
      set({
        items: items.map(i =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      })
    } else {
      set({ items: [...items, { ...product, quantity: 1 }] })
    }
  },

  removeItem: (id) =>
    set({ items: get().items.filter(i => i.id !== id) }),

  updateQty: (id, qty) => {
    if (qty <= 0) {
      set({ items: get().items.filter(i => i.id !== id) })
    } else {
      set({ items: get().items.map(i => i.id === id ? { ...i, quantity: qty } : i) })
    }
  },

  setDiscount: (discount) => set({ discount }),
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  clearCart: () => set({ items: [], discount: 0, paymentMethod: 'CASH' }),

  subtotal: () =>
    get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),

  tax: () => {
    const sub = get().items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    return (sub - get().discount) * 0.11
  },

  total: () => {
    const sub = get().items.reduce((sum, i) => sum + i.price * i.quantity, 0)
    const tax = (sub - get().discount) * 0.11
    return sub - get().discount + tax
  }
}))