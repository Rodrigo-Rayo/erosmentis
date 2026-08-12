import { describe, expect, it } from 'vitest'
import { decryptText, encryptText, WrongPasswordError } from './crypto'

describe('encryptText / decryptText', () => {
  it('round-trips plaintext through encryption and decryption', async () => {
    const plaintext = JSON.stringify({ hello: 'world', clients: [1, 2, 3] })
    const encrypted = await encryptText(plaintext, 'correct horse battery staple')
    const decrypted = await decryptText(encrypted, 'correct horse battery staple')
    expect(decrypted).toBe(plaintext)
  })

  it('produces a different salt and iv on every call', async () => {
    const a = await encryptText('same text', 'password')
    const b = await encryptText('same text', 'password')
    expect(a.salt).not.toBe(b.salt)
    expect(a.iv).not.toBe(b.iv)
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })

  it('throws a WrongPasswordError when the password is wrong', async () => {
    const encrypted = await encryptText('secret data', 'right-password')
    await expect(decryptText(encrypted, 'wrong-password')).rejects.toThrow(WrongPasswordError)
  })

  it('throws when the ciphertext has been tampered with', async () => {
    const encrypted = await encryptText('secret data', 'password')
    const tampered = { ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -4)}abcd` }
    await expect(decryptText(tampered, 'password')).rejects.toThrow(WrongPasswordError)
  })
})
