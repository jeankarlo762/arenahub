import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Spinner } from '../../components/ui/Spinner'

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const { login, loading, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (isAuthenticated) {
      navigate(user?.role === 'SUPERADMIN' ? '/superadmin' : '/', { replace: true })
    }
  }, [isAuthenticated, navigate, user])

  async function onSubmit(data: FormData) {
    try {
      const result = await login(data.email, data.password)
      if (result.user.role === 'SUPERADMIN') {
        navigate('/superadmin', { replace: true })
        return
      }
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      // Show the server message for blocked accounts (e.g. arena desativada); generic otherwise
      toast.error(status === 403 && msg ? msg : 'Email ou senha incorretos')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-orange-700 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-white/10 rounded-full" />
        <div className="absolute top-1/2 right-8 w-48 h-48 bg-white/5 rounded-full" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-8">
          {/* Logo centralizada e grande */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-28 h-28 bg-white/20 rounded-3xl flex items-center justify-center shadow-2xl">
              <span
                className="font-black italic text-6xl text-white leading-none select-none"
                style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}
              >
                MT
              </span>
            </div>
            <div>
              <p className="text-white font-bold text-3xl tracking-tight">MT Quadras</p>
              <p className="text-white/70 text-sm mt-1">May Tecnologia</p>
            </div>
          </div>

          <div className="w-16 h-px bg-white/30" />

          <div className="space-y-3">
            <h1 className="text-2xl font-semibold text-white leading-snug">
              Gestão de quadras<br />esportivas simplificada
            </h1>
            <p className="text-white/70 text-sm leading-relaxed max-w-xs">
              Agendamentos, torneios e controle financeiro em um só lugar.
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {['Agendamentos em tempo real', 'Controle financeiro completo', 'Gestão de torneios'].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" className="w-3 h-3" stroke="white" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-white/80 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="font-black italic text-sm text-white leading-none" style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}>MT</span>
            </div>
            <span className="font-bold text-gray-900 text-lg">MT Quadras</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Bem-vindo de volta</h2>
            <p className="text-gray-500 text-sm">Entre com suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm bg-white transition-all outline-none
                    ${errors.email
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                      : 'border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
                    }`}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Password field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm bg-white transition-all outline-none
                    ${errors.password
                      ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                      : 'border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100'
                    }`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
            >
              {loading ? (
                <Spinner size="sm" />
              ) : (
                <>
                  Entrar
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            MT Quadras — May Tecnologia
          </p>
        </div>
      </div>
    </div>
  )
}
