// app/api/expedientes/[id]/antecedentes/route.ts
// II. Antecedentes Patológicos Personales
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, forbidden, notFound, serverError } from '@/lib/api'
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

  const antecedentes = await prisma.antecedentesPatologicos.findUnique({
    where: { expedienteId },
  })

  return ok(antecedentes)
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

    // Campos booleanos permitidos
    const boolFields = [
      'feReumatica', 'enfCardiovascular', 'mareosDesmayos', 'diabetesPersonal', 'hepatitis',
      'vihSida', 'artritisReumatismo', 'gastritisUlceras', 'problemasRenales', 'anemia',
      'presionArterial', 'sangradoAnormal', 'moretonesFacil', 'transfusiones', 'asma',
      'diabetesFamiliar', 'enfCorazonFamiliar', 'hipertensionFamiliar', 'cancerFamiliar',
      'tratamientoActual', 'alergicoAnestesico', 'faltaAire', 'bocaSeca', 'embarazada',
      'tabaquismo', 'drogas', 'alergiasGenerales', 'alcoholismo',
    ] as const

    const intFields = [
      'mesesGestacion', 'cigarrosDia', 'tabaquismoAnios', 'drogasAnios', 'alergiasAnios', 'alcoholAnios',
    ] as const

    const textFields = [
      'tratamientoActualDetalle', 'alergicoDetalle', 'drogasCuales', 'alergiasCuales', 'alcoholCantSemana',
    ] as const

    const data: Record<string, unknown> = { updatedBy: session.sub }

    if (body.estadoSalud !== undefined) data.estadoSalud = body.estadoSalud || null
    for (const f of boolFields) if (body[f] !== undefined) data[f] = Boolean(body[f])
    for (const f of intFields) if (body[f] !== undefined) data[f] = body[f] === '' || body[f] === null ? null : parseInt(body[f])
    for (const f of textFields) if (body[f] !== undefined) data[f] = body[f]?.trim() || null

    const antecedentes = await prisma.antecedentesPatologicos.upsert({
      where: { expedienteId },
      create: { expedienteId, ...data } as never,
      update: data as never,
    })

    await logAccion({
      usuarioId: session.sub,
      accion: 'actualizar_antecedentes',
      tablaAfectada: 'antecedentes_patologicos',
      registroId: antecedentes.id,
      valorNuevo: data as Record<string, unknown>,
      ipAddress: getIp(req),
    })

    return ok(antecedentes)
  } catch (e) {
    return serverError(e)
  }
}
