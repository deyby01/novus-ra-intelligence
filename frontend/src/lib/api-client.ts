import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/features/auth/store'
import type { TokenPair } from '@/features/auth/types'

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

export const apiClient = axios.create({ baseURL })

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// A bare client (no interceptors) so refreshing can't recurse into itself.
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const { data } = await axios.post<TokenPair>(`${baseURL}/auth/refresh/`, {
    refresh: refreshToken,
  })
  useAuthStore.getState().setTokens(data)
  return data.access
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error)
    }
    const original = error.config as RetryableConfig | undefined
    const { refreshToken, clear } = useAuthStore.getState()

    if (error.response?.status !== 401 || !original || original._retry) {
      return Promise.reject(error)
    }
    if (!refreshToken) {
      clear()
      return Promise.reject(error)
    }

    original._retry = true
    try {
      const newAccess = await refreshAccessToken(refreshToken)
      original.headers.Authorization = `Bearer ${newAccess}`
      return apiClient(original)
    } catch (refreshError) {
      clear()
      return Promise.reject(refreshError)
    }
  },
)
