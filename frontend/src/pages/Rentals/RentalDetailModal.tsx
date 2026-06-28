import { useState, useEffect, useCallback } from 'react'
import { MapPin, Phone, User, CreditCard, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { Button } from '../../components/ui/Button'
import { formatCurrency } from '../../utils/format'
import type { Rental, RentalPayment } from '../../types/rental'
import * as rentalsApi from '../../api/rentals.api'

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Crédito',
  DEBIT_CARD: 'Débito',
  PIX: 'PIX',
  TRANSFER: 'Transferência',
}

interface RentalDetailModalProps {
  open: boolean
  onClose: () => void
  rental: Rental | null
}

function formatChipLabel(dateStr: string, frequency: string | null | undefined): string {
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T12:00:00')
  if (frequency === 'DAILY') {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export function RentalDetailModal({ open, onClose, rental }: RentalDetailModalProps) {
  const [payments, setPayments] = useState<RentalPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState<RentalPayment | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const loadPayments = useCallback(async () => {
    if (!rental) return
    setLoading(true)
    try {
      setPayments(await rentalsApi.listRentalPayments(rental.id))
    } catch {
      toast.error('Erro ao carregar pagamentos')
    } finally {
      setLoading(false)
    }
  }, [rental])

  useEffect(() => {
    if (open && rental) loadPayments()
    else { setPayments([]); setConfirming(null) }
  }, [open, rental, loadPayments])

  async function handleConfirmPay() {
    if (!rental || !confirming) return
    setToggling(confirming.id)
    try {
      const updated = await rentalsApi.toggleRentalPayment(rental.id, confirming.id, true)
      setPayments(prev => prev.map(x => x.id === confirming.id ? { ...x, ...updated } : x))
      setConfirming(null)
    } catch {
      toast.error('Erro ao registrar pagamento')
    } finally {
      setToggling(null)
    }
  }

  async function handleUnpay(p: RentalPayment) {
    if (!rental) return
    setToggling(p.id)
    try {
      const updated = await rentalsApi.toggleRentalPayment(rental.id, p.id, false)
      setPayments(prev => prev.map(x => x.id === p.id ? { ...x, ...updated } : x))
    } catch {
      toast.error('Erro ao atualizar pagamento')
    } finally {
      setToggling(null)
    }
  }

  if (!rental) return null

  const paid = payments.filter(p => p.status === 'PAID')
  const pending = payments.filter(p => p.status === 'PENDING')
  const totalPaid = paid.reduce((s, p) => s + Number(p.amount), 0)
  const totalPending = pending.reduce((s, p) => s + Number(p.amount), 0)

  return (
    <Modal open={open} onClose={onClose} title="Detalhes da Locação" size="lg">
      <div className="flex flex-col gap-5">

        {/* Tenant info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
            <User size={16} className="text-orange-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Locatário</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{rental.clientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
            <Phone size={16} className="text-orange-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Telefone</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rental.clientPhone ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
            <MapPin size={16} className="text-orange-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Quadra</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{rental.court?.name ?? '—'}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{rental.weekdays.map(d => WEEKDAY_LABELS[d]).join(', ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
            <CreditCard size={16} className="text-orange-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Pagamento</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {rental.paymentFrequency === 'DAILY' ? 'Diário' : 'Mensal'}
                {rental.paymentMethod ? ` · ${METHOD_LABELS[rental.paymentMethod] ?? rental.paymentMethod}` : ''}
              </p>
              {rental.paymentFrequency !== 'DAILY' && rental.paymentDay && (
                <p className="text-xs text-gray-400 dark:text-gray-500">Vence dia {rental.paymentDay}</p>
              )}
            </div>
          </div>
        </div>

        {/* Totals */}
        <div className="flex gap-3">
          <div className="flex-1 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Pago</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{paid.length} parcela{paid.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex-1 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-0.5">Pendente</p>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(totalPending)}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{pending.length} parcela{pending.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Confirmation banner */}
        {confirming && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl px-4 py-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-400">Confirmar pagamento?</p>
            <p className="text-sm text-orange-700 dark:text-orange-400">
              Parcela <strong>{formatChipLabel(confirming.dueDate, rental.paymentFrequency)}</strong> — <strong>{formatCurrency(Number(confirming.amount))}</strong>
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => setConfirming(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmPay}
                loading={toggling === confirming.id}
                className="flex-1 !bg-green-600 hover:!bg-green-700"
              >
                <Check size={14} /> Confirmar pagamento
              </Button>
            </div>
          </div>
        )}

        {/* Payment chips */}
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Pagamentos</p>

          {loading ? (
            <div className="flex justify-center py-6"><Spinner size="md" className="text-orange-500" /></div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">Nenhum pagamento gerado</p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto py-1">
              {payments.map((p) => {
                const isPaid = p.status === 'PAID'
                const isThisToggling = toggling === p.id
                const isConfirming = confirming?.id === p.id

                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (isThisToggling) return
                      if (isPaid) {
                        handleUnpay(p)
                      } else {
                        setConfirming(isConfirming ? null : p)
                      }
                    }}
                    title={isPaid ? 'Clique para desfazer' : 'Clique para confirmar pagamento'}
                    className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all select-none min-w-[60px] ${
                      isConfirming
                        ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-400 text-orange-700 dark:text-orange-400 scale-105 shadow-md'
                        : isPaid
                        ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                        : 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 hover:scale-105'
                    }`}
                  >
                    {isThisToggling ? (
                      <Spinner size="sm" className={isPaid ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'} />
                    ) : isPaid ? (
                      <Check size={12} className="mb-0.5 text-green-500 dark:text-green-400" />
                    ) : (
                      <X size={12} className="mb-0.5 text-red-400 dark:text-red-500" />
                    )}
                    <span>{formatChipLabel(p.dueDate, rental.paymentFrequency)}</span>
                    <span className="text-[10px] font-normal opacity-75 mt-0.5">
                      {formatCurrency(Number(p.amount))}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </Modal>
  )
}
