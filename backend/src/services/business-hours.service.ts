import { prisma } from '../config/database'
import { getTenantId } from '../config/tenant-context'

const DAYS = [0, 1, 2, 3, 4, 5, 6]
const DEFAULT = { openTime: '08:00', closeTime: '22:00', active: true }

export interface DayHours {
  dayOfWeek: number
  openTime: string
  closeTime: string
  active: boolean
}

// Horário de um dia específico para um tenant. Se não houver configuração,
// usa o padrão (aberto 08:00–22:00) para não quebrar arenas ainda não configuradas.
export async function getDayHours(
  tenantId: string | null | undefined,
  dayOfWeek: number,
): Promise<{ openTime: string; closeTime: string; active: boolean }> {
  if (!tenantId) return DEFAULT
  const row = await prisma.businessHours.findFirst({ where: { tenantId, dayOfWeek } })
  if (!row) return DEFAULT
  return { openTime: row.openTime, closeTime: row.closeTime, active: row.active }
}

// Lista os 7 dias (preenchendo com o padrão os que ainda não foram salvos).
export async function getBusinessHours(): Promise<DayHours[]> {
  const tenantId = getTenantId()
  const rows = tenantId ? await prisma.businessHours.findMany({ where: { tenantId } }) : []
  return DAYS.map((d) => {
    const row = rows.find((r) => r.dayOfWeek === d)
    return {
      dayOfWeek: d,
      openTime: row?.openTime ?? DEFAULT.openTime,
      closeTime: row?.closeTime ?? DEFAULT.closeTime,
      active: row?.active ?? DEFAULT.active,
    }
  })
}

export async function setBusinessHours(hours: DayHours[]): Promise<DayHours[]> {
  const tenantId = getTenantId()
  if (!tenantId) throw Object.assign(new Error('Arena não identificada'), { statusCode: 403 })
  await prisma.$transaction([
    prisma.businessHours.deleteMany({ where: { tenantId } }),
    prisma.businessHours.createMany({
      data: hours.map((h) => ({
        tenantId,
        dayOfWeek: h.dayOfWeek,
        openTime: h.openTime,
        closeTime: h.closeTime,
        active: h.active,
      })),
    }),
  ])
  return getBusinessHours()
}
