import { z } from 'zod'

const createBookingBase = z.object({
  courtId: z.string().min(1, 'Quadra obrigatória'),
  customerName: z.string().min(1, 'Nome do cliente obrigatório'),
  // Telefone é opcional em agendamentos internos (feitos pelo admin/operador).
  customerPhone: z.string().optional().or(z.literal('')),
  customerEmail: z.string().email().optional().or(z.literal('')),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato YYYY-MM-DD'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Formato HH:MM'),
  totalPrice: z.number().min(0, 'Valor não pode ser negativo'),
  notes: z.string().optional(),
})

export const createBookingSchema = createBookingBase.refine(
  (d) => d.startTime < d.endTime,
  { message: 'Horário de início deve ser anterior ao término', path: ['endTime'] },
)

export const updateBookingSchema = createBookingBase.partial()

export const bookingStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']),
})

export const createPaymentSchema = z.object({
  amount: z.number().positive('Valor deve ser positivo'),
  method: z.enum(['CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'TRANSFER']),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
})

export const updatePaymentSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'REFUNDED']),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
})

export const bookingFiltersSchema = z.object({
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  createdDate: z.string().optional(),
  courtId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).optional(),
  // recent = criado mais recente primeiro (padrão); asc/desc = pela data do agendamento
  sort: z.enum(['recent', 'asc', 'desc']).optional(),
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>
