import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, MessageCircle, RefreshCw, XCircle } from 'lucide-react'
import { getWhatsAppStatus, connectWhatsApp, disconnectWhatsApp, type WhatsAppInfo } from '../../api/whatsapp.api'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  connected:    { label: 'Conectado',     color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  icon: CheckCircle2 },
  connecting:   { label: 'Aguardando QR', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Loader2 },
  disconnected: { label: 'Desconectado',  color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',        icon: XCircle },
}

export function IntegrationsTab() {
  const [info, setInfo] = useState<WhatsAppInfo>({ status: 'disconnected', qr: null })
  const [loading, setLoading] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function refresh() {
    try {
      const data = await getWhatsAppStatus()
      setInfo(data)
    } catch {
      // silently ignore
    }
  }

  function startPolling() {
    stopPolling()
    pollRef.current = setInterval(refresh, 3000)
  }

  function stopPolling() {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
  }

  useEffect(() => {
    refresh()
    return () => stopPolling()
  }, [])

  useEffect(() => {
    if (info.status === 'connecting') {
      startPolling()
    } else {
      stopPolling()
    }
  }, [info.status])

  async function handleConnect() {
    setLoading(true)
    try {
      await connectWhatsApp()
      await refresh()
      startPolling()
      toast.success('Escaneie o QR Code com o WhatsApp')
    } catch {
      toast.error('Erro ao iniciar conexão')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisconnect() {
    setLoading(true)
    try {
      await disconnectWhatsApp()
      setInfo({ status: 'disconnected', qr: null })
      toast.success('WhatsApp desconectado')
    } catch {
      toast.error('Erro ao desconectar')
    } finally {
      setLoading(false)
    }
  }

  const cfg = STATUS_CONFIG[info.status]
  const StatusIcon = cfg.icon

  return (
    <div className="space-y-6">
      {/* Baileys / WhatsApp card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
              <MessageCircle size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">WhatsApp</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Notificações automáticas de agendamento</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${cfg.color}`}>
            <StatusIcon size={12} className={info.status === 'connecting' ? 'animate-spin' : ''} />
            {cfg.label}
          </span>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Connected state */}
          {info.status === 'connected' && (
            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
              <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">WhatsApp conectado!</p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                  Clientes que agendarem pelo link público receberão uma mensagem de confirmação automaticamente.
                </p>
              </div>
            </div>
          )}

          {/* QR Code */}
          {info.status === 'connecting' && (
            <div className="flex flex-col items-center gap-4 py-2">
              {info.qr ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Abra o WhatsApp no celular → <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong> → escaneie:
                  </p>
                  <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <img src={info.qr} alt="QR Code WhatsApp" className="w-52 h-52" />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">O QR Code expira em ~60 segundos. Atualizando automaticamente...</p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 size={32} className="animate-spin text-orange-500" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gerando QR Code...</p>
                </div>
              )}
            </div>
          )}

          {/* Disconnected instructions */}
          {info.status === 'disconnected' && (
            <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1.5">
              <p>Conecte o WhatsApp da arena para enviar confirmações automáticas quando alguém agendar pelo link público.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">Use um número dedicado à arena. Não desconecte o WhatsApp no celular após escanear.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            {info.status !== 'connected' ? (
              <button
                onClick={handleConnect}
                disabled={loading || info.status === 'connecting'}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                {info.status === 'connecting' ? 'Aguardando QR Code...' : 'Conectar WhatsApp'}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Desconectar
              </button>
            )}
            <button
              onClick={refresh}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Atualizar status"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
