import api from './axios'

export interface WhatsAppInfo {
  status: 'disconnected' | 'connecting' | 'connected'
  qr: string | null
}

export async function getWhatsAppStatus(): Promise<WhatsAppInfo> {
  const res = await api.get<WhatsAppInfo>('/settings/whatsapp/status')
  return res.data
}

export async function connectWhatsApp(): Promise<void> {
  await api.post('/settings/whatsapp/connect')
}

export async function disconnectWhatsApp(): Promise<void> {
  await api.post('/settings/whatsapp/disconnect')
}

export async function getWhatsAppTemplate(): Promise<{ template: string }> {
  const res = await api.get<{ template: string }>('/settings/whatsapp/template')
  return res.data
}

export async function saveWhatsAppTemplate(template: string): Promise<void> {
  await api.put('/settings/whatsapp/template', { template })
}
