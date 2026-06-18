import { z } from 'zod'

export const rentalSlotSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  price: z.number().min(0, 'Valor deve ser >= 0').default(0),
})

export const rentalPlanEnum = z.enum(['1M', '3M', '6M', '12M', 'CUSTOM'])
export const paymentMethodEnum = z.enum(['CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'TRANSFER'])

export const createRentalSchema = z.object({
  courtId: z.string().optional(),
  clientId: z.string().optional(),
  clientName: z.string().min(1, 'Nome do cliente obrigatório'),
  clientPhone: z.string().optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Selecione ao menos um dia'),
  slots: z.array(rentalSlotSchema).min(1, 'Selecione ao menos um horário'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  plan: rentalPlanEnum.optional(),
  paymentMethod: paymentMethodEnum.optional(),
  paymentDay: z.number().int().min(1).max(31).optional().nullable(),
  paymentFrequency: z.enum(['DAILY', 'MONTHLY']).optional().default('MONTHLY'),
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
