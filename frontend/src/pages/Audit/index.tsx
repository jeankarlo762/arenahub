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
  CREATE: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  UPDATE: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  UPSERT: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  DELETE: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  DELETE_MANY: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  UPDATE_MANY: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
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

  useEffect(() => { setPage(1) }, [entity, action, search, startDate, endDate])

  return (
    <Layout title="Auditoria">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 flex items-center justify-center">
            <ScrollText size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Registro completo de todas as ações realizadas no sistema</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{total} registro(s)</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-1 md:col-span-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Responsável ou descrição..."
                className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
              />
            </div>
            <select value={entity} onChange={(e) => setEntity(e.target.value)} className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none">
              <option value="">Toda área</option>
              {entities.map((e) => <option key={e} value={e}>{entityLabel(e)}</option>)}
            </select>
            <select value={action} onChange={(e) => setAction(e.target.value)} className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none">
              <option value="">Toda ação</option>
              {ACTIONS.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
            </select>
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-gray-400 dark:text-gray-500">Data início</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-gray-400 dark:text-gray-500">Data fim</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none" />
            </div>
          </div>
          {(search || entity || action || startDate || endDate) && (
            <div className="flex justify-end">
              <button
                onClick={() => { setSearch(''); setEntity(''); setAction(''); setStartDate(''); setEndDate('') }}
                className="text-xs text-orange-500 hover:text-orange-700 transition-colors"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Spinner size="md" />
              <span className="text-sm text-gray-400 dark:text-gray-500">Carregando auditoria...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400 dark:text-gray-500">
              <ScrollText size={40} className="opacity-30" />
              <p className="text-sm">Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
                    <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Data / Hora</th>
                    <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Responsável</th>
                    <th className="text-left px-4 sm:px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Ação</th>
                    <th className="hidden sm:table-cell text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">Onde</th>
                    <th className="hidden md:table-cell text-left px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">O que foi feito</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors align-top">
                      <td className="px-4 sm:px-5 py-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmtDateTime(log.createdAt)}</td>
                      <td className="px-4 sm:px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                            {log.userRole === 'ADMIN' || log.userRole === 'SUPERADMIN'
                              ? <Shield size={13} className="text-blue-600" />
                              : <UserIcon size={13} className="text-gray-500 dark:text-gray-400" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{log.userName ?? 'Sistema'}</p>
                            {log.userEmail && <p className="text-xs text-gray-400 dark:text-gray-500 truncate hidden sm:block">{log.userEmail}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3">
                        <span className={`inline-flex px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium ${ACTION_STYLES[log.action] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                          {actionLabel(log.action)}
                        </span>
                        <p className="sm:hidden text-xs text-gray-500 dark:text-gray-400 mt-0.5">{entityLabel(log.entity)}</p>
                      </td>
                      <td className="hidden sm:table-cell px-5 py-3">
                        <span className="text-sm text-gray-700 dark:text-gray-300">{entityLabel(log.entity)}</span>
                        {log.entityId && <p className="text-[11px] text-gray-300 dark:text-gray-600 font-mono truncate max-w-[140px]">{log.entityId}</p>}
                      </td>
                      <td className="hidden md:table-cell px-5 py-3 text-sm text-gray-600 dark:text-gray-400">{log.summary ?? '—'}</td>
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
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} de {total} registros
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
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