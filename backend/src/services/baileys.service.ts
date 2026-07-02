import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
  initAuthCreds,
  BufferJSON,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import QRCode from 'qrcode'
import pino from 'pino'
import { prisma } from '../config/database'

type Status = 'disconnected' | 'connecting' | 'connected'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sock: any = null
let qrDataUrl: string | null = null
let status: Status = 'disconnected'

export function getInfo() {
  return { status, qr: qrDataUrl }
}

// ── Auth state persistido no PostgreSQL ──────────────────────────────
// Substitui o useMultiFileAuthState (que grava em disco) para que a sessão
// sobreviva a reinícios do servidor no Railway (filesystem efêmero).
async function useDatabaseAuthState(): Promise<{
  state: AuthenticationState
  saveCreds: () => Promise<void>
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function readData(id: string): Promise<any | null> {
    const row = await prisma.whatsAppAuth.findUnique({ where: { id } })
    return row ? JSON.parse(row.value, BufferJSON.reviver) : null
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function writeData(id: string, value: any): Promise<void> {
    const str = JSON.stringify(value, BufferJSON.replacer)
    await prisma.whatsAppAuth.upsert({
      where: { id },
      create: { id, value: str },
      update: { value: str },
    })
  }
  async function removeData(id: string): Promise<void> {
    await prisma.whatsAppAuth.deleteMany({ where: { id } })
  }

  const creds: AuthenticationCreds = (await readData('creds')) || initAuthCreds()

  return {
    state: {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
          const data: { [id: string]: SignalDataTypeMap[T] } = {}
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`)
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value)
              }
              data[id] = value
            }),
          )
          return data
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set: async (data: any) => {
          const tasks: Promise<void>[] = []
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id]
              const key = `${category}-${id}`
              tasks.push(value ? writeData(key, value) : removeData(key))
            }
          }
          await Promise.all(tasks)
        },
      },
    },
    saveCreds: async () => {
      await writeData('creds', creds)
    },
  }
}

export async function connect(): Promise<void> {
  if (status === 'connected') return
  status = 'connecting'
  qrDataUrl = null

  const { state, saveCreds } = await useDatabaseAuthState()
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
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

      if (loggedOut) {
        // Sessão invalidada pelo WhatsApp — limpa credenciais para novo QR
        await prisma.whatsAppAuth.deleteMany({}).catch(() => {})
      } else {
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
  await prisma.whatsAppAuth.deleteMany({}).catch(() => {})
}

// Gera as variações possíveis de um telefone brasileiro (com e sem o 9º dígito).
// No Brasil, alguns números estão registrados no WhatsApp COM o 9 e outros SEM,
// então precisamos testar as duas formas e usar a que realmente existe.
function brazilCandidates(raw: string): string[] {
  const digits = raw.replace(/\D/g, '')
  const base = digits.startsWith('55') ? digits : `55${digits}`
  const set = new Set<string>([base])
  // 55 + DDD(2) + 9 + 8 = 13 dígitos → também tenta SEM o 9
  if (base.length === 13 && base[4] === '9') set.add(base.slice(0, 4) + base.slice(5))
  // 55 + DDD(2) + 8 = 12 dígitos → também tenta COM o 9
  if (base.length === 12) set.add(`${base.slice(0, 4)}9${base.slice(4)}`)
  return [...set]
}

// Descobre o JID real no WhatsApp, tratando o 9º dígito automaticamente.
async function resolveJid(raw: string): Promise<string | null> {
  const candidates = brazilCandidates(raw)
  for (const c of candidates) {
    try {
      const res = await sock.onWhatsApp(c)
      if (res && res[0]?.exists && res[0]?.jid) return res[0].jid
    } catch (err) {
      console.error('[WhatsApp] Falha ao verificar número:', err)
    }
  }
  return null
}

export async function sendMessage(to: string, text: string): Promise<void> {
  if (!sock || status !== 'connected') {
    console.warn(`[WhatsApp] Mensagem não enviada: WhatsApp não conectado (status=${status})`)
    return
  }
  try {
    const jid = await resolveJid(to)
    if (!jid) {
      console.warn(`[WhatsApp] Número ${to} não encontrado no WhatsApp — mensagem não enviada`)
      return
    }
    await sock.sendMessage(jid, { text })
    console.log(`[WhatsApp] Mensagem enviada para ${jid}`)
  } catch (err) {
    console.error(`[WhatsApp] Erro ao enviar mensagem para ${to}:`, err)
  }
}

// Auto-conecta na inicialização se já existe sessão salva no banco
prisma.whatsAppAuth
  .findUnique({ where: { id: 'creds' } })
  .then((row) => {
    if (row) connect().catch((err: unknown) => console.error('[WhatsApp] Erro na inicialização:', err))
  })
  .catch(() => { /* tabela ainda não migrada — ignora */ })
