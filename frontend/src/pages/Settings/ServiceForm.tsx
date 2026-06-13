import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import type { Service } from '../../api/services.api'
import * as servicesApi from '../../api/services.api'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  defaultPrice: z.coerce.number().positive('Preço obrigatório'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ServiceFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  service?: Service
}

export function ServiceForm({ open, onClose, onSuccess, service }: ServiceFormProps) {
  const isEdit = !!service
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) {
      reset(service ?? { name: '', defaultPrice: 0, description: '' })
    }
  }, [open, service, reset])

  async function onSubmit(data: FormData) {
    try {
      if (isEdit) {
        await servicesApi.updateService(service.name, data)
        toast.success('Serviço atualizado')
      } else {
        await servicesApi.createService(data)
        toast.success('Serviço criado')
      }
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg ?? 'Erro ao salvar serviço')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Serviço' : 'Novo Serviço'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>Salvar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input
          label="Nome"
          disabled={isEdit}
          error={errors.name?.message}
          {...register('name')}
        />
        <Input
          label="Preço padrão (R$/h)"
          type="number"
          step="0.01"
          error={errors.defaultPrice?.message}
          {...register('defaultPrice')}
        />
        <Textarea label="Descrição" {...register('description')} />
      </div>
    </Modal>
  )
}
