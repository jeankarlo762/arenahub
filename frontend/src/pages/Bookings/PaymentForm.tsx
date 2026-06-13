import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import type { Booking } from '../../types/booking'
import * as bookingsApi from '../../api/bookings.api'
import { formatCurrency } from '../../utils/format'
import { toInputDate } from '../../utils/date'
import { PAYMENT_METHOD_LABELS } from '../../utils/format'

const schema = z.object({
  amount: z.coerce.number().positive('Valor obrigatório'),
  method: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'TRANSFER']),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface PaymentFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  booking: Booking
}

export function PaymentForm({ open, onClose, onSuccess, booking }: PaymentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: Number(booking.totalPrice),
      method: 'PIX',
      paidAt: toInputDate(new Date()),
    },
  })

  async function onSubmit(data: FormData) {
    try {
      await bookingsApi.createPayment(booking.id, {
        amount: data.amount,
        method: data.method,
        paidAt: data.paidAt || undefined,
        notes: data.notes,
      })
      toast.success('Pagamento registrado')
      onSuccess()
      onClose()
    } catch {
      toast.error('Erro ao registrar pagamento')
    }
  }

  const methodOptions = Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value, label }))

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar Pagamento"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>Salvar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="bg-gray-50 rounded-lg p-3 text-sm">
          <p className="text-gray-600">Valor do agendamento</p>
          <p className="font-semibold text-lg text-gray-900">{formatCurrency(Number(booking.totalPrice))}</p>
        </div>
        <Input
          label="Valor pago (R$)"
          type="number"
          step="0.01"
          error={errors.amount?.message}
          {...register('amount')}
        />
        <Select
          label="Método"
          options={methodOptions}
          error={errors.method?.message}
          {...register('method')}
        />
        <Input label="Data do pagamento" type="date" {...register('paidAt')} />
        <Textarea label="Observações" {...register('notes')} />
      </div>
    </Modal>
  )
}
