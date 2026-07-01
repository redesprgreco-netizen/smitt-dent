// app/api/usuarios/doctoras/route.ts
// Lista ligera de doctoras activas — usada en selectores (agenda, expedientes)
import prisma from '@/lib/prisma'
import { requireAuth, ok, serverError } from '@/lib/api'

export async function GET() {
  const auth = await requireAuth()
  if ('status' in auth) return auth

  try {
    const doctoras = await prisma.usuario.findMany({
      where: { estado: 'activo', rol: { in: ['doctora', 'visitante', 'admin'] } },
      select: { id: true, nombre: true, apellido: true, colorAgenda: true, rol: true },
      orderBy: { nombre: 'asc' },
    })
    return ok(doctoras)
  } catch (e) {
    return serverError(e)
  }
}
