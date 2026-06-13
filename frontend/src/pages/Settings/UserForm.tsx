import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import api from '../../api/axios'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['ADMIN', 'OPERATOR']),
})

type FormData = z.infer<typeof schema>

interface UserFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UserForm({ open, onClose, onSuccess }: UserFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'OPERATOR' },
  })

  async function onSubmit(data: FormData) {
    try {
      await api.post('/users', data)
      toast.success('Usuário criado')
      reset()
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      toast.error(msg ?? 'Erro ao criar usuário')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Novo Usuário"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>Criar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Nome" error={errors.name?.message} {...register('name')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input label="Senha" type="password" error={errors.password?.message} {...register('password')} />
        <Select
          label="Perfil"
          options={[
            { value: 'OPERATOR', label: 'Operador' },
            { value: 'ADMIN', label: 'Administrador' },
          ]}
          error={errors.role?.message}
          {...register('role')}
        />
      </div>
    </Modal>
  )
}
