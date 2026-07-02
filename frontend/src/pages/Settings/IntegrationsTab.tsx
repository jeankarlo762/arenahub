import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, MessageCircle, RefreshCw, XCircle, Info, Phone } from 'lucide-react'
import {
  getWhatsAppStatus, connectWhatsApp, disconnectWhatsApp,
  getWhatsAppConfig, saveWhatsAppConfig,
  type WhatsAppInfo, type WhatsAppConfig,
} from '../../api/whatsapp.api'
import { formatPhone } from '../../utils/format'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  connected:    { label: 'Conectado',     color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',  icon: CheckCircle2 },
  connecting:   { label: 'Aguardando QR', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: Loader2 },
  disconnected: { label: 'Desconectado',  color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',        icon: XCircle },
}

const ALL_VARS = [
  { tag: '{nome}',    desc: 'Nome do cliente' },
  { tag: '{arena}',   desc: 'Nome da arena' },
  { tag: '{quadra}',  desc: 'Nome da quadra' },
  { tag: '{data}',    desc: 'Data (DD/MM/AAAA)' },
  { tag: '{horario}', desc: 'Horário (HH:MM às HH:MM)' },
  { tag: '{total}',   desc: 'Valor total (ex: 80,00)' },
]

// ── Editor de uma mensagem ──────────────────────────────────────────
function MessageBlock({
  title, description, value, onChange,
}: {
  title: string
  description: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500">{description}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ALL_VARS.map(({ tag, desc }) => (
          <button key={tag} onClick={() => onChange(value + tag)} title={desc}
            className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-md font-mono hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
            {tag}
          </button>
        ))}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={9}
        className="w-full px-4 py-3 text-sm font-mono border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-600 resize-none leading-relaxed"
      />
    </div>
  )
}

export function IntegrationsTab() {
  const [info, setInfo] = useState<WhatsAppInfo>({ status: 'disconnected', qr: null })
  const [loadingConn, setLoadingConn] = useState(false)

  const [config, setConfig] = useState<WhatsAppConfig>({ confirmation: '', reminder: '', owner: '', ownerNumber: '' })
  const [savedConfig, setSavedConfig] = useState<WhatsAppConfig>({ confirmation: '', reminder: '', owner: '', ownerNumber: '' })
  const [savingConfig, setSavingConfig] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function refresh() {
    try { setInfo(await getWhatsAppStatus()) } catch { /* ignore */ }
  }
  function startPolling() { stopPolling(); pollRef.current = setInterval(refresh, 3000) }
  function stopPolling() { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }

  useEffect(() => {
    refresh()
    getWhatsAppConfig().then((c) => { setConfig(c); setSavedConfig(c) }).catch(() => {})
    return () => stopPolling()
  }, [])

  useEffect(() => {
    if (info.status === 'connecting') startPolling()
    else stopPolling()
  }, [info.status])

  async function handleConnect() {
    setLoadingConn(true)
    try {
      await connectWhatsApp(); await refresh(); startPolling()
      toast.success('Escaneie o QR Code com o WhatsApp')
    } catch { toast.error('Erro ao iniciar conexão') }
    finally { setLoadingConn(false) }
  }

  async function handleDisconnect() {
    setLoadingConn(true)
    try {
      await disconnectWhatsApp(); setInfo({ status: 'disconnected', qr: null })
      toast.success('WhatsApp desconectado')
    } catch { toast.error('Erro ao desconectar') }
    finally { setLoadingConn(false) }
  }

  async function handleSaveConfig() {
    setSavingConfig(true)
    try {
      const saved = await saveWhatsAppConfig(config)
      setSavedConfig(saved); setConfig(saved)
      toast.success('Mensagens salvas!')
    } catch { toast.error('Erro ao salvar') }
    finally { setSavingConfig(false) }
  }

  const cfg = STATUS_CONFIG[info.status]
  const StatusIcon = cfg.icon
  const isDirty = JSON.stringify(config) !== JSON.stringify(savedConfig)

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Conexão WhatsApp ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
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

        <div className="px-6 py-5 space-y-5">
          {info.status === 'connected' && (
            <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
              <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">WhatsApp conectado!</p>
                <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">Clientes recebem confirmação e lembrete automáticos ao agendar pelo link público.</p>
              </div>
            </div>
          )}

          {info.status === 'connecting' && (
            <div className="flex flex-col items-center gap-4 py-2">
              {info.qr ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Abra o WhatsApp → <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong> → escaneie:
                  </p>
                  <div className="p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <img src={info.qr} alt="QR Code WhatsApp" className="w-52 h-52" />
                  </div>
                  <p className="text-xs text-gray-400">O QR Code expira em ~60s. Atualizando automaticamente...</p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 py-6">
                  <Loader2 size={32} className="animate-spin text-orange-500" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gerando QR Code...</p>
                </div>
              )}
            </div>
          )}

          {info.status === 'disconnected' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Conecte o WhatsApp da arena para enviar confirmações e lembretes automáticos.
            </p>
          )}

          <div className="flex items-center gap-3">
            {info.status !== 'connected' ? (
              <button onClick={handleConnect} disabled={loadingConn || info.status === 'connecting'}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {loadingConn ? <Loader2 size={14} className="animate-spin" /> : <MessageCircle size={14} />}
                {info.status === 'connecting' ? 'Aguardando QR Code...' : 'Conectar WhatsApp'}
              </button>
            ) : (
              <button onClick={handleDisconnect} disabled={loadingConn}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {loadingConn ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Desconectar
              </button>
            )}
            <button onClick={refresh} title="Atualizar status"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mensagens automáticas ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Mensagens automáticas</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Personalize os textos enviados pelo WhatsApp</p>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Variáveis */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl">
            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Clique numa variável para inseri-la. Ela é trocada automaticamente pelos dados reais do agendamento.
            </p>
          </div>

          <MessageBlock
            title="Confirmação para o cliente"
            description="Enviada ao cliente assim que a reserva é confirmada."
            value={config.confirmation}
            onChange={(v) => setConfig((c) => ({ ...c, confirmation: v }))}
          />

          <MessageBlock
            title="Lembrete 1h antes"
            description="Enviado ao cliente cerca de 1 hora antes do horário agendado."
            value={config.reminder}
            onChange={(v) => setConfig((c) => ({ ...c, reminder: v }))}
          />

          <MessageBlock
            title="Aviso de novo agendamento (para o dono)"
            description="Enviado para o número abaixo sempre que alguém agenda pelo link público."
            value={config.owner}
            onChange={(v) => setConfig((c) => ({ ...c, owner: v }))}
          />

          {/* Número do dono */}
          <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Número do dono (WhatsApp)</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                inputMode="tel"
                placeholder="(11) 99999-9999"
                value={config.ownerNumber}
                onChange={(e) => setConfig((c) => ({ ...c, ownerNumber: formatPhone(e.target.value) }))}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
              />
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">Deixe em branco para não receber o aviso de novo agendamento.</p>
          </div>

          {/* Salvar */}
          <div className="flex items-center justify-end gap-3">
            {isDirty && <span className="text-xs text-orange-500">Alterações não salvas</span>}
            <button onClick={handleSaveConfig} disabled={savingConfig || !isDirty}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
              {savingConfig ? <Loader2 size={14} className="animate-spin" /> : null}
              Salvar mensagens
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
