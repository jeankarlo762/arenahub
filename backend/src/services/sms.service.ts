import { env } from '../config/env'

export async function sendSms(to: string, message: string): Promise<void> {
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
    throw Object.assign(
      new Error('Serviço de SMS não configurado. Contate o suporte.'),
      { statusCode: 503 },
    )
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`
  const credentials = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')
  const body = new URLSearchParams({ From: env.TWILIO_FROM_NUMBER, To: to, Body: message })
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { message?: string }
    throw Object.assign(new Error(data.message ?? 'Erro ao enviar SMS'), { statusCode: 502 })
  }
}
