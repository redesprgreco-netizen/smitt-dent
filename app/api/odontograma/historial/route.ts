// app/api/odontograma/historial/route.ts
// Historial de cambios de una pieza dental: quién cambió qué estado y cuándo.
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, badRequest, forbidden } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  const expedienteId = req.nextUrl.searchParams.get('expedienteId')
  const numeroPiezaRaw = req.nextUrl.searchParams.get('numeroPieza')
  if (!expedienteId) return badRequest('expedienteId requerido')

  const exp = await prisma.expediente.findUnique({ where: { id: parseInt(expedienteId) } })
  if (!exp) return badRequest('Expediente no encontrado')
  if (session.rol !== 'admin' && exp.doctoraId !== session.sub)
    return forbidden('Sin acceso')

  const historial = await prisma.odontogramaHistorial.findMany({
    where: {
      expedienteId: parseInt(expedienteId),
      ...(numeroPiezaRaw ? { numeroPieza: parseInt(numeroPiezaRaw) } : {}),
    },
    orderBy: { changedAt: 'desc' },
    take: numeroPiezaRaw ? 30 : 100,
    include: { changer: { select: { id: true, nombre: true, apellido: true } } },
  })

  return ok(historial)
}
