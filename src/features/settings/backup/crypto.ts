const PBKDF2_ITERATIONS = 600_000
const SALT_LENGTH_BYTES = 16
const IV_LENGTH_BYTES = 12

export interface EncryptedPayload {
  salt: string
  iv: string
  ciphertext: string
}

function bufferToBase64(buffer: Uint8Array): string {
  let binary = ''
  buffer.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptText(plaintext: string, password: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES))
  const key = await deriveKey(password, salt)
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  )
  return {
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(new Uint8Array(ciphertextBuffer)),
  }
}

export class WrongPasswordError extends Error {
  constructor() {
    super('Contraseña incorrecta o archivo dañado')
    this.name = 'WrongPasswordError'
  }
}

export async function decryptText(payload: EncryptedPayload, password: string): Promise<string> {
  // One try/catch around decode *and* decrypt: a corrupted/tampered file can fail as early as
  // atob() throwing InvalidCharacterError on non-base64 salt/iv/ciphertext, which must surface
  // as the same "bad password or damaged file" message as an auth-tag failure, not an uncaught
  // exception out of the restore flow.
  try {
    const salt = base64ToBuffer(payload.salt)
    const iv = base64ToBuffer(payload.iv)
    const key = await deriveKey(password, salt)
    const plainBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      base64ToBuffer(payload.ciphertext) as BufferSource,
    )
    return new TextDecoder().decode(plainBuffer)
  } catch {
    throw new WrongPasswordError()
  }
}
