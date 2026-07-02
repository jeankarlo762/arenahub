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

export interface WhatsAppConfig {
  confirmation: string
  reminder: string
  owner: string
  ownerNumber: string
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const res = await api.get<WhatsAppConfig>('/settings/whatsapp/config')
  return res.data
}

export async function saveWhatsAppConfig(data: Partial<WhatsAppConfig>): Promise<WhatsAppConfig> {
  const res = await api.put<WhatsAppConfig>('/settings/whatsapp/config', data)
  return res.data
}
