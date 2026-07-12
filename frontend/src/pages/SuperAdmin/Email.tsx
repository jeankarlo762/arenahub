import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail, Eye, EyeOff, Check, Send, Link2, Unplug, Copy, Info } from 'lucide-react'
import * as emailApi from '../../api/email.api'
import type { EmailConfig } from '../../api/email.api'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { SuperAdminLayout } from './SuperAdminLayout'

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none'

const VARS_HINT = '{nome} · {arena} · {quadra} · {data} · {horario} · {total}'

export default function EmailPage() {
  const [params, setParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [cfg, setCfg] = useState<EmailConfig | null>(null)

  // Form state
  const [senderEmail, setSenderEmail] = useState('')
  const [senderName, setSenderName] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  const [clientSubject, setClientSubject] = useState('')
  const [clientBodyHtml, setClientBodyHtml] = useState('')
  const [ownerSubject, setOwnerSubject] = useState('')
  const [ownerBodyHtml, setOwnerBodyHtml] = useState('')

  const [saving, setSaving] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [testTo, setTestTo] = useState('')
  const [testing, setTesting] = useState(false)

  function apply(c: EmailConfig) {
    setCfg(c)
    setSenderEmail(c.senderEmail)
    setSenderName(c.senderName)
    setClientId(c.clientId)
    setClientSubject(c.templates.clientSubject)
    setClientBodyHtml(c.templates.clientBodyHtml)
    setOwnerSubject(c.templates.ownerSubject)
    setOwnerBodyHtml(c.templates.ownerBodyHtml)
  }

  async function load() {
    setLoading(true)
    try {
      apply(await emailApi.getEmailConfig())
    } catch {
      toast.error('Erro ao carregar configuração de e-mail')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Feedback do retorno do OAuth (redirect do Google → backend → aqui)
  useEffect(() => {
    if (params.get('email_connected')) {
      toast.success('Google conectado com sucesso!')
      params.delete('email_connected'); setParams(params, { replace: true }); load()
    } else if (params.get('email_error')) {
      toast.error(`Falha ao conectar: ${params.get('email_error')}`)
      params.delete('email_error'); setParams(params, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function formValues(): emailApi.UpdateEmailConfigInput {
    return {
      senderEmail, senderName, clientId,
      ...(clientSecret.trim() ? { clientSecret } : {}),
      clientSubject, clientBodyHtml, ownerSubject, ownerBodyHtml,
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      apply(await emailApi.updateEmailConfig(formValues()))
      setClientSecret('')
      toast.success('Configuração salva')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleConnect() {
    if (!senderEmail.trim() || !clientId.trim() || (!clientSecret.trim() && !cfg?.hasClientSecret)) {
      toast.error('Preencha e-mail remetente, Client ID e Client Secret antes de conectar')
      return
    }
    setConnecting(true)
    try {
      // Garante que o backend tem a config mais recente antes do fluxo OAuth
      await emailApi.updateEmailConfig(formValues())
      const { url } = await emailApi.getGoogleAuthUrl()
      window.location.href = url
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Erro ao iniciar conexão')
      setConnecting(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Desconectar a conta Google? Os e-mails deixarão de ser enviados até reconectar.')) return
    try {
      await emailApi.disconnectEmail()
      toast.success('Google desconectado')
      load()
    } catch {
      toast.error('Erro ao desconectar')
    }
  }

  async function handleTest() {
    if (!testTo.trim()) { toast.error('Informe um e-mail para o teste'); return }
    setTesting(true)
    try {
      await emailApi.sendTestEmail(testTo.trim())
      toast.success('E-mail de teste enviado')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message
      toast.error(msg ?? 'Falha ao enviar teste')
    } finally {
      setTesting(false)
    }
  }

  function copyRedirect() {
    if (cfg?.redirectUri) {
      navigator.clipboard.writeText(cfg.redirectUri).then(() => toast.success('URI copiada'))
    }
  }

  return (
    <SuperAdminLayout title="E-mail" subtitle="Notificações por e-mail (Gmail via OAuth2)">
      {loading || !cfg ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Spinner size="md" />
          <span className="text-sm text-gray-400">Carregando...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-w-2xl">
          {/* Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cfg.connected ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              <Mail size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {cfg.connected ? 'Google conectado — envio ativo' : 'Não conectado'}
              </p>
              <p className="text-xs text-gray-400">
                {cfg.connected
                  ? `Remetente: ${cfg.senderEmail}${cfg.connectedAt ? ` · desde ${new Date(cfg.connectedAt).toLocaleDateString('pt-BR')}` : ''}`
                  : 'Configure as credenciais e conecte a conta Google para enviar notificações.'}
              </p>
            </div>
            {cfg.connected ? (
              <Button variant="ghost" onClick={handleDisconnect}>
                <Unplug size={15} className="text-red-500" /> Desconectar
              </Button>
            ) : (
              <Button onClick={handleConnect} loading={connecting}>
                <Link2 size={15} /> Conectar Google
              </Button>
            )}
          </div>

          {/* Passo a passo */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-semibold">Como configurar</p>
              <ol className="list-decimal ml-4 space-y-0.5 text-blue-700">
                <li>No Google Cloud, crie credenciais OAuth 2.0 (tipo "Aplicativo da Web").</li>
                <li>Adicione a URI de redirecionamento abaixo nas credenciais.</li>
                <li>Cole o Client ID, Client Secret e o e-mail remetente e salve.</li>
                <li>Clique em "Conectar Google" e autorize o acesso.</li>
              </ol>
            </div>
          </div>

          {/* Credenciais */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-900">Credenciais OAuth</h2>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">URI de redirecionamento (registre no Google)</label>
              <div className="flex gap-2">
                <input readOnly value={cfg.redirectUri || 'Salve a configuração para gerar'} className={`${inputCls} bg-gray-50 text-gray-500`} />
                <Button variant="secondary" onClick={copyRedirect} disabled={!cfg.redirectUri}><Copy size={15} /></Button>
              </div>
              <p className="text-xs text-gray-400">Gerada a partir do domínio do backend ao salvar/conectar.</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">E-mail remetente (Gmail)</label>
                <input value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} placeholder="arena@gmail.com" className={inputCls} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Nome do remetente</label>
                <input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="ArenaHub" className={inputCls} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Client ID</label>
              <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="xxxx.apps.googleusercontent.com" className={inputCls} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Client Secret</label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder={cfg.hasClientSecret ? '•••••••• (deixe vazio para não alterar)' : 'Cole o client secret'}
                  className={`${inputCls} pr-10`}
                />
                <button type="button" onClick={() => setShowSecret((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                  {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <Button onClick={handleSave} loading={saving}><Check size={15} /> Salvar credenciais</Button>
            </div>
          </div>

          {/* Teste */}
          {cfg.connected && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-900">Enviar e-mail de teste</h2>
              <div className="flex gap-2">
                <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="seu@email.com" className={inputCls} />
                <Button onClick={handleTest} loading={testing}><Send size={15} /> Enviar</Button>
              </div>
            </div>
          )}

          {/* Templates */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Templates</h2>
              <p className="text-xs text-gray-400 mt-0.5">Variáveis disponíveis: <span className="font-mono">{VARS_HINT}</span></p>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">Para o cliente</p>
              <input value={clientSubject} onChange={(e) => setClientSubject(e.target.value)} placeholder="Assunto" className={inputCls} />
              <textarea value={clientBodyHtml} onChange={(e) => setClientBodyHtml(e.target.value)} rows={6} placeholder="Corpo (HTML)" className={`${inputCls} font-mono text-xs`} />
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-gray-500 uppercase">Para o dono da arena</p>
              <input value={ownerSubject} onChange={(e) => setOwnerSubject(e.target.value)} placeholder="Assunto" className={inputCls} />
              <textarea value={ownerBodyHtml} onChange={(e) => setOwnerBodyHtml(e.target.value)} rows={6} placeholder="Corpo (HTML)" className={`${inputCls} font-mono text-xs`} />
            </div>

            <div>
              <Button onClick={handleSave} loading={saving}><Check size={15} /> Salvar templates</Button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  )
}
