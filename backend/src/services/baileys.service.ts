import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode'
import path from 'path'
import fs from 'fs'
import pino from 'pino'

type Status = 'disconnected' | 'connecting' | 'connected'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sock: any = null
let qrDataUrl: string | null = null
let status: Status = 'disconnected'

const AUTH_DIR = path.join(process.cwd(), '.whatsapp-auth')

export function getInfo() {
  return { status, qr: qrDataUrl }
}

export async function connect(): Promise<void> {
  if (status === 'connected') return
  status = 'connecting'
  qrDataUrl = null

  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.ubuntu('ArenaHub'),
    connectTimeoutMs: 30_000,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update: { connection?: string; lastDisconnect?: { error: unknown }; qr?: string }) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      qrDataUrl = await QRCode.toDataURL(qr)
    }

    if (connection === 'open') {
      qrDataUrl = null
      status = 'connected'
      console.log('[WhatsApp] Conectado!')
    }

    if (connection === 'close') {
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode
      const loggedOut = code === DisconnectReason.loggedOut
      status = 'disconnected'
      qrDataUrl = null
      sock = null
      console.log(`[WhatsApp] Desconectado (código ${code})`)

      if (!loggedOut) {
        console.log('[WhatsApp] Reconectando em 5s...')
        setTimeout(() => connect(), 5000)
      }
    }
  })
}

export async function disconnect(): Promise<void> {
  try { await sock?.logout() } catch { /* ignore */ }
  sock = null
  status = 'disconnected'
  qrDataUrl = null
  if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true })
}

export async function sendMessage(to: string, text: string): Promise<void> {
  if (!sock || status !== 'connected') {
    console.warn('[WhatsApp] Mensagem não enviada: WhatsApp não conectado')
    return
  }
  const digits = to.replace(/\D/g, '')
  const number = digits.startsWith('55') ? digits : `55${digits}`
  await sock.sendMessage(`${number}@s.whatsapp.net`, { text })
}

// Auto-conecta na inicialização se já existe sessão salva
if (fs.existsSync(AUTH_DIR)) {
  connect().catch((err: unknown) => console.error('[WhatsApp] Erro na inicialização:', err))
}
