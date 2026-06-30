import { env } from '../config/env'

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('55') ? digits : `55${digits}`
}

export async function sendWhatsApp(to: string, message: string): Promise<void> {
  if (!env.EVOLUTION_API_URL || !env.EVOLUTION_API_KEY || !env.EVOLUTION_INSTANCE) return

  const number = normalizePhone(to)
  const url = `${env.EVOLUTION_API_URL}/message/sendText/${env.EVOLUTION_INSTANCE}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.EVOLUTION_API_KEY,
    },
    body: JSON.stringify({ number, text: message }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { message?: string }
    console.error('[WhatsApp] Falha ao enviar:', data.message ?? res.statusText)
  }
}
