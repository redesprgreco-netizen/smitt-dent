// app/api/citas/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, created, badRequest, serverError, paginatedOk, parsePagination } from '@/lib/api'

const COLORES_TEMPORALES = ['#e11d48', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#7c3aed', '#c026d3', '#475569']

async function colorTemporalDisponible(fecha: Date) {
  const citas = await prisma.cita.findMany({
    where: { fecha, medicoTemporalColor: { not: null } },
    select: { medicoTemporalColor: true },
  })
  const usados = new Set(citas.map(cita => cita.medicoTemporalColor))
  return COLORES_TEMPORALES.find(color => !usados.has(color)) ?? COLORES_TEMPORALES[citas.length % COLORES_TEMPORALES.length]
}

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

    const data = await prisma.cita.findMany({
      where,
      include: {
        doctora: { select: { id: true, nombre: true, apellido: true, colorAgenda: true } },
      },
      orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
      skip,
      take: pageSize,
    })
    const total = await prisma.cita.count({ where })

    // Normalizar fecha/hora a strings simples para el frontend
    const normalized = data.map(c => ({
      ...c,
      fecha: c.fecha.toISOString().slice(0, 10),
      hora: c.hora.toISOString().slice(11, 16),
    }))

    return paginatedOk(normalized, total, page, pageSize)
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
    const { nombrePaciente, apellidoPaciente, asunto, fecha, hora, notas, doctoraId, expedienteId, medicoTemporalNombre } = body

    if (!nombrePaciente || !apellidoPaciente || !asunto || !fecha || !hora || !doctoraId)
      return badRequest('Campos requeridos: nombrePaciente, apellidoPaciente, asunto, fecha, hora, doctoraId')

    // Doctoras solo pueden crear sus propias citas
    if (session.rol !== 'admin' && doctoraId !== session.sub)
      return badRequest('Solo puedes crear citas para ti misma')

    const doctora = await prisma.usuario.findUnique({
      where: { id: parseInt(doctoraId) },
      select: { nombre: true, apellido: true },
    })
    if (!doctora) return badRequest('Doctora no encontrada')

    const fechaCita = new Date(fecha)
    const nombreTemporal = typeof medicoTemporalNombre === 'string' ? medicoTemporalNombre.trim() : ''
    const colorTemporal = nombreTemporal ? await colorTemporalDisponible(fechaCita) : null

    const cita = await prisma.cita.create({
      data: {
        nombrePaciente: nombrePaciente.trim(),
        apellidoPaciente: apellidoPaciente.trim(),
        asunto: asunto.trim(),
        fecha: fechaCita,
        hora: new Date(`1970-01-01T${hora}:00Z`),
        notas: notas?.trim() || null,
        doctoraId: parseInt(doctoraId),
        doctoraNombre: `${doctora.nombre} ${doctora.apellido}`,
        medicoTemporalNombre: nombreTemporal || null,
        medicoTemporalColor: colorTemporal,
        expedienteId: expedienteId ? parseInt(expedienteId) : null,
        createdBy: session.sub,
        creadoPorNombre: `${session.nombre} ${session.apellido}`,
      },
      include: {
        doctora: { select: { id: true, nombre: true, apellido: true, colorAgenda: true } },
      },
    })

    return created(cita)
  } catch (e: unknown) {
    if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002')
      return badRequest('Ya existe una cita en esa fecha y hora. Elige otro horario.')
    return serverError(e)
  }
}
