import { z } from 'zod'

export const rentalSlotSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  price: z.number().min(0, 'Valor deve ser >= 0').default(0),
})

export const createRentalSchema = z.object({
  courtId: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().min(1, 'Nome do cliente obrigatório'),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Selecione ao menos um dia'),
  slots: z.array(rentalSlotSchema).min(1, 'Selecione ao menos um horário'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().optional(),
})

export const updateRentalSchema = createRentalSchema.partial().extend({
  active: z.boolean().optional(),
})

export const rentalFiltersSchema = z.object({
  courtId: z.string().optional(),
  clientId: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  date: z.string().optional(),
})

export type CreateRentalInput = z.infer<typeof createRentalSchema>
export type UpdateRentalInput = z.infer<typeof updateRentalSchema>
