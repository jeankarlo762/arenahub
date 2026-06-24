import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { AlertTriangle, RefreshCw, Trash2, ArrowLeft } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { ClientSearchInput } from '../../components/ClientSearchInput'
import type { BarOrder } from '../../types/bar'
import * as barApi from '../../api/bar.api'
import { formatCurrency } from '../../utils/format'

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

  const [conflictOrder, setConflictOrder] = useState<BarOrder | null>(null)
  // For grid-click (presetNumber): closed order found silently — reopen on submit, no dialog
  const [silentConflict, setSilentConflict] = useState<BarOrder | null>(null)
  const [checkingNumber, setCheckingNumber] = useState(false)
  const [reopening, setReopening] = useState(false)

  const numberReg = register('number')

  useEffect(() => {
    if (open) {
      reset(order
        ? { number: order.number, customerName: order.customerName, notes: order.notes ?? '' }
        : { number: presetNumber, customerName: '', notes: '' })
      setConflictOrder(null)
      setSilentConflict(null)
      // For preset numbers from the grid, detect closed order silently
      if (!order && presetNumber) {
        barApi.getOrderByNumber(presetNumber)
          .then((existing) => {
            if (existing && (existing.status === 'CLOSED' || existing.status === 'CANCELLED')) {
              setSilentConflict(existing)
            }
          })
          .catch(() => {})
      }
    }
  }, [open, order, presetNumber, reset])

  async function handleNumberBlur() {
    if (isEdit) return
    const num = Number(getValues('number'))
    if (!num || num <= 0) return
    // Preset number: conflict handled silently on submit, skip the dialog
    if (num === presetNumber) return
    setCheckingNumber(true)
    try {
      const existing = await barApi.getOrderByNumber(num)
      if (existing && (existing.status === 'CLOSED' || existing.status === 'CANCELLED')) {
        setConflictOrder(existing)
      } else {
        setConflictOrder(null)
      }
    } catch { /* ignore */ }
    finally { setCheckingNumber(false) }
  }

  async function handleReopen(clearItems: boolean, newCustomerName?: string) {
    if (!conflictOrder) return
    setReopening(true)
    try {
      const result = await barApi.reopenOrder(conflictOrder.id, clearItems, newCustomerName)
      toast.success(`Comanda #${result.number} reaberta`)
      setConflictOrder(null)
      onSuccess(result)
      onClose()
    } catch { toast.error('Erro ao reabrir comanda') }
    finally { setReopening(false) }
  }

  async function onSubmit(data: FormData) {
    try {
      let result: BarOrder
      if (isEdit) {
        result = await barApi.updateOrder(order.id, { customerName: data.customerName, notes: data.notes })
        toast.success('Comanda atualizada')
      } else if (silentConflict) {
        // Grid-click on a number in history: reopen empty with new customer, no dialog
        result = await barApi.reopenOrder(silentConflict.id, true, data.customerName)
        toast.success(`Comanda #${result.number} aberta`)
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

  const currentName = watch('customerName')?.trim() ?? ''
  const nameMatches = conflictOrder
    ? conflictOrder.customerName.toLowerCase() === currentName.toLowerCase()
    : false

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
          title={`Comanda #${conflictOrder.number} já existe`}
          size="sm"
          footer={<Button variant="secondary" onClick={() => setConflictOrder(null)}>Cancelar</Button>}
        >
          <div className="flex flex-col gap-4">
            {nameMatches ? (
              <>
                <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <RefreshCw size={16} className="text-orange-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-orange-800">Comanda encontrada no histórico</p>
                    <p className="text-orange-700 mt-0.5">
                      Cliente: <strong>{conflictOrder.customerName}</strong> · {conflictOrder.items.length} {conflictOrder.items.length === 1 ? 'item' : 'itens'} · {formatCurrency(Number(conflictOrder.total))}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Deseja reabrir esta comanda?</p>
                <div className="flex flex-col gap-2">
                  <Button onClick={() => handleReopen(false)} loading={reopening} className="w-full justify-center">
                    <RefreshCw size={15} /> Reabrir comanda (manter itens)
                  </Button>
                  <Button variant="secondary" onClick={() => handleReopen(true)} loading={reopening} className="w-full justify-center">
                    <Trash2 size={15} /> Reabrir comanda vazia
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-800">Número já utilizado</p>
                    <p className="text-amber-700 mt-0.5">
                      A comanda <strong>#{conflictOrder.number}</strong> está no histórico de <strong>{conflictOrder.customerName}</strong>.
                      O histórico é apenas visual — você pode reabri-la para um novo cliente.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleReopen(true, currentName || undefined)}
                    loading={reopening}
                    disabled={!currentName}
                    className="w-full justify-center"
                  >
                    <RefreshCw size={15} /> Reabrir vazia para {currentName || 'novo cliente'}
                  </Button>
                  {!currentName && (
                    <p className="text-xs text-gray-400 text-center">Informe o nome do cliente para reabrir</p>
                  )}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
