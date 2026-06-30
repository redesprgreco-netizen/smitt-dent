// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { badRequest, conflict, serverError } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const { nombre, apellido, correo, password } = await req.json()
    if (!nombre || !apellido || !correo || !password)
      return badRequest('Todos los campos son requeridos')
    if (password.length < 8)
      return badRequest('La contraseña debe tener al menos 8 caracteres')

    const exists = await prisma.usuario.findUnique({ where: { correo: correo.toLowerCase() } })
    if (exists) return conflict('Ya existe una cuenta con ese correo')

    const passwordHash = await hashPassword(password)
    const user = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: correo.toLowerCase().trim(),
        passwordHash,
        rol: 'doctora',
        estado: 'pendiente',
      },
      select: { id: true, nombre: true, apellido: true, correo: true, estado: true },
    })

    return NextResponse.json({ ok: true, data: user }, { status: 201 })
  } catch (e) {
    return serverError(e)
  }
}
