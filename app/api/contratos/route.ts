// app/api/contratos/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, badRequest, serverError } from '@/lib/api'
import { supabaseAdmin, BUCKET_CONTRATOS } from '@/lib/supabase-admin'
import { logAccion, getIp } from '@/lib/bitacora'

// Devuelve el contrato activo (si existe)
export async function GET() {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth

  const contrato = await prisma.contrato.findFirst({
    where: { activo: true },
    orderBy: { createdAt: 'desc' },
  })
  return ok(contrato)
}

// Sube un nuevo PDF y lo marca como el contrato activo (desactiva el anterior)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth
  const { session } = auth

  try {
    const formData = await req.formData()
    const file = formData.get('archivo') as File | null
    const nombre = (formData.get('nombre') as string) || 'Contrato'

    if (!file) return badRequest('Falta el archivo PDF')
    if (file.type !== 'application/pdf') return badRequest('El archivo debe ser un PDF')

    const bytes = await file.arrayBuffer()
    const storagePath = `contrato-${Date.now()}.pdf`

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_CONTRATOS)
      .upload(storagePath, bytes, { contentType: 'application/pdf' })

    if (uploadError) return badRequest(`Error al subir el PDF: ${uploadError.message}`)

    // Desactiva el contrato anterior (si había uno) y crea el nuevo activo
    await prisma.contrato.updateMany({ where: { activo: true }, data: { activo: false } })

    const contrato = await prisma.contrato.create({
      data: { nombre, storagePath, activo: true, subidoPor: session.sub },
    })

    await logAccion({
      usuarioId: session.sub,
      accion: 'subir_contrato',
      tablaAfectada: 'contratos',
      registroId: contrato.id,
      valorNuevo: { nombre },
      ipAddress: getIp(req),
    })

    return ok(contrato)
  } catch (e) {
    return serverError(e)
  }
}
