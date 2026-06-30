// app/api/usuarios/[id]/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, badRequest, notFound, serverError } from '@/lib/api'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth

  const id = parseInt(params.id)
  const user = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, nombre: true, apellido: true, correo: true, rol: true, colorAgenda: true, estado: true, createdAt: true },
  })
  if (!user) return notFound('Usuario no encontrado')
  return ok(user)
}

// Aprobar / cambiar rol / desactivar
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth
  const { session } = auth

  const id = parseInt(params.id)
  if (id === session.sub) return badRequest('No puedes modificar tu propia cuenta desde aquí')

  const user = await prisma.usuario.findUnique({ where: { id } })
  if (!user) return notFound('Usuario no encontrado')

  try {
    const { rol, colorAgenda, estado } = await req.json()

    const updated = await prisma.usuario.update({
      where: { id },
      data: {
        ...(rol        && { rol }),
        ...(colorAgenda !== undefined && { colorAgenda: colorAgenda || null }),
        ...(estado     && { estado }),
        // Al aprobar, registrar quién aprobó
        ...(estado === 'activo' && user.estado === 'pendiente' && { aprobadoPor: session.sub }),
      },
      select: { id: true, nombre: true, apellido: true, correo: true, rol: true, colorAgenda: true, estado: true },
    })
    return ok(updated)
  } catch (e) {
    return serverError(e)
  }
}
