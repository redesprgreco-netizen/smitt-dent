import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, notFound, serverError, badRequest } from '@/lib/api'
import { supabaseAdmin, BUCKET_CONTRATOS, supabaseConfigured } from '@/lib/supabase-admin'

export async function GET() {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth

  if (!supabaseConfigured()) {
    return badRequest('Supabase Storage no está configurado.')
  }

  try {
    const contrato = await prisma.contrato.findFirst({
      where: { activo: true },
      orderBy: { createdAt: 'desc' },
    })
    if (!contrato) return notFound('No hay un contrato activo para descargar')

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_CONTRATOS)
      .createSignedUrl(contrato.storagePath, 60, { download: contrato.nombre })

    if (error || !data?.signedUrl) {
      console.error('[contratos] No se pudo generar el enlace de descarga:', error)
      return serverError(error ?? new Error('No se pudo generar el enlace de descarga'))
    }

    return NextResponse.redirect(data.signedUrl)
  } catch (error) {
    return serverError(error)
  }
}
