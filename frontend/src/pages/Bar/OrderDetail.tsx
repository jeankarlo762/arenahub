import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, CheckCircle, XCircle, Minus, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import type { BarOrder, BarProduct } from '../../types/bar'
import * as barApi from '../../api/bar.api'
import { formatCurrency } from '../../utils/format'

interface OrderDetailProps {
  open: boolean
  onClose: () => void
  orderId: string
  onRefresh: () => void
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  CLOSED: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-red-100 text-red-600',
}
const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberta',
  CLOSED: 'Paga',
  CANCELLED: 'Cancelada',
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
  { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
  { value: 'TRANSFER', label: 'Transferência' },
]

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de Crédito',
  DEBIT_CARD: 'Cartão de Débito',
  TRANSFER: 'Transferência',
}

export function OrderDetail({ open, onClose, orderId, onRefresh }: OrderDetailProps) {
  const [order, setOrder] = useState<BarOrder | null>(null)
  const [products, setProducts] = useState<BarProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [addingItem, setAddingItem] = useState(false)
  const [removingItemId, setRemovingItemId] = useState<string | null>(null)
  const [changingStatus, setChangingStatus] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [payDialog, setPayDialog] = useState(false)
  const [selectedPayMethod, setSelectedPayMethod] = useState('CASH')

  const loadOrder = useCallback(async () => {
    try {
      const o = await barApi.getOrder(orderId)
      setOrder(o)
    } catch {
      toast.error('Erro ao carregar comanda')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    if (open) {
      setLoading(true)
      loadOrder()
      barApi.listProducts(true).then(setProducts).catch(() => {})
    }
  }, [open, loadOrder])

  async function handleAddItem() {
    if (!selectedProductId) { toast.error('Selecione um produto'); return }
    setAddingItem(true)
    try {
      const updated = await barApi.addItem(orderId, { productId: selectedProductId, quantity })
      setOrder(updated)
      setSelectedProductId('')
      setQuantity(1)
      onRefresh()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao adicionar item')
    } finally {
      setAddingItem(false)
    }
  }

  async function handleRemoveItem(itemId: string) {
    setRemovingItemId(itemId)
    try {
      const updated = await barApi.removeItem(orderId, itemId)
      setOrder(updated)
      onRefresh()
    } catch {
      toast.error('Erro ao remover item')
    } finally {
      setRemovingItemId(null)
    }
  }

  const remainingToPay = order ? Number(order.total) - Number((order as unknown as { paidAmount?: number }).paidAmount ?? 0) : 0
  const hasPartialPayment = order ? Number((order as unknown as { paidAmount?: number }).paidAmount ?? 0) > 0 : false

  async function handleChangeStatus(status: 'CLOSED' | 'OPEN' | 'CANCELLED', paymentMethod?: string) {
    setChangingStatus(true)
    try {
      const updated = await barApi.updateOrderStatus(orderId, status, paymentMethod)
      setOrder(updated)
      onRefresh()
      const messages: Record<string, string> = {
        CLOSED: 'Comanda marcada como paga',
        OPEN: 'Comanda reaberta',
        CANCELLED: 'Comanda cancelada',
      }
      toast.success(messages[status])
      if (status === 'CLOSED') setPayDialog(false)
    } catch {
      toast.error('Erro ao atualizar comanda')
    } finally {
      setChangingStatus(false)
      setConfirmCancel(false)
    }
  }

  const canEdit = order?.status !== 'CANCELLED'
  const isOpen = order?.status === 'OPEN'
  const isClosed = order?.status === 'CLOSED'

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={order ? `Comanda #${order.number}` : 'Comanda'}
        size="lg"
        footer={
          order?.status === 'CANCELLED' ? (
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
          ) : (
            <div className="flex gap-2 w-full justify-between">
              <Button variant="secondary" onClick={onClose}>Fechar janela</Button>
              <div className="flex gap-2">
                {isOpen && (
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmCancel(true)}
                    disabled={changingStatus}
                  >
                    <XCircle size={15} className="text-red-500" />
                    Cancelar
                  </Button>
                )}
                {isOpen && (
                  <Button onClick={() => { setSelectedPayMethod('CASH'); setPayDialog(true) }} disabled={changingStatus}>
                    <CheckCircle size={15} />
                    Marcar como pago
                  </Button>
                )}
                {isClosed && (
                  <Button
                    variant="secondary"
                    onClick={() => handleChangeStatus('OPEN')}
                    loading={changingStatus}
                  >
                    <RotateCcw size={15} />
                    Reabrir comanda
                  </Button>
                )}
              </div>
            </div>
          )
        }
      >
        {loading || !order ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" className="text-orange-500" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <p className="text-xl font-bold text-gray-900">#{order.number}</p>
                <p className="text-gray-600 font-medium">{order.customerName}</p>
                {order.notes && <p className="text-sm text-gray-400 mt-0.5">{order.notes}</p>}
                {order.paymentMethod && (
                  <p className="text-xs text-orange-600 font-medium mt-1">
                    Pago via {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                  {STATUS_LABELS[order.status]}
                </span>
                <p className="text-2xl font-bold text-orange-600 mt-2">{formatCurrency(Number(order.total))}</p>
                {hasPartialPayment && order.status === 'OPEN' && (
                  <div className="mt-1">
                    <p className="text-xs text-gray-400">Já pago: {formatCurrency(Number((order as unknown as { paidAmount?: number }).paidAmount ?? 0))}</p>
                    <p className="text-sm font-semibold text-orange-700">Restante: {formatCurrency(remainingToPay)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Add item */}
            {canEdit && (
              <div className="flex gap-2 items-end bg-gray-50 rounded-xl p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-600 mb-1">Produto</p>
                  <SearchableSelect
                    options={products.map((p) => ({
                      value: p.id,
                      label: `${p.name} — ${formatCurrency(p.price)}`,
                      sub: p.category ?? undefined,
                    }))}
                    value={selectedProductId}
                    onChange={setSelectedProductId}
                    placeholder="Buscar produto..."
                  />
                </div>
                <div className="w-28 shrink-0">
                  <p className="text-xs font-medium text-gray-600 mb-1">Qtd</p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-7 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-10 text-center rounded-lg border border-gray-200 py-2 text-sm text-gray-900 focus:border-orange-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-7 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
                <Button onClick={handleAddItem} loading={addingItem} size="sm" className="shrink-0">
                  <Plus size={15} /> Adicionar
                </Button>
              </div>
            )}

            {/* Items list */}
            <div className="flex flex-col gap-0 divide-y divide-gray-100">
              {order.items.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Nenhum item adicionado ainda</p>
              ) : (
                <>
                  <div className="grid grid-cols-[1fr_60px_100px_100px_40px] gap-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <span>Produto</span>
                    <span className="text-center">Qtd</span>
                    <span className="text-right">Unit.</span>
                    <span className="text-right">Total</span>
                    <span />
                  </div>
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-[1fr_60px_100px_100px_40px] gap-3 items-center py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                        {item.product.category && (
                          <p className="text-xs text-gray-400">{item.product.category}</p>
                        )}
                      </div>
                      <p className="text-sm text-center text-gray-700">{item.quantity}x</p>
                      <p className="text-sm text-right text-gray-600">{formatCurrency(Number(item.unitPrice))}</p>
                      <p className="text-sm font-semibold text-right text-gray-900">{formatCurrency(Number(item.subtotal))}</p>
                      {canEdit ? (
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={removingItemId === item.id}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors flex justify-center"
                        >
                          {removingItemId === item.id ? <Spinner size="sm" /> : <Trash2 size={15} />}
                        </button>
                      ) : <span />}
                    </div>
                  ))}
                  <div className="flex justify-end pt-3">
                    <p className="text-base font-bold text-orange-600">
                      Total: {formatCurrency(Number(order.total))}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Payment method selection dialog */}
      <Modal
        open={payDialog}
        onClose={() => setPayDialog(false)}
        title="Forma de pagamento"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPayDialog(false)} disabled={changingStatus}>Cancelar</Button>
            <Button onClick={() => handleChangeStatus('CLOSED', selectedPayMethod)} loading={changingStatus}>
              <CheckCircle size={15} /> Confirmar pagamento
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-gray-500">
            Selecione como o cliente pagou a comanda #{order?.number}
            {order && ` — ${formatCurrency(hasPartialPayment ? remainingToPay : Number(order.total))}`}.
            {hasPartialPayment && (
              <span className="block text-xs text-orange-600 mt-1">
                Valor já pago anteriormente: {formatCurrency(Number((order as unknown as { paidAmount?: number }).paidAmount ?? 0))}
              </span>
            )}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setSelectedPayMethod(m.value)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  selectedPayMethod === m.value
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedPayMethod === m.value ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                }`}>
                  {selectedPayMethod === m.value && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                <span className="text-sm font-medium">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => handleChangeStatus('CANCELLED')}
        title="Cancelar comanda"
        message={`Cancelar a comanda #${order?.number} de ${order?.customerName}? Esta ação não pode ser desfeita.`}
        confirmLabel="Cancelar comanda"
      />
    </>
  )
}
