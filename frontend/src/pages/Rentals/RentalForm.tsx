import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2 } from 'lucide-react'
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
  { value: 'CUSTOM', label: 'Personalizado (datas)' },
  { value: '1M', label: '1 mês' },
  { value: '3M', label: '3 meses' },
  { value: '6M', label: '6 meses' },
  { value: '12M', label: '1 ano' },
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

const schema = z.object({
  courtId: z.string().optional(),
  clientName: z.string().min(1, 'Cliente obrigatório'),
  clientId: z.string().optional(),
  weekdays: z.array(z.number()).min(1, 'Selecione ao menos um dia'),
  slots: z.array(z.object({
    startTime: z.string().min(1, 'Horário obrigatório'),
    endTime: z.string().min(1, 'Horário obrigatório'),
    price: z.coerce.number().min(0, 'Valor deve ser >= 0').default(0),
  })).min(1, 'Adicione ao menos um horário'),
  startDate: z.string().min(1, 'Data de início obrigatória'),
  endDate: z.string().optional(),
  plan: z.string().default('CUSTOM'),
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

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { weekdays: [], slots: [{ startTime: '', endTime: '', price: 0 }], plan: 'CUSTOM' },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'slots' })

  const plan = watch('plan')
  const startDate = watch('startDate')

  useEffect(() => {
    if (open) {
      if (rental) {
        const wds = rental.weekdays
        setSelectedWeekdays(wds)
        reset({
          courtId: rental.courtId ?? '',
          clientName: rental.clientName,
          clientId: rental.clientId,
          weekdays: wds,
          slots: rental.slots.map(s => ({ ...s, price: s.price ?? 0 })),
          startDate: rental.startDate.slice(0, 10),
          endDate: rental.endDate?.slice(0, 10) ?? '',
          plan: rental.plan ?? 'CUSTOM',
          paymentMethod: rental.paymentMethod ?? '',
          paymentDay: rental.paymentDay != null ? String(rental.paymentDay) : '',
          notes: rental.notes ?? '',
        })
      } else {
        setSelectedWeekdays([])
        reset({ courtId: '', clientName: '', clientId: '', weekdays: [], slots: [{ startTime: '', endTime: '', price: 0 }], startDate: '', endDate: '', plan: 'CUSTOM', paymentMethod: '', paymentDay: '', notes: '' })
      }
    }
  }, [open, rental, reset])

  // Auto-compute end date for fixed plans
  const computedEndDate = plan !== 'CUSTOM' && startDate && PLAN_MONTHS[plan]
    ? addMonths(startDate, PLAN_MONTHS[plan])
    : null

  function toggleWeekday(d: number) {
    const updated = selectedWeekdays.includes(d)
      ? selectedWeekdays.filter(x => x !== d)
      : [...selectedWeekdays, d].sort()
    setSelectedWeekdays(updated)
    setValue('weekdays', updated, { shouldValidate: true })
  }

  async function onSubmit(data: FormData) {
    const isFixedPlan = data.plan !== 'CUSTOM' && PLAN_MONTHS[data.plan]
    const endDate = isFixedPlan
      ? addMonths(data.startDate, PLAN_MONTHS[data.plan])
      : (data.endDate || undefined)
    const paymentDayNum = data.paymentDay && data.paymentDay.trim()
      ? parseInt(data.paymentDay, 10)
      : null
    if (paymentDayNum != null && (isNaN(paymentDayNum) || paymentDayNum < 1 || paymentDayNum > 31)) {
      toast.error('Dia de pagamento deve ser entre 1 e 31')
      return
    }
    try {
      const payload = {
        courtId: data.courtId || undefined,
        clientId: data.clientId || undefined,
        clientName: data.clientName,
        weekdays: data.weekdays,
        slots: data.slots,
        startDate: data.startDate,
        endDate,
        plan: data.plan,
        paymentMethod: data.paymentMethod || undefined,
        paymentDay: paymentDayNum,
        notes: data.notes,
      }
      if (isEdit) {
        await rentalsApi.updateRental(rental.id, payload)
        toast.success('Locação atualizada')
      } else {
        await rentalsApi.createRental(payload)
        toast.success('Locação cadastrada')
      }
      onSuccess()
      onClose()
    } catch { toast.error('Erro ao salvar locação') }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Aluguel' : 'Novo Aluguel'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>{isEdit ? 'Salvar' : 'Cadastrar'}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Cliente + Quadra */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ClientSearchInput
            value={watch('clientName') ?? ''}
            onChange={(name, id) => {
              setValue('clientName', name, { shouldValidate: true })
              setValue('clientId', id)
            }}
            error={errors.clientName?.message}
          />
          <Select
            label="Quadra (opcional)"
            options={[
              { value: '', label: 'Sem quadra definida' },
              ...courts.filter(c => c.active).map(c => ({ value: c.id, label: c.name })),
            ]}
            {...register('courtId')}
          />
        </div>

        {/* Dias da semana */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Dias da semana *</p>
          <div className="flex gap-2 flex-wrap">
            {WEEKDAY_LABELS.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleWeekday(i)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  selectedWeekdays.includes(i)
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {errors.weekdays && <p className="text-xs text-red-500 mt-1">{errors.weekdays.message}</p>}
        </div>

        {/* Horários + Preços */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Horários e Valores *</p>
            <button
              type="button"
              onClick={() => append({ startTime: '', endTime: '', price: 0 })}
              className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600 font-medium"
            >
              <Plus size={13} /> Adicionar horário
            </button>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 flex flex-col gap-2">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto_1fr_1fr_auto] gap-2 items-center px-1">
              <span className="text-xs font-semibold text-gray-500">Início</span>
              <span className="text-xs text-gray-400 w-4 text-center">–</span>
              <span className="text-xs font-semibold text-gray-500">Fim</span>
              <span className="text-xs font-semibold text-gray-500">Valor (R$)</span>
              <span className="w-6" />
            </div>

            {fields.map((field, i) => (
              <div key={field.id} className="grid grid-cols-[1fr_auto_1fr_1fr_auto] gap-2 items-center">
                <input
                  type="time"
                  {...register(`slots.${i}.startTime`)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-orange-400 bg-white"
                />
                <span className="text-gray-400 text-sm text-center">–</span>
                <input
                  type="time"
                  {...register(`slots.${i}.endTime`)}
                  className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-orange-400 bg-white"
                />
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">R$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder="0,00"
                    {...register(`slots.${i}.price`)}
                    className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:border-orange-400 bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  disabled={fields.length === 1}
                  className="p-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {errors.slots && <p className="text-xs text-red-500 mt-1">Preencha todos os horários</p>}
        </div>

        {/* Plano / Período */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Plano" options={PLAN_OPTIONS} {...register('plan')} />
          <Input label="Data de início *" type="date" error={errors.startDate?.message} {...register('startDate')} />
        </div>

        {plan === 'CUSTOM' ? (
          <Input label="Data de término (opcional)" type="date" {...register('endDate')} />
        ) : (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-700">
            {computedEndDate
              ? <>Término calculado automaticamente: <strong>{new Date(computedEndDate + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></>
              : 'Informe a data de início para calcular o término do plano.'}
          </div>
        )}

        {/* Pagamento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select label="Forma de pagamento" options={PAYMENT_METHOD_OPTIONS} {...register('paymentMethod')} />
          <Input
            label="Dia de pagamento (1-31)"
            type="number"
            min={1}
            max={31}
            placeholder="ex: 5"
            {...register('paymentDay')}
          />
        </div>

        <Textarea label="Observações" {...register('notes')} placeholder="Ex: Professor de Beach Tennis, turma avançada" />
      </div>
    </Modal>
  )
}
