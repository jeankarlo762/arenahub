import jwt from 'jsonwebtoken'
import { jwtConfig } from '../config/jwt'

export interface TokenPayload {
  sub: string
  email: string
  role: string
}

function validatePayload(decoded: unknown): TokenPayload {
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof (decoded as Record<string, unknown>).sub !== 'string' ||
    typeof (decoded as Record<string, unknown>).email !== 'string' ||
    typeof (decoded as Record<string, unknown>).role !== 'string'
  ) {
    throw new Error('Token inválido: payload malformado')
  }
  return decoded as TokenPayload
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn as jwt.SignOptions['expiresIn'],
  })
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  })
}

export function verifyAccessToken(token: string): TokenPayload {
  return validatePayload(jwt.verify(token, jwtConfig.secret))
}

export function verifyRefreshToken(token: string): TokenPayload {
  return validatePayload(jwt.verify(token, jwtConfig.refreshSecret))
}
