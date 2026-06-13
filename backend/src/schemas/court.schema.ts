import { z } from 'zod'

export const createCourtSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  type: z.string().min(1, 'Tipo obrigatório'),
  description: z.string().optional(),
  capacity: z.number().int().positive('Capacidade deve ser positiva').optional().nullable(),
  pricePerSlot: z.number().min(0, 'Preço deve ser >= 0').default(0),
  slotMinutes: z.number().int().positive('Duração deve ser positiva').default(60),
  imageUrl: z.string().url().optional().or(z.literal('')),
})

export const updateCourtSchema = createCourtSchema.partial().extend({
  active: z.boolean().optional(),
})

export const scheduleItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  active: z.boolean().default(true),
})

export const updateScheduleSchema = z.object({
  schedules: z.array(scheduleItemSchema),
})

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
})

export const courtFiltersSchema = z.object({
  active: z.enum(['true', 'false']).optional(),
  type: z.string().optional(),
})

export type CreateCourtInput = z.infer<typeof createCourtSchema>
export type UpdateCourtInput = z.infer<typeof updateCourtSchema>
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>
