import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Clock, CheckCircle2, History, LayoutGrid, List, BarChart2 } from 'lucide-react'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import type { BarOrder } from '../../types/bar'
import * as barApi from '../../api/bar.api'
import { formatCurrency, PAYMENT_METHOD_LABELS } from '../../utils/format'
import { formatDate } from '../../utils/date'

import { OrderDetail } from '../Bar/OrderDetail'
import { OrderForm } from '../Bar/OrderForm'

const PAYMENT_LABELS = PAYMENT_METHOD_LABELS

type ViewFormat = 'cards' | 'list'
type Tab = 'active' | 'report'

function ComandasReport() {
  const [closedOrders, setClosedOrders] = useState<BarOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    barApi.listOrders('CLOSED').then(setClosedOrders).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>

  const totalRevenue = closedOrders.reduce((s, o) => s + Number(o.total), 0)
  const byMethod: Record<string, number> = {}
  for (const o of closedOrders) {
    if (o.paymentMethod) byMethod[o.paymentMethod] = (byMethod[o.paymentMethod] ?? 0) + Number(o.total)
  }

  const topClients: Record<string, number> = {}
  for (const o of closedOrders) {
    topClients[o.customerName] = (topClients[o.customerName] ?? 0) + Number(o.total)
  }
  const topClientsList = Object.entries(topClients)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total de Comandas</p>
          <p className="text-2xl font-bold text-gray-900">{closedOrders.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Faturamento Total</p>
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-500 mb-1">Ticket Médio</p>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(closedOrders.length > 0 ? totalRevenue / closedOrders.length : 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Payment methods breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Formas de Pagamento</h3>
          {Object.keys(byMethod).length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>
          ) : (
            <div className="flex flex-col gap-2">
              {Object.entries(byMethod).sort(([, a], [, b]) => b - a).map(([method, amount]) => {
                const pct = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0
                return (
                  <div key={method}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{PAYMENT_LABELS[method] ?? method}</span>
                      <span className="text-gray-600">{formatCurrency(amount)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Top clients */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Clientes</h3>
          {topClientsList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>
          ) : (
            <div className="flex flex-col gap-1 divide-y divide-gray-50">
              {topClientsList.map(([name, total], i) => (
                <div key={name} className="flex items-center gap-3 py-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-gray-50 text-gray-400'}`}>
                    {i + 1}
                  </span>
                  <p className="flex-1 text-sm font-medium text-gray-900 truncate">{name}</p>
                  <p className="text-sm font-semibold text-green-700 shrink-0">{formatCurrency(total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Full history table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Histórico Completo</h3>
          <span className="text-xs text-gray-400">{closedOrders.length} comandas pagas</span>
        </div>
        {closedOrders.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhuma comanda paga ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  {['#', 'Cliente', 'Data', 'Itens', 'Pagamento', 'Total'].map((h) => (
                    <th key={h} className="py-2 px-4 first:pl-4 last:pr-4 last:text-right text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {closedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-4 font-mono text-gray-500">#{o.number}</td>
                    <td className="py-2 px-4 font-medium text-gray-900">{o.customerName}</td>
                    <td className="py-2 px-4 text-gray-500 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                    <td className="py-2 px-4 text-gray-500">{o.items.length}</td>
                    <td className="py-2 px-4">
                      {o.paymentMethod && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                          {PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right font-semibold text-gray-900">{formatCurrency(Number(o.total))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td colSpan={5} className="py-3 px-4 text-sm font-semibold text-gray-700">Total</td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900">{formatCurrency(totalRevenue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ComandasPage() {
  const [openOrders, setOpenOrders] = useState<BarOrder[]>([])
  const [closedOrders, setClosedOrders] = useState<BarOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [viewFormat, setViewFormat] = useState<ViewFormat>('cards')
  const [activeTab, setActiveTab] = useState<Tab>('active')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [open, closed] = await Promise.all([
        barApi.listOrders('OPEN'),
        barApi.listOrders('CLOSED'),
      ])
      setOpenOrders(open)
      setClosedOrders(closed)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function openDetail(orderId: string) {
    setSelectedOrderId(orderId)
    setDetailOpen(true)
  }

  const filteredOpen = search.trim()
    ? openOrders.filter((o) => o.customerName.toLowerCase().includes(search.toLowerCase()) || String(o.number).includes(search))
    : openOrders

  const filteredClosed = search.trim()
    ? closedOrders.filter((o) => o.customerName.toLowerCase().includes(search.toLowerCase()) || String(o.number).includes(search))
    : closedOrders

  return (
    <Layout title="Comandas">
      <div className="flex flex-col gap-6">
        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'active' ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Clock size={15} /> Comandas
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'report' ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <BarChart2 size={15} /> Relatório
          </button>
        </div>

        {activeTab === 'report' ? (
          <ComandasReport />
        ) : (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-36">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou número..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
                />
              </div>

              <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
                <button
                  onClick={() => setViewFormat('cards')}
                  title="Cards"
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewFormat === 'cards' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  onClick={() => setViewFormat('list')}
                  title="Lista"
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-l border-gray-200 transition-colors ${viewFormat === 'list' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  <List size={15} />
                </button>
              </div>

              <Button onClick={() => setFormOpen(true)}>
                <Plus size={16} /> Nova Comanda
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
            ) : (
              <>
                {/* ── Fila de atendimento (OPEN) ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={16} className="text-orange-500" />
                    <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Fila de atendimento</h2>
                    {filteredOpen.length > 0 && (
                      <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                        {filteredOpen.length}
                      </span>
                    )}
                  </div>

                  {filteredOpen.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl py-10 text-center">
                      <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
                      <p className="text-sm text-gray-400">Nenhuma comanda em aberto</p>
                      <button
                        onClick={() => setFormOpen(true)}
                        className="mt-3 text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors"
                      >
                        + Nova comanda
                      </button>
                    </div>
                  ) : viewFormat === 'cards' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {filteredOpen.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => openDetail(order.id)}
                          className="bg-white rounded-xl border-2 border-orange-200 p-4 text-left flex flex-col gap-3 hover:border-orange-400 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-900 text-xl">#{order.number}</p>
                                <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">Aberta</span>
                              </div>
                              <p className="text-sm font-medium text-gray-700 truncate">{order.customerName}</p>
                            </div>
                            <p className="font-bold text-orange-600 text-lg shrink-0">{formatCurrency(Number(order.total))}</p>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</span>
                            <span>{formatDate(order.createdAt)}</span>
                          </div>
                          {order.notes && <p className="text-xs text-gray-400 truncate">{order.notes}</p>}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border-2 border-orange-100 divide-y divide-gray-100 overflow-hidden">
                      {filteredOpen.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => openDetail(order.id)}
                          className="w-full flex items-center gap-4 px-4 py-3 hover:bg-orange-50 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                            <p className="text-xs font-bold text-orange-700">#{order.number}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{order.customerName}</p>
                            <p className="text-xs text-gray-400">
                              {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                              {' · '}{formatDate(order.createdAt)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-orange-600">{formatCurrency(Number(order.total))}</p>
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Aberta</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Histórico (CLOSED) ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <History size={16} className="text-gray-400" />
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Histórico de pagamentos</h2>
                    {filteredClosed.length > 0 && (
                      <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">
                        {filteredClosed.length}
                      </span>
                    )}
                  </div>

                  {filteredClosed.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Nenhuma comanda paga ainda</p>
                  ) : viewFormat === 'list' ? (
                    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                      {filteredClosed.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => openDetail(order.id)}
                          className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <p className="text-xs font-bold text-gray-600">#{order.number}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{order.customerName}</p>
                            <p className="text-xs text-gray-400">
                              {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                              {order.paymentMethod && ` · ${PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}`}
                              {' · '}{formatDate(order.createdAt)}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-gray-700 shrink-0">{formatCurrency(Number(order.total))}</p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                      {filteredClosed.map((order) => (
                        <button
                          key={order.id}
                          onClick={() => openDetail(order.id)}
                          className="bg-white rounded-xl border border-gray-200 p-4 text-left flex flex-col gap-3 hover:border-gray-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-gray-700 text-lg">#{order.number}</p>
                              <p className="text-sm text-gray-700 truncate">{order.customerName}</p>
                            </div>
                            <p className="font-bold text-gray-700 text-base shrink-0">{formatCurrency(Number(order.total))}</p>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</span>
                            {order.paymentMethod && (
                              <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full font-medium">
                                {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <OrderForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={(order) => {
          setFormOpen(false)
          load()
          openDetail(order.id)
        }}
      />

      {selectedOrderId && (
        <OrderDetail
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          orderId={selectedOrderId}
          onRefresh={load}
        />
      )}
    </Layout>
  )
}
