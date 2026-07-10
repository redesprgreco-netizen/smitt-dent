// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'smittdent-dev-secret-change-in-production'
)
const COOKIE = 'sd_token'

// Rutas públicas
const PUBLIC_PATHS = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/firmar', '/api/firmar']

// Rutas que cualquier usuario autenticado puede acceder
const AUTH_PATHS = [
  '/dashboard',
  '/api/expedientes',      // ← Agregado
  '/api/citas',
  '/api/historial',
  // agrega aquí otras rutas que necesites
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rutas públicas y estáticas
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE)?.value

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const { payload } = await jwtVerify(token, SECRET)

    // Permitir rutas para usuarios autenticados
    if (AUTH_PATHS.some(p => pathname.startsWith(p))) {
      return NextResponse.next()
    }

    // Rutas solo admin
    const ADMIN_PATHS = ['/configuracion', '/reportes', '/api/reportes', '/api/bitacora', '/api/usuarios', '/api/contratos', '/api/firmas']
    if (ADMIN_PATHS.some(p => pathname.startsWith(p))) {
      if (payload.rol !== 'admin') {
        return NextResponse.json({ ok: false, error: 'Sin permiso' }, { status: 403 })
      }
    }

    if (pathname === '/login' || pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
  } catch {
    const res = pathname.startsWith('/api/')
      ? NextResponse.json({ ok: false, error: 'Token inválido' }, { status: 401 })
      : NextResponse.redirect(new URL('/login', request.url))

    res.cookies.delete(COOKIE)
    return res
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}