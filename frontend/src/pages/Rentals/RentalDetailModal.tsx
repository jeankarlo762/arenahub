import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Circle, MapPin, Phone, User, CalendarClock, CreditCard } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { formatCurrency } from '../../utils/format'
import type { Rental, RentalPayment } from '../../types/rental'
import * as rentalsApi from '../../api/rentals.api'

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

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

function formatDueDate(dateStr: string, frequency: string | null | undefined): string {
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T12:00:00'))
  if (frequency === 'DAILY') {
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} (${WEEKDAY_LABELS[d.getDay()]})`
  }
  return `${MONTH_LABELS[d.getMonth()]}/${d.getFullYear()}`
}

export function RentalDetailModal({ open, onClose, rental }: RentalDetailModalProps) {
  const [payments, setPayments] = useState<RentalPayment[]>([])
  const [loading, setLoading] = useState(false)
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
    else setPayments([])
  }, [open, rental, loadPayments])

  async function handleToggle(p: RentalPayment) {
    if (!rental) return
    setToggling(p.id)
    try {
      const updated = await rentalsApi.toggleRentalPayment(rental.id, p.id, p.status !== 'PAID')
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
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <User size={16} className="text-orange-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Locatário</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{rental.clientName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <Phone size={16} className="text-orange-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Telefone</p>
              <p className="text-sm font-semibold text-gray-900">{rental.clientPhone ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <MapPin size={16} className="text-orange-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Quadra</p>
              <p className="text-sm font-semibold text-gray-900">{rental.court?.name ?? '—'}</p>
              <p className="text-xs text-gray-400">
                {rental.weekdays.map(d => WEEKDAY_LABELS[d]).join(', ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <CreditCard size={16} className="text-orange-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Pagamento</p>
              <p className="text-sm font-semibold text-gray-900">
                {rental.paymentFrequency === 'DAILY' ? 'Diário' : 'Mensal'}
                {rental.paymentMethod ? ` · ${METHOD_LABELS[rental.paymentMethod] ?? rental.paymentMethod}` : ''}
              </p>
              {rental.paymentFrequency !== 'DAILY' && rental.paymentDay && (
                <p className="text-xs text-gray-400">Vence dia {rental.paymentDay}</p>
              )}
            </div>
          </div>
        </div>

        {/* Payment summary */}
        <div className="flex gap-3">
          <div className="flex-1 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Pago</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-gray-400">{paid.length} pagamento{paid.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex-1 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Pendente</p>
            <p className="text-lg font-bold text-orange-600">{formatCurrency(totalPending)}</p>
            <p className="text-xs text-gray-400">{pending.length} pagamento{pending.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Payments list */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock size={15} className="text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">Histórico de pagamentos</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Spinner size="md" className="text-orange-500" /></div>
          ) : payments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum pagamento gerado</p>
          ) : (
            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
              {payments.map((p) => {
                const isPaid = p.status === 'PAID'
                const isToggling = toggling === p.id
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                      isPaid ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => handleToggle(p)}
                        disabled={isToggling}
                        className="shrink-0 transition-transform hover:scale-110 disabled:opacity-50"
                      >
                        {isToggling ? (
                          <Spinner size="sm" className="text-orange-500" />
                        ) : isPaid ? (
                          <CheckCircle2 size={18} className="text-green-500" />
                        ) : (
                          <Circle size={18} className="text-gray-300" />
                        )}
                      </button>
                      <div>
                        <p className={`text-sm font-medium ${isPaid ? 'text-green-700' : 'text-gray-700'}`}>
                          {formatDueDate(p.dueDate, rental.paymentFrequency)}
                        </p>
                        {isPaid && p.paidAt && (
                          <p className="text-xs text-green-500">
                            Pago em {new Date(p.paidAt).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${isPaid ? 'text-green-600' : 'text-gray-600'}`}>
                      {formatCurrency(Number(p.amount))}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
