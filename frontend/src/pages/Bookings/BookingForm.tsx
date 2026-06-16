import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { DatePicker } from '../../components/ui/DatePicker'
import { Spinner } from '../../components/ui/Spinner'
import type { Court, AvailabilitySlot } from '../../types/court'
import * as courtsApi from '../../api/courts.api'
import * as bookingsApi from '../../api/bookings.api'
import { formatCurrency } from '../../utils/format'
import { toInputDate } from '../../utils/date'

const schema = z.object({
  courtId: z.string().min(1, 'Quadra obrigatória'),
  date: z.string().min(1, 'Data obrigatória'),
  customerName: z.string().min(1, 'Nome obrigatório'),
  customerPhone: z.string().optional(),
  customerEmail: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface BookingFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  courts: Court[]
  preSelect?: { courtId: string; date: string; startTime: string }
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

export function BookingForm({ open, onClose, onSuccess, courts, preSelect }: BookingFormProps) {
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedTimes, setSelectedTimes] = useState<string[]>([])
  const [slotsError, setSlotsError] = useState('')
  const [pendingTime, setPendingTime] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const courtId = watch('courtId')
  const date = watch('date')

  useEffect(() => {
    if (!open) {
      reset()
      setSelectedCourt(null)
      setSlots([])
      setSelectedTimes([])
      setSlotsError('')
      setPendingTime(null)
    } else if (preSelect) {
      reset({ courtId: preSelect.courtId, date: preSelect.date })
      setPendingTime(preSelect.startTime)
    }
  }, [open, reset, preSelect])

  useEffect(() => {
    const court = courts.find((c) => c.id === courtId) ?? null
    setSelectedCourt(court)
    setSlots([])
    setSelectedTimes([])
  }, [courtId, courts])

  useEffect(() => {
    if (!courtId || !date) return
    setLoadingSlots(true)
    setSelectedTimes([])
    courtsApi
      .getCourtAvailability(courtId, date)
      .then((av) => {
        const newSlots = av.slots ?? []
        setSlots(newSlots)
        if (pendingTime && newSlots.some((s) => s.startTime === pendingTime && s.available)) {
          setSelectedTimes([pendingTime])
          setPendingTime(null)
        }
      })
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courtId, date])

  function toggleSlot(startTime: string) {
    setSlotsError('')
    setSelectedTimes((prev) =>
      prev.includes(startTime) ? prev.filter((t) => t !== startTime) : [...prev, startTime],
    )
  }

  const pricePerSlot = selectedCourt ? Number(selectedCourt.pricePerSlot) : 0
  const totalPrice = pricePerSlot * selectedTimes.length

  async function onSubmit(data: FormData) {
    if (selectedTimes.length === 0) {
      setSlotsError('Selecione ao menos um horário')
      return
    }

    const slotsToBook = selectedTimes
      .map((t) => slots.find((s) => s.startTime === t))
      .filter((s): s is AvailabilitySlot => !!s)

    try {
      await Promise.all(
        slotsToBook.map((slot) =>
          bookingsApi.createBooking({
            courtId: data.courtId,
            customerName: data.customerName,
            customerPhone: data.customerPhone || '',
            customerEmail: data.customerEmail || undefined,
            date: data.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            totalPrice: pricePerSlot,
            notes: data.notes,
          }),
        ),
      )
      toast.success(
        selectedTimes.length > 1
          ? `${selectedTimes.length} agendamentos criados`
          : 'Agendamento criado',
      )
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg ?? 'Erro ao criar agendamento')
    }
  }

  const availableSlots = slots.filter((s) => s.available)
  const todayStr = toInputDate(new Date())

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo Agendamento"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            loading={isSubmitting}
            disabled={selectedTimes.length === 0}
          >
            {selectedTimes.length > 1
              ? `Confirmar ${selectedTimes.length} horários — ${formatCurrency(totalPrice)}`
              : `Confirmar — ${formatCurrency(totalPrice)}`}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Select
          label="Quadra"
          placeholder="Insira a quadra"
          options={courts.filter((c) => c.active).map((c) => ({ value: c.id, label: c.name }))}
          error={errors.courtId?.message}
          {...register('courtId')}
        />

        {selectedCourt && (
          <p className="text-xs text-gray-500">
            {selectedCourt.slotMinutes} min por slot · {formatCurrency(Number(selectedCourt.pricePerSlot))} / slot
          </p>
        )}

        <DatePicker
          label="Data"
          min={todayStr}
          disabled={!courtId}
          error={errors.date?.message}
          {...register('date')}
        />

        {date && courtId && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                Horários
                {selectedTimes.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-orange-600">
                    {selectedTimes.length} selecionado(s)
                  </span>
                )}
              </label>
              {selectedTimes.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSelectedTimes([])}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Limpar seleção
                </button>
              )}
            </div>

            {loadingSlots ? (
              <div className="flex items-center gap-2 py-3">
                <Spinner size="sm" className="text-orange-500" />
                <span className="text-sm text-gray-400">Carregando horários...</span>
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 bg-gray-50 rounded-lg text-center">
                Nenhum horário disponível nesta data
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {slots.map((slot) => {
                  const isSelected = selectedTimes.includes(slot.startTime)
                  const isAvailable = slot.available
                  return (
                    <button
                      key={slot.startTime}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => isAvailable && toggleSlot(slot.startTime)}
                      className={`rounded-lg px-2 py-2 text-center text-xs font-medium transition-all ${
                        !isAvailable
                          ? 'bg-gray-100 text-gray-300 border border-gray-200 cursor-not-allowed line-through'
                          : isSelected
                          ? 'bg-orange-500 text-white border border-orange-500 shadow-sm'
                          : 'bg-green-50 text-green-700 border border-green-200 hover:border-orange-400 hover:bg-orange-50'
                      }`}
                    >
                      <span className="block">{slot.startTime}</span>
                      {isSelected && (
                        <span className="block text-[10px] opacity-80">{slot.endTime}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {slotsError && (
              <p className="text-xs text-red-500">{slotsError}</p>
            )}
          </div>
        )}

        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Dados do Cliente</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nome" placeholder="Nome do cliente" error={errors.customerName?.message} {...register('customerName')} />
            <Input
              label="Telefone (opcional)"
              placeholder="(11) 99999-9999"
              {...register('customerPhone')}
              onChange={(e) => {
                const formatted = formatPhone(e.target.value)
                e.target.value = formatted
                register('customerPhone').onChange(e)
              }}
            />
            <Input
              label="Email (opcional)"
              type="email"
              placeholder="email@gmail.com"
              className="sm:col-span-2"
              {...register('customerEmail')}
            />
          </div>
        </div>

        <Textarea label="Observações (opcional)" {...register('notes')} />
      </div>
    </Modal>
  )
}
