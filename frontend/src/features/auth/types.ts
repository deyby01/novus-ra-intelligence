export interface User {
  id: string
  email: string
}

export interface TokenPair {
  access: string
  refresh: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  password: string
  organizationName: string
}

export interface RegisterResponse {
  user: User
  organization: {
    id: string
    name: string
    slug: string
  }
  access: string
  refresh: string
}

export interface PasswordResetRequestInput {
  email: string
}

export interface PasswordResetConfirmInput {
  uid: string
  token: string
  newPassword: string
}
