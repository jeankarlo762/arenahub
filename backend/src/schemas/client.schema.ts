import { z } from 'zod'

export const createClientSchema = z.object({
  firstName: z.string().min(1, 'Nome obrigatório'),
  lastName: z.string().min(1, 'Sobrenome obrigatório'),
  phone: z.string().optional(),
})

export const updateClientSchema = createClientSchema.partial()

export const clientFiltersSchema = z.object({
  search: z.string().optional(),
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
