import { create } from 'zustand'
import type { User } from '../types/auth'
import { parseModulesConfig, type ModulesConfig } from '../config/modules'

interface AuthState {
  user: Pick<User, 'id' | 'name' | 'email' | 'role'> | null
  modules: ModulesConfig | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: AuthState['user'], access: string, refresh: string) => void
  clearAuth: () => void
  setUser: (data: Pick<User, 'id' | 'name' | 'email' | 'role'> & { modulesConfig?: string | null }) => void
  hasModule: (key: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  modules: null,
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
    set({ user: null, modules: null, accessToken: null, refreshToken: null, isAuthenticated: false })
  },

  setUser: ({ modulesConfig, ...user }) => {
    const modules = modulesConfig !== undefined ? parseModulesConfig(modulesConfig) : null
    set({ user, ...(modules !== null ? { modules } : {}) })
  },

  hasModule: (key: string) => {
    const { modules, user } = get()
    if (!modules) return true  // not loaded yet or superadmin — show all
    if (user?.role === 'ADMIN') return modules.admin.includes(key)
    if (user?.role === 'OPERATOR') return modules.operator.includes(key)
    return false
  },
}))
