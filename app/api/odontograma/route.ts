// app/api/odontograma/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, badRequest, forbidden, serverError } from '@/lib/api'

// Piezas dentales adulto (FDI): 11-18, 21-28, 31-38, 41-48
const PIEZAS_ADULTO = [
  11,12,13,14,15,16,17,18,
  21,22,23,24,25,26,27,28,
  31,32,33,34,35,36,37,38,
  41,42,43,44,45,46,47,48,
]
// Piezas dentales infantil / dentición temporal (FDI): 51-55, 61-65, 71-75, 81-85
const PIEZAS_INFANTIL = [
  51,52,53,54,55,
  61,62,63,64,65,
  71,72,73,74,75,
  81,82,83,84,85,
]
const PIEZAS_VALIDAS = [...PIEZAS_ADULTO, ...PIEZAS_INFANTIL]
const SUPERFICIES_VALIDAS = ['oclusal', 'mesial', 'distal', 'vestibular', 'palatino']
const SUPERFICIE_ESTADOS_VALIDOS = ['sano', 'caries', 'obturado']

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
    include: { updater: { select: { id: true, nombre: true, apellido: true } } },
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
    const { expedienteId, numeroPieza, estado, notas, superficies } = await req.json()
    if (!expedienteId || !numeroPieza || !estado)
      return badRequest('expedienteId, numeroPieza y estado son requeridos')

    if (!PIEZAS_VALIDAS.includes(numeroPieza))
      return badRequest(`Pieza ${numeroPieza} no es válida. Use numeración FDI (11-48 adulto, 51-85 infantil)`)

    // Validar superficies si vienen
    let superficiesLimpio: Record<string, string> | undefined
    if (superficies !== undefined) {
      if (superficies === null) {
        superficiesLimpio = {}
      } else {
        superficiesLimpio = {}
        for (const [cara, est] of Object.entries(superficies)) {
          if (!SUPERFICIES_VALIDAS.includes(cara)) return badRequest(`Superficie "${cara}" no es válida`)
          if (!SUPERFICIE_ESTADOS_VALIDOS.includes(est as string)) return badRequest(`Estado de superficie "${est}" no es válido`)
          if (est !== 'sano') superficiesLimpio[cara] = est as string
        }
      }
    }

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
        ...(superficiesLimpio !== undefined && { superficies: superficiesLimpio }),
        updatedBy: session.sub,
      },
      update: {
        estado,
        notas: notas?.trim() || null,
        ...(superficiesLimpio !== undefined && { superficies: superficiesLimpio }),
        updatedBy: session.sub,
      },
      include: { updater: { select: { id: true, nombre: true, apellido: true } } },
    })

    // Registrar en historial si cambió el estado general de la pieza
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

