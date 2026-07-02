export interface User {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'OPERATOR' | 'SUPERADMIN'
  phone?: string | null
  active: boolean
  createdAt: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: Pick<User, 'id' | 'name' | 'email' | 'role'>
}
