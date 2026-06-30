// app/api/auth/me/route.ts
import { getSessionFromCookie, clearSessionCookie } from '@/lib/auth'
import { ok, unauthorized } from '@/lib/api'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getSessionFromCookie()
  if (!session) return unauthorized()
  return ok({
    id: session.sub,
    nombre: session.nombre,
    apellido: session.apellido,
    correo: session.correo,
    rol: session.rol,
    colorAgenda: session.colorAgenda,
  })
}

export async function DELETE() {
  const headers = clearSessionCookie()
  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': headers.get('Set-Cookie')! },
  })
}
