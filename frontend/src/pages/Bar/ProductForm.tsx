import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import type { BarProduct } from '../../types/bar'
import * as barApi from '../../api/bar.api'

const schema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  category: z.string().optional(),
  costPrice: z.coerce.number().min(0, 'Custo deve ser >= 0').default(0),
  price: z.coerce.number().positive('Preço de venda deve ser maior que zero'),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface ProductFormProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  product?: BarProduct
}

export function ProductForm({ open, onClose, onSuccess, product }: ProductFormProps) {
  const isEdit = !!product
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (open) {
      reset(product
        ? { name: product.name, category: product.category ?? '', price: product.price, costPrice: product.costPrice ?? 0, description: product.description ?? '' }
        : { name: '', category: '', price: undefined as unknown as number, costPrice: 0, description: '' })
    }
  }, [open, product, reset])

  async function onSubmit(data: FormData) {
    try {
      if (isEdit) {
        await barApi.updateProduct(product.id, data)
        toast.success('Produto atualizado')
      } else {
        await barApi.createProduct(data)
        toast.success('Produto cadastrado')
      }
      onSuccess()
      onClose()
    } catch {
      toast.error('Erro ao salvar produto')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar Produto' : 'Novo Produto'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={isSubmitting}>Salvar</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Input label="Nome" error={errors.name?.message} {...register('name')} placeholder="ex: Refrigerante, Cerveja" />
        <Input label="Categoria" {...register('category')} placeholder="ex: Bebidas, Petiscos" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Custo (R$)" type="number" step="0.01" min="0" placeholder="0,00" error={errors.costPrice?.message} {...register('costPrice')} />
          <Input label="Preço de venda (R$)" type="number" step="0.01" min="0" error={errors.price?.message} {...register('price')} />
        </div>
        <Textarea label="Descrição" {...register('description')} />
      </div>
    </Modal>
  )
}
