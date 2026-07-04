import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const SECRET = process.env.AUTH_SECRET || 'dev-secret-change-me'
const TOKEN_EXPIRY = '30d'

export function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

export function comparePassword(password, hash) {
  return bcrypt.compare(password, hash)
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: TOKEN_EXPIRY })
}

export function verifyToken(token) {
  try { return jwt.verify(token, SECRET) } catch { return null }
}

export function extractUserFromRequest(request) {
  const cookie = request.headers.get('cookie') || ''
  const match = cookie.match(/(?:^|;\s*)mockmate_token=([^;]+)/)
  if (!match) {
    // Fallback to legacy X-User-Id (anonymous mode) for backward compat
    const anon = request.headers.get('x-user-id')
    return anon ? { userId: anon, anonymous: true } : null
  }
  const payload = verifyToken(decodeURIComponent(match[1]))
  if (!payload) return null
  return { userId: payload.uid, email: payload.email, name: payload.name, anonymous: false }
}

export function buildAuthCookie(token) {
  const isProd = process.env.NODE_ENV === 'production'
  const maxAge = 30 * 24 * 60 * 60 // 30 days
  return `mockmate_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProd ? '; Secure' : ''}`
}

export function clearAuthCookie() {
  return 'mockmate_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
}
