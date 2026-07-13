import { apiClient } from '@/lib/api-client'
import type {
  LoginInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  RegisterInput,
  RegisterResponse,
  TokenPair,
  User,
} from './types'

export async function login(input: LoginInput): Promise<TokenPair> {
  const { data } = await apiClient.post<TokenPair>('/auth/login/', input)
  return data
}

export async function register(
  input: RegisterInput,
): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/auth/register/', {
    email: input.email,
    password: input.password,
    organization_name: input.organizationName,
  })
  return data
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me/')
  return data
}

export async function logout(refresh: string): Promise<void> {
  await apiClient.post('/auth/logout/', { refresh })
}

export async function requestPasswordReset(
  input: PasswordResetRequestInput,
): Promise<void> {
  await apiClient.post('/auth/password/reset/', { email: input.email })
}

export async function confirmPasswordReset(
  input: PasswordResetConfirmInput,
): Promise<void> {
  await apiClient.post('/auth/password/reset/confirm/', {
    uid: input.uid,
    token: input.token,
    new_password: input.newPassword,
  })
}
