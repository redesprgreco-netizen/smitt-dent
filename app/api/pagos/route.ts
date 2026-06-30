// app/api/pagos/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, created, badRequest, serverError, paginatedOk, parsePagination } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  try {
    const sp = req.nextUrl.searchParams
    const { page, pageSize, skip } = parsePagination(sp)
    const expedienteId = sp.get('expedienteId')

    const where: Record<string, unknown> = {}
    if (expedienteId) where.expedienteId = parseInt(expedienteId)

    // Doctoras solo ven pagos de sus pacientes
    if (session.rol !== 'admin') {
      where.expediente = { doctoraId: session.sub }
    }

    const [data, total] = await prisma.$transaction([
      prisma.pago.findMany({
        where,
        include: {
          expediente: { select: { id: true, folio: true, nombre: true, apellido: true } },
          creador:    { select: { id: true, nombre: true, apellido: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.pago.count({ where }),
    ])

    return paginatedOk(data, total, page, pageSize)
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  try {
    const body = await req.json()
    const { expedienteId, monto, metodoPago, concepto } = body

    if (!expedienteId || !monto || !metodoPago)
      return badRequest('Campos requeridos: expedienteId, monto, metodoPago')

    if (Number(monto) <= 0) return badRequest('El monto debe ser mayor a 0')

    const exp = await prisma.expediente.findUnique({ where: { id: parseInt(expedienteId) } })
    if (!exp) return badRequest('Expediente no encontrado')

    // Generar folio de recibo
    const count = await prisma.pago.count()
    const folioRecibo = `REC-${String(count + 1).padStart(5, '0')}`

    const pago = await prisma.pago.create({
      data: {
        folioRecibo,
        expedienteId: parseInt(expedienteId),
        monto: Number(monto),
        metodoPago,
        concepto: concepto?.trim() || null,
        createdBy: session.sub,
      },
      include: {
        expediente: { select: { id: true, folio: true, nombre: true, apellido: true } },
        creador:    { select: { id: true, nombre: true, apellido: true } },
      },
    })

    return created(pago)
  } catch (e) {
    return serverError(e)
  }
}
