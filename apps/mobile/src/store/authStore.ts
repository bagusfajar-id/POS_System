import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

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
  setAuth: (user: User, token: string, refreshToken: string) => Promise<void>
  logout: () => Promise<void>
  loadAuth: () => Promise<void>
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: null,

  setAuth: async (user, token, refreshToken) => {
    await SecureStore.setItemAsync('token', token)
    await SecureStore.setItemAsync('refreshToken', refreshToken)
    await SecureStore.setItemAsync('user', JSON.stringify(user))
    set({ user, token })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token')
    await SecureStore.deleteItemAsync('refreshToken')
    await SecureStore.deleteItemAsync('user')
    set({ user: null, token: null })
  },

  loadAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('token')
      const userStr = await SecureStore.getItemAsync('user')
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr) })
      }
    } catch {
      // ignore
    }
  },

  isAuthenticated: () => !!get().token
}))