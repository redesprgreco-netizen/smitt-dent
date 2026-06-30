// app/api/bitacora/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, serverError, paginatedOk, parsePagination } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth

  try {
    const sp = req.nextUrl.searchParams
    const { page, pageSize, skip } = parsePagination(sp)
    const usuarioId = sp.get('usuarioId')
    const accion    = sp.get('accion')
    const tabla     = sp.get('tabla')

    const where: Record<string, unknown> = {}
    if (usuarioId) where.usuarioId   = parseInt(usuarioId)
    if (accion)    where.accion      = { contains: accion, mode: 'insensitive' }
    if (tabla)     where.tablaAfectada = tabla

    const [data, total] = await prisma.$transaction([
      prisma.bitacora.findMany({
        where,
        include: {
          usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.bitacora.count({ where }),
    ])

    return paginatedOk(data, total, page, pageSize)
  } catch (e) {
    return serverError(e)
  }
}
