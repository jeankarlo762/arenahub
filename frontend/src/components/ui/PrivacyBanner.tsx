import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Shield, X } from 'lucide-react'

const STORAGE_KEY = 'mt_privacy_accepted'

export function PrivacyBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="max-w-3xl mx-auto bg-gray-900 text-white rounded-2xl shadow-2xl border border-gray-700 p-4 flex items-start gap-4">
        <div className="p-1.5 bg-orange-500/20 rounded-lg shrink-0 mt-0.5">
          <Shield size={16} className="text-orange-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white mb-0.5">Privacidade e cookies</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            O MT Quadras usa armazenamento local para manter sua sessão ativa. Não utilizamos cookies de rastreamento ou publicidade.
            Ao continuar, você concorda com nossa{' '}
            <Link to="/privacidade" className="text-orange-400 hover:text-orange-300 underline" onClick={accept}>
              Política de Privacidade
            </Link>{' '}
            e{' '}
            <Link to="/termos" className="text-orange-400 hover:text-orange-300 underline" onClick={accept}>
              Termos de Uso
            </Link>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={accept}
            className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Entendi
          </button>
          <button
            onClick={accept}
            className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
