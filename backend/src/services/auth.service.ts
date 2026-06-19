import { prisma } from '../config/database'
import { comparePassword } from '../utils/password'
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from '../utils/token'
import { LoginInput } from '../schemas/auth.schema'

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
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  })

  if (!user) {
    throw Object.assign(new Error('Usuário não encontrado'), { statusCode: 404 })
  }

  return user
}
