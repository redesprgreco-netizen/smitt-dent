import { NextResponse } from 'next/server'

export function middleware(req) {
  const sesion = req.cookies.get('admin_session')

  if (!sesion || sesion.value !== 'ok') {
    return NextResponse.redirect(new URL('/admin-login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/scan'],
}
