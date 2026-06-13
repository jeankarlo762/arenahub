import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  price: z.number().positive('Preço de venda deve ser positivo'),
  costPrice: z.number().min(0, 'Custo deve ser >= 0').default(0),
  category: z.string().optional(),
})

export const updateProductSchema = createProductSchema.partial()

export const createOrderSchema = z.object({
  number: z.number().int().positive('Número obrigatório'),
  customerName: z.string().min(1, 'Nome do cliente obrigatório'),
  notes: z.string().optional(),
})

export const updateOrderSchema = z.object({
  customerName: z.string().min(1).optional(),
  notes: z.string().optional(),
})

export const orderStatusSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED', 'CANCELLED']),
  paymentMethod: z.string().optional(),
})

export const addItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive('Quantidade deve ser positiva'),
})

export const orderFiltersSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED', 'CANCELLED']).optional(),
})

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateOrderInput = z.infer<typeof updateOrderSchema>
export type AddItemInput = z.infer<typeof addItemSchema>
