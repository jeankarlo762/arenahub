import { useEffect, useState } from 'react'
import { Layout } from '../../components/layout/Layout'
import { LifeBuoy, ChevronDown, Plus, Download, MessageSquare, Clock, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { listMyTickets, createSupportTicket } from '../../api/support.api'
import type { SupportTicket } from '../../api/support.api'
import toast from 'react-hot-toast'

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof Clock; label: string }> = {
  OPEN:        { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-400',   icon: Clock,         label: 'Aberto' },
  IN_PROGRESS: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', icon: AlertCircle,   label: 'Em Andamento' },
  RESOLVED:    { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle2, label: 'Resolvido' },
  CLOSED:      { bg: 'bg-gray-100 dark:bg-gray-700',      text: 'text-gray-600 dark:text-gray-400',   icon: XCircle,       label: 'Fechado' },
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function TicketCard({ ticket }: { ticket: SupportTicket }) {
  const [expanded, setExpanded] = useState(false)
  const s = STATUS_STYLES[ticket.status] ?? STATUS_STYLES.OPEN
  const StatusIcon = s.icon
  const hasReply = !!ticket.replyText

  function downloadAttachment() {
    if (!ticket.attachmentBase64 || !ticket.attachmentName) return
    const ext = ticket.attachmentName.split('.').pop()?.toLowerCase() ?? ''
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', txt: 'text/plain', csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
    const mime = mimeMap[ext] ?? 'application/octet-stream'
    const link = document.createElement('a')
    link.href = `data:${mime};base64,${ticket.attachmentBase64}`
    link.download = ticket.attachmentName
    link.click()
  }

  return (
    <div className={`bg-white dark:bg-gray-900 border rounded-xl overflow-hidden transition-all ${
      hasReply ? 'border-green-200 dark:border-green-800' : 'border-gray-200 dark:border-gray-700'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${s.bg}`}>
          <StatusIcon size={14} className={s.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
              {s.label}
            </span>
            {hasReply && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                <MessageSquare size={10} /> Respondido
              </span>
            )}
            {ticket.attachmentName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                <Download size={10} /> anexo
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1 truncate">{ticket.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Aberto em {formatDate(ticket.createdAt)}</p>
        </div>
        <ChevronDown size={16} className={`text-gray-400 dark:text-gray-500 shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-4">
          {/* Minha descrição */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Sua mensagem</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 rounded-lg p-3 leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {ticket.attachmentName && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Anexo</p>
              <button
                onClick={downloadAttachment}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
              >
                <Download size={14} />
                {ticket.attachmentName}
              </button>
            </div>
          )}

          {/* Resposta do suporte */}
          {hasReply ? (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <MessageSquare size={13} className="text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">Resposta do Suporte</p>
                {ticket.repliedAt && (
                  <span className="ml-auto text-xs text-green-600/70 dark:text-green-500/70">{formatDate(ticket.repliedAt)}</span>
                )}
              </div>
              <p className="text-sm text-green-900 dark:text-green-200 whitespace-pre-wrap leading-relaxed">{ticket.replyText}</p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2.5">
              <Clock size={13} />
              Aguardando resposta da equipe de suporte…
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function NewTicketModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [attachment, setAttachment] = useState<{ name: string; base64: string } | null>(null)
  const [loading, setLoading] = useState(false)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Arquivo muito grande. Máx. 5 MB'); return }
    const reader = new FileReader()
    reader.onload = () => setAttachment({ name: file.name, base64: (reader.result as string).split(',')[1] })
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    setLoading(true)
    try {
      await createSupportTicket({ title: title.trim(), description: description.trim(), attachmentBase64: attachment?.base64, attachmentName: attachment?.name })
      toast.success('Ticket enviado!')
      onSuccess()
    } catch {
      toast.error('Erro ao enviar ticket.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <LifeBuoy size={18} className="text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Novo Ticket</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Título <span className="text-red-500">*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Descreva o problema brevemente" maxLength={200} required
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Descrição <span className="text-red-500">*</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detalhe o que aconteceu, passos para reproduzir, etc." rows={5} maxLength={5000} required
              className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 dark:focus:ring-orange-600 resize-none" />
            <p className="text-xs text-right text-gray-400 dark:text-gray-500 mt-1">{description.length}/5000</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Anexo <span className="text-gray-400 dark:text-gray-500 font-normal">(opcional, máx. 5 MB)</span></label>
            {attachment ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
                <Download size={14} className="text-orange-500 shrink-0" />
                <span className="text-sm text-orange-700 dark:text-orange-300 truncate flex-1">{attachment.name}</span>
                <button type="button" onClick={() => setAttachment(null)} className="text-orange-400 hover:text-orange-600 text-xs">×</button>
              </div>
            ) : (
              <label className="flex items-center gap-2 w-full px-3 py-2.5 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-orange-400 hover:text-orange-500 transition-colors cursor-pointer">
                <Download size={15} /> Clique para anexar
                <input type="file" accept="image/*,.pdf,.txt,.csv,.xlsx,.docx" onChange={handleFileChange} className="hidden" />
              </label>
            )}
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button type="submit" disabled={loading || !title.trim() || !description.trim()}
              className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={15} className="animate-spin" /> Enviando…</> : 'Enviar Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SuportePage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await listMyTickets()
      setTickets(data)
    } catch {
      toast.error('Erro ao carregar tickets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length

  return (
    <Layout title="Suporte" breadcrumb="Ajuda">
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <LifeBuoy size={22} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Suporte</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Seus chamados com a equipe MT Quadras</p>
            </div>
          </div>
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} />
            Novo Ticket
          </button>
        </div>

        {/* Stats */}
        {tickets.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{tickets.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{openCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Em aberto</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{resolvedCount}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Resolvidos</p>
            </div>
          </div>
        )}

        {/* Tickets list */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))
          ) : tickets.length === 0 ? (
            <div className="py-20 text-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl">
              <LifeBuoy size={44} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
              <p className="text-gray-600 dark:text-gray-300 font-medium">Nenhum ticket aberto ainda</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-5">Encontrou algum problema? Abra um chamado.</p>
              <button
                onClick={() => setShowNew(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Plus size={15} /> Abrir Ticket
              </button>
            </div>
          ) : (
            tickets.map(t => <TicketCard key={t.id} ticket={t} />)
          )}
        </div>
      </div>

      {showNew && (
        <NewTicketModal
          onClose={() => setShowNew(false)}
          onSuccess={() => { setShowNew(false); load() }}
        />
      )}
    </Layout>
  )
}
