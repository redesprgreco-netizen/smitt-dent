// app/api/plan-tratamiento/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, created, badRequest, forbidden, serverError } from '@/lib/api'

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

  const data = await prisma.planTratamiento.findMany({
    where: { expedienteId: parseInt(expedienteId) },
    orderBy: { createdAt: 'asc' },
  })

  const total = data.reduce(
    (acc, pt) => acc + Number(pt.subtotal) * (1 - Number(pt.descuentoPct) / 100), 0
  )

  return ok({ items: data, total })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  try {
    const { expedienteId, concepto, piezas, cantidad, precioUnitario, descuentoPct } = await req.json()
    if (!expedienteId || !concepto || !precioUnitario)
      return badRequest('expedienteId, concepto y precioUnitario son requeridos')

    const exp = await prisma.expediente.findUnique({ where: { id: parseInt(expedienteId) } })
    if (!exp) return badRequest('Expediente no encontrado')
    if (session.rol !== 'admin' && exp.doctoraId !== session.sub)
      return forbidden('Sin acceso')

    const qty       = Number(cantidad) || 1
    const precio    = Number(precioUnitario)
    const descuento = Number(descuentoPct) || 0
    const subtotal  = qty * precio

    const item = await prisma.planTratamiento.create({
      data: {
        expedienteId: parseInt(expedienteId),
        concepto:     concepto.trim(),
        piezas:       piezas?.trim() || null,
        cantidad:     qty,
        precioUnitario: precio,
        subtotal,
        descuentoPct: descuento,
        createdBy: session.sub,
      },
    })
    return created(item)
  } catch (e) {
    return serverError(e)
  }
}
