import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
import { formatPhone } from '../../utils/format'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { ClientSearchInput } from '../../components/ClientSearchInput'
import type { Rental } from '../../types/rental'
import type { Court } from '../../types/court'
import * as rentalsApi from '../../api/rentals.api'

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const PLAN_OPTIONS = [
  { value: '', label: 'Selecione um plano' },
  { value: 'DAILY', label: 'Diária' },
  { value: '1M', label: '1 mês' },
  { value: '3M', label: '3 meses' },
  { value: '6M', label: '6 meses' },
  { value: '12M', label: '1 ano' },
  { value: 'CUSTOM', label: 'Personalizado (datas)' },
]

const PLAN_MONTHS: Record<string, number> = { '1M': 1, '3M': 3, '6M': 6, '12M': 12 }

const PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Não informado' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
  { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
  { value: 'TRANSFER', label: 'Transferência' },
]

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + months)
  return d.toISOString().slice(0, 10)
}

function formatDateBR(isoDate: string): string {
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('pt-BR')
}

const schema = z.object({
  courtId: z.string().min(1, 'Selecione uma quadra'),
  clientName: z.string().min(1, 'Cliente obrigatório'),
  clientId: z.string().optional(),
  clientPhone: z.string().optional(),
  plan: z.string().min(1, 'Selecione um plano'),
  weekdays: z.array(z.number()),
  slots: z.array(z.object({
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    price: z.coerce.number().min(0).default(0),
  })).min(1, 'Adicione ao menos um horário'),
  startDate: z.string().min(1, 'Data de início obrigatória'),
  endDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentDay: z.string().optional(),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface RentalFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  courts: Court[]
  rental?: Rental
}

export function RentalForm({ open, onClose, onSuccess, courts, rental }: RentalFormProps) {
  const isEdit = !!rental
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([])

  const {
    register, handleSubmit, reset, setValue, watch, control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { courtId: '', weekdays: [], slots: [{ startTime: '', endTime: '', price: 0 }], plan: '' },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'slots' })

  const plan = watch('plan')
  const startDate = watch('startDate')
  const courtId = watch('courtId')

  const isDaily = plan === 'DAILY'
  const planSelected = !!plan && plan !== ''
  const showWeekdays = planSelected && !isDaily
  const computedEndDate = !isDaily && PLAN_MONTHS[plan] && startDate
    ? addMonths(startDate, PLAN_MONTHS[plan])
    : null

  const selectedCourt = courts.find(c => c.id === courtId)
  const availableDays: Set<number> = selectedCourt
    ? new Set(selectedCourt.schedules.filter(s => s.active).map(s => s.dayOfWeek))
    : new Set([0, 1, 2, 3, 4, 5, 6])

  useEffect(() => {
    if (!open) return
    if (rental) {
      const rentalPlan = rental.paymentFrequency === 'DAILY' ? 'DAILY' : (rental.plan ?? 'CUSTOM')
      const wds = rental.weekdays
      setSelectedWeekdays(wds)
      reset({
        courtId: rental.courtId ?? '',
        clientName: rental.clientName,
        clientId: rental.clientId,
        clientPhone: rental.clientPhone ?? '',
        plan: rentalPlan,
        weekdays: wds,
        slots: rental.slots.map(s => ({ ...s, price: Number(s.price) ?? 0 })),
        startDate: rental.startDate.slice(0, 10),
        endDate: rental.endDate?.slice(0, 10) ?? '',
        paymentMethod: rental.paymentMethod ?? '',
        paymentDay: rental.paymentDay != null ? String(rental.paymentDay) : '',
        notes: rental.notes ?? '',
      })
    } else {
      setSelectedWeekdays([])
      reset({
        courtId: '', clientName: '', clientId: '', clientPhone: '',
        plan: '', weekdays: [],
        slots: [{ startTime: '', endTime: '', price: 0 }],
        startDate: '', endDate: '',
        paymentMethod: '', paymentDay: '', notes: '',
      })
    }
  }, [open, rental, reset])

  // When court changes, drop weekdays not available in new court
  useEffect(() => {
    if (!courtId) return
    const court = courts.find(c => c.id === courtId)
    if (!court) return
    const available = new Set(court.schedules.filter(s => s.active).map(s => s.dayOfWeek))
    const filtered = selectedWeekdays.filter(d => available.has(d))
    if (filtered.length !== selectedWeekdays.length) {
      setSelectedWeekdays(filtered)
      setValue('weekdays', filtered, { shouldValidate: true })
    }
  }, [courtId, courts]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear weekdays when switching to DAILY
  useEffect(() => {
    if (isDaily) {
      setSelectedWeekdays([])
      setValue('weekdays', [])
    }
  }, [isDaily, setValue])

  function toggleWeekday(d: number) {
    if (!availableDays.has(d)) return
    const updated = selectedWeekdays.includes(d)
      ? selectedWeekdays.filter(x => x !== d)
      : [...selectedWeekdays, d].sort((a, b) => a - b)
    setSelectedWeekdays(updated)
    setValue('weekdays', updated, { shouldValidate: true })
  }

  async function onSubmit(data: FormData) {
    if (!isDaily && data.weekdays.length === 0) {
      toast.error('Selecione ao menos um dia da semana')
      return
    }
    if (isDaily && !data.endDate) {
      toast.error('Informe a data de término para mensalista diário')
      return
    }

    const weekdays = isDaily ? [0, 1, 2, 3, 4, 5, 6] : data.weekdays
    const paymentFrequency = isDaily ? 'DAILY' : 'MONTHLY'
    const endDate = computedEndDate ?? (data.endDate || undefined)
    const effectivePlan = isDaily ? 'CUSTOM' : data.plan

    const paymentDayNum = data.paymentDay?.trim() ? parseInt(data.paymentDay, 10) : null
    if (!isDaily && paymentDayNum != null && (isNaN(paymentDayNum) || paymentDayNum < 1 || paymentDayNum > 31)) {
      toast.error('Dia de pagamento deve ser entre 1 e 31')
      return
    }

    try {
      const payload = {
        courtId: data.courtId,
        clientId: data.clientId || undefined,
        clientName: data.clientName,
        clientPhone: data.clientPhone || undefined,
        weekdays,
        slots: data.slots,
        startDate: data.startDate,
        endDate,
        plan: effectivePlan,
        paymentMethod: data.paymentMethod || undefined,
        paymentFrequency,
        paymentDay: !isDaily ? paymentDayNum : null,
        notes: data.notes,
      }
      if (isEdit) {
        await rentalsApi.updateRental(rental.id, payload)
        toast.success('Mensalista atualizado')
      } else {
        await rentalsApi.createRental(payload)
        toast.success('Mensalista cadastrado')
      }
      onSuccess()
      onClose()
    } catch {
      toast.error('Erro ao salvar mensalista')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Mensalista' : 'Novo Mensalista'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Salvar' : 'Cadastrar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">

        {/* Quadra */}
        <Select
          label="Quadra *"
          options={[
            { value: '', label: 'Selecione uma quadra' },
            ...courts.filter(c => c.active).map(c => ({ value: c.id, label: c.name })),
          ]}
          error={errors.courtId?.message}
          {...register('courtId')}
        />

        {/* Cliente + Telefone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ClientSearchInput
            value={watch('clientName') ?? ''}
            onChange={(name, id) => {
              setValue('clientName', name, { shouldValidate: true })
              setValue('clientId', id)
            }}
            error={errors.clientName?.message}
          />
          <Input
            label="Telefone do cliente"
            placeholder="(11) 99999-9999"
            inputMode="tel"
            {...register('clientPhone')}
            onChange={(e) => setValue('clientPhone', formatPhone(e.target.value))}
          />
        </div>

        {/* Plano — controle principal */}
        <Select
          label="Plano *"
          options={PLAN_OPTIONS}
          error={errors.plan?.message}
          {...register('plan')}
        />

        {/* Dias da semana — apenas para planos mensais, após plano selecionado */}
        {showWeekdays && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Dias da semana *</p>
            <div className="flex gap-2 flex-wrap">
              {WEEKDAY_LABELS.map((label, i) => {
                const isAvailable = availableDays.has(i)
                const isSelected = selectedWeekdays.includes(i)
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleWeekday(i)}
                    disabled={!isAvailable}
                    title={!isAvailable ? 'Sem funcionamento nesta quadra' : undefined}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      !isAvailable
                        ? 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 border-gray-100 dark:border-gray-800 cursor-not-allowed'
                        : isSelected
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-orange-300'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Horários e Valores */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Horários e Valores *</p>
            <button
              type="button"
              onClick={() => append({ startTime: '', endTime: '', price: 0 })}
              className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium"
            >
              <Plus size={13} /> Adicionar horário
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 flex flex-col gap-2">
            <div className="grid grid-cols-[1fr_auto_1fr_1fr_auto] gap-2 items-center px-1">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Início</span>
              <span className="text-xs text-gray-400 dark:text-gray-500 w-4 text-center">–</span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Fim</span>
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Valor (R$)</span>
              <span className="w-6" />
            </div>

            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-[1fr_auto_1fr_1fr_auto] gap-2 items-center">
                <input
                  type="time"
                  {...register(`slots.${i}.startTime`)}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-orange-400 bg-white dark:bg-gray-800 dark:text-gray-100"
                />
                <span className="text-gray-400 dark:text-gray-500 text-sm text-center">–</span>
                <input
                  type="time"
                  {...register(`slots.${i}.endTime`)}
                  className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-orange-400 bg-white dark:bg-gray-800 dark:text-gray-100"
                />
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-xs pointer-events-none">R$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0,00"
                    {...register(`slots.${i}.price`)}
                    className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:border-orange-400 bg-white dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  disabled={fields.length === 1}
                  className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          {errors.slots && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">Preencha todos os horários</p>
          )}
        </div>

        {/* Período — varia conforme plano */}
        {isDaily && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Data de início *" type="date" error={errors.startDate?.message} {...register('startDate')} />
            <Input label="Data de término *" type="date" {...register('endDate')} />
          </div>
        )}

        {!isDaily && planSelected && PLAN_MONTHS[plan] && (
          <>
            <Input label="Data de início *" type="date" error={errors.startDate?.message} {...register('startDate')} />
            {computedEndDate && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg px-4 py-3 text-sm text-orange-700 dark:text-orange-400">
                Término previsto: <strong>{formatDateBR(computedEndDate)}</strong>
                {' '}({PLAN_MONTHS[plan]} mês{PLAN_MONTHS[plan] > 1 ? 'es' : ''})
              </div>
            )}
          </>
        )}

        {!isDaily && planSelected && !PLAN_MONTHS[plan] && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Data de início *" type="date" error={errors.startDate?.message} {...register('startDate')} />
            <Input label="Data de término (opcional)" type="date" {...register('endDate')} />
          </div>
        )}

        {/* Pagamento */}
        {planSelected && (
          <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 flex flex-col gap-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Pagamento</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label="Forma de pagamento" options={PAYMENT_METHOD_OPTIONS} {...register('paymentMethod')} />
              {!isDaily && (
                <Input
                  label="Dia de vencimento (1-31)"
                  type="number"
                  min={1}
                  max={31}
                  placeholder="ex: 5"
                  {...register('paymentDay')}
                />
              )}
            </div>
          </div>
        )}

        <Textarea
          label="Observações"
          {...register('notes')}
          placeholder="Ex: Professor de Beach Tennis, turma avançada"
        />
      </div>
    </Modal>
  )
}
