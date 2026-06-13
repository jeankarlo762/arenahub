import { z } from 'zod'

export const createServiceSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  defaultPrice: z.number().positive('Preço deve ser positivo'),
})

export const updateServiceSchema = createServiceSchema.partial()

export const associateServiceSchema = z.object({
  serviceName: z.string().min(1, 'Nome do serviço obrigatório'),
  pricePerSlot: z.number().positive('Preço por slot deve ser positivo'),
  slotMinutes: z.number().int().positive('Duração do slot deve ser positiva'),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>
export type AssociateServiceInput = z.infer<typeof associateServiceSchema>
