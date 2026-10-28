import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

function describir(nombre: string, raw: string | undefined) {
  if (!raw) return { variable: nombre, existe: false }
  const limpio = raw.trim().replace(/^["']|["']$/g, '')
  try {
    const u = new URL(limpio)
    const pass = decodeURIComponent(u.password)
    return {
      variable: nombre,
      usuario: decodeURIComponent(u.username),
      largoPassword: pass.length,
      primerCaracter: pass.slice(0, 1),
      ultimoCaracter: pass.slice(-1),
      huella: createHash('sha256').update(pass).digest('hex').slice(0, 8),
      host: u.hostname,
      puerto: u.port,
    }
  } catch {
    return { variable: nombre, urlInvalida: true }
  }
}

export async function GET() {
  const r: Record<string, unknown> = {
    version: 'diag-v2',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'n/d',
    databaseUrl: describir('DATABASE_URL', process.env.DATABASE_URL),
    directUrl: describir('DIRECT_URL', process.env.DIRECT_URL),
  }
  try {
    await prisma.$queryRaw`SELECT 1`
    r.conexion = { ok: true }
  } catch (e: any) {
    r.conexion = { ok: false, error: String(e?.message ?? e).slice(0, 200) }
  }
  return NextResponse.json(r)
}