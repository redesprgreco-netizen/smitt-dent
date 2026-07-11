// app/api/firmas/[id]/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, notFound, serverError } from '@/lib/api'
import { supabaseAdmin, BUCKET_CONTRATOS, BUCKET_FIRMAS } from '@/lib/supabase-admin'

type Params = { params: { id: string } }

// Detalle de una firma para el admin: incluye link temporal al PDF y a la imagen de la firma
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAuth(['admin'])
  if ('status' in auth) return auth

  try {
    const firma = await prisma.firmaContrato.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        contrato: true,
        expediente: { select: { id: true, folio: true, nombre: true, apellido: true } },
      },
    })
    if (!firma) return notFound('Firma no encontrada')

    const { data: pdfData } = await supabaseAdmin.storage
      .from(BUCKET_CONTRATOS)
      .createSignedUrl(firma.contrato.storagePath, 60 * 10)

    let firmaUrl: string | null = null
    if (firma.firmaStoragePath) {
      const { data: firmaData } = await supabaseAdmin.storage
        .from(BUCKET_FIRMAS)
        .createSignedUrl(firma.firmaStoragePath, 60 * 10)
      firmaUrl = firmaData?.signedUrl ?? null
    }

    return ok({ ...firma, pdfUrl: pdfData?.signedUrl ?? null, firmaUrl })
  } catch (e) {
    return serverError(e)
  }
}
