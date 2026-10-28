// app/api/diag-db/route.ts
// TEMPORAL y público: muestra QUÉ conexión a la base de datos está usando Vercel
// (sin mostrar la contraseña). BÓRRALO cuando termines de arreglar el problema.
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

function describir(nombre: string, raw: string | undefined) {
  if (!raw) return { variable: nombre, existe: false }
  const tieneComillas = /^["']|["']$/.test(raw)
  const tieneEspacios = raw !== raw.trim()
  const limpio = raw.trim().replace(/^["']|["']$/g, '')
  try {
    const u = new URL(limpio)
    const pass = decodeURIComponent(u.password)
    return {
      variable: nombre,
      existe: true,
      usuario: decodeURIComponent(u.username),
      largoPassword: decodeURIComponent(u.password).length,
      passwordPrimerCaracter: pass.slice(0, 1),
      passwordUltimoCaracter: pass.slice(-1),
      passwordHuella: createHash('sha256').update(pass).digest('hex').slice(0, 8),
      passwordTieneCorchetes: /^\[.*\]$/.test(decodeURIComponent(u.password)),
      host: u.hostname,
      puerto: u.port,
      baseDeDatos: u.pathname,
      parametros: u.search,
      tieneComillas,
      tieneEspacios,
    }
  } catch {
    return { variable: nombre, existe: true, urlInvalida: true, tieneComillas, tieneEspacios }
  }
}

export async function GET() {
  const resultado: Record<string, unknown> = {
    databaseUrl: describir('DATABASE_URL', process.env.DATABASE_URL),
    directUrl: describir('DIRECT_URL', process.env.DIRECT_URL),
    entorno: process.env.VERCEL_ENV ?? 'local',
    despliegue: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'n/d',
  }
  try {
    await prisma.$queryRaw`SELECT 1`
    resultado.conexion = { ok: true }
  } catch (e: any) {
    resultado.conexion = { ok: false, error: String(e?.message ?? e).slice(0, 300) }
  }
  return NextResponse.json(resultado)
}