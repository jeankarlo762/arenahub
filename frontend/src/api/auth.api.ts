import api from './axios'
import type { LoginResponse, User } from '../types/auth'

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', { email, password })
  return res.data
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken })
}

export async function getMe(): Promise<User> {
  const res = await api.get<User>('/auth/me')
  return res.data
}

export async function forgotPassword(phone: string): Promise<{ sent: boolean }> {
  const res = await api.post<{ sent: boolean }>('/auth/forgot-password', { phone })
  return res.data
}

export async function verifyResetCode(phone: string, code: string): Promise<{ resetToken: string }> {
  const res = await api.post<{ resetToken: string }>('/auth/verify-reset-code', { phone, code })
  return res.data
}

export async function resetPassword(resetToken: string, password: string): Promise<void> {
  await api.post('/auth/reset-password', { resetToken, password })
}
