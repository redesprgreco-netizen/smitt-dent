import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { badRequest, conflict, notFound, ok, requireAuth, serverError } from '@/lib/api'
import { getAvailableTimes, isRequestableDate } from '@/lib/solicitudes-cita'

function prismaCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: string }).code
    : undefined
}

class SolicitudAtendidaError extends Error {}

export async function GET() {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth

  try {
    const solicitudes = await prisma.solicitudCita.findMany({
      where: {
        OR: [
          { estado: 'pendiente' },
          { estado: 'confirmada', createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        ],
      },
      orderBy: [{ estado: 'asc' }, { fecha: 'asc' }, { hora: 'asc' }],
      take: 100,
      select: {
        id: true,
        nombrePaciente: true,
        apellidoPaciente: true,
        telefono: true,
        correo: true,
        fecha: true,
        hora: true,
        estado: true,
        citaId: true,
        createdAt: true,
      },
    })
    return ok(solicitudes.map(solicitud => ({
      ...solicitud,
      fecha: solicitud.fecha.toISOString().slice(0, 10),
      hora: solicitud.hora.toISOString().slice(11, 16),
    })))
  } catch (error) {
    return serverError(error)
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth

  try {
    const body: unknown = await req.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return badRequest('Solicitud o acción no válida')
    }
    const payload = body as Record<string, unknown>
    const id = Number(payload.id)
    const accion = payload.accion
    if (
      !Number.isInteger(id) || id < 1 ||
      (accion !== 'confirmar' && accion !== 'rechazar')
    ) {
      return badRequest('Solicitud o acción no válida')
    }

    if (accion === 'rechazar') {
      const updated = await prisma.solicitudCita.updateMany({
        where: { id, estado: 'pendiente' },
        data: { estado: 'rechazada' },
      })
      if (!updated.count) return conflict('La solicitud ya fue atendida o no existe.')
      return ok({ rechazada: true })
    }

    const outcome = await prisma.$transaction(async tx => {
      const solicitud = await tx.solicitudCita.findUnique({ where: { id } })
      if (!solicitud) return 'not-found' as const
      if (solicitud.estado !== 'pendiente') return 'already-handled' as const

      const fecha = solicitud.fecha.toISOString().slice(0, 10)
      if (!isRequestableDate(fecha)) return 'expired' as const

      const citas = await tx.cita.findMany({
        where: { fecha: solicitud.fecha },
        select: { hora: true },
      })
      const horario = solicitud.hora.toISOString().slice(11, 16)
      if (!getAvailableTimes(fecha, citas.map(cita => cita.hora)).includes(horario)) {
        return 'slot-taken' as const
      }

      const cita = await tx.cita.create({
        data: {
          nombrePaciente: solicitud.nombrePaciente,
          apellidoPaciente: solicitud.apellidoPaciente,
          asunto: 'Cita solicitada desde sitio web',
          fecha: solicitud.fecha,
          hora: solicitud.hora,
          estado: 'confirmada',
          creadoPorNombre: 'Solicitud web',
        },
      })
      const updated = await tx.solicitudCita.updateMany({
        where: { id, estado: 'pendiente' },
        data: { estado: 'confirmada', citaId: cita.id },
      })
      if (!updated.count) throw new SolicitudAtendidaError()
      return 'confirmed' as const
    }, { isolationLevel: 'Serializable' })

    if (outcome === 'not-found') return notFound('No se encontró la solicitud.')
    if (outcome === 'already-handled') return conflict('La solicitud ya fue atendida.')
    if (outcome === 'expired') return badRequest('La fecha de esta solicitud ya pasó o está fuera del periodo de reservación.')
    if (outcome === 'slot-taken') return conflict('Ese horario ya no está disponible. Contacta al paciente para ofrecerle otro.')
    return ok({ confirmada: true })
  } catch (error) {
    if (error instanceof SolicitudAtendidaError) {
      return conflict('La solicitud ya fue atendida.')
    }
    if (prismaCode(error) === 'P2002' || prismaCode(error) === 'P2034') {
      return conflict('Ese horario acaba de ocuparse. Actualiza la agenda antes de volver a intentarlo.')
    }
    return serverError(error)
  }
}
