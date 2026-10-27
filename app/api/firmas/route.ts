// app/api/firmas/route.ts
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import prisma from '@/lib/prisma'
import { requireAuth, ok, badRequest, serverError } from '@/lib/api'

// Lista todas las solicitudes de firma (más recientes primero). Filtra por ?expedienteId= si se pasa.
export async function GET(req: NextRequest) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth

  const expedienteId = req.nextUrl.searchParams.get('expedienteId')

  const firmas = await prisma.firmaContrato.findMany({
    where: expedienteId ? { expedienteId: parseInt(expedienteId) } : undefined,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      contrato: { select: { id: true, nombre: true } },
      expediente: { select: { id: true, folio: true, nombre: true, apellido: true } },
    },
  })
  const pendientesVistos = new Set<string>()
  const firmasVisibles = firmas.filter(firma => {
    if (firma.estado === 'reemplazado') return false
    if (firma.estado !== 'pendiente') return true
    const identidad = firma.expedienteId != null
      ? `expediente:${firma.expedienteId}`
      : `cliente:${firma.clienteNombre.toLocaleLowerCase()}:${firma.clienteTelefono ?? ''}`
    const key = `${firma.contratoId}:${identidad}`
    if (pendientesVistos.has(key)) return false
    pendientesVistos.add(key)
    return true
  })
  return ok(firmasVisibles)
}

// Crea una nueva solicitud de firma y devuelve el link único
export async function POST(req: NextRequest) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth
  const { session } = auth

  try {
    const { clienteNombre, clienteTelefono, expedienteId } = await req.json()
    if (!clienteNombre?.trim()) return badRequest('Falta el nombre del cliente')
    if (expedienteId != null && (!Number.isInteger(expedienteId) || expedienteId < 1)) {
      return badRequest('El expediente no es válido')
    }

    const contrato = await prisma.contrato.findFirst({ where: { activo: true } })
    if (!contrato) return badRequest('No hay ningún contrato activo. Sube un PDF primero en Configuración → Contratos.')

    const nombre = clienteNombre.trim()
    const telefono = clienteTelefono?.trim() || null
    const expediente = expedienteId ?? null
    const pendiente = await prisma.firmaContrato.findFirst({
      where: expediente
        ? { contratoId: contrato.id, expedienteId: expediente, estado: 'pendiente' }
        : {
          contratoId: contrato.id,
          expedienteId: null,
          clienteNombre: nombre,
          clienteTelefono: telefono,
          estado: 'pendiente',
        },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })

    const firma = pendiente ?? await prisma.firmaContrato.create({
      data: {
        token: crypto.randomBytes(24).toString('base64url'),
        contratoId: contrato.id,
        expedienteId: expediente,
        clienteNombre: nombre,
        clienteTelefono: telefono,
        creadoPor: session.sub,
      },
    })

    await prisma.firmaContrato.updateMany({
      where: {
        id: { lt: firma.id },
        contratoId: contrato.id,
        estado: 'pendiente',
        ...(expediente
          ? { expedienteId: expediente }
          : { expedienteId: null, clienteNombre: nombre, clienteTelefono: telefono }),
      },
      data: { estado: 'reemplazado' },
    })

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/+$/, '')
    const link = `${baseUrl}/firmar/${firma.token}`

    return ok({ ...firma, link })
  } catch (e) {
    return serverError(e)
  }
}
