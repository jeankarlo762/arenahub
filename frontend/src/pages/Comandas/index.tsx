import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, History, Trash2 } from 'lucide-react'
import { Layout } from '../../components/layout/Layout'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import type { BarOrder } from '../../types/bar'
import * as barApi from '../../api/bar.api'
import { formatCurrency } from '../../utils/format'
import { formatDate } from '../../utils/date'
import toast from 'react-hot-toast'
import { METHOD_LABELS } from '../../constants/shared'

import { OrderDetail } from '../Bar/OrderDetail'
import { OrderForm } from '../Bar/OrderForm'

const MIN_CELLS = 20

export default function ComandasPage() {
  const [openOrders, setOpenOrders] = useState<BarOrder[]>([])
  const [closedOrders, setClosedOrders] = useState<BarOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [presetNumber, setPresetNumber] = useState<number | undefined>(undefined)
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)

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

  function openNewWithNumber(num?: number) {
    setPresetNumber(num)
    setFormOpen(true)
  }

  async function handleClearAll() {
    setClearing(true)
    try {
      await Promise.all(openOrders.map((o) => barApi.updateOrderStatus(o.id, 'CANCELLED')))
      toast.success('Comandas removidas')
      setConfirmClear(false)
      load()
    } catch {
      toast.error('Erro ao remover comandas')
    } finally {
      setClearing(false)
    }
  }

  const ordersByNumber = new Map<number, BarOrder>()
  for (const o of openOrders) ordersByNumber.set(o.number, o)

  const highestNumber = openOrders.reduce((max, o) => Math.max(max, o.number), 0)
  const cellCount = Math.max(MIN_CELLS, highestNumber)
  const cells = Array.from({ length: cellCount }, (_, i) => i + 1)

  const searchNum = search.trim()
  const filteredClosed = searchNum
    ? closedOrders.filter((o) => o.customerName.toLowerCase().includes(searchNum.toLowerCase()) || String(o.number).includes(searchNum))
    : closedOrders

  function matchesSearch(o: BarOrder): boolean {
    if (!searchNum) return true
    return o.customerName.toLowerCase().includes(searchNum.toLowerCase()) || String(o.number).includes(searchNum)
  }

  return (
    <Layout title="Comandas">
      <div className="flex flex-col gap-6">
        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-36">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por nome ou número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
            />
          </div>

          {openOrders.length > 0 && (
            <Button variant="secondary" onClick={() => setConfirmClear(true)}>
              <Trash2 size={16} /> Remover todas
            </Button>
          )}
          <Button onClick={() => openNewWithNumber(undefined)}>
            <Plus size={16} /> Nova Comanda
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" className="text-orange-500" /></div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-green-500 inline-block" /> Disponível
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500 inline-block" /> Em consumo
              </span>
            </div>

            {/* ── Grade de comandas (estilo SAIPOS) ── */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
              {cells.map((num) => {
                const order = ordersByNumber.get(num)
                const dimmed = !!searchNum && order ? !matchesSearch(order) : false

                if (order) {
                  return (
                    <button
                      key={num}
                      onClick={() => openDetail(order.id)}
                      className={`relative rounded-lg p-2.5 text-left text-white bg-red-500 hover:bg-red-600 transition-all min-h-[78px] flex flex-col justify-between shadow-sm ${dimmed ? 'opacity-30' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-lg leading-none">{num}</span>
                        <span className="text-[10px] bg-white/20 rounded-full px-1.5 py-0.5 leading-none">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                        </span>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium truncate">{order.customerName}</p>
                        <p className="text-xs font-bold">{formatCurrency(Number(order.total))}</p>
                      </div>
                    </button>
                  )
                }

                return (
                  <button
                    key={num}
                    onClick={() => openNewWithNumber(num)}
                    title={`Abrir comanda ${num}`}
                    className="rounded-lg p-2.5 text-white bg-green-500 hover:bg-green-600 transition-all min-h-[78px] flex items-center justify-center shadow-sm"
                  >
                    <span className="font-bold text-2xl">{num}</span>
                  </button>
                )
              })}
            </div>

            {/* ── Histórico (CLOSED) ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <History size={16} className="text-gray-400 dark:text-gray-500" />
                <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Histórico de pagamentos</h2>
                {filteredClosed.length > 0 && (
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold px-2 py-0.5 rounded-full">
                    {filteredClosed.length}
                  </span>
                )}
              </div>

              {filteredClosed.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Nenhuma comanda paga ainda</p>
              ) : (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
                  {filteredClosed.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => openDetail(order.id)}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                        <p className="text-xs font-bold text-gray-600 dark:text-gray-400">#{order.number}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{order.customerName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                          {order.paymentMethod && ` · ${METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}`}
                          {' · '}{formatDate(order.createdAt)}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300 shrink-0">{formatCurrency(Number(order.total))}</p>
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
        presetNumber={presetNumber}
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

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={handleClearAll}
        title="Remover todas as comandas"
        message={`Isso vai cancelar as ${openOrders.length} comanda(s) em aberto. Esta ação não pode ser desfeita.`}
        confirmLabel={clearing ? 'Removendo...' : 'Remover todas'}
      />
    </Layout>
  )
}