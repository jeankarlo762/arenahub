import { useState, useEffect } from 'react'
import { CalendarDays, ClipboardList, DollarSign, Phone, User, X } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import type { Client } from '../../types/client'
import * as clientsApi from '../../api/clients.api'
import { formatCurrency } from '../../utils/format'
import { formatDate } from '../../utils/date'

interface ClientHistory {
  client: Client
  bookings: Array<{ id: string; date: string; startTime: string; endTime: string; courtName: string; totalPrice: number; status: string }>
  orders: Array<{ id: string; number: number; total: number; paymentMethod: string | null; createdAt: string; status: string }>
  totalSpent: number
  totalBookings: number
  totalOrders: number
}

interface Props {
  client: Client
  open: boolean
  onClose: () => void
}

const BOOKING_STATUS: Record<string, string> = {
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Concluído',
  NO_SHOW: 'Não compareceu',
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  PIX: 'PIX',
  CREDIT_CARD: 'Crédito',
  DEBIT_CARD: 'Débito',
  TRANSFER: 'Transferência',
}

export function ClientDetailModal({ client, open, onClose }: Props) {
  const [history, setHistory] = useState<ClientHistory | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) { setHistory(null); return }
    setLoading(true)
    clientsApi.getClientHistory(client.id)
      .then(setHistory)
      .catch(() => setHistory(null))
      .finally(() => setLoading(false))
  }, [open, client.id])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${client.firstName} ${client.lastName}`}
      size="lg"
      footer={
        <button onClick={onClose} className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <X size={14} /> Fechar
        </button>
      }
    >
      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" className="text-orange-500" /></div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Client info */}
          <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <span className="text-base font-bold text-orange-700">{client.firstName[0]}{client.lastName[0]}</span>
              </div>
              <div>
                <p className="font-bold text-gray-900">{client.firstName} {client.lastName}</p>
                {client.phone && (
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Phone size={12} />
                    <span>{client.phone}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400">Cliente desde {formatDate(client.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Summary cards */}
          {history && (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                <DollarSign size={16} className="mx-auto mb-1 text-green-600" />
                <p className="text-lg font-bold text-green-700">{formatCurrency(history.totalSpent)}</p>
                <p className="text-xs text-gray-500">Total gasto</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                <CalendarDays size={16} className="mx-auto mb-1 text-blue-500" />
                <p className="text-lg font-bold text-gray-900">{history.totalBookings}</p>
                <p className="text-xs text-gray-500">Agendamentos</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
                <ClipboardList size={16} className="mx-auto mb-1 text-orange-500" />
                <p className="text-lg font-bold text-gray-900">{history.totalOrders}</p>
                <p className="text-xs text-gray-500">Comandas</p>
              </div>
            </div>
          )}

          {/* Bookings */}
          {history && history.bookings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays size={15} className="text-blue-500" />
                <h3 className="text-sm font-semibold text-gray-800">Agendamentos</h3>
                <span className="text-xs text-gray-400">({history.bookings.length})</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50 overflow-hidden max-h-48 overflow-y-auto">
                {history.bookings.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{b.courtName}</p>
                      <p className="text-xs text-gray-500">{formatDate(b.date)} · {b.startTime}–{b.endTime}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(b.totalPrice)}</p>
                      <span className={`text-xs ${b.status === 'CANCELLED' ? 'text-red-500' : b.status === 'CONFIRMED' ? 'text-green-600' : 'text-gray-400'}`}>
                        {BOOKING_STATUS[b.status] ?? b.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders */}
          {history && history.orders.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList size={15} className="text-orange-500" />
                <h3 className="text-sm font-semibold text-gray-800">Comandas do Bar</h3>
                <span className="text-xs text-gray-400">({history.orders.length})</span>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50 overflow-hidden max-h-48 overflow-y-auto">
                {history.orders.map((o) => (
                  <div key={o.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">Comanda #{o.number}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(o.createdAt)}
                        {o.paymentMethod && ` · ${PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(Number(o.total))}</p>
                      <span className={`text-xs ${o.status === 'CLOSED' ? 'text-green-600' : o.status === 'CANCELLED' ? 'text-red-500' : 'text-orange-500'}`}>
                        {o.status === 'CLOSED' ? 'Paga' : o.status === 'CANCELLED' ? 'Cancelada' : 'Aberta'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {history && history.bookings.length === 0 && history.orders.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              <User size={32} className="mx-auto mb-2 text-gray-300" />
              Nenhuma atividade registrada para este cliente
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
