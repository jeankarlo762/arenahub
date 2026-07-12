import nodemailer from 'nodemailer'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database'
import { jwtConfig } from '../config/jwt'
import { encryptSecret, decryptSecret } from '../utils/crypto'

// ─── Config global (linha única id="default") ────────────────────────────────
const CONFIG_ID = 'default'

// Escopo necessário para enviar e-mail pelo SMTP do Gmail via OAuth2.
const GMAIL_SCOPE = 'https://mail.google.com/'
const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

// ─── Templates padrão (assunto + corpo HTML) ─────────────────────────────────
// Variáveis: {nome} {arena} {quadra} {data} {horario} {total}
export const DEFAULT_CLIENT_SUBJECT = '✅ Agendamento confirmado — {arena}'
export const DEFAULT_CLIENT_BODY = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#111">
  <div style="background:#F2B705;padding:20px 24px;border-radius:12px 12px 0 0">
    <h1 style="margin:0;font-size:20px;color:#0A0A0A">Agendamento confirmado! 🎾</h1>
  </div>
  <div style="border:1px solid #eee;border-top:0;border-radius:0 0 12px 12px;padding:24px">
    <p>Olá, <strong>{nome}</strong>! Sua reserva foi realizada com sucesso.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:6px 0;color:#666">Arena</td><td style="text-align:right;font-weight:600">{arena}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Quadra</td><td style="text-align:right;font-weight:600">{quadra}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Data</td><td style="text-align:right;font-weight:600">{data}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Horário</td><td style="text-align:right;font-weight:600">{horario}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Total</td><td style="text-align:right;font-weight:700;color:#0A0A0A">R$ {total}</td></tr>
    </table>
    <p style="color:#666;font-size:13px">Qualquer dúvida, entre em contato com a arena. Até lá! 👋</p>
  </div>
  <p style="text-align:center;color:#bbb;font-size:11px;margin-top:16px">Enviado por ArenaHub · MK Tecnologia</p>
</div>`.trim()

export const DEFAULT_OWNER_SUBJECT = '🔔 Novo agendamento — {quadra} em {data}'
export const DEFAULT_OWNER_BODY = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#111">
  <div style="background:#0A0A0A;padding:20px 24px;border-radius:12px 12px 0 0">
    <h1 style="margin:0;font-size:20px;color:#F2B705">Novo agendamento 🔔</h1>
  </div>
  <div style="border:1px solid #eee;border-top:0;border-radius:0 0 12px 12px;padding:24px">
    <p>Uma nova reserva foi registrada na sua arena:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
      <tr><td style="padding:6px 0;color:#666">Cliente</td><td style="text-align:right;font-weight:600">{nome}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Quadra</td><td style="text-align:right;font-weight:600">{quadra}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Data</td><td style="text-align:right;font-weight:600">{data}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Horário</td><td style="text-align:right;font-weight:600">{horario}</td></tr>
      <tr><td style="padding:6px 0;color:#666">Total</td><td style="text-align:right;font-weight:700">R$ {total}</td></tr>
    </table>
  </div>
  <p style="text-align:center;color:#bbb;font-size:11px;margin-top:16px">Enviado por ArenaHub · MK Tecnologia</p>
</div>`.trim()

export interface EmailVars {
  nome: string
  arena: string
  quadra: string
  data: string
  horario: string
  total: string
}

export function fillEmailTemplate(template: string, vars: EmailVars): string {
  return template
    .replace(/\{nome\}/g, vars.nome)
    .replace(/\{arena\}/g, vars.arena)
    .replace(/\{quadra\}/g, vars.quadra)
    .replace(/\{data\}/g, vars.data)
    .replace(/\{horario\}/g, vars.horario)
    .replace(/\{total\}/g, vars.total)
}

// ─── Leitura da config ───────────────────────────────────────────────────────
async function getRow() {
  return prisma.emailConfig.findUnique({ where: { id: CONFIG_ID } })
}

// Config "pública" — sem segredos, para o painel do super admin.
export async function getEmailConfig() {
  const row = await getRow()
  return {
    senderEmail: row?.senderEmail ?? '',
    senderName: row?.senderName ?? 'ArenaHub',
    clientId: row?.clientId ?? '',
    hasClientSecret: !!row?.clientSecretEnc,
    connected: !!row?.refreshTokenEnc,
    connectedAt: row?.connectedAt ?? null,
    active: row?.active ?? true,
    redirectUri: row?.redirectUri ?? '',
    templates: {
      clientSubject: row?.clientSubject ?? DEFAULT_CLIENT_SUBJECT,
      clientBodyHtml: row?.clientBodyHtml ?? DEFAULT_CLIENT_BODY,
      ownerSubject: row?.ownerSubject ?? DEFAULT_OWNER_SUBJECT,
      ownerBodyHtml: row?.ownerBodyHtml ?? DEFAULT_OWNER_BODY,
    },
  }
}

export async function setEmailConfig(data: {
  senderEmail?: string
  senderName?: string
  clientId?: string
  clientSecret?: string
  active?: boolean
  clientSubject?: string
  clientBodyHtml?: string
  ownerSubject?: string
  ownerBodyHtml?: string
}) {
  const update: Record<string, unknown> = {}
  if (data.senderEmail !== undefined) update.senderEmail = data.senderEmail.trim() || null
  if (data.senderName !== undefined) update.senderName = data.senderName.trim() || null
  if (data.clientId !== undefined) update.clientId = data.clientId.trim() || null
  // Só reescreve o secret quando um novo valor não-vazio é enviado (o painel
  // manda vazio para "não alterar").
  if (data.clientSecret !== undefined && data.clientSecret.trim() !== '') {
    update.clientSecretEnc = encryptSecret(data.clientSecret.trim())
  }
  if (data.active !== undefined) update.active = data.active
  if (data.clientSubject !== undefined) update.clientSubject = data.clientSubject
  if (data.clientBodyHtml !== undefined) update.clientBodyHtml = data.clientBodyHtml
  if (data.ownerSubject !== undefined) update.ownerSubject = data.ownerSubject
  if (data.ownerBodyHtml !== undefined) update.ownerBodyHtml = data.ownerBodyHtml

  await prisma.emailConfig.upsert({
    where: { id: CONFIG_ID },
    create: { id: CONFIG_ID, ...update },
    update,
  })
  return getEmailConfig()
}

// ─── Fluxo OAuth2 ────────────────────────────────────────────────────────────
function signState(): string {
  return jwt.sign({ purpose: 'email-oauth' }, jwtConfig.secret, { expiresIn: '15m' })
}

function verifyState(state: string): void {
  const decoded = jwt.verify(state, jwtConfig.secret) as { purpose?: string }
  if (decoded.purpose !== 'email-oauth') throw new Error('State inválido')
}

// Monta a URL de consentimento do Google. Persiste o redirectUri usado para que
// a troca de código (callback) utilize exatamente o mesmo valor.
export async function getGoogleAuthUrl(redirectUri: string) {
  const row = await getRow()
  if (!row?.clientId) {
    throw Object.assign(new Error('Configure o Client ID antes de conectar'), { statusCode: 400 })
  }
  await prisma.emailConfig.update({ where: { id: CONFIG_ID }, data: { redirectUri } })

  const params = new URLSearchParams({
    client_id: row.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state: signState(),
  })
  return { url: `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}` }
}

// Troca o authorization code por tokens e guarda o refresh token (criptografado).
export async function handleGoogleCallback(code: string, state: string) {
  verifyState(state)

  const row = await getRow()
  if (!row?.clientId || !row.clientSecretEnc || !row.redirectUri) {
    throw Object.assign(new Error('Configuração OAuth incompleta'), { statusCode: 400 })
  }
  const clientSecret = decryptSecret(row.clientSecretEnc)

  const body = new URLSearchParams({
    code,
    client_id: row.clientId,
    client_secret: clientSecret,
    redirect_uri: row.redirectUri,
    grant_type: 'authorization_code',
  })

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = (await res.json()) as { refresh_token?: string; error?: string; error_description?: string }
  if (!res.ok || !json.refresh_token) {
    throw Object.assign(
      new Error(json.error_description || json.error || 'Falha ao obter o refresh token do Google'),
      { statusCode: 400 },
    )
  }

  await prisma.emailConfig.update({
    where: { id: CONFIG_ID },
    data: { refreshTokenEnc: encryptSecret(json.refresh_token), connectedAt: new Date() },
  })
}

export async function disconnectEmail() {
  await prisma.emailConfig.update({
    where: { id: CONFIG_ID },
    data: { refreshTokenEnc: null, connectedAt: null },
  })
}

// ─── Envio ───────────────────────────────────────────────────────────────────
async function buildTransport() {
  const row = await getRow()
  if (!row || !row.active) return null
  if (!row.senderEmail || !row.clientId || !row.clientSecretEnc || !row.refreshTokenEnc) {
    return null // não configurado / não conectado
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: row.senderEmail,
      clientId: row.clientId,
      clientSecret: decryptSecret(row.clientSecretEnc),
      refreshToken: decryptSecret(row.refreshTokenEnc),
    },
  })
}

async function sendRaw(to: string, subject: string, html: string): Promise<void> {
  const transport = await buildTransport()
  if (!transport) return
  const row = await getRow()
  const from = row?.senderName && row?.senderEmail
    ? `${row.senderName} <${row.senderEmail}>`
    : (row?.senderEmail ?? undefined)
  await transport.sendMail({ from, to, subject, html })
}

// Envia um e-mail de teste (usado pelo botão "Enviar teste" no painel).
export async function sendTestEmail(to: string): Promise<void> {
  const transport = await buildTransport()
  if (!transport) {
    throw Object.assign(new Error('E-mail não configurado ou não conectado'), { statusCode: 400 })
  }
  const vars: EmailVars = {
    nome: 'Teste', arena: 'Sua Arena', quadra: 'Quadra 1',
    data: new Date().toLocaleDateString('pt-BR'), horario: '19:00 às 20:00', total: '80,00',
  }
  await sendRaw(to, 'Teste de e-mail — ArenaHub', fillEmailTemplate(DEFAULT_CLIENT_BODY, vars))
}

export interface BookingEmailInput {
  tenantId: string | null
  customerName: string
  customerEmail?: string | null
  courtName: string
  date: Date
  startTime: string
  endTime: string
  totalPrice: number
}

// Notifica cliente (se tiver e-mail) e dono da arena (Tenant.email) sobre uma
// nova reserva. Best-effort e não-bloqueante: qualquer falha é apenas logada.
export async function notifyNewBookingEmail(input: BookingEmailInput): Promise<void> {
  try {
    const cfg = await getRow()
    if (!cfg || !cfg.active || !cfg.refreshTokenEnc) return // não conectado

    const tenant = input.tenantId
      ? await prisma.tenant.findUnique({ where: { id: input.tenantId }, select: { name: true, email: true } })
      : null

    const d = input.date
    const data = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
    const vars: EmailVars = {
      nome: input.customerName,
      arena: tenant?.name ?? '',
      quadra: input.courtName,
      data,
      horario: `${input.startTime} às ${input.endTime}`,
      total: Number(input.totalPrice).toFixed(2).replace('.', ','),
    }

    // Cliente
    if (input.customerEmail) {
      const subject = fillEmailTemplate(cfg.clientSubject ?? DEFAULT_CLIENT_SUBJECT, vars)
      const html = fillEmailTemplate(cfg.clientBodyHtml ?? DEFAULT_CLIENT_BODY, vars)
      await sendRaw(input.customerEmail, subject, html).catch((e) =>
        console.error('[E-mail] Falha ao notificar cliente:', e),
      )
    }

    // Dono da arena
    if (tenant?.email) {
      const subject = fillEmailTemplate(cfg.ownerSubject ?? DEFAULT_OWNER_SUBJECT, vars)
      const html = fillEmailTemplate(cfg.ownerBodyHtml ?? DEFAULT_OWNER_BODY, vars)
      await sendRaw(tenant.email, subject, html).catch((e) =>
        console.error('[E-mail] Falha ao notificar dono:', e),
      )
    }
  } catch (err) {
    console.error('[E-mail] Erro ao enviar notificação de agendamento:', err)
  }
}
