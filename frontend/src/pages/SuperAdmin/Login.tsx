import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Spinner } from '../../components/ui/Spinner'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

type FormData = z.infer<typeof schema>

export default function SuperAdminLoginPage() {
  const { login, loading, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === 'SUPERADMIN' ? '/superadmin' : '/', { replace: true })
    }
  }, [isAuthenticated, navigate, user])

  async function onSubmit(data: FormData) {
    try {
      const result = await login(data.email, data.password)
      if (result.user.role !== 'SUPERADMIN') {
        toast.error('Acesso restrito a Super Administradores')
        return
      }
      navigate('/superadmin', { replace: true })
    } catch {
      toast.error('Email ou senha incorretos')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-white font-bold text-xl tracking-tight">ArenaHub</h1>
            <p className="text-gray-500 text-xs mt-0.5">Painel Super Administrador · MK Sistemas</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="mb-7">
            <h2 className="text-lg font-semibold text-white">Acesso Restrito</h2>
            <p className="text-gray-500 text-sm mt-1">Somente para super administradores do sistema</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-400">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="email"
                  placeholder="superadmin@quadras.com"
                  autoComplete="username"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-gray-800 text-white placeholder-gray-600 transition-all outline-none
                    ${errors.email
                      ? 'border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-gray-700 focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20'
                    }`}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-400">Senha</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm bg-gray-800 text-white placeholder-gray-600 transition-all outline-none
                    ${errors.password
                      ? 'border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-gray-700 focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/20'
                    }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
            >
              {loading ? <Spinner size="sm" /> : 'Entrar no painel'}
            </button>
          </form>
        </div>

        {/* Back link */}
        <p className="mt-5 text-center text-xs text-gray-600">
          Não é super admin?{' '}
          <a href="/login" className="text-gray-400 hover:text-orange-400 transition-colors">
            Ir para o login comum
          </a>
        </p>
      </div>
    </div>
  )
}
