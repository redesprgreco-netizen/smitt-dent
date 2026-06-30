// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword, signToken, setSessionCookie } from '@/lib/auth'
import { badRequest, unauthorized, serverError } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const { correo, password } = await req.json()
    if (!correo || !password) return badRequest('Correo y contraseña requeridos')

    const user = await prisma.usuario.findUnique({ where: { correo: correo.toLowerCase() } })
    if (!user) return unauthorized('Credenciales incorrectas')
    if (user.estado !== 'activo') {
      return unauthorized(
        user.estado === 'pendiente'
          ? 'Tu cuenta está pendiente de aprobación'
          : 'Tu cuenta ha sido desactivada'
      )
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) return unauthorized('Credenciales incorrectas')

    const token = await signToken({
      sub: user.id,
      correo: user.correo,
      rol: user.rol,
      nombre: user.nombre,
      apellido: user.apellido,
      colorAgenda: user.colorAgenda,
    })

    const res = NextResponse.json({
      ok: true,
      data: { id: user.id, nombre: user.nombre, apellido: user.apellido, rol: user.rol, colorAgenda: user.colorAgenda },
    })
    return setSessionCookie(token, res)
  } catch (e) {
    return serverError(e)
  }
}
