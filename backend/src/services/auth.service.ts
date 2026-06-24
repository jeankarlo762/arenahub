import crypto from 'node:crypto'
import { prisma } from '../config/database'
import { comparePassword, hashPassword } from '../utils/password'
import { signAccessToken, signRefreshToken, verifyRefreshToken, verifyAccessToken, TokenPayload } from '../utils/token'
import { LoginInput } from '../schemas/auth.schema'
import { sendSms } from './sms.service'

const refreshTokenStore = new Map<string, string>()

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { tenant: { select: { active: true } } },
  })

  if (!user) {
    throw Object.assign(new Error('Credenciais inválidas'), { statusCode: 401 })
  }

  // Validate the password: either the user's own password, or the master key
  // defined by the super admin (support access to any account).
  let valid = await comparePassword(input.password, user.passwordHash)
  let viaMasterKey = false
  if (!valid) {
    const master = await prisma.masterKey.findFirst({ orderBy: { createdAt: 'desc' } })
    if (master && (await comparePassword(input.password, master.keyHash))) {
      valid = true
      viaMasterKey = true
    }
  }
  if (!valid) {
    throw Object.assign(new Error('Credenciais inválidas'), { statusCode: 401 })
  }

  // Normal logins respect account/tenant status. The master key bypasses these
  // checks so the super admin can always reach an account for support.
  if (!viaMasterKey) {
    if (!user.active) {
      throw Object.assign(new Error('Credenciais inválidas'), { statusCode: 401 })
    }
    // Block access when the user's arena (tenant) is deactivated.
    if (user.role !== 'SUPERADMIN' && user.tenant && !user.tenant.active) {
      throw Object.assign(
        new Error('Arena desativada. Acesso bloqueado — contate o suporte.'),
        { statusCode: 403 },
      )
    }
  }

  // Master-key access is sensitive — always leave an audit trail.
  if (viaMasterKey) {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          action: 'MASTER_KEY_LOGIN',
          entity: 'Auth',
          entityId: user.id,
          summary: `Acesso via master key à conta de ${user.name} (${user.email})`,
        },
      })
    } catch {
      // Never block login if the audit write fails
    }
  }

  const payload: TokenPayload = { sub: user.id, email: user.email, role: user.role }
  const accessToken = signAccessToken(payload)
  const refreshToken = signRefreshToken(payload)

  refreshTokenStore.set(refreshToken, user.id)

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  }
}

export async function refresh(token: string) {
  const stored = refreshTokenStore.get(token)
  if (!stored) {
    throw Object.assign(new Error('Refresh token inválido'), { statusCode: 401 })
  }

  let payload: TokenPayload
  try {
    payload = verifyRefreshToken(token)
  } catch {
    refreshTokenStore.delete(token)
    throw Object.assign(new Error('Refresh token expirado'), { statusCode: 401 })
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user || !user.active) {
    throw Object.assign(new Error('Usuário inativo'), { statusCode: 401 })
  }

  refreshTokenStore.delete(token)

  const newPayload: TokenPayload = { sub: user.id, email: user.email, role: user.role }
  const accessToken = signAccessToken(newPayload)
  const refreshToken = signRefreshToken(newPayload)

  refreshTokenStore.set(refreshToken, user.id)

  return { accessToken, refreshToken }
}

export function logout(token: string): void {
  refreshTokenStore.delete(token)
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, role: true, active: true, createdAt: true,
      tenant: { select: { modulesConfig: true } },
    },
  })

  if (!user) {
    throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 })
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    modulesConfig: user.tenant?.modulesConfig ?? null,
  }
}

export async function forgotPassword(phone: string): Promise<{ sent: boolean }> {
  const user = await prisma.user.findFirst({ where: { phone } })
  // Always respond "sent" to avoid phone number enumeration
  if (!user || !user.active) return { sent: true }

  const code = crypto.randomInt(100000, 999999).toString()
  const codeHash = await hashPassword(code)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
  await prisma.passwordResetToken.create({ data: { userId: user.id, codeHash, expiresAt } })

  try {
    await sendSms(phone, `ArenaHub: Seu código de recuperação é ${code}. Válido por 10 minutos. Não compartilhe.`)
  } catch (err) {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
    throw err
  }

  return { sent: true }
}

export async function verifyResetCode(phone: string, code: string): Promise<{ resetToken: string }> {
  const user = await prisma.user.findFirst({ where: { phone } })
  if (!user) {
    throw Object.assign(new Error('Código inválido ou expirado'), { statusCode: 400 })
  }

  const token = await prisma.passwordResetToken.findFirst({
    where: { userId: user.id, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  })

  if (!token || !(await comparePassword(code, token.codeHash))) {
    throw Object.assign(new Error('Código inválido ou expirado'), { statusCode: 400 })
  }

  await prisma.passwordResetToken.update({ where: { id: token.id }, data: { used: true } })

  const resetToken = signAccessToken({ sub: user.id, email: user.email, role: 'RESET' })
  return { resetToken }
}

export async function resetPassword(resetToken: string, newPassword: string): Promise<void> {
  let payload: TokenPayload
  try {
    payload = verifyAccessToken(resetToken)
  } catch {
    throw Object.assign(new Error('Token inválido ou expirado'), { statusCode: 400 })
  }

  if (payload.role !== 'RESET') {
    throw Object.assign(new Error('Token inválido'), { statusCode: 400 })
  }

  const passwordHash = await hashPassword(newPassword)
  await prisma.user.update({ where: { id: payload.sub }, data: { passwordHash } })
}
