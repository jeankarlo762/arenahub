import { useState, useEffect, useCallback } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Spinner } from '../../components/ui/Spinner'
import { ScrollText, Search, ChevronLeft, ChevronRight, Shield, User as UserIcon } from 'lucide-react'
import * as auditApi from '../../api/audit.api'
import type { AuditLog } from '../../api/audit.api'

const ENTITY_LABELS: Record<string, string> = {
  Court: 'Quadra', Schedule: 'Horário', Booking: 'Agendamento', Payment: 'Pagamento',
  Tournament: 'Torneio', TournamentTeam: 'Time de torneio', BarProduct: 'Produto do bar',
  BarOrder: 'Comanda', BarOrderItem: 'Item de comanda', BarCategory: 'Categoria do bar',
  BarTransaction: 'Transação do bar', Client: 'Cliente', Rental: 'Locação',
  RentalPayment: 'Pagamento de locação', Player: 'Jogador', User: 'Usuário',
  Tenant: 'Arena', PaymentFee: 'Taxa de pagamento',
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Criação', UPDATE: 'Edição', DELETE: 'Exclusão',
  UPDATE_MANY: 'Edição em lote', DELETE_MANY: 'Exclusão em lote', UPSERT: 'Atualização',
}

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  UPSERT: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  DELETE_MANY: 'bg-red-100 text-red-700',
  UPDATE_MANY: 'bg-blue-100 text-blue-700',
}

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'UPDATE_MANY', 'DELETE_MANY', 'UPSERT']

function entityLabel(e: string) { return ENTITY_LABELS[e] ?? e }
function actionLabel(a: string) { return ACTION_LABELS[a] ?? a }

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 50

  const [entities, setEntities] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [entity, setEntity] = useState('')
  const [action, setAction] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await auditApi.listAuditLogs({
        page, pageSize,
        ...(entity ? { entity } : {}),
        ...(action ? { action } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      })
      setLogs(res.logs)
      setTotal(res.total)
      setTotalPages(res.totalPages)
    } finally {
      setLoading(false)
    }
  }, [page, entity, action, search, startDate, endDate])

  useEffect(() => { load() }, [load])
  useEffect(() => { auditApi.listAuditEntities().then(setEntities).catch(() => {}) }, [])

  // Reset to page 1 whenever a filter changes
  useEffect(() => { setPage(1) }, [entity, action, search, startDate, endDate])

  return (
    <Layout title="Auditoria">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
            <ScrollText size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Registro completo de todas as ações realizadas no sistema</p>
            <p className="text-xs text-gray-400">{total} registro(s)</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-1 md:col-span-2">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Responsável ou descrição..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
            />
          </div>
          <select value={entity} onChange={(e) => setEntity(e.target.value)} className="text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none">
            <option value="">Toda área</option>
            {entities.map((e) => <option key={e} value={e}>{entityLabel(e)}</option>)}
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none">
            <option value="">Toda ação</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
          </select>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm rounded-lg border border-gray-200 px-3 py-2 bg-white focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Spinner size="md" />
              <span className="text-sm text-gray-400">Carregando auditoria...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <ScrollText size={40} className="opacity-30" />
              <p className="text-sm">Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Data / Hora', 'Responsável', 'Ação', 'Onde', 'O que foi feito'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors align-top">
                      <td className="px-5 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            {log.userRole === 'ADMIN' || log.userRole === 'SUPERADMIN'
                              ? <Shield size={13} className="text-blue-600" />
                              : <UserIcon size={13} className="text-gray-500" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{log.userName ?? 'Sistema'}</p>
                            {log.userEmail && <p className="text-xs text-gray-400 truncate">{log.userEmail}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${ACTION_STYLES[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                          {actionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-gray-700">{entityLabel(log.entity)}</span>
                        {log.entityId && <p className="text-[11px] text-gray-300 font-mono truncate max-w-[140px]">{log.entityId}</p>}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{log.summary ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">Página {page} de {totalPages}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próxima <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
