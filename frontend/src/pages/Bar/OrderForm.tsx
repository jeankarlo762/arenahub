import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { ClientSearchInput } from '../../components/ClientSearchInput'
import type { BarOrder } from '../../types/bar'
import * as barApi from '../../api/bar.api'

const schema = z.object({
  number: z.coerce.number().int().positive('Número obrigatório'),
  customerName: z.string().min(1, 'Nome do cliente obrigatório'),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface OrderFormProps {
  open: boolean
  onClose: () => void
  onSuccess: (order: BarOrder) => void
  order?: BarOrder
  presetNumber?: number
  onBack?: () => void
}

export function OrderForm({ open, onClose, onSuccess, order, presetNumber, onBack }: OrderFormProps) {
  const isEdit = !!order
  const { register, handleSubmit, reset, setValue, watch, getValues, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // conflictOrder: an OPEN order already exists with the typed number
  const [conflictOrder, setConflictOrder] = useState<BarOrder | null>(null)
  const [checkingNumber, setCheckingNumber] = useState(false)

  const numberReg = register('number')

  useEffect(() => {
    if (open) {
      reset(order
        ? { number: order.number, customerName: order.customerName, notes: order.notes ?? '' }
        : { number: presetNumber, customerName: '', notes: '' })
      setConflictOrder(null)
    }
  }, [open, order, presetNumber, reset])

  async function handleNumberBlur() {
    if (isEdit) return
    const num = Number(getValues('number'))
    if (!num || num <= 0) return
    if (num === presetNumber) return
    setCheckingNumber(true)
    try {
      const existing = await barApi.getOrderByNumber(num)
      // getOrderByNumber now returns only OPEN orders
      setConflictOrder(existing ?? null)
    } catch { /* ignore */ }
    finally { setCheckingNumber(false) }
  }

  async function onSubmit(data: FormData) {
    try {
      let result: BarOrder
      if (isEdit) {
        result = await barApi.updateOrder(order.id, { customerName: data.customerName, notes: data.notes })
        toast.success('Comanda atualizada')
      } else {
        result = await barApi.createOrder({ number: data.number, customerName: data.customerName, notes: data.notes })
        toast.success(`Comanda #${result.number} aberta`)
      }
      onSuccess(result)
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Erro ao salvar comanda')
    }
  }

  return (
    <>
      <Modal
        open={open && !conflictOrder}
        onClose={onClose}
        title={isEdit ? 'Editar Comanda' : 'Nova Comanda'}
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {onBack && (
                <Button variant="ghost" onClick={onBack} type="button">
                  <ArrowLeft size={15} /> Voltar
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
              <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting || checkingNumber}>
                {isEdit ? 'Salvar' : 'Abrir Comanda'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {!isEdit && (
            <Input
              label="Número da comanda *"
              type="number"
              min={1}
              placeholder="ex: 5"
              error={errors.number?.message}
              {...numberReg}
              onBlur={(e) => { numberReg.onBlur(e); handleNumberBlur() }}
            />
          )}
          <ClientSearchInput
            label="Cliente *"
            value={watch('customerName') ?? ''}
            onChange={(name, _id) => setValue('customerName', name, { shouldValidate: true })}
            error={errors.customerName?.message}
          />
          <Textarea label="Observações" {...register('notes')} placeholder="Observações opcionais..." />
        </div>
      </Modal>

      {conflictOrder && (
        <Modal
          open={true}
          onClose={() => setConflictOrder(null)}
          title={`Comanda #${conflictOrder.number} já está aberta`}
          size="sm"
          footer={<Button variant="secondary" onClick={() => setConflictOrder(null)}>Voltar</Button>}
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-amber-800 dark:text-amber-400">Comanda em uso</p>
                <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                  A comanda <strong>#{conflictOrder.number}</strong> já está aberta para <strong>{conflictOrder.customerName}</strong>.
                  Escolha outro número ou acesse a comanda existente.
                </p>
              </div>
            </div>
            <Button
              className="w-full justify-center"
              onClick={() => { onSuccess(conflictOrder); setConflictOrder(null); onClose() }}
            >
              Ver comanda #{conflictOrder.number}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
