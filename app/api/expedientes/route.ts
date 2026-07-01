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
        take: pageSize,
      }),
      prisma.expediente.count({ where }),
    ])

    return paginatedOk(data, total, page, pageSize)
  } catch (e) {
    return serverError(e)
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if ('status' in auth) return auth
  const { session } = auth

  try {
    const body = await req.json()
    const { nombre, apellido, fechaNacimiento, telefono, correo, alergias, motivoInicial, doctoraId } = body

    if (!nombre || !apellido) return badRequest('Nombre y apellido son requeridos')

    // Generar folio
    const count = await prisma.expediente.count()
    const folio = `EXP-${String(count + 1).padStart(4, '0')}`

    const expediente = await prisma.expediente.create({
      data: {
        folio,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        telefono: telefono?.trim() || null,
        correo: correo?.toLowerCase().trim() || null,
        alergias: alergias?.trim() || null,
        motivoInicial: motivoInicial?.trim() || null,
        doctoraId: doctoraId ? parseInt(doctoraId) : session.sub,
        createdBy: session.sub,
      },
      include: {
        doctora: { select: { id: true, nombre: true, apellido: true } },
      },
    })

    return created(expediente)
  } catch (e) {
    return serverError(e)
  }
}
