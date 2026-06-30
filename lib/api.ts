// lib/api.ts — helpers para Route Handlers de Next.js
import { NextResponse } from 'next/server'
import { getSessionFromCookie } from './auth'
import type { JWTPayload, Rol } from '@/types'

// ─── Respuestas estándar ──────────────────────────────────
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function created<T>(data: T) {
  return ok(data, 201)
}

export function noContent() {
  return new NextResponse(null, { status: 204 })
}

export function badRequest(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 })
}

export function unauthorized(error = 'No autenticado') {
  return NextResponse.json({ ok: false, error }, { status: 401 })
}

export function forbidden(error = 'Sin permiso') {
  return NextResponse.json({ ok: false, error }, { status: 403 })
}

export function notFound(error = 'No encontrado') {
  return NextResponse.json({ ok: false, error }, { status: 404 })
}

export function conflict(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 409 })
}

export function serverError(error: unknown) {
  console.error('[API Error]', error)
  const message =
    error instanceof Error ? error.message : 'Error interno del servidor'
  return NextResponse.json({ ok: false, error: message }, { status: 500 })
}

// ─── Auth guard para Route Handlers ──────────────────────
export async function requireAuth(
  roles?: Rol[]
): Promise<{ session: JWTPayload } | NextResponse> {
  const session = await getSessionFromCookie()
  if (!session) return unauthorized()
  if (roles && !roles.includes(session.rol)) return forbidden()
  return { session }
}

// ─── Paginación ───────────────────────────────────────────
export function parsePagination(searchParams: URLSearchParams) {
  const page     = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')))
  const skip     = (page - 1) * pageSize
  return { page, pageSize, skip }
}

export function paginatedOk<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
) {
  return NextResponse.json({
    ok: true,
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
}
