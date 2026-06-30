// app/api/pagos/[id]/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, badRequest, forbidden, notFound, serverError } from '@/lib/api'

type Params = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if ('status' in auth) return auth

  const id = parseInt(params.id)
  const pago = await prisma.pago.findUnique({
    where: { id },
    include: {
      expediente: { select: { id: true, folio: true, nombre: true, apellido: true } },
      creador:    { select: { id: true, nombre: true, apellido: true } },
      anulador:   { select: { id: true, nombre: true, apellido: true } },
    },
  })
  if (!pago) return notFound('Pago no encontrado')
  return ok(pago)
}

// Anular pago — solo admin
export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth
  const { session } = auth

  const id = parseInt(params.id)
  const pago = await prisma.pago.findUnique({ where: { id } })
  if (!pago) return notFound('Pago no encontrado')
  if (pago.estado === 'anulado') return badRequest('El pago ya está anulado')

  try {
    const { motivoAnulacion } = await req.json()
    if (!motivoAnulacion?.trim()) return badRequest('El motivo de anulación es requerido')

    const updated = await prisma.pago.update({
      where: { id },
      data: {
        estado: 'anulado',
        motivoAnulacion: motivoAnulacion.trim(),
        anuladoPor: session.sub,
        anuladoAt:  new Date(),
      },
    })
    return ok(updated)
  } catch (e) {
    return serverError(e)
  }
}
