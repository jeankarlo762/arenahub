import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import type { Court } from '../../types/court'
import * as courtsApi from '../../api/courts.api'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  type: z.string().min(1, 'Tipo obrigatório'),
  capacity: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : Number(v)),
    z.number().int().positive('Deve ser maior que zero').nullable().optional(),
  ),
  pricePerSlot: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? 0 : Number(v)),
    z.number().min(0, 'Valor não pode ser negativo'),
  ),
  slotMinutes: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? 60 : Number(v)),
    z.number().int().positive('Deve ser maior que zero'),
  ),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface CourtFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  court?: Court
}

export function CourtForm({ open, onClose, onSuccess, court }: CourtFormProps) {
  const isEdit = !!court

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) {
      reset(
        court
          ? {
              name: court.name,
              type: court.type,
              capacity: court.capacity ?? undefined,
              pricePerSlot: Number(court.pricePerSlot),
              slotMinutes: court.slotMinutes,
              description: court.description ?? '',
            }
          : { name: '', type: '', capacity: undefined, pricePerSlot: 0, slotMinutes: 60, description: '' },
      )
    }
  }, [open, court, reset])

  async function onSubmit(data: FormData) {
    try {
      if (isEdit) {
        await courtsApi.updateCourt(court.id, data)
        toast.success('Quadra atualizada')
      } else {
        await courtsApi.createCourt(data)
        toast.success('Quadra criada')
      }
      onSuccess()
      onClose()
    } catch {
      toast.error('Erro ao salvar quadra')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Quadra' : 'Nova Quadra'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>Salvar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Nome" error={errors.name?.message} {...register('name')} />
        <Input
          label="Tipo"
          placeholder="ex: Futebol Society, Beach Tennis"
          error={errors.type?.message}
          {...register('type')}
        />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Jogo (R$)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
              {...register('pricePerSlot')}
            />
            {errors.pricePerSlot && <p className="text-xs text-red-500 mt-1">{errors.pricePerSlot.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duração do Jogo (min)</label>
            <input
              type="number"
              min={15}
              step={15}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-200 outline-none"
              {...register('slotMinutes')}
            />
            {errors.slotMinutes && <p className="text-xs text-red-500 mt-1">{errors.slotMinutes.message}</p>}
          </div>
        </div>
        <Input
          label="Capacidade (pessoas)"
          type="number"
          placeholder="Sem limite"
          error={errors.capacity?.message}
          {...register('capacity')}
        />
        <Textarea label="Descrição" {...register('description')} />
      </div>
    </Modal>
  )
}
