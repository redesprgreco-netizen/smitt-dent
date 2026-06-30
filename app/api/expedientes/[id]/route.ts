// app/api/expedientes/[id]/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, badRequest, forbidden, notFound, serverError } from '@/lib/api'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  const id = parseInt(params.id)
  const exp = await prisma.expediente.findUnique({
    where: { id },
    include: {
      doctora:  { select: { id: true, nombre: true, apellido: true } },
      historial: {
        orderBy: { createdAt: 'desc' },
        include: { creador: { select: { id: true, nombre: true, apellido: true, rol: true } } },
      },
      odontograma: { orderBy: { numeroPieza: 'asc' } },
      planTratamiento: { orderBy: { createdAt: 'asc' } },
      pagos: {
        orderBy: { createdAt: 'desc' },
        include: { creador: { select: { id: true, nombre: true, apellido: true } } },
      },
    },
  })
  if (!exp) return notFound('Expediente no encontrado')

  // Doctoras solo ven sus pacientes
  if (session.rol !== 'admin' && exp.doctoraId !== session.sub)
    return forbidden('No tienes acceso a este expediente')

  // Calcular saldo
  const totalPresupuesto = exp.planTratamiento.reduce(
    (acc, pt) => acc + Number(pt.subtotal) * (1 - Number(pt.descuentoPct) / 100), 0
  )
  const totalPagado = exp.pagos
    .filter(p => p.estado === 'activo')
    .reduce((acc, p) => acc + Number(p.monto), 0)

  return ok({ ...exp, totalPresupuesto, totalPagado, saldoPendiente: totalPresupuesto - totalPagado })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  const id = parseInt(params.id)
  const exp = await prisma.expediente.findUnique({ where: { id } })
  if (!exp) return notFound('Expediente no encontrado')

  if (session.rol !== 'admin' && exp.doctoraId !== session.sub)
    return forbidden('No tienes acceso a este expediente')

  try {
    const body = await req.json()
    const { nombre, apellido, fechaNacimiento, telefono, correo, alergias, motivoInicial, estado } = body

    // Solo admin puede cambiar estado
    if (estado !== undefined && session.rol !== 'admin')
      return forbidden('Solo la administradora puede cambiar el estado del expediente')

    const updated = await prisma.expediente.update({
      where: { id },
      data: {
        ...(nombre           && { nombre: nombre.trim() }),
        ...(apellido         && { apellido: apellido.trim() }),
        ...(fechaNacimiento !== undefined && { fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null }),
        ...(telefono  !== undefined && { telefono: telefono?.trim() || null }),
        ...(correo    !== undefined && { correo: correo?.toLowerCase().trim() || null }),
        ...(alergias  !== undefined && { alergias: alergias?.trim() || null }),
        ...(motivoInicial !== undefined && { motivoInicial: motivoInicial?.trim() || null }),
        ...(estado    !== undefined && { estado }),
      },
    })
    return ok(updated)
  } catch (e) {
    return serverError(e)
  }
}
