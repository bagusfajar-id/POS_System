import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
  role: string
  branch?: { id: string; name: string }
}

interface AuthStore {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string, refreshToken: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: (() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })(),
  token: localStorage.getItem('token'),

  setAuth: (user, token, refreshToken) => {
    localStorage.setItem('token', token)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(user))
    set({ user, token })
  },

  logout: () => {
    localStorage.clear()
    set({ user: null, token: null })
  },

  isAuthenticated: () => !!get().token
}))