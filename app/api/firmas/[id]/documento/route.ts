import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, notFound, badRequest, serverError } from '@/lib/api'
import { supabaseAdmin, BUCKET_FIRMAS } from '@/lib/supabase-admin'

type Params = { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth

  const id = Number.parseInt(params.id, 10)
  if (!Number.isInteger(id) || id < 1) return badRequest('Firma no válida')

  try {
    const firma = await prisma.firmaContrato.findUnique({ where: { id } })
    if (!firma) return notFound('Firma no encontrada')
    if (firma.estado !== 'firmado') return badRequest('Este documento aún no ha sido firmado')

    const descargar = req.nextUrl.searchParams.get('descargar') === '1'
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_FIRMAS)
      .createSignedUrl(
        `documento-firmado-${firma.token}.pdf`,
        60 * 60,
        descargar ? { download: 'documento-firmado.pdf' } : undefined,
      )

    if (error || !data?.signedUrl) {
      console.error('[firmas] No se pudo generar el enlace del documento firmado:', error)
      return serverError(error ?? new Error('No se pudo generar el enlace del documento firmado'))
    }

    return NextResponse.redirect(data.signedUrl)
  } catch (error) {
    return serverError(error)
  }
}
