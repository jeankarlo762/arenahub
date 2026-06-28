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

export async function demoLogin(): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/demo')
  return res.data
}

