// app/api/expedientes/[id]/consentimiento/route.ts
// Consentimiento Informado
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, badRequest, forbidden, notFound, serverError } from '@/lib/api'
import { logAccion, getIp } from '@/lib/bitacora'

type Params = { params: { id: string } }

async function getExpedienteConAcceso(id: number, session: { sub: number; rol: string }) {
  const exp = await prisma.expediente.findUnique({ where: { id } })
  if (!exp) return { error: notFound('Expediente no encontrado') }
  if (session.rol !== 'admin' && exp.doctoraId !== session.sub)
    return { error: forbidden('No tienes acceso a este expediente') }
  return { exp }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  const expedienteId = parseInt(params.id)
  const { error } = await getExpedienteConAcceso(expedienteId, session)
  if (error) return error

  const consentimiento = await prisma.consentimientoInformado.findUnique({
    where: { expedienteId },
  })

  return ok(consentimiento)
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  const expedienteId = parseInt(params.id)
  const { error } = await getExpedienteConAcceso(expedienteId, session)
  if (error) return error

  try {
    const body = await req.json()
    const { nombreDentista, nombreRepresentanteLegal, parentesco, aceptado, firmaNombre } = body

    if (aceptado && !firmaNombre?.trim())
      return badRequest('El nombre/firma del paciente o tutor es requerido para aceptar el consentimiento')

    const data = {
      nombreDentista: nombreDentista?.trim() || null,
      nombreRepresentanteLegal: nombreRepresentanteLegal?.trim() || null,
      parentesco: parentesco?.trim() || null,
      aceptado: Boolean(aceptado),
      firmaNombre: firmaNombre?.trim() || null,
      fechaFirma: aceptado ? new Date() : null,
    }

    const consentimiento = await prisma.consentimientoInformado.upsert({
      where: { expedienteId },
      create: { expedienteId, createdBy: session.sub, ...data },
      update: data,
    })

    await logAccion({
      usuarioId: session.sub,
      accion: aceptado ? 'firmar_consentimiento' : 'actualizar_consentimiento',
      tablaAfectada: 'consentimiento_informado',
      registroId: consentimiento.id,
      valorNuevo: data,
      ipAddress: getIp(req),
    })

    return ok(consentimiento)
  } catch (e) {
    return serverError(e)
  }
}
