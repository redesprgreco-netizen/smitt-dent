// app/api/citas/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, created, badRequest, serverError, paginatedOk, parsePagination } from '@/lib/api'

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if ('status' in auth) return auth

  try {
    const sp = req.nextUrl.searchParams
    const { page, pageSize, skip } = parsePagination(sp)
    const fecha     = sp.get('fecha')          // YYYY-MM-DD — filtra por día
    const mes       = sp.get('mes')            // YYYY-MM — filtra por mes
    const doctoraId = sp.get('doctoraId')

    const where: Record<string, unknown> = {}

    if (fecha) {
      where.fecha = new Date(fecha)
    } else if (mes) {
      const [y, m] = mes.split('-').map(Number)
      where.fecha = {
        gte: new Date(y, m - 1, 1),
        lt:  new Date(y, m, 1),
      }
    }

    if (doctoraId) where.doctoraId = parseInt(doctoraId)

    const [data, total] = await prisma.$transaction([
      prisma.cita.findMany({
        where,
        include: {
          doctora: { select: { id: true, nombre: true, apellido: true, colorAgenda: true } },
        },
        orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
        skip,
        take: pageSize,
      }),
      prisma.cita.count({ where }),
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
    const { nombrePaciente, apellidoPaciente, asunto, fecha, hora, notas, doctoraId, expedienteId } = body

    if (!nombrePaciente || !apellidoPaciente || !asunto || !fecha || !hora || !doctoraId)
      return badRequest('Campos requeridos: nombrePaciente, apellidoPaciente, asunto, fecha, hora, doctoraId')

    // Doctoras solo pueden crear sus propias citas
    if (session.rol !== 'admin' && doctoraId !== session.sub)
      return badRequest('Solo puedes crear citas para ti misma')

    const cita = await prisma.cita.create({
      data: {
        nombrePaciente: nombrePaciente.trim(),
        apellidoPaciente: apellidoPaciente.trim(),
        asunto: asunto.trim(),
        fecha: new Date(fecha),
        hora: new Date(`1970-01-01T${hora}:00Z`),
        notas: notas?.trim() || null,
        doctoraId: parseInt(doctoraId),
        expedienteId: expedienteId ? parseInt(expedienteId) : null,
        createdBy: session.sub,
      },
      include: {
        doctora: { select: { id: true, nombre: true, apellido: true, colorAgenda: true } },
      },
    })

    return created(cita)
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002')
      return badRequest('Ya existe una cita para esa doctora en esa fecha y hora')
    return serverError(e)
  }
}
