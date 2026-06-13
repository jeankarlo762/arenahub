import { create } from 'zustand'
import type { User } from '../types/auth'

interface AuthState {
  user: Pick<User, 'id' | 'name' | 'email' | 'role'> | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthState['user'], access: string, refresh: string) => void
  clearAuth: () => void
  setUser: (user: AuthState['user']) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),

  setAuth: (user, access, refresh) => {
    localStorage.setItem('accessToken', access)
    localStorage.setItem('refreshToken', refresh)
    set({ user, accessToken: access, refreshToken: refresh, isAuthenticated: true })
  },

  clearAuth: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
  },

  setUser: (user) => set({ user }),
}))
