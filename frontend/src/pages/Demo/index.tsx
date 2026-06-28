import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'
import * as authApi from '../../api/auth.api'

export default function DemoPage() {
  const navigate = useNavigate()
  const { setAuth, isAuthenticated } = useAuthStore()
  const [error, setError] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true })
      return
    }

    authApi.demoLogin()
      .then(({ accessToken, refreshToken, user }) => {
        setAuth(user, accessToken, refreshToken)
        navigate('/', { replace: true })
      })
      .catch(() => setError(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="flex flex-col items-center gap-6 text-center px-6">
        {/* Logo */}
        <div className="w-20 h-20 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
          <span
            className="font-black italic text-4xl text-white leading-none select-none"
            style={{ fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif' }}
          >
            MT
          </span>
        </div>

        {error ? (
          <>
            <div>
              <p className="text-white font-semibold text-lg">Erro ao carregar demo</p>
              <p className="text-gray-400 text-sm mt-1">Não foi possível conectar ao servidor.</p>
            </div>
            <button
              onClick={() => { setError(false); window.location.reload() }}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Tentar novamente
            </button>
          </>
        ) : (
          <>
            <div>
              <p className="text-white font-semibold text-lg">Carregando demo...</p>
              <p className="text-gray-400 text-sm mt-1">Preparando o ambiente de demonstração</p>
            </div>
            {/* Spinner */}
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </>
        )}
      </div>
    </div>
  )
}
