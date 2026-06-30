// app/api/plan-tratamiento/[id]/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, noContent, badRequest, forbidden, notFound, serverError } from '@/lib/api'

type Params = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  const id = parseInt(params.id)
  const item = await prisma.planTratamiento.findUnique({
    where: { id },
    include: { expediente: true },
  })
  if (!item) return notFound('Ítem no encontrado')
  if (session.rol !== 'admin' && item.expediente.doctoraId !== session.sub)
    return forbidden('Sin acceso')

  try {
    const { concepto, piezas, cantidad, precioUnitario, descuentoPct, estado } = await req.json()

    const qty     = cantidad     !== undefined ? Number(cantidad)     : Number(item.cantidad)
    const precio  = precioUnitario !== undefined ? Number(precioUnitario) : Number(item.precioUnitario)
    const subtotal = qty * precio

    const updated = await prisma.planTratamiento.update({
      where: { id },
      data: {
        ...(concepto       !== undefined && { concepto: concepto.trim() }),
        ...(piezas         !== undefined && { piezas: piezas?.trim() || null }),
        ...(cantidad       !== undefined && { cantidad: qty }),
        ...(precioUnitario !== undefined && { precioUnitario: precio }),
        ...(cantidad !== undefined || precioUnitario !== undefined) && { subtotal },
        ...(descuentoPct   !== undefined && { descuentoPct: Number(descuentoPct) }),
        ...(estado         !== undefined && { estado }),
      },
    })
    return ok(updated)
  } catch (e) {
    return serverError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  const id = parseInt(params.id)
  const item = await prisma.planTratamiento.findUnique({
    where: { id },
    include: { expediente: true },
  })
  if (!item) return notFound('Ítem no encontrado')
  if (session.rol !== 'admin' && item.expediente.doctoraId !== session.sub)
    return forbidden('Sin acceso')

  await prisma.planTratamiento.delete({ where: { id } })
  return noContent()
}
