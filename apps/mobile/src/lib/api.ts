import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

export const API_URL = 'http://10.10.2.234:3001'

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000
})

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {
    // ignore
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken')
        if (refreshToken) {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
          await SecureStore.setItemAsync('token', data.token)
          error.config.headers.Authorization = `Bearer ${data.token}`
          return api(error.config)
        }
      } catch {
        await SecureStore.deleteItemAsync('token')
        await SecureStore.deleteItemAsync('refreshToken')
      }
    }
    return Promise.reject(error)
  }
)

export default api