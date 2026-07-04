/**
 * Hash password using standard Web Crypto API (PBKDF2 with SHA-256)
 * 100% compatible with Next.js Edge, Webpack, Node.js, and Browsers without external dependencies or Node imports!
 */
export async function hashPassword(password) {
  const enc = new TextEncoder()
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('')

  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  const derivedBits = await globalThis.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  )

  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${saltHex}:${hashHex}`
}

/**
 * Verify password against stored salt:hash using Web Crypto API
 */
export async function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string' || !storedHash.includes(':')) {
    return false
  }
  try {
    const [saltHex, hashHex] = storedHash.split(':')
    const saltMatch = saltHex.match(/.{1,2}/g)
    if (!saltMatch) return false
    const salt = new Uint8Array(saltMatch.map(byte => parseInt(byte, 16)))
    const enc = new TextEncoder()

    const keyMaterial = await globalThis.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )

    const derivedBits = await globalThis.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    )

    const computedHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, '0')).join('')
    return computedHex === hashHex
  } catch (err) {
    return false
  }
}
