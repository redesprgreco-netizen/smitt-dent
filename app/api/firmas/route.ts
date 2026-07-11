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
    orderBy: { createdAt: 'desc' },
    include: {
      contrato: { select: { nombre: true } },
      expediente: { select: { id: true, folio: true, nombre: true, apellido: true } },
    },
  })
  return ok(firmas)
}

// Crea una nueva solicitud de firma y devuelve el link único
export async function POST(req: NextRequest) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth
  const { session } = auth

  try {
    const { clienteNombre, clienteTelefono, expedienteId } = await req.json()
    if (!clienteNombre?.trim()) return badRequest('Falta el nombre del cliente')

    const contrato = await prisma.contrato.findFirst({ where: { activo: true } })
    if (!contrato) return badRequest('No hay ningún contrato activo. Sube un PDF primero en Configuración → Contratos.')

    const token = crypto.randomBytes(24).toString('base64url')

    const firma = await prisma.firmaContrato.create({
      data: {
        token,
        contratoId: contrato.id,
        expedienteId: expedienteId ?? null,
        clienteNombre: clienteNombre.trim(),
        clienteTelefono: clienteTelefono?.trim() || null,
        creadoPor: session.sub,
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`
    const link = `${baseUrl}/firmar/${token}`

    return ok({ ...firma, link })
  } catch (e) {
    return serverError(e)
  }
}
