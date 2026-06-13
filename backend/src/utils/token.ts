import jwt from 'jsonwebtoken'
import { jwtConfig } from '../config/jwt'

export interface TokenPayload {
  sub: string
  email: string
  role: string
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
  return jwt.verify(token, jwtConfig.secret) as TokenPayload
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, jwtConfig.refreshSecret) as TokenPayload
}
