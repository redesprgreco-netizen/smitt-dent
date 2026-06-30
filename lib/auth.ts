// lib/auth.ts
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import type { JWTPayload, Rol } from '@/types'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'smittdent-dev-secret-change-in-production'
)
const EXPIRY = '8h'
const COOKIE_NAME = 'sd_token'

// ─── Contraseñas ───────────────────────────────────────────
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

// ─── JWT ──────────────────────────────────────────────────
export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

// ─── Cookie helpers (Server Components / Route Handlers) ──
export async function getSessionFromCookie(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export function setSessionCookie(token: string, response: Response): Response {
  const cloned = new Response(response.body, response)
  cloned.headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${8 * 3600}${
      process.env.NODE_ENV === 'production' ? '; Secure' : ''
    }`
  )
  return cloned
}

export function clearSessionCookie(): Headers {
  const headers = new Headers()
  headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`
  )
  return headers
}

// ─── Autorización por rol ─────────────────────────────────
export function isAdmin(session: JWTPayload | null): boolean {
  return session?.rol === 'admin'
}

export function isDoctora(session: JWTPayload | null): boolean {
  return session?.rol === 'doctora' || session?.rol === 'visitante'
}

export function hasRole(session: JWTPayload | null, roles: Rol[]): boolean {
  return session !== null && roles.includes(session.rol)
}

// ─── Middleware helper ────────────────────────────────────
export const COOKIE_NAME_EXPORT = COOKIE_NAME
