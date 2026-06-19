import { z } from 'zod'

export const createPlayerSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  age: z.number().int().min(0).max(120).optional().nullable(),
  photo: z.string().optional().nullable(),
})

export const updatePlayerSchema = createPlayerSchema.partial()

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>
export type UpdatePlayerInput = z.infer<typeof updatePlayerSchema>
