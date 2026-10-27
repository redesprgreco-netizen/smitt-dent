// app/api/firmas/[id]/route.ts
import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, ok, notFound, serverError } from '@/lib/api'
import { supabaseAdmin, BUCKET_CONTRATOS, BUCKET_FIRMAS } from '@/lib/supabase-admin'
import { asegurarPdfFirmado } from '@/lib/firma-pdf'

type Params = { params: { id: string } }

// Detalle de una firma para el admin: incluye enlaces temporales al PDF y a la imagen de la firma.
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

    const firmado = firma.estado === 'firmado'
    if (firmado) await asegurarPdfFirmado(firma)
    const pdfPath = firmado
      ? `documento-firmado-${firma.token}.pdf`
      : firma.contrato.storagePath
    const pdfBucket = firmado ? BUCKET_FIRMAS : BUCKET_CONTRATOS
    const [{ data: pdfData, error: pdfError }, { data: downloadData, error: downloadError }] = await Promise.all([
      supabaseAdmin.storage.from(pdfBucket).createSignedUrl(pdfPath, 60 * 60),
      supabaseAdmin.storage.from(pdfBucket).createSignedUrl(pdfPath, 60 * 60, { download: true }),
    ])
    if (pdfError || downloadError) {
      console.error('[firmas] No se pudo generar el enlace del PDF:', pdfError ?? downloadError)
      return serverError(pdfError ?? downloadError)
    }

    let firmaUrl: string | null = null
    if (firma.firmaStoragePath) {
      const { data: firmaData } = await supabaseAdmin.storage
        .from(BUCKET_FIRMAS)
        .createSignedUrl(firma.firmaStoragePath, 60 * 10)
      firmaUrl = firmaData?.signedUrl ?? null
    }

    return ok({
      ...firma,
      pdfUrl: pdfData?.signedUrl ?? null,
      downloadUrl: downloadData?.signedUrl ?? null,
      firmaUrl,
    })
  } catch (e) {
    return serverError(e)
  }
}
