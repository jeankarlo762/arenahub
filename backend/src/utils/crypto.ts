import crypto from 'node:crypto'
import { env } from '../config/env'

// Criptografia simétrica para segredos em repouso (OAuth client secret e
// refresh token do Gmail). Usa AES-256-GCM com uma chave derivada do
// JWT_SECRET (já obrigatório e com no mínimo 32 chars), evitando exigir uma
// nova variável de ambiente. O formato do ciphertext é:
//   base64(iv).base64(authTag).base64(cipher)

const KEY = crypto.createHash('sha256').update(env.JWT_SECRET).digest() // 32 bytes
const IV_BYTES = 12

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split('.')
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Ciphertext inválido')
  }
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()])
  return dec.toString('utf8')
}
