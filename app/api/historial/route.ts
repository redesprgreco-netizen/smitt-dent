// app/api/historial/route.ts
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
    return forbidden('Sin acceso a este expediente')

  const data = await prisma.historialClinico.findMany({
    where: { expedienteId: parseInt(expedienteId) },
    orderBy: { createdAt: 'desc' },
    include: {
      creador:      { select: { id: true, nombre: true, apellido: true, rol: true } },
      correcciones: { include: { creador: { select: { id: true, nombre: true, apellido: true } } } },
    },
  })
  return ok(data)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  try {
    const { expedienteId, titulo, descripcion, esCorreccion, notaOriginalId } = await req.json()
    if (!expedienteId || !titulo || !descripcion)
      return badRequest('expedienteId, titulo y descripcion son requeridos')

    const exp = await prisma.expediente.findUnique({ where: { id: parseInt(expedienteId) } })
    if (!exp) return badRequest('Expediente no encontrado')
    if (session.rol !== 'admin' && exp.doctoraId !== session.sub)
      return forbidden('Sin acceso a este expediente')

    // Solo admin puede agregar correcciones
    if (esCorreccion && session.rol !== 'admin')
      return forbidden('Solo la administradora puede agregar correcciones')

    const nota = await prisma.historialClinico.create({
      data: {
        expedienteId: parseInt(expedienteId),
        titulo:       titulo.trim(),
        descripcion:  descripcion.trim(),
        esCorreccion: !!esCorreccion,
        notaOriginalId: notaOriginalId ? parseInt(notaOriginalId) : null,
        createdBy:    session.sub,
      },
      include: {
        creador: { select: { id: true, nombre: true, apellido: true, rol: true } },
      },
    })
    return created(nota)
  } catch (e) {
    return serverError(e)
  }
}
