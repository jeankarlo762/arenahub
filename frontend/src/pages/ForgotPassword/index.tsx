import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Phone, ArrowLeft, ArrowRight, KeyRound, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react'
import * as authApi from '../../api/auth.api'
import { Spinner } from '../../components/ui/Spinner'

type Step = 'phone' | 'code' | 'password' | 'done'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('phone')
  const [loading, setLoading] = useState(false)

  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault()
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 10) { toast.error('Informe um número de telefone válido'); return }
    setLoading(true)
    try {
      await authApi.forgotPassword(`+55${cleaned}`)
      setStep('code')
      toast.success('Código enviado por SMS!')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao enviar código. Verifique o número.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) { toast.error('Digite o código de 6 dígitos'); return }
    setLoading(true)
    try {
      const cleaned = phone.replace(/\D/g, '')
      const res = await authApi.verifyResetCode(`+55${cleaned}`, code)
      setResetToken(res.resetToken)
      setStep('password')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Código inválido ou expirado')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) { toast.error('A senha deve ter no mínimo 6 caracteres'); return }
    if (password !== confirmPassword) { toast.error('As senhas não coincidem'); return }
    setLoading(true)
    try {
      await authApi.resetPassword(resetToken, password)
      setStep('done')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao redefinir senha')
    } finally {
      setLoading(false)
    }
  }

  const stepNumber = step === 'phone' ? 1 : step === 'code' ? 2 : step === 'password' ? 3 : 3

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-orange-500 to-orange-700 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-white/10 rounded-full" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-orange-600" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">ArenaHub</span>
          </div>
        </div>
        <div className="relative z-10 space-y-4">
          <h1 className="text-4xl font-bold text-white leading-tight">Recuperação de senha</h1>
          <p className="text-orange-100 text-lg leading-relaxed">
            Enviaremos um código de verificação para o seu número de celular cadastrado.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            {[
              { n: 1, label: 'Informe seu celular' },
              { n: 2, label: 'Digite o código SMS' },
              { n: 3, label: 'Crie sua nova senha' },
            ].map(({ n, label }) => (
              <div key={n} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${stepNumber >= n ? 'bg-white text-orange-600' : 'bg-white/20 text-white'}`}>
                  {n}
                </div>
                <span className={`text-sm ${stepNumber >= n ? 'text-white font-medium' : 'text-orange-200'}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-orange-200 text-xs">Sistema de gestão profissional</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-sm">
          {step !== 'done' && (
            <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-8 transition-colors">
              <ArrowLeft size={14} /> Voltar ao login
            </Link>
          )}

          {/* Step 1 — Phone */}
          {step === 'phone' && (
            <>
              <div className="mb-8">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <Phone size={22} className="text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Esqueceu a senha?</h2>
                <p className="text-gray-500 text-sm">Informe seu número de celular cadastrado e enviaremos um código de verificação.</p>
              </div>
              <form onSubmit={handleSendCode} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Celular</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">+55</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      autoComplete="tel"
                      className="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 text-sm bg-white transition-all outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  {loading ? <Spinner size="sm" /> : <><span>Enviar código</span><ArrowRight size={16} /></>}
                </button>
              </form>
            </>
          )}

          {/* Step 2 — SMS Code */}
          {step === 'code' && (
            <>
              <div className="mb-8">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <KeyRound size={22} className="text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Código SMS</h2>
                <p className="text-gray-500 text-sm">
                  Enviamos um código de 6 dígitos para{' '}
                  <span className="font-medium text-gray-700">+55 {phone}</span>.
                  Válido por 10 minutos.
                </p>
              </div>
              <form onSubmit={handleVerifyCode} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Código de verificação</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    autoComplete="one-time-code"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 text-sm bg-white text-center text-xl tracking-[0.5em] font-bold transition-all outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  {loading ? <Spinner size="sm" /> : <><span>Verificar código</span><ArrowRight size={16} /></>}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="text-sm text-gray-400 hover:text-orange-500 transition-colors text-center"
                >
                  Não recebi o código — tentar novamente
                </button>
              </form>
            </>
          )}

          {/* Step 3 — New Password */}
          {step === 'password' && (
            <>
              <div className="mb-8">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                  <Lock size={22} className="text-orange-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Nova senha</h2>
                <p className="text-gray-500 text-sm">Escolha uma senha segura com no mínimo 6 caracteres.</p>
              </div>
              <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 text-sm bg-white transition-all outline-none"
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" tabIndex={-1}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">Confirmar nova senha</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 text-sm bg-white transition-all outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  {loading ? <Spinner size="sm" /> : <><span>Redefinir senha</span><ArrowRight size={16} /></>}
                </button>
              </form>
            </>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={32} className="text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Senha redefinida!</h2>
                <p className="text-gray-500 text-sm">Sua senha foi atualizada com sucesso. Faça login com a nova senha.</p>
              </div>
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2.5 px-6 rounded-xl transition-colors text-sm"
              >
                Ir para o login <ArrowRight size={16} />
              </button>
            </div>
          )}

          {step !== 'done' && (
            <p className="mt-8 text-center text-xs text-gray-400">
              ArenaHub — Gestão de Quadras Esportivas
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
