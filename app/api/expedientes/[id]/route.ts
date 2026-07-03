$ cd /c/dev/smitt-dent
git show HEAD:"app/api/expedientes/[id]/route.ts"
// app/api/expedientes/route.ts
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
    const q = sp.get('q')?.trim()

    const where: Record<string, unknown> = {}

    // Doctoras solo ven sus pacientes
    if (session.rol !== 'admin') {
      where.doctoraId = session.sub
    }

    if (q) {
      where.OR = [
        { nombre:   { contains: q, mode: 'insensitive' } },
        { apellido: { contains: q, mode: 'insensitive' } },
        { folio:    { contains: q, mode: 'insensitive' } },
        { telefono: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await prisma.$transaction([
      prisma.expediente.findMany({
        where,
        include: {
          doctora: { select: { id: true, nombre: true, apellido: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
:
