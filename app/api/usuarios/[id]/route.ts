// app/api/usuarios/[id]/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, badRequest, notFound, serverError } from '@/lib/api'
import { logAccion, getIp } from '@/lib/bitacora'

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

    // Bitácora
    const accion = estado === 'activo' && user.estado === 'pendiente'
      ? 'aprobar_usuario'
      : estado === 'inactivo' ? 'desactivar_usuario'
      : estado === 'activo' && user.estado === 'inactivo' ? 'reactivar_usuario'
      : rol ? 'editar_rol_usuario'
      : 'editar_usuario'

    await logAccion({
      usuarioId: session.sub,
      accion,
      tablaAfectada: 'usuarios',
      registroId: id,
      valorAnterior: { rol: user.rol, estado: user.estado, colorAgenda: user.colorAgenda },
      valorNuevo: { rol: updated.rol, estado: updated.estado, colorAgenda: updated.colorAgenda },
      ipAddress: getIp(req),
    })

    return ok(updated)
  } catch (e) {
    return serverError(e)
  }
}
