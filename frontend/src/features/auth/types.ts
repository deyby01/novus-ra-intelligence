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
