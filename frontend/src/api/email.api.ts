import api from './axios'

export interface EmailTemplates {
  clientSubject: string
  clientBodyHtml: string
  ownerSubject: string
  ownerBodyHtml: string
}

export interface EmailConfig {
  senderEmail: string
  senderName: string
  clientId: string
  hasClientSecret: boolean
  connected: boolean
  connectedAt: string | null
  active: boolean
  redirectUri: string
  templates: EmailTemplates
}

export interface UpdateEmailConfigInput {
  senderEmail?: string
  senderName?: string
  clientId?: string
  clientSecret?: string
  active?: boolean
  clientSubject?: string
  clientBodyHtml?: string
  ownerSubject?: string
  ownerBodyHtml?: string
}

export async function getEmailConfig(): Promise<EmailConfig> {
  const res = await api.get<EmailConfig>('/superadmin/email')
  return res.data
}

export async function updateEmailConfig(input: UpdateEmailConfigInput): Promise<EmailConfig> {
  const res = await api.put<EmailConfig>('/superadmin/email', input)
  return res.data
}

export async function getGoogleAuthUrl(): Promise<{ url: string }> {
  const res = await api.post<{ url: string }>('/superadmin/email/auth-url')
  return res.data
}

export async function disconnectEmail(): Promise<void> {
  await api.post('/superadmin/email/disconnect')
}

export async function sendTestEmail(to: string): Promise<void> {
  await api.post('/superadmin/email/test', { to })
}
