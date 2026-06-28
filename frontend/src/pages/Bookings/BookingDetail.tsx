import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ClipboardList } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { OrderForm } from '../Bar/OrderForm'
import { OrderDetail } from '../Bar/OrderDetail'
import { PaymentForm } from './PaymentForm'
import type { Booking } from '../../types/booking'
import type { BarOrder } from '../../types/bar'
import * as bookingsApi from '../../api/bookings.api'
import { formatCurrency, BOOKING_STATUS_LABELS, PAYMENT_METHOD_LABELS } from '../../utils/format'
import { formatDate, formatDateTime } from '../../utils/date'

interface BookingDetailProps {
  open: boolean
  onClose: () => void
  booking: Booking
  onSuccess: () => void
}

export function BookingDetail({ open, onClose, booking, onSuccess }: BookingDetailProps) {
  const navigate = useNavigate()
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [paymentFormOpen, setPaymentFormOpen] = useState(false)
  const [comandaFormOpen, setComandaFormOpen] = useState(false)
  const [comandaDetailOpen, setComandaDetailOpen] = useState(false)
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null)

  async function changeStatus(status: string) {
    setUpdatingStatus(true)
    try {
      await bookingsApi.updateBookingStatus(booking.id, status)
      toast.success('Status atualizado')
      onSuccess()
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  function handleComandaCreated(order: BarOrder) {
    setComandaFormOpen(false)
    setCreatedOrderId(order.id)
    setComandaDetailOpen(true)
  }

  const canCancel = booking.status === 'CONFIRMED'
  const canComplete = booking.status === 'CONFIRMED'
  const canNoShow = booking.status === 'CONFIRMED'

  return (
    <>
      <Modal
        open={open && !comandaFormOpen && !comandaDetailOpen}
        onClose={onClose}
        title="Detalhes do Agendamento"
        size="md"
        footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <Badge label={BOOKING_STATUS_LABELS[booking.status]} status={booking.status} />
            <span className="text-xs text-gray-400 dark:text-gray-500">#{booking.id.slice(-6).toUpperCase()}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Quadra</p>
              <p className="font-medium">{booking.court?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Data</p>
              <p className="font-medium">{formatDate(booking.date)}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Horário</p>
              <p className="font-medium">{booking.startTime} – {booking.endTime}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Valor</p>
              <p className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(Number(booking.totalPrice))}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">Criado em</p>
              <p className="font-medium">{formatDateTime(booking.createdAt)}</p>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Cliente</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Nome</p>
                <p className="font-medium">{booking.customerName}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs">Telefone</p>
                <p className="font-medium">{booking.customerPhone}</p>
              </div>
              {booking.customerEmail && (
                <div className="col-span-2">
                  <p className="text-gray-500 dark:text-gray-400 text-xs">Email</p>
                  <p className="font-medium">{booking.customerEmail}</p>
                </div>
              )}
            </div>
          </div>

          {booking.notes && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Observações</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{booking.notes}</p>
            </div>
          )}

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Pagamento</p>
            {booking.payment ? (
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                <div>
                  <p className="font-medium">{formatCurrency(Number(booking.payment.amount))}</p>
                  <p className="text-gray-500 dark:text-gray-400 text-xs">{PAYMENT_METHOD_LABELS[booking.payment.method]}</p>
                </div>
                <Badge label={booking.payment.status === 'PAID' ? 'Pago' : 'Pendente'} status={booking.payment.status} />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum pagamento registrado</p>
                {booking.status !== 'CANCELLED' && (
                  <Button size="sm" onClick={() => setComandaFormOpen(true)}>
                    <ClipboardList size={14} /> Criar comanda
                  </Button>
                )}
              </div>
            )}
          </div>

          {booking.status === 'CONFIRMED' && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 flex gap-2 flex-wrap">
              {canComplete && (
                <Button size="sm" onClick={() => setPaymentFormOpen(true)}>
                  Registrar Pagamento
                </Button>
              )}
              {canNoShow && (
                <Button variant="secondary" size="sm" loading={updatingStatus} onClick={() => changeStatus('NO_SHOW')}>
                  Não Compareceu
                </Button>
              )}
              {canCancel && (
                <Button variant="danger" size="sm" loading={updatingStatus} onClick={() => changeStatus('CANCELLED')}>
                  Cancelar
                </Button>
              )}
            </div>
          )}
        </div>
      </Modal>

      <PaymentForm
        open={paymentFormOpen}
        onClose={() => setPaymentFormOpen(false)}
        onSuccess={() => { setPaymentFormOpen(false); onSuccess() }}
        booking={booking}
      />

      {/* Step 1: Define número e cliente da comanda */}
      <OrderForm
        open={comandaFormOpen}
        onClose={() => setComandaFormOpen(false)}
        onSuccess={handleComandaCreated}
        order={undefined}
      />

      {/* Step 2 + 3: Adicionar itens e selecionar forma de pagamento */}
      {createdOrderId && (
        <OrderDetail
          open={comandaDetailOpen}
          onClose={() => {
            setComandaDetailOpen(false)
            setCreatedOrderId(null)
            onSuccess()
            navigate('/comandas')
          }}
          orderId={createdOrderId}
          onRefresh={onSuccess}
        />
      )}
    </>
  )
}