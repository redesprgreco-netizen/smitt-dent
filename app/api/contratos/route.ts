// app/api/contratos/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, badRequest, serverError } from '@/lib/api'
import { supabaseAdmin, BUCKET_CONTRATOS, supabaseConfigured } from '@/lib/supabase-admin'
import { logAccion, getIp } from '@/lib/bitacora'

export async function GET() {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth

  const contrato = await prisma.contrato.findFirst({
    where: { activo: true },
    orderBy: { createdAt: 'desc' },
  })
  return ok(contrato)
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth
  const { session } = auth

  if (!supabaseConfigured()) {
    return badRequest(
      'Supabase Storage no está configurado. Agrega NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en las variables de entorno de Vercel.'
    )
  }

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
