// app/api/inventario/movimientos/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, created, badRequest, serverError, paginatedOk, parsePagination } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth

  const sp = req.nextUrl.searchParams
  const { page, pageSize, skip } = parsePagination(sp)
  const articuloId = sp.get('articuloId')

  const where: Record<string, unknown> = {}
  if (articuloId) where.articuloId = parseInt(articuloId)

  const [data, total] = await prisma.$transaction([
    prisma.inventarioMovimiento.findMany({
      where,
      include: {
        articulo: { select: { id: true, nombre: true, unidadMedida: true } },
        creador:  { select: { id: true, nombre: true, apellido: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.inventarioMovimiento.count({ where }),
  ])

  return paginatedOk(data, total, page, pageSize)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth
  const { session } = auth

  try {
    const { articuloId, tipo, cantidad, notas } = await req.json()
    if (!articuloId || !tipo || !cantidad) return badRequest('articuloId, tipo y cantidad son requeridos')
    if (!['entrada', 'salida'].includes(tipo)) return badRequest('tipo debe ser entrada o salida')
    if (Number(cantidad) <= 0) return badRequest('cantidad debe ser mayor a 0')

    const articulo = await prisma.inventarioArticulo.findUnique({ where: { id: parseInt(articuloId) } })
    if (!articulo) return badRequest('Artículo no encontrado')

    if (tipo === 'salida' && Number(articulo.stockActual) < Number(cantidad))
      return badRequest(`Stock insuficiente. Disponible: ${articulo.stockActual} ${articulo.unidadMedida}`)

    // El trigger de Supabase actualiza stockActual, pero aquí lo hacemos también en Prisma
    const [movimiento] = await prisma.$transaction([
      prisma.inventarioMovimiento.create({
        data: {
          articuloId: parseInt(articuloId),
          tipo,
          cantidad: Number(cantidad),
          notas: notas?.trim() || null,
          createdBy: session.sub,
        },
        include: { articulo: { select: { id: true, nombre: true, unidadMedida: true } } },
      }),
      prisma.inventarioArticulo.update({
        where: { id: parseInt(articuloId) },
        data: {
          stockActual: tipo === 'entrada'
            ? { increment: Number(cantidad) }
            : { decrement: Number(cantidad) },
        },
      }),
    ])
    return created(movimiento)
  } catch (e) {
    return serverError(e)
  }
}
