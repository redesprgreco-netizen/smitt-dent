// app/api/citas/[id]/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, badRequest, forbidden, notFound, serverError } from '@/lib/api'

type Params = { params: { id: string } }

function normalize<T extends { fecha: Date; hora: Date }>(cita: T) {
  return {
    ...cita,
    fecha: cita.fecha.toISOString().slice(0, 10),
    hora: cita.hora.toISOString().slice(11, 16),
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if ('status' in auth) return auth

  const id = parseInt(params.id)
  const cita = await prisma.cita.findUnique({
    where: { id },
    include: {
      doctora: { select: { id: true, nombre: true, apellido: true, colorAgenda: true } },
      expediente: { select: { id: true, folio: true, nombre: true, apellido: true } },
    },
  })
  if (!cita) return notFound('Cita no encontrada')
  return ok(normalize(cita))
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  const id = parseInt(params.id)
  const cita = await prisma.cita.findUnique({ where: { id } })
  if (!cita) return notFound('Cita no encontrada')

  // Solo admin o la doctora dueña puede editar
  if (session.rol !== 'admin' && cita.doctoraId !== session.sub)
    return forbidden('Solo puedes editar tus propias citas')

  try {
    const body = await req.json()
    const { nombrePaciente, apellidoPaciente, asunto, fecha, hora, notas, estado, expedienteId } = body

    const updated = await prisma.cita.update({
      where: { id },
      data: {
        ...(nombrePaciente   && { nombrePaciente: nombrePaciente.trim() }),
        ...(apellidoPaciente && { apellidoPaciente: apellidoPaciente.trim() }),
        ...(asunto           && { asunto: asunto.trim() }),
        ...(fecha            && { fecha: new Date(fecha) }),
        ...(hora             && { hora: new Date(`1970-01-01T${hora}:00Z`) }),
        ...(notas !== undefined && { notas: notas?.trim() || null }),
        ...(estado           && { estado }),
        ...(expedienteId !== undefined && { expedienteId: expedienteId ? parseInt(expedienteId) : null }),
      },
      include: {
        doctora: { select: { id: true, nombre: true, apellido: true, colorAgenda: true } },
      },
    })
    return ok(normalize(updated))
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002')
      return badRequest('Ya existe una cita en ese horario para esa doctora')
    return serverError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  const id = parseInt(params.id)
  const cita = await prisma.cita.findUnique({ where: { id } })
  if (!cita) return notFound('Cita no encontrada')

  if (session.rol !== 'admin' && cita.doctoraId !== session.sub)
    return forbidden('Solo puedes cancelar tus propias citas')

  // En vez de eliminar, marcar como cancelada
  const updated = await prisma.cita.update({ where: { id }, data: { estado: 'cancelada' } })
  return ok(normalize(updated))
}
