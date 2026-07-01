// app/api/odontograma/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, badRequest, forbidden, serverError } from '@/lib/api'

// Piezas dentales adulto (FDI): 11-18, 21-28, 31-38, 41-48
const PIEZAS_VALIDAS = [
  11,12,13,14,15,16,17,18,
  21,22,23,24,25,26,27,28,
  31,32,33,34,35,36,37,38,
  41,42,43,44,45,46,47,48,
]

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  const expedienteId = req.nextUrl.searchParams.get('expedienteId')
  if (!expedienteId) return badRequest('expedienteId requerido')

  const exp = await prisma.expediente.findUnique({ where: { id: parseInt(expedienteId) } })
  if (!exp) return badRequest('Expediente no encontrado')
  if (session.rol !== 'admin' && exp.doctoraId !== session.sub)
    return forbidden('Sin acceso')

  const piezas = await prisma.odontogramaPieza.findMany({
    where: { expedienteId: parseInt(expedienteId) },
    orderBy: { numeroPieza: 'asc' },
  })

  // Retornar mapa { numeroPieza: pieza }
  const mapa: Record<number, unknown> = {}
  for (const p of piezas) mapa[p.numeroPieza] = p

  return ok({ piezas, mapa })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  try {
    const { expedienteId, numeroPieza, estado, notas } = await req.json()
    if (!expedienteId || !numeroPieza || !estado)
      return badRequest('expedienteId, numeroPieza y estado son requeridos')

    if (!PIEZAS_VALIDAS.includes(numeroPieza))
      return badRequest(`Pieza ${numeroPieza} no es válida. Use numeración FDI (11-48)`)

    const exp = await prisma.expediente.findUnique({ where: { id: parseInt(expedienteId) } })
    if (!exp) return badRequest('Expediente no encontrado')
    if (session.rol !== 'admin' && exp.doctoraId !== session.sub)
      return forbidden('Sin acceso')

    // Buscar estado anterior para historial
    const anterior = await prisma.odontogramaPieza.findUnique({
      where: { expedienteId_numeroPieza: { expedienteId: parseInt(expedienteId), numeroPieza } },
    })

    // Upsert la pieza
    const pieza = await prisma.odontogramaPieza.upsert({
      where: { expedienteId_numeroPieza: { expedienteId: parseInt(expedienteId), numeroPieza } },
      create: {
        expedienteId: parseInt(expedienteId),
        numeroPieza,
        estado,
        notas: notas?.trim() || null,
        updatedBy: session.sub,
      },
      update: {
        estado,
        notas: notas?.trim() || null,
        updatedBy: session.sub,
      },
    })

    // Registrar en historial si cambió
    const estadoAnterior = anterior?.estado ?? 'sin_tratamiento'
    if (estadoAnterior !== estado) {
      await prisma.odontogramaHistorial.create({
        data: {
          expedienteId: parseInt(expedienteId),
          numeroPieza,
          estadoAnterior,
          estadoNuevo: estado,
          changedBy: session.sub,
        },
      })
    }

    return ok(pieza)
  } catch (e) {
    return serverError(e)
  }
}
