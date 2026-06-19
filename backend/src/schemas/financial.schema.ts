import { z } from 'zod'

const financialFiltersBase = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

export const financialFiltersSchema = financialFiltersBase.refine(
  (d) => {
    if (d.startDate && d.endDate) return d.startDate <= d.endDate
    return true
  },
  { message: 'Data de início deve ser anterior à data de término', path: ['endDate'] },
)

export const dailyRevenueSchema = financialFiltersBase.extend({
  days: z.coerce.number().int().positive().default(30),
})

export type FinancialFilters = z.infer<typeof financialFiltersSchema>
