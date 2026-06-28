import { useEffect, useState, useCallback } from 'react'
import { SuperAdminLayout } from './SuperAdminLayout'
import { LifeBuoy, ChevronDown, Download, RefreshCw } from 'lucide-react'
import { listSupportTickets, updateTicketStatus } from '../../api/support.api'
import type { SupportTicket } from '../../api/support.api'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'OPEN', label: 'Aberto' },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'RESOLVED', label: 'Resolvido' },
  { value: 'CLOSED', label: 'Fechado' },
]

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  IN_PROGRESS: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  RESOLVED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  CLOSED: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em Andamento',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function TicketRow({ ticket, onStatusChange }: { ticket: SupportTicket; onStatusChange: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  async function handleStatus(status: string) {
    setUpdatingStatus(true)
    try {
      await updateTicketStatus(ticket.id, status)
      toast.success('Status atualizado')
      onStatusChange()
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  function downloadAttachment() {
    if (!ticket.attachmentBase64 || !ticket.attachmentName) return
    const ext = ticket.attachmentName.split('.').pop()?.toLowerCase() ?? ''
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
      gif: 'image/gif', txt: 'text/plain', csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    }
    const mime = mimeMap[ext] ?? 'application/octet-stream'
    const link = document.createElement('a')
    link.href = `data:${mime};base64,${ticket.attachmentBase64}`
    link.download = ticket.attachmentName
    link.click()
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
      {/* Summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[ticket.status] ?? STATUS_STYLES.OPEN}`}>
              {STATUS_LABELS[ticket.status] ?? ticket.status}
            </span>
            {ticket.attachmentName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                <Download size={10} /> anexo
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1 truncate">{ticket.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {ticket.tenantName ?? '—'} · {ticket.userName ?? ticket.userEmail ?? '—'} · {formatDate(ticket.createdAt)}
          </p>
        </div>
        <ChevronDown size={16} className={`text-gray-400 dark:text-gray-500 shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-800 px-4 pb-4 pt-3 space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descrição</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 rounded-lg p-3 leading-relaxed">
              {ticket.description}
            </p>
          </div>

          {ticket.attachmentName && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Anexo</p>
              <button
                onClick={downloadAttachment}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
              >
                <Download size={14} />
                {ticket.attachmentName}
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 shrink-0">Alterar status:</p>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.filter(s => s.value && s.value !== ticket.status).map(s => (
                <button
                  key={s.value}
                  onClick={() => handleStatus(s.value)}
                  disabled={updatingStatus}
                  className="px-2.5 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SuportePage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listSupportTickets({ status: statusFilter || undefined, page, pageSize: 20 })
      setTickets(res.tickets)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } catch {
      toast.error('Erro ao carregar tickets')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => { setPage(1) }, [statusFilter])
  useEffect(() => { load() }, [load])

  return (
    <SuperAdminLayout title="Suporte">
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <LifeBuoy size={22} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Suporte</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{total} ticket{total !== 1 ? 's' : ''} no total</p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUS_OPTIONS.filter(s => s.value).map(s => {
            const count = tickets.filter(t => t.status === s.value).length
            return (
              <button
                key={s.value}
                onClick={() => setStatusFilter(statusFilter === s.value ? '' : s.value)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  statusFilter === s.value
                    ? 'border-orange-400 dark:border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{count}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </button>
            )
          })}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                onClick={() => { setStatusFilter(s.value); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  statusFilter === s.value
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tickets list */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))
          ) : tickets.length === 0 ? (
            <div className="py-16 text-center">
              <LifeBuoy size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhum ticket encontrado</p>
            </div>
          ) : (
            tickets.map(t => <TicketRow key={t.id} ticket={t} onStatusChange={load} />)
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
            >
              Próximo
            </button>
          </div>
        )}
      </div>
    </SuperAdminLayout>
  )
}
