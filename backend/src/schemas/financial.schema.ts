import { z } from 'zod'

export const financialFiltersSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const dailyRevenueSchema = financialFiltersSchema.extend({
  days: z.coerce.number().int().positive().default(30),
})

export type FinancialFilters = z.infer<typeof financialFiltersSchema>
