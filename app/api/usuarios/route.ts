// app/api/usuarios/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, badRequest, serverError, paginatedOk, parsePagination } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth

  try {
    const sp = req.nextUrl.searchParams
    const { page, pageSize, skip } = parsePagination(sp)
    const estado = sp.get('estado')

    const where: Record<string, unknown> = {}
    if (estado) where.estado = estado

    const [data, total] = await prisma.$transaction([
      prisma.usuario.findMany({
        where,
        select: { id: true, nombre: true, apellido: true, correo: true, rol: true, colorAgenda: true, estado: true, createdAt: true, aprobadoPor: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.usuario.count({ where }),
    ])
    return paginatedOk(data, total, page, pageSize)
  } catch (e) {
    return serverError(e)
  }
}
