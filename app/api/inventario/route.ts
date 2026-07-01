// app/api/inventario/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, created, badRequest, serverError, paginatedOk, parsePagination } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if ('status' in auth) return auth

  try {
    const sp = req.nextUrl.searchParams
    const { page, pageSize, skip } = parsePagination(sp)
    const q       = sp.get('q')?.trim()
    const bajoMin = sp.get('bajoMinimo') === 'true'

    const where: Record<string, unknown> = { activo: true }
    if (q) where.nombre = { contains: q, mode: 'insensitive' }
    if (bajoMin) where.stockActual = { lt: prisma.inventarioArticulo.fields.stockMinimo }

    const [data, total] = await prisma.$transaction([
      prisma.inventarioArticulo.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.inventarioArticulo.count({ where }),
    ])

    return paginatedOk(data, total, page, pageSize)
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth

  try {
    const { nombre, categoria, unidadMedida, stockMinimo } = await req.json()
    if (!nombre || !unidadMedida) return badRequest('nombre y unidadMedida son requeridos')

    const articulo = await prisma.inventarioArticulo.create({
      data: {
        nombre:       nombre.trim(),
        categoria:    categoria?.trim() || null,
        unidadMedida: unidadMedida.trim(),
        stockMinimo:  Number(stockMinimo) || 0,
        stockActual:  0,
      },
    })
    return created(articulo)
  } catch (e) {
    return serverError(e)
  }
}
