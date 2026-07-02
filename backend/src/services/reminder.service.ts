import { prisma } from '../config/database'
import { sendMessage as sendWhatsApp } from './baileys.service'
import { DEFAULT_WHATSAPP_REMINDER_TEMPLATE, fillWhatsAppTemplate } from './settings.service'

// Fuso do Brasil (sem horário de verão desde 2019). Os horários das reservas
// são digitados no horário local da arena; para saber o instante real usamos -03:00.
const BR_OFFSET = '-03:00'

// Verifica reservas que começam em ~1h e ainda não receberam lembrete.
async function runReminderCheck(): Promise<void> {
  const now = Date.now()

  // Limita a busca a hoje/amanhã (UTC) para não varrer a tabela inteira.
  const from = new Date()
  from.setUTCHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setUTCDate(to.getUTCDate() + 2)

  const bookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      reminderSentAt: null,
      date: { gte: from, lt: to },
    },
    include: { court: { select: { name: true } } },
  })

  for (const b of bookings) {
    const dateStr = b.date.toISOString().slice(0, 10) // YYYY-MM-DD
    const target = new Date(`${dateStr}T${b.startTime}:00${BR_OFFSET}`).getTime()
    const diffMin = (target - now) / 60000

    // Janela de 55–65 min antes do início (o loop roda a cada 5 min).
    if (diffMin < 55 || diffMin > 65) continue

    try {
      const [tenant, branding] = b.tenantId
        ? await Promise.all([
            prisma.tenant.findUnique({ where: { id: b.tenantId }, select: { name: true } }),
            prisma.tenantBranding.findUnique({
              where: { tenantId: b.tenantId },
              select: { whatsappReminderTemplate: true },
            }),
          ])
        : [null, null]

      const template = branding?.whatsappReminderTemplate ?? DEFAULT_WHATSAPP_REMINDER_TEMPLATE
      const [y, m, d] = dateStr.split('-')
      const message = fillWhatsAppTemplate(template, {
        nome: b.customerName,
        arena: tenant?.name ?? '',
        quadra: b.court.name,
        data: `${d}/${m}/${y}`,
        horario: `${b.startTime} às ${b.endTime}`,
        total: Number(b.totalPrice).toFixed(2).replace('.', ','),
      })

      await sendWhatsApp(b.customerPhone, message)
      await prisma.booking.update({ where: { id: b.id }, data: { reminderSentAt: new Date() } })
    } catch (err) {
      console.error('[Lembrete] Erro ao enviar lembrete:', err)
    }
  }
}

export function startReminderScheduler(): void {
  // Roda a cada 5 minutos.
  setInterval(() => {
    runReminderCheck().catch((err) => console.error('[Lembrete] Erro no loop:', err))
  }, 5 * 60 * 1000)
  console.log('[Lembrete] Agendador de lembretes iniciado (a cada 5 min)')
}
