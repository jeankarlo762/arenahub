import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Clock, CheckCircle2, History, LayoutGrid, List } from 'lucide-react'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import type { BarOrder } from '../../types/bar'
import * as barApi from '../../api/bar.api'
import { formatCurrency } from '../../utils/format'
import { formatDate } from '../../utils/date'

import { OrderDetail } from '../Bar/OrderDetail'
import { OrderForm } from '../Bar/OrderForm'

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  CREDIT_CARD: 'Crédito',
  DEBIT_CARD: 'Débito',
  TRANSFER: 'Transferência',
}

type ViewFormat = 'cards' | 'list'

export default function ComandasPage() {
  const [openOrders, setOpenOrders] = useState<BarOrder[]>([])
  const [closedOrders, setClosedOrders] = useState<BarOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [viewFormat, setViewFormat] = useState<ViewFormat>('cards')

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

          {/* View format toggle */}
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
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Fila de atendimento
                </h2>
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
