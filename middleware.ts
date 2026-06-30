// middleware.ts — Smitt-Dent
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'smittdent-dev-secret-change-in-production'
)
const COOKIE = 'sd_token'

// Rutas públicas (sin autenticación)
const PUBLIC_PATHS = ['/login', '/register', '/api/auth/login', '/api/auth/register']

// Rutas solo para admin
const ADMIN_PATHS = [
  '/configuracion',
  '/reportes',
  '/api/reportes',
  '/api/bitacora',
  '/api/usuarios',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rutas públicas y archivos estáticos
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE)?.value

  // Sin token → redirigir a login
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ ok: false, error: 'No autenticado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Verificar token
  try {
    const { payload } = await jwtVerify(token, SECRET)

    // Verificar que la cuenta esté activa
    // (la verificación detallada ocurre en la DB dentro de cada Route Handler)

    // Rutas solo admin
    if (ADMIN_PATHS.some(p => pathname.startsWith(p))) {
      if (payload.rol !== 'admin') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ ok: false, error: 'Sin permiso' }, { status: 403 })
        }
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }

    // Redirigir a dashboard si va a login estando autenticado
    if (pathname === '/login' || pathname === '/') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
  } catch {
    // Token inválido
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
