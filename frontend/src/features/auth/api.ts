import { apiClient } from '@/lib/api-client'
import type { LoginInput, TokenPair, User } from './types'

export async function login(input: LoginInput): Promise<TokenPair> {
  const { data } = await apiClient.post<TokenPair>('/auth/login/', input)
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me/')
  return data
}

export async function logout(refresh: string): Promise<void> {
  await apiClient.post('/auth/logout/', { refresh })
}
